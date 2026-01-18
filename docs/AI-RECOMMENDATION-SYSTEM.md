# Sistema de Recomendación Inteligente de Bocadillos

## Descripción General

El **Sistema de Recomendación Inteligente** es un asistente conversacional basado en IA que ayuda a los usuarios a elegir su bocadillo perfecto mediante recomendaciones personalizadas.

## Arquitectura

### Stack Tecnológico

El sistema está dividido en dos partes principales:

#### 1. **API Externo de IA** (No incluido en este repositorio)
- **LangChain**: Framework para aplicaciones con LLM
- **Ollama**: Motor de inferencia local para modelos de lenguaje
- **RAG (Retrieval Augmented Generation)**: Sistema de recuperación de contexto
- **MCP (Model Context Protocol)**: Protocolo para gestión de contexto

#### 2. **Integración en Medieval Manager** (Este repositorio)
- **Backend**: Servicio de recomendaciones que consume el API externo
- **Frontend**: Componente de chat conversacional estilo Revolut

## Componentes del Sistema

### Backend (`/backend/src`)

#### Tipos y Modelos
- **`types/aiRecommendation.ts`**: Tipos TypeScript para todo el sistema
- **`models/ConversacionChat.ts`**: Modelo de MongoDB para historial de chat

#### Servicio de Recomendaciones
- **`services/aiRecommendationService.ts`**: Lógica principal del sistema
  - Análisis de histórico de pedidos del usuario
  - Detección de patrones (ingredientes frecuentes, combinaciones)
  - Comunicación con API externo de LangChain/Ollama
  - Sistema de fallback si el API externo falla
  - Gestión de conversaciones

#### Controlador
- **`controllers/aiRecommendationController.ts`**: Endpoints REST
  - `POST /api/ai-recommendations/solicitar` - Solicitar recomendación
  - `POST /api/ai-recommendations/aceptar` - Aceptar y crear bocadillo
  - `POST /api/ai-recommendations/feedback` - Enviar feedback
  - `GET /api/ai-recommendations/conversacion` - Obtener conversación activa
  - `DELETE /api/ai-recommendations/conversacion` - Cerrar conversación

#### Validadores
- **`validators/aiRecommendationValidator.ts`**: Schemas Zod para validación

#### Rutas
- **`routes/aiRecommendationRoutes.ts`**: Definición de endpoints

### Frontend (`/frontend/src/app`)

#### Modelos
- **`models/ai-recommendation.model.ts`**: Interfaces TypeScript para el frontend

#### Servicios
- **`services/ai-recommendation.service.ts`**: Cliente HTTP para comunicarse con el backend
  - Gestión de estado con RxJS BehaviorSubject
  - Métodos para solicitar, aceptar y rechazar recomendaciones
  - Observables para conversación activa y estado de carga

#### Componentes
- **`components/chat-recomendador/`**: Componente de chat conversacional
  - Diseño mobile-first estilo Revolut
  - Interfaz conversacional intuitiva
  - Sugerencias rápidas predefinidas
  - Visualización de recomendaciones con detalles
  - Botones de acción (aceptar/rechazar)
  - Soporte para alternativas

## Flujo de Funcionamiento

### 1. Usuario abre el chat
```
Usuario hace clic en el botón flotante "💡 Recomendador IA"
↓
Se abre modal de chat con mensaje de bienvenida
↓
Se muestran sugerencias rápidas
```

### 2. Usuario solicita recomendación
```
Usuario escribe mensaje o hace clic en sugerencia rápida
↓
Frontend → POST /api/ai-recommendations/solicitar { mensajeUsuario }
↓
Backend analiza:
  - Histórico de bocadillos del usuario
  - Ingredientes frecuentes
  - Combinaciones repetidas
  - Ingredientes nunca usados
  - Preferencias de pan y tamaño
↓
Backend → API externo LangChain/Ollama con contexto completo
↓
API externo genera recomendación personalizada
↓
Backend recibe y valida recomendación
↓
Backend guarda en conversación
↓
Frontend muestra recomendación en el chat
```

