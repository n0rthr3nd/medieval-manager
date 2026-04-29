/**
 * Gate del chatbot: combina feature flag por usuario, kill-switch global y
 * límite semanal de mensajes en un único middleware.
 *
 * - Kill-switch global apaga la funcionalidad para todos.
 * - User.chatbotMode === 'disabled' → 403.
 * - Si los mensajes consumidos esta semana >= límite → 429.
 *
 * El descuento del contador NO se hace aquí; lo hace el controller cuando se
 * recibe el primer chunk del modelo (así no penalizamos errores de upstream).
 */

import { Response, NextFunction } from 'express';
import User, { ChatbotMode, UserRole } from '../models/User';
import SystemConfig from '../models/SystemConfig';
import ConversacionChat from '../models/ConversacionChat';
import { AuthRequest } from './auth';
import { getWeekNumber } from '../utils/dateUtils';

export interface ChatbotGateContext {
  weeklyLimit: number;
  used: number;
  remaining: number;
  isAdmin: boolean;
  isBeta: boolean;
}

declare module 'express-serve-static-core' {
  interface Request {
    chatbotGate?: ChatbotGateContext;
  }
}

const DEFAULT_LIMIT_USER = 5;
const DEFAULT_LIMIT_ADMIN = 100;

export async function chatbotGate(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  const auth = req.user;
  if (!auth) {
    return res.status(401).json({ error: 'No autenticado' });
  }

  // 1. Kill-switch global.
  const config = await SystemConfig.findOne();
  if (config && config.chatbotGloballyEnabled === false) {
    return res.status(503).json({
      error: 'chatbot_disabled_global',
      message: 'El asistente está temporalmente deshabilitado.',
    });
  }

  // 2. User mode (cargamos fresco; el JWT puede estar antiguo).
  const userDoc = await User.findById(auth.userId).select('chatbotMode role');
  if (!userDoc) {
    return res.status(404).json({ error: 'Usuario no encontrado' });
  }
  if (userDoc.chatbotMode === ChatbotMode.DISABLED) {
    return res.status(403).json({
      error: 'chatbot_disabled_user',
      message: 'No tienes acceso al asistente. Contacta con el administrador.',
    });
  }

  // 3. Cuota semanal.
  const isAdmin = userDoc.role === UserRole.ADMIN;
  const weeklyLimit = isAdmin
    ? (config?.chatbotMessagesPerWeekAdmin ?? DEFAULT_LIMIT_ADMIN)
    : (config?.chatbotMessagesPerWeek ?? DEFAULT_LIMIT_USER);

  const { week, year } = getWeekNumber(new Date());
  const conversacion = await ConversacionChat.findOne({
    userId: auth.userId,
    semana: week,
    ano: year,
    activa: true,
  }).select('mensajesUsuarioCount').lean();

  const used = conversacion?.mensajesUsuarioCount ?? 0;
  const remaining = Math.max(0, weeklyLimit - used);

  if (remaining <= 0) {
    return res.status(429).json({
      error: 'chatbot_quota_exceeded',
      message: `Has alcanzado el límite de ${weeklyLimit} mensajes esta semana.`,
      weeklyLimit,
      used,
      remaining: 0,
    });
  }

  req.chatbotGate = {
    weeklyLimit,
    used,
    remaining,
    isAdmin,
    isBeta: userDoc.chatbotMode === ChatbotMode.BETA,
  };
  next();
}

/**
 * Helper atómico para incrementar el contador en cuanto el modelo empieza a
 * responder. Devuelve el nuevo valor y cuántos quedan.
 */
export async function consumeChatbotQuota(
  userId: string,
  weeklyLimit: number
): Promise<{ used: number; remaining: number }> {
  const { week, year } = getWeekNumber(new Date());
  const updated = await ConversacionChat.findOneAndUpdate(
    { userId, semana: week, ano: year, activa: true },
    { $inc: { mensajesUsuarioCount: 1 } },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  ).select('mensajesUsuarioCount').lean();

  const used = updated?.mensajesUsuarioCount ?? 1;
  return { used, remaining: Math.max(0, weeklyLimit - used) };
}
