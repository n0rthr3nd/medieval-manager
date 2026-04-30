/**
 * Controller del chatbot. Endpoint SSE que reenvía los eventos del servicio
 * al frontend.
 *
 * El descuento de cuota ocurre cuando se recibe el primer chunk del modelo
 * (no antes). Si el upstream falla sin producir nada, no penalizamos al
 * usuario.
 */

import { Request, Response } from 'express';
import mongoose from 'mongoose';
import { z } from 'zod';
import { AuthRequest } from '../middleware/auth';
import ConversacionChat, { IMensajeChat } from '../models/ConversacionChat';
import SystemConfig from '../models/SystemConfig';
import User, { ChatbotMode, UserRole } from '../models/User';
import { getWeekNumber } from '../utils/dateUtils';
import { streamChat } from '../services/chatbot/chatbotService';
import {
  ChatMessage,
  ChatStreamEvent,
  ToolExecutionContext,
} from '../types/chatbot';
import { consumeChatbotQuota } from '../middleware/chatbotGate';

const MAX_HISTORY_MESSAGES = 10;
const HEARTBEAT_MS = 25_000;

const MensajeBodySchema = z.object({
  mensaje: z.string().min(1).max(1000),
});

/**
 * Filtro suave: rechaza mensajes obviamente fuera de dominio o de inyección.
 * No es seguridad, es UX (la seguridad real está en el system prompt y tools).
 */
function inputLooksUnsafe(text: string): string | null {
  const lowered = text.toLowerCase();
  // Caracteres de control raros (excepto \n, \r, \t).
  if (/[\x00-\x08\x0b\x0c\x0e-\x1f]/.test(text)) {
    return 'El mensaje contiene caracteres no permitidos';
  }
  // Patrones obvios de inyección. Lo bloqueamos amablemente.
  const patterns = [
    /ignore (all |the )?previous (instructions|prompts)/i,
    /olvida (todo|tus instrucciones)/i,
    /system prompt/i,
    /jailbreak/i,
  ];
  if (patterns.some(p => p.test(lowered))) {
    return 'No puedo procesar ese mensaje. Pregúntame algo sobre bocadillos.';
  }
  return null;
}

export const postChatMensaje = async (req: Request, res: Response) => {
  const authReq = req as AuthRequest;
  const user = authReq.user;
  if (!user) {
    return res.status(401).json({ error: 'No autenticado' });
  }

  const gate = req.chatbotGate;
  if (!gate) {
    // Defensa en profundidad: la ruta debería siempre montar chatbotGate antes.
    return res.status(500).json({ error: 'Gate del chatbot no inicializado' });
  }

  const parsed = MensajeBodySchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Mensaje inválido', detalles: parsed.error.errors });
  }

  const unsafeReason = inputLooksUnsafe(parsed.data.mensaje);
  if (unsafeReason) {
    return res.status(400).json({ error: 'mensaje_no_permitido', message: unsafeReason });
  }

  // Cargar / crear conversación de la semana actual.
  const { week, year } = getWeekNumber(new Date());
  let conversacion = await ConversacionChat.findOne({
    userId: user.userId,
    activa: true,
    semana: week,
    ano: year,
  });
  if (!conversacion) {
    conversacion = new ConversacionChat({
      userId: new mongoose.Types.ObjectId(user.userId),
      mensajes: [],
      semana: week,
      ano: year,
    });
  }

  // Guardamos el mensaje del usuario, pero NO incrementamos el contador todavía
  // (eso ocurre en cuanto el modelo empiece a responder).
  const userMessage: IMensajeChat = {
    id: new mongoose.Types.ObjectId().toString(),
    rol: 'usuario',
    contenido: parsed.data.mensaje,
    timestamp: new Date(),
  };
  conversacion.mensajes.push(userMessage);
  conversacion.fechaUltimoMensaje = new Date();
  await conversacion.save();

  // Headers SSE.
  res.status(200);
  res.setHeader('content-type', 'text/event-stream; charset=utf-8');
  res.setHeader('cache-control', 'no-cache, no-transform');
  res.setHeader('connection', 'keep-alive');
  res.setHeader('x-accel-buffering', 'no');
  res.flushHeaders();

  let currentRemaining = gate.remaining;

  const send = (event: ChatStreamEvent) => {
    if (res.writableEnded) return;
    res.write(`event: ${event.type}\n`);
    res.write(`data: ${JSON.stringify(event.data)}\n\n`);
  };

  const heartbeat = setInterval(() => {
    if (res.writableEnded) return;
    res.write(': keepalive\n\n');
  }, HEARTBEAT_MS);

  const abortController = new AbortController();
  const onClose = () => {
    abortController.abort();
    clearInterval(heartbeat);
  };
  req.on('close', onClose);

  send({
    type: 'connected',
    data: { conversationId: String(conversacion._id), quotaRemaining: currentRemaining },
  });

  let quotaConsumed = false;
  const consumeOnce = async () => {
    if (quotaConsumed) return;
    quotaConsumed = true;
    try {
      const { remaining } = await consumeChatbotQuota(user.userId, gate.weeklyLimit);
      currentRemaining = remaining;
    } catch (err) {
      console.error('[chatbot] error consumiendo cuota:', err);
    }
  };

  try {
    const ctx: ToolExecutionContext = {
      userId: user.userId,
      username: user.username,
      nombre: user.nombre,
      isAdmin: user.role === UserRole.ADMIN,
    };

    const history = mapHistoryToOpenAI(conversacion.mensajes.slice(0, -1));

    // Wrapper de emit que descuenta cuota en el primer evento que confirme
    // que la LLM está respondiendo (texto, tool call o propuesta).
    const emit = (event: ChatStreamEvent) => {
      if (
        !quotaConsumed &&
        (event.type === 'text_delta' ||
          event.type === 'tool_call_pending' ||
          event.type === 'propuesta_pedido')
      ) {
        // Fire and forget; el descuento es atómico y no debe bloquear el stream.
        void consumeOnce();
      }
      send(event);
    };

    const startedAt = Date.now();
    const result = await streamChat({
      ctx,
      history,
      userMessage: parsed.data.mensaje,
      emit,
      signal: abortController.signal,
    });
    console.log(
      `[chatbot] user=${user.username} convo=${conversacion._id} ` +
      `iters=${result.iterations} tools=${result.toolCallsExecuted} ` +
      `latency=${Date.now() - startedAt}ms quotaConsumed=${quotaConsumed}`
    );

    // Guardar mensaje del asistente (si hubo).
    if (result.finalAssistantText) {
      conversacion.mensajes.push({
        id: new mongoose.Types.ObjectId().toString(),
        rol: 'asistente',
        contenido: result.finalAssistantText,
        timestamp: new Date(),
      });
      conversacion.fechaUltimoMensaje = new Date();
      await conversacion.save();
    }

    send({ type: 'done', data: { quotaRemaining: currentRemaining } });
  } catch (err) {
    console.error('[chatbot] error en stream:', err);
    const message = err instanceof Error ? err.message : 'Error desconocido';
    send({ type: 'error', data: { message, code: 'stream_error' } });
  } finally {
    clearInterval(heartbeat);
    req.off('close', onClose);
    if (!res.writableEnded) res.end();
  }
};

