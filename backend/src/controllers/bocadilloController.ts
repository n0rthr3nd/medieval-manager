import { Request, Response } from 'express';
import Bocadillo from '../models/Bocadillo';
import Settings from '../models/Settings';
import { createBocadilloSchema } from '../validators/bocadilloValidator';
import { getTargetWeek, getWeekNumber } from '../utils/dateUtils';
import { ZodError } from 'zod';
import { AuthRequest } from '../middleware/auth';
import { UserRole } from '../models/User';

export const createBocadillo = async (req: Request, res: Response) => {
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
    const validatedData = createBocadilloSchema.parse(req.body);

    // Obtener semana objetivo (la del próximo viernes)
    const { week, year } = getTargetWeek(new Date());

    // Crear bocadillo con el userId y nombre del usuario autenticado
    const bocadillo = new Bocadillo({
      ...validatedData,
      nombre: user.nombre,
      userId: user.userId,
      semana: week,
      ano: year,
    });

    await bocadillo.save();

    res.status(201).json({
      success: true,
      data: bocadillo,
    });
  } catch (error) {
    if (error instanceof ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Validación fallida',
        details: error.errors,
      });
    }

    console.error('Error creating bocadillo:', error);
    res.status(500).json({
      success: false,
      error: 'Error al crear el bocadillo',
    });
  }
};

export const getBocadillosSemanaActual = async (req: Request, res: Response) => {
  try {
    // Obtener semana objetivo (la del próximo viernes)
    const { week, year } = getTargetWeek(new Date());

    const bocadillos = await Bocadillo.find({
      semana: week,
      ano: year,
    }).sort({ fechaCreacion: -1 });

    res.json({
      success: true,
      data: bocadillos,
      semana: week,
      ano: year,
    });
  } catch (error) {
    console.error('Error fetching bocadillos:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener los bocadillos',
    });
  }
};

export const updateBocadillo = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { week, year } = getTargetWeek(new Date());
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

    // Buscar el bocadillo
    const bocadillo = await Bocadillo.findOne({
      _id: id,
      semana: week,
      ano: year,
    });

    if (!bocadillo) {
      return res.status(404).json({
        success: false,
        error: 'Bocadillo no encontrado o no se puede editar',
      });
    }

    // Verificar permisos: solo el creador o un admin pueden editar
    const isAdmin = user.role === UserRole.ADMIN;
    const isOwner = bocadillo.userId?.toString() === user.userId;

    if (!isAdmin && !isOwner) {
      return res.status(403).json({
        success: false,
        error: 'No tienes permiso para editar este bocadillo',
      });
    }

    // Validar los datos de entrada
    const validatedData = createBocadilloSchema.parse(req.body);

    // Actualizar el bocadillo manteniendo la semana, año y nombre original
    bocadillo.tamano = validatedData.tamano;
    bocadillo.tipoPan = validatedData.tipoPan;
    bocadillo.ingredientes = validatedData.ingredientes;
    bocadillo.bocataPredefinido = validatedData.bocataPredefinido;

    await bocadillo.save();

    res.json({
      success: true,
      data: bocadillo,
      message: 'Bocadillo actualizado correctamente',
    });
  } catch (error) {
    if (error instanceof ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Validación fallida',
        details: error.errors,
      });
    }

    console.error('Error updating bocadillo:', error);
    res.status(500).json({
      success: false,
      error: 'Error al actualizar el bocadillo',
    });
  }
};

