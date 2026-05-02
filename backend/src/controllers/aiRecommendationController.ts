/**
 * Controlador para el sistema de recomendación inteligente de bocadillos
 */

import { Request, Response } from 'express';
import { ZodError } from 'zod';
import { AuthRequest } from '../middleware/auth';
import aiRecommendationService from '../services/aiRecommendationService';
import {
  solicitarRecomendacionSchema,
  aceptarRecomendacionSchema,
  feedbackRecomendacionSchema,
} from '../validators/aiRecommendationValidator';
import Bocadillo from '../models/Bocadillo';
import { getTargetWeek } from '../utils/dateUtils';
import Settings from '../models/Settings';
import { UserRole } from '../models/User';

/**
 * POST /api/ai-recommendations/solicitar
 * Solicita una recomendación inteligente
 */
export const solicitarRecomendacion = async (req: Request, res: Response) => {
  try {
    const user = (req as AuthRequest).user;

    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Usuario no autenticado',
      });
    }

    // Validar datos de entrada
    const validatedData = solicitarRecomendacionSchema.parse(req.body);

    // Generar recomendación usando el servicio
    const response = await aiRecommendationService.generarRecomendacion(
      user.userId,
      user.nombre,
      validatedData.mensajeUsuario
    );

    if (!response.exito) {
      return res.status(500).json({
        success: false,
        error: 'Error al generar recomendación',
        details: response.error,
      });
    }

    // Guardar mensaje del usuario en la conversación
    await aiRecommendationService.guardarMensajeConversacion(
      user.userId,
      'usuario',
      validatedData.mensajeUsuario
    );

    // Guardar respuesta del asistente en la conversación
    if (response.recomendacion) {
      await aiRecommendationService.guardarMensajeConversacion(
        user.userId,
        'asistente',
        response.recomendacion.respuestaTexto,
        response.recomendacion
      );
    }

    res.json({
      success: true,
      data: response,
    });
  } catch (error) {
    if (error instanceof ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Validación fallida',
        details: error.errors,
      });
    }

    console.error('Error solicitando recomendación:', error);
    res.status(500).json({
      success: false,
      error: 'Error al procesar la solicitud',
    });
  }
};

/**
 * POST /api/ai-recommendations/aceptar
 * Acepta una recomendación y crea el bocadillo
 */
export const aceptarRecomendacion = async (req: Request, res: Response) => {
  try {
    const user = (req as AuthRequest).user;

    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Usuario no autenticado',
      });
    }

    // Verificar si los pedidos están cerrados (excepto para admins)
    const settings = await Settings.findOne();
    if (settings?.ordersClosed && user.role !== UserRole.ADMIN) {
      return res.status(403).json({
        success: false,
        error: settings.closedMessage,
        closedUntilDate: settings.closedUntilDate,
      });
    }

    // Validar datos de entrada
    const validatedData = aceptarRecomendacionSchema.parse(req.body);

    // Obtener semana objetivo (la del próximo viernes)
    const { week, year } = getTargetWeek(new Date());

    // Crear bocadillo basado en la recomendación aceptada
    const bocadillo = new Bocadillo({
      nombre: user.nombre,
      userId: user.userId,
      tamano: validatedData.propuestaPedido.tamano,
      tipoPan: validatedData.propuestaPedido.tipoPan,
      ingredientes: validatedData.propuestaPedido.ingredientes,
      semana: week,
      ano: year,
      esAlquimista: false,
    });

    await bocadillo.save();

    // Registrar feedback positivo (recomendación aceptada)
    await aiRecommendationService.guardarMensajeConversacion(
      user.userId,
      'usuario',
      '✅ Recomendación aceptada'
    );

    res.status(201).json({
      success: true,
      data: bocadillo,
      message: 'Bocadillo creado exitosamente desde recomendación',
    });
  } catch (error) {
    if (error instanceof ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Validación fallida',
        details: error.errors,
      });
    }

    console.error('Error aceptando recomendación:', error);
    res.status(500).json({
      success: false,
      error: 'Error al aceptar la recomendación',
    });
  }
};

/**
 * POST /api/ai-recommendations/feedback
 * Envía feedback sobre una recomendación
 */
export const enviarFeedback = async (req: Request, res: Response) => {
  try {
    const user = (req as AuthRequest).user;

    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Usuario no autenticado',
      });
    }

    // Validar datos de entrada
    const validatedData = feedbackRecomendacionSchema.parse(req.body);

    // Guardar feedback en la conversación
    const mensajeFeedback = validatedData.aceptada
      ? '✅ Recomendación aceptada'
      : `❌ Recomendación rechazada${
          validatedData.razonRechazo ? ': ' + validatedData.razonRechazo : ''
        }`;

    await aiRecommendationService.guardarMensajeConversacion(
      user.userId,
      'usuario',
      mensajeFeedback
    );

    res.json({
      success: true,
      message: 'Feedback registrado correctamente',
    });
  } catch (error) {
    if (error instanceof ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Validación fallida',
        details: error.errors,
      });
    }

    console.error('Error enviando feedback:', error);
    res.status(500).json({
      success: false,
      error: 'Error al enviar el feedback',
    });
  }
};

/**
 * GET /api/ai-recommendations/conversacion
 * Obtiene la conversación activa del usuario
 */
export const obtenerConversacion = async (req: Request, res: Response) => {
  try {
    const user = (req as AuthRequest).user;

    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Usuario no autenticado',
      });
    }

    const conversacion =
      await aiRecommendationService.obtenerConversacionActiva(user.userId);

    res.json({
      success: true,
      data: conversacion || null,
    });
  } catch (error) {
    console.error('Error obteniendo conversación:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener la conversación',
    });
  }
};

/**
 * DELETE /api/ai-recommendations/conversacion
 * Cierra la conversación activa del usuario
 */
export const cerrarConversacion = async (req: Request, res: Response) => {
  try {
    const user = (req as AuthRequest).user;

    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Usuario no autenticado',
      });
    }

    const conversacion =
      await aiRecommendationService.obtenerConversacionActiva(user.userId);

    if (conversacion) {
      conversacion.activa = false;
      await conversacion.save();
    }

    res.json({
      success: true,
      message: 'Conversación cerrada correctamente',
    });
  } catch (error) {
    console.error('Error cerrando conversación:', error);
    res.status(500).json({
      success: false,
      error: 'Error al cerrar la conversación',
    });
  }
};
