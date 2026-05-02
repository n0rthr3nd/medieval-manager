import { Request, Response } from 'express';
import { BOCATAS_PREDEFINIDOS } from '../config/menu';
import { isWithinOrderWindow, getNextSaturday, getFridayDeadline, getTargetWeek, getThursdayDeadline, getNextMonday } from '../utils/dateUtils';
import BocadilloAlquimista from '../models/BocadilloAlquimista';
import Ingrediente from '../models/Ingrediente';
import SystemConfig from '../models/SystemConfig';
import { AuthRequest } from '../middleware/auth';
import { UserRole } from '../models/User';

export const getIngredientes = async (req: Request, res: Response) => {
  try {
    // Obtener ingredientes disponibles desde la base de datos
    const ingredientes = await Ingrediente.find({ disponible: true })
      .sort({ orden: 1, nombre: 1 })
      .select('nombre');

    // Extraer solo los nombres para mantener compatibilidad con el frontend
    const nombresIngredientes = ingredientes.map(ing => ing.nombre);

    res.json({
      success: true,
      data: nombresIngredientes,
    });
  } catch (error) {
    console.error('Error al obtener ingredientes:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener ingredientes',
    });
  }
};

export const getBocatasPredefinidos = async (req: Request, res: Response) => {
  try {
    const { week, year } = getTargetWeek(new Date());
    const user = (req as AuthRequest).user;
    const isAdmin = user?.role === UserRole.ADMIN;

    // Buscar si hay un Alquimista para esta semana
    const alquimista = await BocadilloAlquimista.findOne({
      semana: week,
      ano: year,
    });

    let bocatasPredefinidos = [...BOCATAS_PREDEFINIDOS];

    // Si existe el Alquimista, añadirlo a la lista
    if (alquimista) {
      bocatasPredefinidos.push({
        nombre: 'Alquimista',
        tamano: alquimista.tamano,
        tipoPan: alquimista.tipoPan,
        // Solo mostrar ingredientes a los admins, usuarios normales ven array vacío
        ingredientes: isAdmin ? alquimista.ingredientes : [],
      });
    }

    res.json({
      success: true,
      data: bocatasPredefinidos,
    });
  } catch (error) {
    console.error('Error fetching bocatas predefinidos:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener bocatas predefinidos',
    });
  }
};

export const getOrderWindowStatus = async (req: Request, res: Response) => {
  try {
    const config = await SystemConfig.findOne();
    const now = new Date();

    // Si el admin ha cerrado manualmente
    if (config?.manuallyClosedOrders) {
      return res.json({
        success: true,
        data: {
          isOpen: false,
          currentTime: now.toISOString(),
          deadline: getFridayDeadline(now).toISOString(),
          nextOpening: getNextSaturday(now).toISOString(),
          message: config.closureMessage || 'El servicio de bocadillos está cerrado esta semana. Vuelve a probar la próxima semana.',
          manuallyClosed: true,
        },
      });
    }

    // Verificación automática por fecha
    const isOpen = isWithinOrderWindow();

    res.json({
      success: true,
      data: {
        isOpen,
        currentTime: now.toISOString(),
        deadline: getThursdayDeadline(now).toISOString(),
        nextOpening: isOpen ? null : getNextMonday(now).toISOString(),
        message: isOpen
          ? 'Ventana de pedidos abierta (Sábado a Viernes)'
          : 'Ventana de pedidos cerrada. Se abrirá el próximo Sábado.',
        manuallyClosed: false,
      },
    });
  } catch (error) {
    console.error('Error al obtener estado de ventana de pedidos:', error);
    // Fallback a validación automática
    const isOpen = isWithinOrderWindow();
    const now = new Date();

    res.json({
      success: true,
      data: {
        isOpen,
        currentTime: now.toISOString(),
        deadline: getThursdayDeadline(now).toISOString(),
        nextOpening: isOpen ? null : getNextMonday(now).toISOString(),
        message: isOpen
          ? 'Ventana de pedidos abierta (Sábado a Viernes)'
          : 'Ventana de pedidos cerrada. Se abrirá el próximo Sábado.',
      },
    });
  }
};
