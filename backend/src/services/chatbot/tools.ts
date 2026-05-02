/**
 * Tools del chatbot.
 *
 * REGLA DE ORO DE SEGURIDAD: el `userId` viene de `ctx.userId` (que se deriva
 * del JWT en el controller). NUNCA leemos userId de los args del modelo.
 * Aunque la LLM intente pasar `userId: 'otro_user'`, lo descartamos.
 *
 * Tools de escritura validan ownership cargando el documento y comparando
 * `bocadillo.userId === ctx.userId` antes de mutar.
 */

import { z } from 'zod';
import mongoose from 'mongoose';
import Bocadillo, { TamanoBocadillo, TipoPan } from '../../models/Bocadillo';
import Ingrediente from '../../models/Ingrediente';
import SystemConfig from '../../models/SystemConfig';
import Settings from '../../models/Settings';
import { BOCATAS_PREDEFINIDOS } from '../../config/menu';
import { getTargetWeek, isWithinOrderWindow, getNextFriday } from '../../utils/dateUtils';
import { createBocadilloSchema } from '../../validators/bocadilloValidator';
import {
  ToolDefinition,
  ToolExecutionContext,
  ToolHandler,
  ToolResult,
} from '../../types/chatbot';

const PerfilEnum = z.enum(['ligero', 'contundente', 'normal']);

const ListarIngredientesArgs = z.object({
  filtro_perfil: PerfilEnum.optional(),
});

const ObtenerMisPedidosRecientesArgs = z.object({
  limite: z.number().int().min(1).max(20).optional(),
});

const ConsultarVentanaPedidosArgs = z.object({});

const ObtenerMisIngredientesFavoritosArgs = z.object({});

const ObtenerBocatasPredefinidosArgs = z.object({});

const CrearMiPedidoArgs = z.object({
  tamano: z.nativeEnum(TamanoBocadillo),
  tipoPan: z.nativeEnum(TipoPan),
  ingredientes: z.array(z.string()).min(1).max(10),
  bocataPredefinido: z.string().optional(),
});

const EditarMiPedidoArgs = z.object({
  bocadilloId: z.string().min(1),
  tamano: z.nativeEnum(TamanoBocadillo),
  tipoPan: z.nativeEnum(TipoPan),
  ingredientes: z.array(z.string()).min(1).max(10),
});

const EliminarMiPedidoArgs = z.object({
  bocadilloId: z.string().min(1),
});

async function checkServiceOpen(): Promise<{ open: true } | { open: false; reason: string }> {
  const config = await SystemConfig.findOne();
  if (config?.manuallyClosedOrders) {
    return { open: false, reason: config.closureMessage || 'El servicio está cerrado.' };
  }
  const settings = await Settings.findOne();
  if (settings?.ordersClosed) {
    return { open: false, reason: settings.closedMessage || 'Los pedidos están cerrados.' };
  }
  if (!isWithinOrderWindow()) {
    return {
      open: false,
      reason: `Fuera de la ventana de pedidos. La ventana se abre el ${getNextFriday().toISOString()}.`,
    };
  }
  return { open: true };
}

async function validateIngredientesExisten(nombres: string[]): Promise<{ ok: true } | { ok: false; faltan: string[] }> {
  const existentes = await Ingrediente.find({
    nombre: { $in: nombres },
    disponible: true,
  }).select('nombre').lean();
  const setExistentes = new Set(existentes.map(i => i.nombre));
  const faltan = nombres.filter(n => !setExistentes.has(n));
  if (faltan.length > 0) return { ok: false, faltan };
  return { ok: true };
}

const listarIngredientes: ToolHandler = async (_ctx, args) => {
  const parsed = ListarIngredientesArgs.safeParse(args);
  if (!parsed.success) return { ok: false, error: 'Argumentos inválidos' };

  const query: Record<string, unknown> = { disponible: true };
  if (parsed.data.filtro_perfil) query.perfil = parsed.data.filtro_perfil;

  const ingredientes = await Ingrediente.find(query)
    .select('nombre perfil categoria')
    .sort({ orden: 1 })
    .lean();

  return {
    ok: true,
    data: {
      total: ingredientes.length,
      ingredientes: ingredientes.map(i => ({
        nombre: i.nombre,
        perfil: i.perfil,
        categoria: i.categoria,
      })),
    },
  };
};

