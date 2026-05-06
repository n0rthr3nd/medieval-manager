import mongoose, { Document, Schema } from 'mongoose';

export interface ISystemConfig extends Document {
  manuallyClosedOrders: boolean;
  closureMessage: string;
  closedBy?: mongoose.Types.ObjectId;
  closedAt?: Date;
  chatbotGloballyEnabled: boolean;
  chatbotMessagesPerWeek: number;
  chatbotMessagesPerWeekAdmin: number;
  /** Límite semanal de tokens para usuarios normales (default 4000). */
  chatbotTokensPerWeek: number;
  /** Límite semanal de tokens para administradores (default 50000). */
  chatbotTokensPerWeekAdmin: number;
  updatedAt: Date;
}

const SystemConfigSchema: Schema = new Schema(
  {
    manuallyClosedOrders: {
      type: Boolean,
      default: false,
    },
    closureMessage: {
      type: String,
      default: 'El servicio de bocadillos está cerrado esta semana. Vuelve a probar la próxima semana.',
    },
    closedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: false,
    },
    closedAt: {
      type: Date,
      required: false,
    },
    chatbotGloballyEnabled: {
      type: Boolean,
      default: true,
    },
    chatbotMessagesPerWeek: {
      type: Number,
      default: 5,
      min: 0,
    },
    chatbotMessagesPerWeekAdmin: {
      type: Number,
      default: 100,
      min: 0,
    },
    chatbotTokensPerWeek: {
      type: Number,
      default: 4000,
      min: 0,
    },
    chatbotTokensPerWeekAdmin: {
      type: Number,
      default: 50000,
      min: 0,
    },
  },
  {
    timestamps: true,
  }
);

// Singleton pattern: solo puede haber un documento de configuración
SystemConfigSchema.index({}, { unique: true });

export default mongoose.model<ISystemConfig>('SystemConfig', SystemConfigSchema);
