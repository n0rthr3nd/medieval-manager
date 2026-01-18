import mongoose, { Document, Schema } from 'mongoose';
import { IntencionUsuario, RecomendacionIA } from '../types/aiRecommendation';

/**
 * Interfaz para Mensaje individual del chat
 */
export interface IMensajeChat {
  id: string;
  rol: 'usuario' | 'asistente';
  contenido: string;
  timestamp: Date;
  recomendacion?: RecomendacionIA;
  intencionDetectada?: IntencionUsuario;
}

/**
 * Interfaz para documento de Conversación
 */
export interface IConversacionChat extends Document {
  userId: mongoose.Types.ObjectId;
  mensajes: IMensajeChat[];
  fechaInicio: Date;
  fechaUltimoMensaje: Date;
  activa: boolean;
  semana: number;
  ano: number;
}

/**
 * Schema para Mensaje
 */
const MensajeChatSchema = new Schema({
  id: {
    type: String,
    required: true,
  },
  rol: {
    type: String,
    enum: ['usuario', 'asistente'],
    required: true,
  },
  contenido: {
    type: String,
    required: true,
  },
  timestamp: {
    type: Date,
    default: Date.now,
  },
  recomendacion: {
    type: Schema.Types.Mixed,
    required: false,
  },
  intencionDetectada: {
    type: String,
    enum: Object.values(IntencionUsuario),
    required: false,
  },
}, { _id: false });

/**
 * Schema para Conversación
 */
const ConversacionChatSchema: Schema = new Schema({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  mensajes: {
    type: [MensajeChatSchema],
    default: [],
  },
  fechaInicio: {
    type: Date,
    default: Date.now,
  },
  fechaUltimoMensaje: {
    type: Date,
    default: Date.now,
  },
  activa: {
    type: Boolean,
    default: true,
  },
  semana: {
    type: Number,
    required: true,
  },
  ano: {
    type: Number,
    required: true,
  },
}, {
  timestamps: true,
});

// Índices para búsquedas eficientes
ConversacionChatSchema.index({ userId: 1, activa: 1 });
ConversacionChatSchema.index({ semana: 1, ano: 1 });
ConversacionChatSchema.index({ fechaUltimoMensaje: -1 });

export default mongoose.model<IConversacionChat>('ConversacionChat', ConversacionChatSchema);