const obtenerMisPedidosRecientes: ToolHandler = async (ctx, args) => {
  const parsed = ObtenerMisPedidosRecientesArgs.safeParse(args);
  if (!parsed.success) return { ok: false, error: 'Argumentos inválidos' };

  const limite = parsed.data.limite ?? 5;
  const pedidos = await Bocadillo.find({ userId: ctx.userId })
    .sort({ fechaCreacion: -1 })
    .limit(limite)
    .lean();

  return {
    ok: true,
    data: pedidos.map(p => ({
      id: String(p._id),
      tamano: p.tamano,
      tipoPan: p.tipoPan,
      ingredientes: p.ingredientes,
      semana: p.semana,
      ano: p.ano,
      fecha: p.fechaCreacion,
    })),
  };
};

const obtenerMisIngredientesFavoritos: ToolHandler = async (ctx, args) => {
  ObtenerMisIngredientesFavoritosArgs.parse(args);

  const ultimos = await Bocadillo.find({ userId: ctx.userId })
    .sort({ fechaCreacion: -1 })
    .limit(50)
    .select('ingredientes')
    .lean();

  const conteo = new Map<string, number>();
  for (const b of ultimos) {
    for (const ing of b.ingredientes) {
      conteo.set(ing, (conteo.get(ing) || 0) + 1);
    }
  }

  const ranking = Array.from(conteo.entries())
    .map(([ingrediente, frecuencia]) => ({ ingrediente, frecuencia }))
    .sort((a, b) => b.frecuencia - a.frecuencia)
    .slice(0, 10);

  return {
    ok: true,
    data: {
      basadoEnUltimosPedidos: ultimos.length,
      favoritos: ranking,
    },
  };
};

const obtenerBocatasPredefinidos: ToolHandler = async (_ctx, args) => {
  ObtenerBocatasPredefinidosArgs.parse(args);
  return {
    ok: true,
    data: BOCATAS_PREDEFINIDOS.map(b => ({
      nombre: b.nombre,
      tamano: b.tamano,
      tipoPan: b.tipoPan,
      ingredientes: b.ingredientes,
    })),
  };
};

const consultarVentanaPedidos: ToolHandler = async (_ctx, args) => {
  ConsultarVentanaPedidosArgs.parse(args);
  const status = await checkServiceOpen();
  return {
    ok: true,
    data: status.open
      ? { abierto: true, mensaje: 'La ventana de pedidos está abierta.' }
      : { abierto: false, mensaje: status.reason },
  };
};

const crearMiPedido: ToolHandler = async (ctx, args) => {
  const parsed = CrearMiPedidoArgs.safeParse(args);
  if (!parsed.success) {
    return { ok: false, error: `Argumentos inválidos: ${parsed.error.message}` };
  }

  const apertura = await checkServiceOpen();
  if (!apertura.open) {
    return { ok: false, error: apertura.reason };
  }

  // Reusar las reglas de validación del endpoint normal.
  const valid = createBocadilloSchema.safeParse({
    nombre: ctx.nombre,
    tamano: parsed.data.tamano,
    tipoPan: parsed.data.tipoPan,
    ingredientes: parsed.data.ingredientes,
    bocataPredefinido: parsed.data.bocataPredefinido,
  });
  if (!valid.success) {
    return { ok: false, error: valid.error.errors.map(e => e.message).join(', ') };
  }

  const ingValid = await validateIngredientesExisten(parsed.data.ingredientes);
  if (!ingValid.ok) {
    return { ok: false, error: `Ingredientes no válidos: ${ingValid.faltan.join(', ')}` };
  }

  const { week, year } = getTargetWeek(new Date());

  const bocadillo = new Bocadillo({
    nombre: ctx.nombre,
    userId: ctx.userId,
    tamano: parsed.data.tamano,
    tipoPan: parsed.data.tipoPan,
    ingredientes: parsed.data.ingredientes,
    bocataPredefinido: parsed.data.bocataPredefinido,
    semana: week,
    ano: year,
  });
  await bocadillo.save();

  return {
    ok: true,
    data: {
      id: String(bocadillo._id),
      mensaje: `Pedido creado correctamente para la semana ${week} de ${year}.`,
      semana: week,
      ano: year,
    },
    propuestaPedido: {
      tamano: parsed.data.tamano,
      tipoPan: parsed.data.tipoPan,
      ingredientes: parsed.data.ingredientes,
    },
    bocadilloAfectado: { id: String(bocadillo._id), accion: 'creado' },
  };
};

