/**
 * Servicio de Recomendación Inteligente de Bocadillos
 * Integración con API externo LangChain + Ollama + RAG + MCP
 */

import mongoose from 'mongoose';
import Bocadillo, { TamanoBocadillo, TipoPan } from '../models/Bocadillo';
import Ingrediente from '../models/Ingrediente';
import ConversacionChat from '../models/ConversacionChat';
import {
  AIRecommendationRequest,
  AIRecommendationResponse,
  BocadilloHistorico,
  CatalogoDisponible,
  CombinacionFrecuente,
  ContextoUsuario,
  IngredienteFrecuencia,
  IntencionUsuario,
  RecomendacionIA,
  TipoRecomendacion,
  PropuestaPedido,
} from '../types/aiRecommendation';
import { getWeekNumber } from '../utils/dateUtils';

/**
 * Configuración del API externo de LangChain + Ollama + RAG + MCP
 * Configurado vía variables de entorno
 */
const AI_API_URL = process.env.AI_API_URL || 'http://localhost:8000';
const AI_API_TIMEOUT = parseInt(process.env.AI_API_TIMEOUT || '30000');
const AI_API_KEY = process.env.AI_API_KEY || '';
const AI_MODEL = process.env.AI_MODEL || 'qwen3:14b';
const AI_TEMPERATURE = parseFloat(process.env.AI_TEMPERATURE || '0.7');
const AI_MAX_TOKENS = parseInt(process.env.AI_MAX_TOKENS || '1024');
const AI_USE_KNOWLEDGE_BASE = process.env.AI_USE_KNOWLEDGE_BASE === 'true';
const AI_USE_MONGODB_TOOLS = process.env.AI_USE_MONGODB_TOOLS === 'false';

/**
 * Clase de servicio para recomendaciones AI
 */
export class AIRecommendationService {
  /**
   * Obtiene el histórico completo de bocadillos del usuario
   */
  private async obtenerHistoricoUsuario(
    userId: mongoose.Types.ObjectId
  ): Promise<BocadilloHistorico[]> {
    const bocadillos = await Bocadillo.find({ userId })
      .sort({ fechaCreacion: -1 })
      .limit(50) // Últimos 50 bocadillos
      .lean();

    return bocadillos.map((b) => ({
      nombre: b.nombre,
      tamano: b.tamano as TamanoBocadillo,
      tipoPan: b.tipoPan as TipoPan,
      ingredientes: b.ingredientes,
      fechaCreacion: b.fechaCreacion,
      semana: b.semana,
      ano: b.ano,
    }));
  }

  /**
   * Analiza ingredientes frecuentes del usuario
   */
  private analizarIngredientesFrecuentes(
    historico: BocadilloHistorico[]
  ): IngredienteFrecuencia[] {
    const conteo: Map<string, { count: number; lastDate: Date }> = new Map();

    historico.forEach((bocadillo) => {
      bocadillo.ingredientes.forEach((ingrediente) => {
        const current = conteo.get(ingrediente);
        if (current) {
          current.count++;
          if (bocadillo.fechaCreacion > current.lastDate) {
            current.lastDate = bocadillo.fechaCreacion;
          }
        } else {
          conteo.set(ingrediente, {
            count: 1,
            lastDate: bocadillo.fechaCreacion,
          });
        }
      });
    });

    return Array.from(conteo.entries())
      .map(([ingrediente, data]) => ({
        ingrediente,
        frecuencia: data.count,
        ultimaVez: data.lastDate,
      }))
      .sort((a, b) => b.frecuencia - a.frecuencia);
  }

  /**
   * Identifica ingredientes raros (usados 1-2 veces)
   */
  private identificarIngredientesRaros(
    ingredientesFrecuentes: IngredienteFrecuencia[]
  ): string[] {
    return ingredientesFrecuentes
      .filter((i) => i.frecuencia >= 1 && i.frecuencia <= 2)
      .map((i) => i.ingrediente);
  }

  /**
   * Identifica ingredientes nunca usados por el usuario
   */
  private async identificarIngredientesNuncaUsados(
    ingredientesFrecuentes: IngredienteFrecuencia[]
  ): Promise<string[]> {
    const ingredientesDisponibles = await Ingrediente.find({ disponible: true })
      .select('nombre')
      .lean();

    const ingredientesUsados = new Set(
      ingredientesFrecuentes.map((i) => i.ingrediente)
    );

    return ingredientesDisponibles
      .filter((i) => !ingredientesUsados.has(i.nombre))
      .map((i) => i.nombre);
  }

