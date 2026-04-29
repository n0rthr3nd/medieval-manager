/**
 * Chatbot service: bucle de tool-calling con streaming.
 *
 * Llama al gateway (Ollama OpenAI-compat) con stream=true y tools, lee los
 * deltas, ejecuta tools si la LLM las invoca, y sigue iterando hasta que la
 * LLM emite un mensaje final de texto. Cada evento relevante se emite vía
 * `emit()` para que el controller los reenvíe por SSE.
 */

import { Readable } from 'node:stream';
import {
  ChatMessage,
  ChatStreamEvent,
  OpenAIStreamChunk,
  ToolCall,
  ToolExecutionContext,
} from '../../types/chatbot';
import { TOOL_DEFINITIONS, executeTool } from './tools';
import { construirSystemPrompt } from './promptBuilder';

const AI_API_URL = (process.env.AI_API_URL || 'http://127.0.0.1:8080').replace(/\/$/, '');
const AI_API_KEY = process.env.AI_API_KEY || '';
const AI_MODEL = process.env.AI_MODEL || 'gpt-oss:120b';
const AI_TEMPERATURE = parseFloat(process.env.AI_TEMPERATURE || '0.6');
const AI_MAX_TOKENS = parseInt(process.env.AI_MAX_TOKENS || '1024', 10);
const MAX_TOOL_ITERATIONS = 5;
const MAX_USER_MESSAGE_CHARS = 1000;

export type EmitFn = (event: ChatStreamEvent) => void;

export interface StreamChatOptions {
  ctx: ToolExecutionContext;
  history: ChatMessage[];
  userMessage: string;
  emit: EmitFn;
  signal?: AbortSignal;
}

export interface StreamChatResult {
  finalAssistantText: string;
  iterations: number;
  toolCallsExecuted: number;
  firstChunkReceived: boolean;
}

const DIAS_ES = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];

export async function streamChat(opts: StreamChatOptions): Promise<StreamChatResult> {
  const { ctx, history, emit, signal } = opts;
  const userMessage = opts.userMessage.slice(0, MAX_USER_MESSAGE_CHARS);

  const now = new Date();
  const systemPrompt = construirSystemPrompt({
    nombreUsuario: ctx.nombre,
    fechaActualISO: now.toISOString(),
    diaSemana: DIAS_ES[now.getDay()],
  });

  const messages: ChatMessage[] = [
    { role: 'system', content: systemPrompt },
    ...history,
    { role: 'user', content: userMessage },
  ];

  let iterations = 0;
  let toolCallsExecuted = 0;
  let firstChunkReceived = false;
  let finalAssistantText = '';

  while (iterations < MAX_TOOL_ITERATIONS) {
    iterations++;

    const turn = await runOneTurn({
      messages,
      onTextDelta: delta => {
        if (!firstChunkReceived) firstChunkReceived = true;
        emit({ type: 'text_delta', data: { delta } });
      },
      signal,
    });

    if (!firstChunkReceived && (turn.text.length > 0 || turn.toolCalls.length > 0)) {
      firstChunkReceived = true;
    }

    if (turn.toolCalls.length === 0) {
      // No tool calls: este es el mensaje final del asistente.
      finalAssistantText = turn.text;
      break;
    }

    // Hay tool calls: ejecutamos y volvemos al loop.
    messages.push({
      role: 'assistant',
      content: turn.text || null,
      tool_calls: turn.toolCalls,
    });

    for (const call of turn.toolCalls) {
      emit({ type: 'tool_call_pending', data: { toolName: call.function.name, callId: call.id } });
      const result = await executeTool(ctx, call.function.name, call.function.arguments);
      toolCallsExecuted++;

      emit({
        type: 'tool_call_done',
        data: {
          toolName: call.function.name,
          callId: call.id,
          ok: result.ok,
          summary: result.ok
            ? summarize(result.data)
            : (result.error || 'error'),
        },
      });

      if (result.propuestaPedido) {
        emit({ type: 'propuesta_pedido', data: result.propuestaPedido });
      }
      if (result.bocadilloAfectado) {
        emit({ type: 'bocadillo_afectado', data: result.bocadilloAfectado });
      }

      // El resultado se le pasa de vuelta a la LLM como mensaje role:'tool'.
      messages.push({
        role: 'tool',
        tool_call_id: call.id,
        name: call.function.name,
        content: JSON.stringify({
          ok: result.ok,
          ...(result.ok ? { data: result.data } : { error: result.error }),
        }),
      });
    }
  }

  if (iterations >= MAX_TOOL_ITERATIONS && !finalAssistantText) {
    finalAssistantText = 'Lo siento, no he podido completar la operación. ¿Puedes reformular?';
    emit({ type: 'text_delta', data: { delta: finalAssistantText } });
  }

  return { finalAssistantText, iterations, toolCallsExecuted, firstChunkReceived };
}

