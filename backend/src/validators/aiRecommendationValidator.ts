import { z } from 'zod';
import { IntencionUsuario } from '../types/aiRecommendation';

/**
 * Schema para solicitar recomendación
 */
export const solicitarRecomendacionSchema = z.object({
  mensajeUsuario: z
    .string()
    .min(1, 'El mensaje no puede estar vacío')
    .max(500, 'El mensaje es demasiado largo'),
});

/**
 * Schema para aceptar recomendación
 */
export const aceptarRecomendacionSchema = z.object({
  recomendacionId: z.string(),
  propuestaPedido: z.object({
    nombre: z.string(),
    tamano: z.enum(['normal', 'grande']),
    tipoPan: z.enum(['normal', 'integral', 'semillas']),
    ingredientes: z.array(z.string()).min(1, 'Debe tener al menos un ingrediente'),
  }),
});

/**
 * Schema para feedback de recomendación
 */
export const feedbackRecomendacionSchema = z.object({
  recomendacionId: z.string(),
  aceptada: z.boolean(),
  razonRechazo: z.string().optional(),
});

/**
 * Tipos inferidos
 */
export type SolicitarRecomendacionInput = z.infer<typeof solicitarRecomendacionSchema>;
export type AceptarRecomendacionInput = z.infer<typeof aceptarRecomendacionSchema>;
export type FeedbackRecomendacionInput = z.infer<typeof feedbackRecomendacionSchema>;
