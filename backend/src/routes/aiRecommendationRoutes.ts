import { Router } from 'express';
import {
  solicitarRecomendacion,
  aceptarRecomendacion,
  enviarFeedback,
  obtenerConversacion,
  cerrarConversacion,
} from '../controllers/aiRecommendationController';
import { authenticateToken } from '../middleware/auth';

const router = Router();

/**
 * POST /api/ai-recommendations/solicitar
 * Solicita una recomendación inteligente basada en el mensaje del usuario
 */
router.post('/solicitar', authenticateToken, solicitarRecomendacion);

/**
 * POST /api/ai-recommendations/aceptar
 * Acepta una recomendación y crea el bocadillo automáticamente
 */
router.post('/aceptar', authenticateToken, aceptarRecomendacion);

/**
 * POST /api/ai-recommendations/feedback
 * Envía feedback sobre una recomendación (aceptada/rechazada)
 */
router.post('/feedback', authenticateToken, enviarFeedback);

/**
 * GET /api/ai-recommendations/conversacion
 * Obtiene la conversación activa del usuario
 */
router.get('/conversacion', authenticateToken, obtenerConversacion);

/**
 * DELETE /api/ai-recommendations/conversacion
 * Cierra la conversación activa del usuario
 */
router.delete('/conversacion', authenticateToken, cerrarConversacion);

export default router;