interface OneTurnResult {
  text: string;
  toolCalls: ToolCall[];
  finishReason: string | null;
}

interface RunOneTurnOptions {
  messages: ChatMessage[];
  onTextDelta: (delta: string) => void;
  signal?: AbortSignal;
}

async function runOneTurn(opts: RunOneTurnOptions): Promise<OneTurnResult> {
  const payload = {
    model: AI_MODEL,
    stream: true,
    temperature: AI_TEMPERATURE,
    max_tokens: AI_MAX_TOKENS,
    tools: TOOL_DEFINITIONS,
    tool_choice: 'auto',
    messages: opts.messages.map(m => ({
      role: m.role,
      content: m.content ?? '',
      ...(m.tool_call_id ? { tool_call_id: m.tool_call_id } : {}),
      ...(m.name ? { name: m.name } : {}),
      ...(m.tool_calls ? { tool_calls: m.tool_calls } : {}),
    })),
  };

  const headers: Record<string, string> = {
    'content-type': 'application/json',
  };
  if (AI_API_KEY) headers['x-api-key'] = AI_API_KEY;

  const upstream = await fetch(`${AI_API_URL}/v1/chat/completions`, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
    signal: opts.signal,
  });

  if (!upstream.ok) {
    const errBody = await upstream.text().catch(() => '');
    throw new Error(`upstream ${upstream.status}: ${errBody.slice(0, 200)}`);
  }
  if (!upstream.body) {
    throw new Error('upstream sin body');
  }

  let textAcc = '';
  const toolCallsAcc: ToolCall[] = [];
  let finishReason: string | null = null;

  const nodeStream = Readable.fromWeb(upstream.body as any);
  let buffer = '';

  for await (const chunk of nodeStream) {
    buffer += chunk.toString('utf8');
    let nlIdx;
    while ((nlIdx = buffer.indexOf('\n')) >= 0) {
      const line = buffer.slice(0, nlIdx).trim();
      buffer = buffer.slice(nlIdx + 1);
      if (!line.startsWith('data:')) continue;
      const payloadStr = line.slice(5).trim();
      if (!payloadStr || payloadStr === '[DONE]') continue;

      let parsed: OpenAIStreamChunk;
      try {
        parsed = JSON.parse(payloadStr);
      } catch {
        continue;
      }

      const choice = parsed.choices?.[0];
      if (!choice) continue;

      const delta = choice.delta;
      if (delta?.content) {
        textAcc += delta.content;
        opts.onTextDelta(delta.content);
      }
      if (delta?.tool_calls) {
        for (const tcDelta of delta.tool_calls) {
          const idx = tcDelta.index ?? 0;
          if (!toolCallsAcc[idx]) {
            toolCallsAcc[idx] = {
              id: tcDelta.id || `call_${idx}_${Date.now()}`,
              type: 'function',
              function: { name: '', arguments: '' },
            };
          }
          const target = toolCallsAcc[idx];
          if (tcDelta.id) target.id = tcDelta.id;
          if (tcDelta.function?.name) target.function.name += tcDelta.function.name;
          if (tcDelta.function?.arguments) target.function.arguments += tcDelta.function.arguments;
        }
      }
      if (choice.finish_reason) {
        finishReason = choice.finish_reason;
      }
    }
  }

  // Filtramos tool calls vacíos (algunos modelos emiten índices sueltos).
  const validToolCalls = toolCallsAcc.filter(tc => tc && tc.function.name);

  return {
    text: textAcc,
    toolCalls: validToolCalls,
    finishReason,
  };
}

function summarize(data: unknown): string {
  if (data == null) return 'ok';
  try {
    const s = typeof data === 'string' ? data : JSON.stringify(data);
    return s.length > 80 ? `${s.slice(0, 80)}...` : s;
  } catch {
    return 'ok';
  }
}
