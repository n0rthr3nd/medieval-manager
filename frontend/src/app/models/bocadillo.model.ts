export enum TamanoBocadillo {
  NORMAL = 'normal',
  GRANDE = 'grande',
}

export enum TipoPan {
  NORMAL = 'normal',
  INTEGRAL = 'integral',
  SEMILLAS = 'semillas',
}

export interface Bocadillo {
  _id?: string;
  nombre: string;
  tamano: TamanoBocadillo;
  tipoPan: TipoPan;
  ingredientes: string[];
  bocataPredefinido?: string;
  precio?: number;
  pagado: boolean;
  semana?: number;
  ano?: number;
  fechaCreacion?: Date;
}

export interface BocataPredefinido {
  nombre: string;
  ingredientes: string[];
  tamano: TamanoBocadillo;
  tipoPan: TipoPan;
}

export interface OrderWindowStatus {
  isOpen: boolean;
  currentTime: string;
  deadline: string;
  nextOpening: string | null;
  message: string;
  manuallyClosed?: boolean;
}

export interface SemanaDisponible {
  semana: number;
  ano: number;
  count: number;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  semana?: number;
  ano?: number;
}