const editarMiPedido: ToolHandler = async (ctx, args) => {
  const parsed = EditarMiPedidoArgs.safeParse(args);
  if (!parsed.success) return { ok: false, error: 'Argumentos inválidos' };

  if (!mongoose.isValidObjectId(parsed.data.bocadilloId)) {
    return { ok: false, error: 'bocadilloId inválido' };
  }

  const apertura = await checkServiceOpen();
  if (!apertura.open) return { ok: false, error: apertura.reason };

  const bocadillo = await Bocadillo.findById(parsed.data.bocadilloId);
  if (!bocadillo) return { ok: false, error: 'Bocadillo no encontrado' };

  // OWNERSHIP CHECK: el chatbot solo permite operar sobre pedidos del usuario
  // autenticado. Admins también deben pasar por aquí (no se exponen tools de
  // moderación al chatbot).
  if (bocadillo.userId?.toString() !== ctx.userId) {
    return { ok: false, error: 'No tienes permiso para editar este pedido' };
  }

  // Solo semana objetivo (la del próximo viernes).
  const { week, year } = getTargetWeek(new Date());
  if (bocadillo.semana !== week || bocadillo.ano !== year) {
    return { ok: false, error: 'Solo se pueden editar pedidos de la semana objetivo (próximo viernes)' };
  }

  const valid = createBocadilloSchema.safeParse({
    nombre: ctx.nombre,
    tamano: parsed.data.tamano,
    tipoPan: parsed.data.tipoPan,
    ingredientes: parsed.data.ingredientes,
  });
  if (!valid.success) {
    return { ok: false, error: valid.error.errors.map(e => e.message).join(', ') };
  }

  const ingValid = await validateIngredientesExisten(parsed.data.ingredientes);
  if (!ingValid.ok) {
    return { ok: false, error: `Ingredientes no válidos: ${ingValid.faltan.join(', ')}` };
  }

  bocadillo.tamano = parsed.data.tamano;
  bocadillo.tipoPan = parsed.data.tipoPan;
  bocadillo.ingredientes = parsed.data.ingredientes;
  await bocadillo.save();

  return {
    ok: true,
    data: { id: String(bocadillo._id), mensaje: 'Pedido actualizado.' },
    propuestaPedido: {
      tamano: parsed.data.tamano,
      tipoPan: parsed.data.tipoPan,
      ingredientes: parsed.data.ingredientes,
    },
    bocadilloAfectado: { id: String(bocadillo._id), accion: 'editado' },
  };
};

const eliminarMiPedido: ToolHandler = async (ctx, args) => {
  const parsed = EliminarMiPedidoArgs.safeParse(args);
  if (!parsed.success) return { ok: false, error: 'Argumentos inválidos' };

  if (!mongoose.isValidObjectId(parsed.data.bocadilloId)) {
    return { ok: false, error: 'bocadilloId inválido' };
  }

  const apertura = await checkServiceOpen();
  if (!apertura.open) return { ok: false, error: apertura.reason };

  const bocadillo = await Bocadillo.findById(parsed.data.bocadilloId);
  if (!bocadillo) return { ok: false, error: 'Bocadillo no encontrado' };

  if (bocadillo.userId?.toString() !== ctx.userId) {
    return { ok: false, error: 'No tienes permiso para eliminar este pedido' };
  }

  const { week, year } = getTargetWeek(new Date());
  if (bocadillo.semana !== week || bocadillo.ano !== year) {
    return { ok: false, error: 'Solo se pueden eliminar pedidos de la semana objetivo (próximo viernes)' };
  }

  await Bocadillo.deleteOne({ _id: bocadillo._id });

  return {
    ok: true,
    data: { mensaje: 'Pedido eliminado.' },
    bocadilloAfectado: { id: String(bocadillo._id), accion: 'eliminado' },
  };
};

export const TOOL_HANDLERS: Record<string, ToolHandler> = {
  listar_ingredientes: listarIngredientes,
  obtener_mis_pedidos_recientes: obtenerMisPedidosRecientes,
  obtener_mis_ingredientes_favoritos: obtenerMisIngredientesFavoritos,
  obtener_bocatas_predefinidos: obtenerBocatasPredefinidos,
  consultar_ventana_pedidos: consultarVentanaPedidos,
  crear_mi_pedido: crearMiPedido,
  editar_mi_pedido: editarMiPedido,
  eliminar_mi_pedido: eliminarMiPedido,
};

