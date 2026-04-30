/**
 * Tipos del chatbot SSE.
 */

export type TamanoBocadillo = 'normal' | 'grande';
export type TipoPan = 'normal' | 'integral' | 'semillas';

export interface PropuestaPedido {
  tamano: TamanoBocadillo;
  tipoPan: TipoPan;
  ingredientes: string[];
}

export interface BocadilloAfectado {
  id: string;
  accion: 'creado' | 'editado' | 'eliminado';
}

export type ChatStreamEvent =
  | { type: 'connected'; data: { conversationId: string; quotaRemaining: number } }
  | { type: 'text_delta'; data: { delta: string } }
  | { type: 'tool_call_pending'; data: { toolName: string; callId: string } }
  | { type: 'tool_call_done'; data: { toolName: string; callId: string; ok: boolean; summary?: string } }
  | { type: 'propuesta_pedido'; data: PropuestaPedido }
  | { type: 'bocadillo_afectado'; data: BocadilloAfectado }
  | { type: 'done'; data: { quotaRemaining: number } }
  | { type: 'error'; data: { message: string; code?: string } };

export interface ChatbotStatus {
  enabled: boolean;
  globallyEnabled: boolean;
  mode: 'disabled' | 'beta' | 'enabled';
  isBeta: boolean;
  weeklyLimit: number;
  used: number;
  remaining: number;
}

export interface ChatMensajeUI {
  id: string;
  rol: 'usuario' | 'asistente' | 'sistema';
  contenido: string;
  timestamp: Date;
  /** True mientras el asistente está generando texto. */
  streaming?: boolean;
  /** Tools que se están ejecutando o se ejecutaron en este turno. */
  toolCalls?: { toolName: string; ok?: boolean; summary?: string }[];
  /** Propuesta de pedido asociada al turno (si la hubo). */
  propuesta?: PropuestaPedido;
  /** Pedido afectado (creado/editado/eliminado). */
  bocadilloAfectado?: BocadilloAfectado;
}
