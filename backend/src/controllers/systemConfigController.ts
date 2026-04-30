import { Response } from 'express';
import mongoose from 'mongoose';
import SystemConfig from '../models/SystemConfig';
import { AuthRequest } from '../middleware/auth';

/**
 * Obtiene la configuración del sistema (crea una por defecto si no existe)
 */
export const getSystemConfig = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    let config = await SystemConfig.findOne();

    // Si no existe configuración, crear una por defecto
    if (!config) {
      config = new SystemConfig({
        manuallyClosedOrders: false,
        closureMessage: 'El servicio de bocadillos está cerrado esta semana. Vuelve a probar la próxima semana.',
      });
      await config.save();
    }

    res.json({
      success: true,
      data: config,
    });
  } catch (error) {
    console.error('Error al obtener configuración del sistema:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener configuración del sistema',
    });
  }
};

/**
 * Actualiza el estado de pedidos (abierto/cerrado manualmente) - Solo ADMIN
 */
export const updateOrdersStatus = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { manuallyClosedOrders, closureMessage } = req.body;

    if (typeof manuallyClosedOrders !== 'boolean') {
      res.status(400).json({
        success: false,
        error: 'El campo manuallyClosedOrders debe ser un booleano',
      });
      return;
    }

    let config = await SystemConfig.findOne();

    if (!config) {
      config = new SystemConfig();
    }

    config.manuallyClosedOrders = manuallyClosedOrders;

    if (closureMessage && typeof closureMessage === 'string') {
      config.closureMessage = closureMessage.trim();
    }

    if (manuallyClosedOrders) {
      config.closedBy = req.user?.userId ? new mongoose.Types.ObjectId(req.user.userId) : undefined;
      config.closedAt = new Date();
    } else {
      config.closedBy = undefined;
      config.closedAt = undefined;
    }

    await config.save();

    res.json({
      success: true,
      data: config,
      message: manuallyClosedOrders
        ? 'Pedidos cerrados correctamente'
        : 'Pedidos abiertos correctamente',
    });
  } catch (error) {
    console.error('Error al actualizar estado de pedidos:', error);
    res.status(500).json({
      success: false,
      error: 'Error al actualizar estado de pedidos',
    });
  }
};

/**
 * Actualiza la configuración global del chatbot (kill-switch + cuotas) - Solo ADMIN
 */
export const updateChatbotConfig = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const {
      chatbotGloballyEnabled,
      chatbotMessagesPerWeek,
      chatbotMessagesPerWeekAdmin,
    } = req.body;

    let config = await SystemConfig.findOne();
    if (!config) {
      config = new SystemConfig();
    }

    if (typeof chatbotGloballyEnabled === 'boolean') {
      config.chatbotGloballyEnabled = chatbotGloballyEnabled;
    }
    if (typeof chatbotMessagesPerWeek === 'number' && chatbotMessagesPerWeek >= 0) {
      config.chatbotMessagesPerWeek = chatbotMessagesPerWeek;
    }
    if (typeof chatbotMessagesPerWeekAdmin === 'number' && chatbotMessagesPerWeekAdmin >= 0) {
      config.chatbotMessagesPerWeekAdmin = chatbotMessagesPerWeekAdmin;
    }

    await config.save();

    res.json({
      success: true,
      data: config,
      message: 'Configuración del chatbot actualizada',
    });
  } catch (error) {
    console.error('Error al actualizar configuración del chatbot:', error);
    res.status(500).json({
      success: false,
      error: 'Error al actualizar configuración del chatbot',
    });
  }
};