### 3. Usuario acepta recomendación
```
Usuario hace clic en "✓ Pedir este"
↓
Frontend → POST /api/ai-recommendations/aceptar { propuestaPedido }
↓
Backend crea bocadillo automáticamente
↓
Backend guarda feedback positivo
↓
Frontend cierra chat y recarga lista de bocadillos
```

### 4. Usuario rechaza recomendación
```
Usuario hace clic en "Otra opción"
↓
Frontend → POST /api/ai-recommendations/feedback { aceptada: false }
↓
Backend registra feedback
↓
Usuario puede pedir otra recomendación
```

## Lógica de Recomendación

### Análisis del Histórico

El servicio analiza automáticamente:

1. **Ingredientes Frecuentes**
   - Ingredientes usados en más del 30% de pedidos
   - Ordenados por frecuencia

2. **Ingredientes Raros**
   - Ingredientes usados 1-2 veces
   - Potencial para variaciones

3. **Ingredientes Nunca Usados**
   - Ingredientes disponibles pero nunca pedidos
   - Para descubrimiento controlado

4. **Combinaciones Repetidas**
   - Sets de ingredientes que se repiten
   - Identifica "favoritos"

5. **Preferencias de Pan y Tamaño**
   - Tipos de pan más usados
   - Tamaños preferidos

### Tipos de Recomendación

#### Recurrente (`RECURRENTE`)
- Basada en pedidos habituales del usuario
- Alta confianza (>80%)
- Ingredientes conocidos
- **Icono**: ⭐

#### Variación Suave (`VARIACION_SUAVE`)
- Mantiene ingredientes base del usuario
- Añade 1-2 ingredientes nuevos o cambia el pan
- Confianza media (60-80%)
- **Icono**: 🔄

#### Descubrimiento (`DESCUBRIMIENTO`)
- Propone ingredientes nunca usados
- Mantiene coherencia con preferencias
- Confianza variable (50-70%)
- **Icono**: 🔍

### Sistema de Fallback

Si el API externo de LangChain/Ollama no está disponible:

1. **Usuario con histórico**: Recomienda el bocadillo más frecuente
2. **Usuario nuevo**: Recomienda bocadillo clásico básico
3. Confianza reducida (50-60%)
4. Se registra en logs para diagnóstico

## Intenciones Detectadas

El sistema detecta automáticamente la intención del usuario:

| Intención | Palabras clave | Comportamiento |
|-----------|---------------|----------------|
| `SORPRENDEME` | sorprend, recomienda | Descubrimiento controlado |
| `LIGERO` | ligero, poco | Menos ingredientes, pan integral |
| `CONTUNDENTE` | contundente, grande, mucho | Tamaño grande, más ingredientes |
| `LO_DE_SIEMPRE` | siempre, habitual, usual | Bocadillo más frecuente |
| `PROBAR_DISTINTO` | distinto, nuevo, probar | Ingredientes nunca usados |
| `MUCHA_HAMBRE` | hambre | Tamaño grande, contundente |
| `PERSONALIZADO` | (otros casos) | Análisis general |

## Configuración

### Variables de Entorno

```bash
# Backend (.env)
AI_API_URL=http://localhost:8000         # URL del API externo
AI_API_TIMEOUT=30000                      # Timeout en ms (30 segundos)
```

### API Externo (LangChain + Ollama)

El API externo debe exponerexponer:

**Endpoint**: `POST /api/recommend`

**Request**:
```json
{
  "userId": "string",
  "intencion": "sorprendeme",
  "mensajeUsuario": "string",
  "contextoUsuario": {
    "historicoCompleto": [...],
    "ingredientesFrecuentes": [...],
    "ingredientesNuncaUsados": [...],
    // ... más contexto
  },
  "catalogoDisponible": {
    "ingredientes": [...],
    "tiposPan": [...],
    "tamanos": [...]
  }
}
```

**Response**:
```json
{
  "recomendacion": {
    "respuestaTexto": "string",
    "propuestaPedido": {
      "nombre": "string",
      "tamano": "normal|grande",
      "tipoPan": "normal|integral|semillas",
      "ingredientes": [...]
    },
    "alternativa": { ... },
    "tipoRecomendacion": "recurrente|variacion_suave|descubrimiento",
    "razonamiento": "string",
    "confianza": 0.85,
    "metadatos": { ... }
  }
}
```

