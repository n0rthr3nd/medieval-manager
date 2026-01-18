/**
 * Tipos para el Sistema de Recomendación Inteligente de Bocadillos
 * Integración con API externo LangChain + Ollama + RAG + MCP
 */

import { TamanoBocadillo, TipoPan } from '../models/Bocadillo';

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
  RECURRENTE = 'recurrente', // Basada en pedidos habituales
  VARIACION_SUAVE = 'variacion_suave', // Variación leve sobre lo habitual
  DESCUBRIMIENTO = 'descubrimiento', // Algo nuevo pero coherente
}

/**
 * Contexto del usuario para generar recomendaciones
 * Provisto por el sistema RAG
 */
export interface ContextoUsuario {
  userId: string;
  nombre: string;
  historicoCompleto: BocadilloHistorico[];
  ingredientesFrecuentes: IngredienteFrecuencia[];
  ingredientesRaros: string[];
  ingredientesNuncaUsados: string[];
  combinacionesRepetidas: CombinacionFrecuente[];
  panesPreferidos: TipoPan[];
  tamanosPreferidos: TamanoBocadillo[];
  contextoTemporal?: ContextoTemporal;
}

/**
 * Bocadillo del histórico del usuario
 */
export interface BocadilloHistorico {
  nombre: string;
  tamano: TamanoBocadillo;
  tipoPan: TipoPan;
  ingredientes: string[];
  fechaCreacion: Date;
  semana: number;
  ano: number;
}

/**
 * Frecuencia de ingredientes
 */
export interface IngredienteFrecuencia {
  ingrediente: string;
  frecuencia: number;
  ultimaVez: Date;
}

/**
 * Combinación frecuente de ingredientes
 */
export interface CombinacionFrecuente {
  ingredientes: string[];
  frecuencia: number;
  ultimaVez: Date;
}

/**
 * Contexto temporal opcional
 */
export interface ContextoTemporal {
  hora?: number;
  dia?: string;
  esFinDeSemana?: boolean;
}

/**
 * Catálogo disponible del sistema
 */
export interface CatalogoDisponible {
  ingredientes: string[];
  ingredientesLigeros?: string[];
  ingredientesContundentes?: string[];
  tiposPan: TipoPan[];
  tamanos: TamanoBocadillo[];
}

/**
 * Request al API externo de IA
 */
export interface AIRecommendationRequest {
  userId: string;
  intencion: IntencionUsuario;
  mensajeUsuario?: string;
  contextoUsuario: ContextoUsuario;
  catalogoDisponible: CatalogoDisponible;
  configuracion?: ConfiguracionRecomendacion;
}

/**
 * Configuración de recomendación
 */
export interface ConfiguracionRecomendacion {
  maxRecomendaciones?: number; // Por defecto 1
  incluirAlternativa?: boolean; // Por defecto true
  nivelDescubrimiento?: 'bajo' | 'medio' | 'alto'; // Por defecto 'medio'
}

/**
 * Recomendación estructurada generada por la IA
 */
export interface RecomendacionIA {
  respuestaTexto: string; // Respuesta conversacional al usuario
  propuestaPedido: PropuestaPedido;
  alternativa?: PropuestaPedido; // Opcional
  tipoRecomendacion: TipoRecomendacion;
  razonamiento: string; // Por qué se hizo esta recomendación
  confianza: number; // 0-1, qué tan segura está la IA
  metadatos?: {
    ingredientesNuevos?: string[];
    basadoEnPedido?: string; // Nombre del pedido en el que se basó
    similitudConHistorico?: number;
  };
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
 * Response del API externo de IA
 */
export interface AIRecommendationResponse {
  exito: boolean;
  recomendacion?: RecomendacionIA;
  error?: string;
  timestamp: Date;
  latenciaMs?: number;
}

/**
 * Mensaje en el chat
 */
export interface MensajeChat {
  id: string;
  userId: string;
  rol: 'usuario' | 'asistente';
  contenido: string;
  timestamp: Date;
  recomendacion?: RecomendacionIA; // Solo si es mensaje del asistente
  intencionDetectada?: IntencionUsuario;
}

/**
 * Sesión de conversación
 */
export interface SesionConversacion {
  id: string;
  userId: string;
  mensajes: MensajeChat[];
  fechaInicio: Date;
  fechaUltimoMensaje: Date;
  activa: boolean;
}

/**
 * Estadísticas de uso del sistema de recomendación
 */
export interface EstadisticasRecomendacion {
  totalRecomendaciones: number;
  recomendacionesAceptadas: number;
  recomendacionesRechazadas: number;
  tasaAceptacion: number;
  tiempoPromedioRespuesta: number;
  intencionMasFrecuente: IntencionUsuario;
  tipoRecomendacionMasExitoso: TipoRecomendacion;
}
