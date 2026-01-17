import { TamanoBocadillo, TipoPan } from './bocadillo.model';

/**
 * Tipos de intención del usuario
 */
export enum IntencionUsuario {
  SORPRENDEME = 'sorprendeme',
  LIGERO = 'ligero',
  CONTUNDENTE = 'contundente',
  LO_DE_SIEMPRE = 'lo_de_siempre',
  PROBAR_DISTINTO = 'probar_distinto',
  MUCHA_HAMBRE = 'mucha_hambre',
  PERSONALIZADO = 'personalizado',
}

/**
 * Tipos de recomendación generada
 */
export enum TipoRecomendacion {
  RECURRENTE = 'recurrente',
  VARIACION_SUAVE = 'variacion_suave',
  DESCUBRIMIENTO = 'descubrimiento',
}

/**
 * Propuesta de pedido
 */
export interface PropuestaPedido {
  nombre: string;
  tamano: TamanoBocadillo;
  tipoPan: TipoPan;
  ingredientes: string[];
  precioEstimado?: number;
}

/**
 * Metadatos de la recomendación
 */
export interface MetadatosRecomendacion {
  ingredientesNuevos?: string[];
  basadoEnPedido?: string;
  similitudConHistorico?: number;
}

/**
 * Recomendación de la IA
 */
export interface RecomendacionIA {
  respuestaTexto: string;
  propuestaPedido: PropuestaPedido;
  alternativa?: PropuestaPedido;
  tipoRecomendacion: TipoRecomendacion;
  razonamiento: string;
  confianza: number;
  metadatos?: MetadatosRecomendacion;
}

/**
 * Response del API de recomendaciones
 */
export interface AIRecommendationResponse {
  exito: boolean;
  recomendacion?: RecomendacionIA;
  error?: string;
  timestamp: Date;
  latenciaMs?: number;
}

/**
 * Mensaje del chat
 */
export interface MensajeChat {
  id: string;
  rol: 'usuario' | 'asistente';
  contenido: string;
  timestamp: Date;
  recomendacion?: RecomendacionIA;
  intencionDetectada?: IntencionUsuario;
}

/**
 * Conversación activa
 */
export interface ConversacionChat {
  _id: string;
  userId: string;
  mensajes: MensajeChat[];
  fechaInicio: Date;
  fechaUltimoMensaje: Date;
  activa: boolean;
  semana: number;
  ano: number;
}

/**
 * Request para solicitar recomendación
 */
export interface SolicitarRecomendacionRequest {
  mensajeUsuario: string;
}

/**
 * Request para aceptar recomendación
 */
export interface AceptarRecomendacionRequest {
  recomendacionId: string;
  propuestaPedido: PropuestaPedido;
}

/**
 * Request para enviar feedback
 */
export interface FeedbackRecomendacionRequest {
  recomendacionId: string;
  aceptada: boolean;
  razonRechazo?: string;
}

/**
 * Respuesta genérica del API
 */
export interface AIApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}
