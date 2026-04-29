/**
 * Tipos del chatbot conversacional.
 *
 * El bot habla con el usuario vía SSE y puede invocar tools con seguridad por
 * propiedad: el userId siempre se inyecta desde el JWT en el handler, NUNCA
 * desde los argumentos del modelo.
 */

import { TamanoBocadillo, TipoPan } from '../models/Bocadillo';

export type ChatRole = 'system' | 'user' | 'assistant' | 'tool';

export interface ChatMessage {
  role: ChatRole;
  content: string | null;
  name?: string;
  tool_call_id?: string;
  tool_calls?: ToolCall[];
}

export interface ToolCall {
  id: string;
  type: 'function';
  function: {
    name: string;
    arguments: string;
  };
}

export interface ToolDefinition {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: {
      type: 'object';
      properties: Record<string, unknown>;
      required?: string[];
    };
  };
}

/**
 * Contexto inyectado en cada llamada a un tool handler.
 * El handler NUNCA debe leer userId de los args del modelo.
 */
export interface ToolExecutionContext {
  userId: string;
  username: string;
  nombre: string;
  isAdmin: boolean;
}

export type ToolHandler = (
  ctx: ToolExecutionContext,
  args: Record<string, unknown>
) => Promise<ToolResult>;

export interface ToolResult {
  ok: boolean;
  data?: unknown;
  error?: string;
  /** Si el tool produjo una propuesta estructurada de pedido, va aquí. */
  propuestaPedido?: PropuestaPedido;
  /** Si el tool creó/editó/borró un bocadillo, lo señalamos para la UI. */
  bocadilloAfectado?: { id: string; accion: 'creado' | 'editado' | 'eliminado' };
}

export interface PropuestaPedido {
  tamano: TamanoBocadillo;
  tipoPan: TipoPan;
  ingredientes: string[];
}

/**
 * Eventos que el backend envía al frontend por SSE.
 * Estructura: cada evento es una línea `event: <type>\ndata: <json>\n\n`.
 */
export type ChatStreamEvent =
  | { type: 'connected'; data: { conversationId: string; quotaRemaining: number } }
  | { type: 'text_delta'; data: { delta: string } }
  | { type: 'tool_call_pending'; data: { toolName: string; callId: string } }
  | { type: 'tool_call_done'; data: { toolName: string; callId: string; ok: boolean; summary?: string } }
  | { type: 'propuesta_pedido'; data: PropuestaPedido }
  | { type: 'bocadillo_afectado'; data: { id: string; accion: 'creado' | 'editado' | 'eliminado' } }
  | { type: 'done'; data: { quotaRemaining: number } }
  | { type: 'error'; data: { message: string; code?: string } };

export interface OpenAIStreamChunk {
  id?: string;
  choices?: Array<{
    index: number;
    delta?: {
      role?: ChatRole;
      content?: string | null;
      tool_calls?: Array<{
        index: number;
        id?: string;
        type?: 'function';
        function?: {
          name?: string;
          arguments?: string;
        };
      }>;
    };
    finish_reason?: 'stop' | 'tool_calls' | 'length' | null;
  }>;
}