export const deleteBocadillo = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { week, year } = getTargetWeek(new Date());
    const user = (req as AuthRequest).user;

    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Usuario no autenticado',
      });
    }

    // Solo permitir eliminar bocadillos de la semana actual
    const bocadillo = await Bocadillo.findOne({
      _id: id,
      semana: week,
      ano: year,
    });

    if (!bocadillo) {
      return res.status(404).json({
        success: false,
        error: 'Bocadillo no encontrado o no se puede eliminar',
      });
    }

    // Verificar permisos: solo el creador o un admin pueden eliminar
    const isAdmin = user.role === UserRole.ADMIN;
    const isOwner = bocadillo.userId?.toString() === user.userId;

    if (!isAdmin && !isOwner) {
      return res.status(403).json({
        success: false,
        error: 'No tienes permiso para eliminar este bocadillo',
      });
    }

    await Bocadillo.deleteOne({ _id: id });

    res.json({
      success: true,
      message: 'Bocadillo eliminado correctamente',
    });
  } catch (error) {
    console.error('Error deleting bocadillo:', error);
    res.status(500).json({
      success: false,
      error: 'Error al eliminar el bocadillo',
    });
  }
};

// Actualizar precio de un bocadillo (solo admin)
export const updatePrecio = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { precio } = req.body;

    if (precio === undefined || precio < 0) {
      return res.status(400).json({
        success: false,
        error: 'Precio inválido',
      });
    }

    const bocadillo = await Bocadillo.findById(id);

    if (!bocadillo) {
      return res.status(404).json({
        success: false,
        error: 'Bocadillo no encontrado',
      });
    }

    bocadillo.precio = precio;
    await bocadillo.save();

    res.json({
      success: true,
      data: bocadillo,
      message: 'Precio actualizado correctamente',
    });
  } catch (error) {
    console.error('Error updating precio:', error);
    res.status(500).json({
      success: false,
      error: 'Error al actualizar el precio',
    });
  }
};

// Marcar bocadillo como pagado (solo admin)
export const markAsPagado = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { pagado } = req.body;

    const bocadillo = await Bocadillo.findById(id);

    if (!bocadillo) {
      return res.status(404).json({
        success: false,
        error: 'Bocadillo no encontrado',
      });
    }

    if (!bocadillo.precio) {
      return res.status(400).json({
        success: false,
        error: 'No se puede marcar como pagado sin precio',
      });
    }

    bocadillo.pagado = pagado;
    await bocadillo.save();

    res.json({
      success: true,
      data: bocadillo,
      message: pagado ? 'Marcado como pagado' : 'Marcado como no pagado',
    });
  } catch (error) {
    console.error('Error updating pagado status:', error);
    res.status(500).json({
      success: false,
      error: 'Error al actualizar el estado de pago',
    });
  }
};

// Obtener bocadillos de una semana específica (admin)
export const getBocadillosByWeek = async (req: Request, res: Response) => {
  try {
    const semana = req.query.semana ? parseInt(req.query.semana as string) : undefined;
    const ano = req.query.ano ? parseInt(req.query.ano as string) : undefined;

    if (semana && ano) {
      if (isNaN(semana) || isNaN(ano) || semana < 1 || semana > 53) {
        return res.status(400).json({
          success: false,
          error: 'Parámetros semana/ano inválidos',
        });
      }
    }

    const target = semana && ano ? { week: semana, year: ano } : getTargetWeek(new Date());

    const bocadillos = await Bocadillo.find({
      semana: target.week,
      ano: target.year,
    }).sort({ fechaCreacion: -1 });

    res.json({
      success: true,
      data: bocadillos,
      semana: target.week,
      ano: target.year,
    });
  } catch (error) {
    console.error('Error fetching bocadillos by week:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener los bocadillos',
    });
  }
};

// Obtener semanas con pedidos disponibles (admin)
export const getSemanasDisponibles = async (_req: Request, res: Response) => {
  try {
    const semanas = await Bocadillo.aggregate([
      {
        $group: {
          _id: { semana: '$semana', ano: '$ano' },
          count: { $sum: 1 },
        },
      },
      { $sort: { '_id.ano': -1, '_id.semana': -1 } },
      { $limit: 52 },
    ]);

    const result = semanas.map((s) => ({
      semana: s._id.semana,
      ano: s._id.ano,
      count: s.count,
    }));

    res.json({ success: true, data: result });
  } catch (error) {
    console.error('Error fetching semanas disponibles:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener las semanas disponibles',
    });
  }
};
