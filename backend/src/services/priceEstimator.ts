import { TamanoBocadillo } from '../models/Bocadillo';
import {
  TIERS_PRECIO,
  PRECIO_POR_INGREDIENTE_EXTRA,
  UMBRAL_INGREDIENTES_INCLUIDOS,
  TIER_POR_DEFECTO,
  PrecioTier,
} from '../config/precios';

export interface EstimarPrecioInput {
  tamano: TamanoBocadillo;
  ingredientes: string[];
}

const tierPorIngrediente: Map<string, PrecioTier> = (() => {
  const map = new Map<string, PrecioTier>();
  for (const [tier, cfg] of Object.entries(TIERS_PRECIO) as [PrecioTier, typeof TIERS_PRECIO[PrecioTier]][]) {
    for (const ing of cfg.ingredientes) {
      map.set(ing.toLowerCase().trim(), tier);
    }
  }
  return map;
})();

function tierDeIngrediente(nombre: string): PrecioTier {
  return tierPorIngrediente.get(nombre.toLowerCase().trim()) ?? TIER_POR_DEFECTO;
}

function tierMaximo(ingredientes: string[]): PrecioTier {
  let mejor: PrecioTier = TIER_POR_DEFECTO;
  let mejorPrioridad = TIERS_PRECIO[mejor].prioridad;

  for (const ing of ingredientes) {
    const tier = tierDeIngrediente(ing);
    const prioridad = TIERS_PRECIO[tier].prioridad;
    if (prioridad > mejorPrioridad) {
      mejor = tier;
      mejorPrioridad = prioridad;
    }
  }
  return mejor;
}

export function estimarPrecio({ tamano, ingredientes }: EstimarPrecioInput): number {
  const validos = ingredientes
    .map((i) => (i ?? '').trim())
    .filter((i) => i.length > 0);

  if (validos.length === 0) {
    return TIERS_PRECIO[TIER_POR_DEFECTO].base[tamano];
  }

  const tier = tierMaximo(validos);
  const base = TIERS_PRECIO[tier].base[tamano];

  const extras = Math.max(0, validos.length - UMBRAL_INGREDIENTES_INCLUIDOS);
  const ajuste = extras * PRECIO_POR_INGREDIENTE_EXTRA;

  return Math.round((base + ajuste) * 10) / 10;
}
