import { Router } from 'express';
import { authenticateToken } from '../middleware/auth';
import { chatbotGate } from '../middleware/chatbotGate';
import {
  postChatMensaje,
  getChatConversacionActual,
  getChatStatus,
} from '../controllers/chatbotController';

const router = Router();

router.use(authenticateToken);

// Status (sin consumir cuota): saber si está habilitado y cuántos mensajes quedan.
router.get('/status', getChatStatus);
router.get('/conversacion', getChatConversacionActual);

// Mensaje: aquí sí pasa por el gate (kill-switch + mode + cuota).
router.post('/mensaje', chatbotGate, postChatMensaje);

export default router;