  /**
   * Detecta combinaciones frecuentes de ingredientes
   */
  private detectarCombinacionesFrecuentes(
    historico: BocadilloHistorico[]
  ): CombinacionFrecuente[] {
    const combinaciones: Map<string, { count: number; lastDate: Date }> =
      new Map();

    historico.forEach((bocadillo) => {
      const ingredientesOrdenados = [...bocadillo.ingredientes].sort();
      const key = ingredientesOrdenados.join('|');

      const current = combinaciones.get(key);
      if (current) {
        current.count++;
        if (bocadillo.fechaCreacion > current.lastDate) {
          current.lastDate = bocadillo.fechaCreacion;
        }
      } else {
        combinaciones.set(key, {
          count: 1,
          lastDate: bocadillo.fechaCreacion,
        });
      }
    });

    return Array.from(combinaciones.entries())
      .filter(([, data]) => data.count >= 2) // Solo combinaciones repetidas
      .map(([key, data]) => ({
        ingredientes: key.split('|'),
        frecuencia: data.count,
        ultimaVez: data.lastDate,
      }))
      .sort((a, b) => b.frecuencia - a.frecuencia);
  }

  /**
   * Analiza panes preferidos
   */
  private analizarPanesPreferidos(
    historico: BocadilloHistorico[]
  ): TipoPan[] {
    const conteo: Map<TipoPan, number> = new Map();

    historico.forEach((bocadillo) => {
      const count = conteo.get(bocadillo.tipoPan) || 0;
      conteo.set(bocadillo.tipoPan, count + 1);
    });

    return Array.from(conteo.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([pan]) => pan);
  }

  /**
   * Analiza tamaños preferidos
   */
  private analizarTamanosPreferidos(
    historico: BocadilloHistorico[]
  ): TamanoBocadillo[] {
    const conteo: Map<TamanoBocadillo, number> = new Map();

    historico.forEach((bocadillo) => {
      const count = conteo.get(bocadillo.tamano) || 0;
      conteo.set(bocadillo.tamano, count + 1);
    });

    return Array.from(conteo.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([tamano]) => tamano);
  }

  /**
   * Obtiene el catálogo disponible de ingredientes y panes
   */
  private async obtenerCatalogoDisponible(): Promise<CatalogoDisponible> {
    const ingredientes = await Ingrediente.find({ disponible: true })
      .select('nombre')
      .sort({ orden: 1 })
      .lean();

    return {
      ingredientes: ingredientes.map((i) => i.nombre),
      tiposPan: Object.values(TipoPan),
      tamanos: Object.values(TamanoBocadillo),
    };
  }

  /**
   * Construye el contexto completo del usuario
   */
  private async construirContextoUsuario(
    userId: mongoose.Types.ObjectId,
    nombre: string
  ): Promise<ContextoUsuario> {
    const historicoCompleto = await this.obtenerHistoricoUsuario(userId);
    const ingredientesFrecuentes =
      this.analizarIngredientesFrecuentes(historicoCompleto);
    const ingredientesRaros =
      this.identificarIngredientesRaros(ingredientesFrecuentes);
    const ingredientesNuncaUsados =
      await this.identificarIngredientesNuncaUsados(ingredientesFrecuentes);
    const combinacionesRepetidas =
      this.detectarCombinacionesFrecuentes(historicoCompleto);
    const panesPreferidos = this.analizarPanesPreferidos(historicoCompleto);
    const tamanosPreferidos =
      this.analizarTamanosPreferidos(historicoCompleto);

    const now = new Date();
    const contextoTemporal = {
      hora: now.getHours(),
      dia: now.toLocaleDateString('es-ES', { weekday: 'long' }),
      esFinDeSemana: now.getDay() === 0 || now.getDay() === 6,
    };

    return {
      userId: userId.toString(),
      nombre,
      historicoCompleto,
      ingredientesFrecuentes,
      ingredientesRaros,
      ingredientesNuncaUsados,
      combinacionesRepetidas,
      panesPreferidos,
      tamanosPreferidos,
      contextoTemporal,
    };
  }

