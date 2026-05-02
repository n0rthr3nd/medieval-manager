import { Request, Response } from 'express';
import BocadilloAlquimista from '../models/BocadilloAlquimista';
import { getTargetWeek } from '../utils/dateUtils';
import { z, ZodError } from 'zod';
import { TamanoBocadillo, TipoPan } from '../models/Bocadillo';

const alquimistaSchema = z.object({
  tamano: z.nativeEnum(TamanoBocadillo),
  tipoPan: z.nativeEnum(TipoPan),
  ingredientes: z.array(z.string()).min(1, 'Debe seleccionar al menos un ingrediente'),
});

// Obtener el bocadillo Alquimista de la semana actual
export const getAlquimistaActual = async (req: Request, res: Response) => {
  try {
    const { week, year } = getTargetWeek(new Date());

    const alquimista = await BocadilloAlquimista.findOne({
      semana: week,
      ano: year,
    });

    res.json({
      success: true,
      data: alquimista,
      semana: week,
      ano: year,
    });
  } catch (error) {
    console.error('Error fetching bocadillo alquimista:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener el bocadillo alquimista',
    });
  }
};

// Crear o actualizar el bocadillo Alquimista (solo admin)
export const upsertAlquimista = async (req: Request, res: Response) => {
  try {
    const validatedData = alquimistaSchema.parse(req.body);
    const { week, year } = getTargetWeek(new Date());

    // Buscar si ya existe un Alquimista para esta semana
    let alquimista = await BocadilloAlquimista.findOne({
      semana: week,
      ano: year,
    });

    if (alquimista) {
      // Actualizar existente
      alquimista.tamano = validatedData.tamano;
      alquimista.tipoPan = validatedData.tipoPan;
      alquimista.ingredientes = validatedData.ingredientes;
      await alquimista.save();
    } else {
      // Crear nuevo
      alquimista = new BocadilloAlquimista({
        ...validatedData,
        semana: week,
        ano: year,
      });
      await alquimista.save();
    }

    res.json({
      success: true,
      data: alquimista,
      message: alquimista ? 'Bocadillo Alquimista actualizado' : 'Bocadillo Alquimista creado',
    });
  } catch (error) {
    if (error instanceof ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Validación fallida',
        details: error.errors,
      });
    }

    console.error('Error upserting bocadillo alquimista:', error);
    res.status(500).json({
      success: false,
      error: 'Error al guardar el bocadillo alquimista',
    });
  }
};

// Eliminar el bocadillo Alquimista de la semana (solo admin)
export const deleteAlquimista = async (req: Request, res: Response) => {
  try {
    const { week, year } = getTargetWeek(new Date());

    const result = await BocadilloAlquimista.deleteOne({
      semana: week,
      ano: year,
    });

    if (result.deletedCount === 0) {
      return res.status(404).json({
        success: false,
        error: 'No hay bocadillo Alquimista para esta semana',
      });
    }

    res.json({
      success: true,
      message: 'Bocadillo Alquimista eliminado',
    });
  } catch (error) {
    console.error('Error deleting bocadillo alquimista:', error);
    res.status(500).json({
      success: false,
      error: 'Error al eliminar el bocadillo alquimista',
    });
  }
};
