import { TamanoBocadillo } from '../models/Bocadillo';

export type PrecioTier = 'premium' | 'especial' | 'estandar_alto' | 'estandar';

interface TierConfig {
  prioridad: number;
  base: Record<TamanoBocadillo, number>;
  ingredientes: string[];
}

export const TIERS_PRECIO: Record<PrecioTier, TierConfig> = {
  premium: {
    prioridad: 4,
    base: { [TamanoBocadillo.NORMAL]: 5.6, [TamanoBocadillo.GRANDE]: 7.8 },
    ingredientes: ['Jamón Iberico'],
  },
  especial: {
    prioridad: 3,
    base: { [TamanoBocadillo.NORMAL]: 4.6, [TamanoBocadillo.GRANDE]: 6.9 },
    ingredientes: ['Mojama'],
  },
  estandar_alto: {
    prioridad: 2,
    base: { [TamanoBocadillo.NORMAL]: 4.2, [TamanoBocadillo.GRANDE]: 6.1 },
    ingredientes: [
      'Pollo Rebozado Picante',
      'Pollo Miel',
      'Carillada',
      'Costillas Miel',
      'Costillas Barbacoa',
      'Chilindron',
      'Chilindron Picante',
      'Kebab',
      'Pavo',
    ],
  },
  estandar: {
    prioridad: 1,
    base: { [TamanoBocadillo.NORMAL]: 3.7, [TamanoBocadillo.GRANDE]: 5.6 },
    ingredientes: [
      'Bacon',
      'Sobrasada',
      'Sobrasada picante',
      'Huevo frito',
      'Huevo duro',
      'Tortilla francesa',
      'Tortilla ajos',
      'Tortilla patata',
      'Tortilla',
      'Morcilla',
      'Longaniza',
      'Chorizo',
      'Jamón',
      'Atún',
      'Anchoas',
      'Olivas',
      'Queso curado',
      'Queso semi',
      'Queso fresco',
      'Cebolla',
      'Lomo',
      'Tomate',
      'Tomate restregado',
      'Lechuga',
      'Patata',
      'Aceite',
      'Ensalada',
      'Mayonesa',
      'Mostaza',
    ],
  },
};

export const PRECIO_POR_INGREDIENTE_EXTRA = 0.2;
export const UMBRAL_INGREDIENTES_INCLUIDOS = 3;
export const TIER_POR_DEFECTO: PrecioTier = 'estandar';