  /**
   * Detecta la intención del usuario basándose en su mensaje
   */
  private detectarIntencion(mensajeUsuario: string): IntencionUsuario {
    const mensaje = mensajeUsuario.toLowerCase();

    if (mensaje.includes('sorprend') || mensaje.includes('recomienda')) {
      return IntencionUsuario.SORPRENDEME;
    }
    if (mensaje.includes('ligero') || mensaje.includes('poco')) {
      return IntencionUsuario.LIGERO;
    }
    if (
      mensaje.includes('contundente') ||
      mensaje.includes('grande') ||
      mensaje.includes('mucho')
    ) {
      return IntencionUsuario.CONTUNDENTE;
    }
    if (
      mensaje.includes('siempre') ||
      mensaje.includes('habitual') ||
      mensaje.includes('usual')
    ) {
      return IntencionUsuario.LO_DE_SIEMPRE;
    }
    if (
      mensaje.includes('distinto') ||
      mensaje.includes('nuevo') ||
      mensaje.includes('probar')
    ) {
      return IntencionUsuario.PROBAR_DISTINTO;
    }
    if (mensaje.includes('hambre')) {
      return IntencionUsuario.MUCHA_HAMBRE;
    }

    return IntencionUsuario.PERSONALIZADO;
  }

  /**
   * Construye el prompt del sistema con todo el contexto del usuario
   */
  private construirPromptSistema(
    contextoUsuario: ContextoUsuario,
    catalogoDisponible: CatalogoDisponible,
    intencion: IntencionUsuario
  ): string {
    const ingredientesFrecuentesTexto = contextoUsuario.ingredientesFrecuentes
      .slice(0, 10)
      .map((i) => `${i.ingrediente} (${i.frecuencia} veces)`)
      .join(', ');

    const combinacionesFrecuentesTexto = contextoUsuario.combinacionesRepetidas
      .slice(0, 5)
      .map((c) => `[${c.ingredientes.join(', ')}] (${c.frecuencia} veces)`)
      .join(', ');

    const historicoReciente = contextoUsuario.historicoCompleto
      .slice(0, 5)
      .map(
        (b) =>
          `- ${b.nombre}: ${b.ingredientes.join(', ')} (pan ${b.tipoPan}, tamaño ${b.tamano})`
      )
      .join('\n');

    return `Eres un asistente conversacional de recomendación inteligente dentro de una app de pedidos de bocadillos.

## Contexto Técnico Importante
Ya existe un API externo completamente operativo basado en LangChain, Ollama, RAG y MCP.
Este API se encarga de recuperar el catálogo válido de ingredientes y el histórico del usuario.

## Objetivo
Recomendar bocadillos de forma personalizada, rápida y fiable, al estilo de un recomendador tipo Spotify, sin inventar opciones y reduciendo al máximo la fricción del pedido.

## Reglas Estrictas (OBLIGATORIAS)
- ❌ Nunca inventes ingredientes, panes o combinaciones
- ❌ No propongas nada fuera del catálogo recibido
- ❌ No asumas restricciones alimentarias no explícitas
- ❌ No modifiques ni ignores el histórico del usuario
- ✅ Prioriza ingredientes y combinaciones frecuentes
- ✅ Puedes proponer variaciones leves sobre pedidos habituales
- ✅ Puedes sugerir descubrimiento solo si es coherente con el histórico

## Contexto del Usuario: ${contextoUsuario.nombre}

### Ingredientes Frecuentes
${ingredientesFrecuentesTexto || 'Usuario nuevo, sin histórico'}

### Combinaciones Repetidas
${combinacionesFrecuentesTexto || 'Ninguna combinación repetida aún'}

### Ingredientes Nunca Usados
${contextoUsuario.ingredientesNuncaUsados.slice(0, 20).join(', ') || 'Ninguno'}

### Panes Preferidos
${contextoUsuario.panesPreferidos.join(', ') || 'Sin preferencia aún'}

### Tamaños Preferidos
${contextoUsuario.tamanosPreferidos.join(', ') || 'Sin preferencia aún'}

### Últimos 5 Pedidos
${historicoReciente || 'Sin pedidos anteriores'}

## Catálogo Disponible

### Ingredientes Disponibles (SOLO usa estos)
${catalogoDisponible.ingredientes.join(', ')}

### Tipos de Pan Disponibles (SOLO usa estos)
${catalogoDisponible.tiposPan.join(', ')}

### Tamaños Disponibles (SOLO usa estos)
${catalogoDisponible.tamanos.join(', ')}

## Intención Detectada
${intencion}

## Formato de Respuesta (OBLIGATORIO)

Debes devolver ÚNICAMENTE un objeto JSON válido con esta estructura exacta:

{
  "respuestaTexto": "Texto breve y natural explicando por qué se recomienda ese bocadillo (máx. 2-3 frases)",
  "propuestaPedido": {
    "nombre": "Nombre descriptivo del bocadillo",
    "tamano": "normal" o "grande",
    "tipoPan": "normal", "integral" o "semillas",
    "ingredientes": ["Ingrediente1", "Ingrediente2", ...]
  },
  "alternativa": {
    "nombre": "Nombre de la alternativa (opcional)",
    "tamano": "normal" o "grande",
    "tipoPan": "normal", "integral" o "semillas",
    "ingredientes": ["Ingrediente1", "Ingrediente2", ...]
  },
  "tipoRecomendacion": "recurrente" | "variacion_suave" | "descubrimiento",
  "razonamiento": "Por qué se hizo esta recomendación",
  "confianza": 0.85,
  "metadatos": {
    "ingredientesNuevos": ["ingredientes que el usuario nunca ha usado"],
    "basadoEnPedido": "Nombre del pedido en el que se basó (si aplica)",
    "similitudConHistorico": 0.75
  }
}

## Comportamiento
- Conversacional, natural y cercano
- Seguro pero no invasivo
- Breve y directo (máx. 2–3 frases en respuestaTexto)
- Enfocado a que el usuario pueda aceptar con un solo toque

## Contexto Temporal
Hora: ${contextoUsuario.contextoTemporal?.hora}h
Día: ${contextoUsuario.contextoTemporal?.dia}
Fin de semana: ${contextoUsuario.contextoTemporal?.esFinDeSemana ? 'Sí' : 'No'}`;
  }

