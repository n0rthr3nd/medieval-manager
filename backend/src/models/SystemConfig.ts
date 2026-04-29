import mongoose, { Document, Schema } from 'mongoose';

export interface ISystemConfig extends Document {
  manuallyClosedOrders: boolean;
  closureMessage: string;
  closedBy?: mongoose.Types.ObjectId;
  closedAt?: Date;
  chatbotGloballyEnabled: boolean;
  chatbotMessagesPerWeek: number;
  chatbotMessagesPerWeekAdmin: number;
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
  },
  {
    timestamps: true,
  }
);

// Singleton pattern: solo puede haber un documento de configuración
SystemConfigSchema.index({}, { unique: true });

export default mongoose.model<ISystemConfig>('SystemConfig', SystemConfigSchema);
