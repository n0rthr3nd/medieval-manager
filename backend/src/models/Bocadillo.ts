import mongoose, { Document, Schema } from 'mongoose';

export enum TamanoBocadillo {
  NORMAL = 'normal',
  GRANDE = 'grande',
}

export enum TipoPan {
  NORMAL = 'normal',
  INTEGRAL = 'integral',
  SEMILLAS = 'semillas',
}

export interface IBocadillo extends Document {
  nombre: string;
  userId?: mongoose.Types.ObjectId;
  tamano: TamanoBocadillo;
  tipoPan: TipoPan;
  ingredientes: string[];
  bocataPredefinido?: string;
  esAlquimista: boolean;
  precio?: number;
  precioEstimado?: number;
  pagado: boolean;
  semana: number; // Número de semana del año
  ano: number;
  fechaCreacion: Date;
}

const BocadilloSchema: Schema = new Schema({
  nombre: {
    type: String,
    required: true,
    uppercase: true,
    trim: true,
  },
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: false,
  },
  tamano: {
    type: String,
    enum: Object.values(TamanoBocadillo),
    required: true,
  },
  tipoPan: {
    type: String,
    enum: Object.values(TipoPan),
    required: true,
  },
  ingredientes: {
    type: [String],
    required: true,
    validate: {
      validator: function (v: string[]) {
        return v.length > 0;
      },
      message: 'Debe seleccionar al menos un ingrediente',
    },
  },
  bocataPredefinido: {
    type: String,
    required: false,
  },
  esAlquimista: {
    type: Boolean,
    default: false,
  },
  precio: {
    type: Number,
    required: false,
    min: 0,
  },
  precioEstimado: {
    type: Number,
    required: false,
    min: 0,
  },
  pagado: {
    type: Boolean,
    default: false,
  },
  semana: {
    type: Number,
    required: true,
  },
  ano: {
    type: Number,
    required: true,
  },
  fechaCreacion: {
    type: Date,
    default: Date.now,
  },
});

// Índice para búsquedas eficientes por semana y usuario
BocadilloSchema.index({ semana: 1, ano: 1 });
BocadilloSchema.index({ userId: 1 });

export default mongoose.model<IBocadillo>('Bocadillo', BocadilloSchema);