  /**
   * Llama al API externo de LangChain + Ollama + RAG + MCP
   */
  private async llamarAPIExterno(
    request: AIRecommendationRequest
  ): Promise<AIRecommendationResponse> {
    const startTime = Date.now();

    try {
      // Construir prompt del sistema
      const systemPrompt = this.construirPromptSistema(
        request.contextoUsuario,
        request.catalogoDisponible,
        request.intencion
      );

      // Construir payload para el API externo
      const payload = {
        messages: [
          {
            role: 'system',
            content: systemPrompt,
          },
          {
            role: 'user',
            content: request.mensajeUsuario,
          },
        ],
        model: AI_MODEL,
        temperature: AI_TEMPERATURE,
        max_tokens: AI_MAX_TOKENS,
        use_knowledge_base: AI_USE_KNOWLEDGE_BASE,
        use_mongodb_tools: AI_USE_MONGODB_TOOLS,
      };

      // Configurar headers
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      if (AI_API_KEY) {
        headers['X-API-KEY'] = AI_API_KEY;
      }

      // Llamar al API con timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), AI_API_TIMEOUT);

      const response = await fetch(`${AI_API_URL}/chat/stream`, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`API externo respondió con status ${response.status}`);
      }

      // Leer el stream completo
      let fullText = '';
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        throw new Error('No se pudo obtener el reader del stream');
      }

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        fullText += chunk;
      }

      // Parsear la respuesta JSON del LLM
      // El LLM debería devolver un JSON válido según el prompt
      let recomendacion: RecomendacionIA;

      try {
        // Intentar parsear directamente
        recomendacion = JSON.parse(fullText.trim());
      } catch (parseError) {
        // Si falla, intentar extraer JSON del texto
        const jsonMatch = fullText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          recomendacion = JSON.parse(jsonMatch[0]);
        } else {
          throw new Error('No se pudo parsear la respuesta del LLM como JSON');
        }
      }

      const latenciaMs = Date.now() - startTime;

      return {
        exito: true,
        recomendacion,
        timestamp: new Date(),
        latenciaMs,
      };
    } catch (error) {
      console.error('Error llamando al API externo:', error);

      const latenciaMs = Date.now() - startTime;

      return {
        exito: false,
        error:
          error instanceof Error
            ? error.message
            : 'Error desconocido al llamar al API',
        timestamp: new Date(),
        latenciaMs,
      };
    }
  }

  /**
   * Genera una recomendación de fallback si el API externo falla
   */
  private generarRecomendacionFallback(
    contextoUsuario: ContextoUsuario,
    catalogoDisponible: CatalogoDisponible,
    intencion: IntencionUsuario
  ): RecomendacionIA {
    // Usar el bocadillo más frecuente del usuario o crear uno básico
    if (contextoUsuario.historicoCompleto.length > 0) {
      const bocadilloFavorito = contextoUsuario.historicoCompleto[0];

      return {
        respuestaTexto:
          'Basándome en tus pedidos anteriores, te sugiero repetir uno de tus favoritos.',
        propuestaPedido: {
          nombre: bocadilloFavorito.nombre,
          tamano: bocadilloFavorito.tamano,
          tipoPan: bocadilloFavorito.tipoPan,
          ingredientes: bocadilloFavorito.ingredientes,
        },
        tipoRecomendacion: TipoRecomendacion.RECURRENTE,
        razonamiento: 'Recomendación de fallback basada en histórico',
        confianza: 0.6,
        metadatos: {
          basadoEnPedido: bocadilloFavorito.nombre,
        },
      };
    }

    // Usuario nuevo sin histórico
    const ingredientesBasicos = catalogoDisponible.ingredientes
      .filter((i) =>
        ['Jamón', 'Queso', 'Tomate', 'Lechuga'].some((basico) =>
          i.includes(basico)
        )
      )
      .slice(0, 3);

    return {
      respuestaTexto:
        'Como es tu primer pedido, te sugiero un bocadillo clásico para empezar.',
      propuestaPedido: {
        nombre: 'Bocadillo Clásico',
        tamano: TamanoBocadillo.NORMAL,
        tipoPan: TipoPan.NORMAL,
        ingredientes:
          ingredientesBasicos.length > 0
            ? ingredientesBasicos
            : catalogoDisponible.ingredientes.slice(0, 3),
      },
      tipoRecomendacion: TipoRecomendacion.RECURRENTE,
      razonamiento: 'Recomendación básica para usuario nuevo',
      confianza: 0.5,
    };
  }

  /**
   * Genera una recomendación inteligente
   */
  async generarRecomendacion(
    userId: mongoose.Types.ObjectId,
    nombre: string,
    mensajeUsuario: string
  ): Promise<AIRecommendationResponse> {
    try {
      // 1. Construir contexto del usuario
      const contextoUsuario = await this.construirContextoUsuario(
        userId,
        nombre
      );

      // 2. Obtener catálogo disponible
      const catalogoDisponible = await this.obtenerCatalogoDisponible();

      // 3. Detectar intención
      const intencion = this.detectarIntencion(mensajeUsuario);

      // 4. Construir request para API externo
      const request: AIRecommendationRequest = {
        userId: userId.toString(),
        intencion,
        mensajeUsuario,
        contextoUsuario,
        catalogoDisponible,
        configuracion: {
          maxRecomendaciones: 1,
          incluirAlternativa: true,
          nivelDescubrimiento: 'medio',
        },
      };

      // 5. Llamar al API externo
      const response = await this.llamarAPIExterno(request);

      // 6. Si falla el API externo, usar fallback
      if (!response.exito || !response.recomendacion) {
        console.warn('API externo falló, usando recomendación de fallback');
        const recomendacionFallback = this.generarRecomendacionFallback(
          contextoUsuario,
          catalogoDisponible,
          intencion
        );

        return {
          exito: true,
          recomendacion: recomendacionFallback,
          timestamp: new Date(),
          latenciaMs: response.latenciaMs,
        };
      }

      return response;
    } catch (error) {
      console.error('Error generando recomendación:', error);
      throw error;
    }
  }

  /**
   * Guarda un mensaje en la conversación
   */
  async guardarMensajeConversacion(
    userId: mongoose.Types.ObjectId,
    rol: 'usuario' | 'asistente',
    contenido: string,
    recomendacion?: RecomendacionIA,
    intencionDetectada?: IntencionUsuario
  ): Promise<void> {
    const { week, year } = getWeekNumber(new Date());

    // Buscar conversación activa de la semana actual
    let conversacion = await ConversacionChat.findOne({
      userId,
      activa: true,
      semana: week,
      ano: year,
    });

    // Si no existe, crear nueva conversación
    if (!conversacion) {
      conversacion = new ConversacionChat({
        userId,
        mensajes: [],
        semana: week,
        ano: year,
      });
    }

    // Agregar mensaje
    const mensaje = {
      id: new mongoose.Types.ObjectId().toString(),
      rol,
      contenido,
      timestamp: new Date(),
      recomendacion,
      intencionDetectada,
    };

    conversacion.mensajes.push(mensaje);
    conversacion.fechaUltimoMensaje = new Date();

    await conversacion.save();
  }

  /**
   * Obtiene la conversación activa del usuario
   */
  async obtenerConversacionActiva(userId: mongoose.Types.ObjectId) {
    const { week, year } = getWeekNumber(new Date());

    return await ConversacionChat.findOne({
      userId,
      activa: true,
      semana: week,
      ano: year,
    });
  }
}

// Exportar instancia singleton
export default new AIRecommendationService();