export const TOOL_DEFINITIONS: ToolDefinition[] = [
  {
    type: 'function',
    function: {
      name: 'listar_ingredientes',
      description: 'Lista los ingredientes disponibles para hacer un bocadillo. Úsalo cuando el usuario pregunte qué hay disponible o cuando necesites confirmar que un ingrediente existe.',
      parameters: {
        type: 'object',
        properties: {
          filtro_perfil: {
            type: 'string',
            enum: ['ligero', 'contundente', 'normal'],
            description: 'Opcional. Filtra por perfil del ingrediente.',
          },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'obtener_mis_pedidos_recientes',
      description: 'Devuelve los últimos pedidos del usuario autenticado (pueden ser de semanas actuales o pasadas). Útil para "lo de siempre" o para sugerir variaciones. Los pedidos incluyen el número de semana y año al que pertenecen.',
      parameters: {
        type: 'object',
        properties: {
          limite: {
            type: 'integer',
            minimum: 1,
            maximum: 20,
            description: 'Cuántos pedidos devolver (por defecto 5).',
          },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'obtener_mis_ingredientes_favoritos',
      description: 'Devuelve los ingredientes que el usuario ha pedido más frecuentemente, basado en su histórico.',
      parameters: { type: 'object', properties: {} },
    },
  },
  {
    type: 'function',
    function: {
      name: 'obtener_bocatas_predefinidos',
      description: 'Lista los bocadillos predefinidos del menú (Alquimistas, Blanco y Negro, etc).',
      parameters: { type: 'object', properties: {} },
    },
  },
  {
    type: 'function',
    function: {
      name: 'consultar_ventana_pedidos',
      description: 'Indica si la ventana de pedidos está abierta ahora mismo. Llámala antes de proponer crear, editar o eliminar un pedido.',
      parameters: { type: 'object', properties: {} },
    },
  },
  {
    type: 'function',
    function: {
      name: 'crear_mi_pedido',
      description: 'Crea un pedido de bocadillo para el usuario autenticado. El sistema asigna automáticamente la semana correcta (la del próximo viernes). SIEMPRE se crea para el usuario que está hablando contigo, no para otros usuarios. Llama antes a consultar_ventana_pedidos para confirmar que se puede.',
      parameters: {
        type: 'object',
        properties: {
          tamano: { type: 'string', enum: ['normal', 'grande'] },
          tipoPan: { type: 'string', enum: ['normal', 'integral', 'semillas'] },
          ingredientes: {
            type: 'array',
            items: { type: 'string' },
            minItems: 1,
            maxItems: 10,
            description: 'Lista de ingredientes EXACTAMENTE como aparecen en listar_ingredientes.',
          },
          bocataPredefinido: {
            type: 'string',
            description: 'Opcional. Nombre del bocata predefinido si se está clonando uno.',
          },
        },
        required: ['tamano', 'tipoPan', 'ingredientes'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'editar_mi_pedido',
      description: 'Edita un pedido EXISTENTE del usuario autenticado. Solo funciona con pedidos propios y de la semana actual.',
      parameters: {
        type: 'object',
        properties: {
          bocadilloId: { type: 'string', description: 'ID del bocadillo a editar (debe ser del usuario actual).' },
          tamano: { type: 'string', enum: ['normal', 'grande'] },
          tipoPan: { type: 'string', enum: ['normal', 'integral', 'semillas'] },
          ingredientes: {
            type: 'array',
            items: { type: 'string' },
            minItems: 1,
            maxItems: 10,
          },
        },
        required: ['bocadilloId', 'tamano', 'tipoPan', 'ingredientes'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'eliminar_mi_pedido',
      description: 'Elimina un pedido del usuario autenticado. Solo pedidos propios y de la semana actual. Confirma con el usuario antes de llamar.',
      parameters: {
        type: 'object',
        properties: {
          bocadilloId: { type: 'string' },
        },
        required: ['bocadilloId'],
      },
    },
  },
];

/**
 * Ejecuta un tool. Devuelve un objeto que se serializa y se envía al LLM como
 * mensaje `role: 'tool'`. También se exponen `propuestaPedido` y
 * `bocadilloAfectado` al stream para que la UI pueda reaccionar.
 */
export async function executeTool(
  ctx: ToolExecutionContext,
  name: string,
  argsJson: string
): Promise<ToolResult> {
  const handler = TOOL_HANDLERS[name];
  if (!handler) {
    return { ok: false, error: `Tool desconocido: ${name}` };
  }

  let args: Record<string, unknown> = {};
  if (argsJson && argsJson.trim()) {
    try {
      args = JSON.parse(argsJson);
    } catch {
      return { ok: false, error: 'Argumentos no son JSON válido' };
    }
  }

  // Defensa: aunque la LLM intente pasar campos sensibles, los borramos.
  delete (args as Record<string, unknown>).userId;
  delete (args as Record<string, unknown>).user_id;
  delete (args as Record<string, unknown>).nombre;

  try {
    return await handler(ctx, args);
  } catch (err) {
    console.error(`[chatbot] error en tool ${name}:`, err);
    return {
      ok: false,
      error: err instanceof Error ? err.message : 'Error desconocido en tool',
    };
  }
}