/**
 * Mapea los mensajes persistidos (rol 'usuario'/'asistente') al formato
 * OpenAI ('user'/'assistant'). Solo incluimos texto plano; los tool calls
 * efímeros no se persisten y por tanto no se replican en el contexto.
 */
function mapHistoryToOpenAI(mensajes: IMensajeChat[]): ChatMessage[] {
  const recientes = mensajes.slice(-MAX_HISTORY_MESSAGES);
  return recientes
    .filter(m => m.contenido && m.contenido.trim())
    .map(m => ({
      role: m.rol === 'usuario' ? ('user' as const) : ('assistant' as const),
      content: m.contenido,
    }));
}

export const getChatConversacionActual = async (req: Request, res: Response) => {
  const user = (req as AuthRequest).user;
  if (!user) return res.status(401).json({ error: 'No autenticado' });

  const { week, year } = getWeekNumber(new Date());
  const conversacion = await ConversacionChat.findOne({
    userId: user.userId,
    activa: true,
    semana: week,
    ano: year,
  }).lean();

  if (!conversacion) {
    return res.json({ data: null });
  }

  return res.json({
    data: {
      id: conversacion._id,
      mensajes: conversacion.mensajes.map((m: IMensajeChat) => ({
        id: m.id,
        rol: m.rol,
        contenido: m.contenido,
        timestamp: m.timestamp,
      })),
      fechaInicio: conversacion.fechaInicio,
    },
  });
};

/**
 * Devuelve si el chatbot está disponible para el usuario y cuántos mensajes
 * le quedan. No consume cuota — la UI lo llama al cargar.
 */
export const getChatStatus = async (req: Request, res: Response) => {
  const auth = (req as AuthRequest).user;
  if (!auth) return res.status(401).json({ error: 'No autenticado' });

  const config = await SystemConfig.findOne();
  const userDoc = await User.findById(auth.userId).select('chatbotMode role');
  if (!userDoc) return res.status(404).json({ error: 'Usuario no encontrado' });

  const globallyEnabled = config?.chatbotGloballyEnabled ?? true;
  const mode = userDoc.chatbotMode ?? ChatbotMode.DISABLED;
  const isAdmin = userDoc.role === UserRole.ADMIN;
  const weeklyLimit = isAdmin
    ? (config?.chatbotMessagesPerWeekAdmin ?? 100)
    : (config?.chatbotMessagesPerWeek ?? 5);

  const { week, year } = getWeekNumber(new Date());
  const conv = await ConversacionChat.findOne({
    userId: auth.userId,
    semana: week,
    ano: year,
    activa: true,
  }).select('mensajesUsuarioCount').lean();
  const used = conv?.mensajesUsuarioCount ?? 0;

  const enabled =
    globallyEnabled &&
    mode !== ChatbotMode.DISABLED;

  return res.json({
    enabled,
    globallyEnabled,
    mode,
    isBeta: mode === ChatbotMode.BETA,
    weeklyLimit,
    used,
    remaining: Math.max(0, weeklyLimit - used),
  });
};