## Características del Chat

### Diseño Mobile-First

- **Botón flotante (FAB)**: Siempre accesible en la esquina inferior derecha
- **Modal full-screen en móvil**: Aprovecha todo el espacio disponible
- **Animaciones suaves**: Transiciones estilo Revolut
- **Responsive**: Se adapta perfectamente a escritorio

### Sugerencias Rápidas

Chips interactivos para acceso rápido:
- 🎲 Sorpréndeme
- 🥗 Algo ligero
- 🍔 Algo contundente
- ⭐ Lo de siempre
- 🔍 Quiero probar algo distinto

### Tarjeta de Recomendación

Muestra:
- **Badge de tipo**: Favorito / Variación / Nuevo
- **Nombre del bocadillo**
- **Detalles**: Pan y tamaño con iconos
- **Lista de ingredientes** formateada
- **Botones de acción**: Pedir / Otra opción
- **Alternativa opcional**: Segunda opción
- **Badge de confianza**: Verde/Amarillo/Rojo según %
- **Metadatos**: "Basado en [bocadillo]"

## Seguridad

- **Autenticación requerida**: Todos los endpoints requieren JWT
- **Validación con Zod**: Schemas estrictos para todas las requests
- **Timeout configurable**: Evita bloqueos por API lento
- **Sanitización de datos**: Previene inyecciones
- **Rate limiting** (recomendado): Limitar requests por usuario

## Monitoreo y Logs

### Logs del Sistema

```typescript
console.log('Generando recomendación para usuario:', userId);
console.warn('API externo falló, usando recomendación de fallback');
console.error('Error llamando al API externo:', error);
```

### Métricas Recomendadas

- Tasa de aceptación de recomendaciones
- Tiempo promedio de respuesta del API
- Tasa de fallback activado
- Intenciones más frecuentes
- Confianza promedio de recomendaciones

## Roadmap Futuro

### Funcionalidades Planificadas

- [ ] **Prompt separado para detección de intenciones**
- [ ] **Schema JSON estrictamente tipado para responses**
- [ ] **Flujo UX mejorado tipo Revolut mobile**
- [ ] **Reglas de fallback más sofisticadas**
- [ ] **Sistema de feedback contextual**
- [ ] **A/B testing de prompts**
- [ ] **Aprendizaje continuo basado en feedback**
- [ ] **Soporte multilenguaje**
- [ ] **Recomendaciones grupales**
- [ ] **Integración con calendario (eventos especiales)**

## Troubleshooting

### El chat no se abre
- Verificar que el usuario esté en ventana de pedidos abierta
- Revisar permisos de autenticación
- Comprobar consola del navegador

### No se generan recomendaciones
- Verificar que `AI_API_URL` esté configurada
- Comprobar que el API externo esté en ejecución
- Revisar logs del backend para errores
- El sistema de fallback debería activarse automáticamente

### Recomendaciones de baja calidad
- Verificar que el usuario tenga histórico de pedidos
- Ajustar el prompt en el API externo
- Revisar la lógica de análisis de preferencias

### Timeout del API externo
- Aumentar `AI_API_TIMEOUT` en .env
- Optimizar el modelo en Ollama
- Reducir el contexto enviado al API

## Contribución

Para extender el sistema:

1. **Nuevos tipos de intención**: Editar `types/aiRecommendation.ts`
2. **Lógica de análisis**: Modificar `services/aiRecommendationService.ts`
3. **UI del chat**: Personalizar `components/chat-recomendador/`
4. **Validaciones**: Actualizar `validators/aiRecommendationValidator.ts`

## Contacto y Soporte

Para preguntas o problemas relacionados con el sistema de recomendaciones:
- Crear issue en el repositorio
- Revisar logs del backend y frontend
- Consultar documentación de LangChain/Ollama

---

**Versión**: 1.0.0
**Última actualización**: 2026-01-17
