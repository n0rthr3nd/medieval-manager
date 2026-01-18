# Guía de Configuración del Sistema de Recomendación IA

## Requisitos Previos

Antes de configurar el sistema de recomendación, asegúrate de tener:

1. ✅ **Medieval Manager funcionando** (backend + frontend)
2. ✅ **MongoDB** corriendo con datos de usuarios y bocadillos
3. ✅ **API externo de LangChain + Ollama + RAG + MCP** configurado

## Paso 1: Configurar Variables de Entorno

### Backend

Edita el archivo `/backend/.env`:

```bash
# AI Recommendation System (LangChain + Ollama + RAG + MCP)
AI_API_URL=http://localhost:8000
AI_API_TIMEOUT=30000
AI_API_KEY=
AI_MODEL=qwen3:14b
AI_TEMPERATURE=0.7
AI_MAX_TOKENS=1024
AI_USE_KNOWLEDGE_BASE=false
AI_USE_MONGODB_TOOLS=false
```

**Notas**:
- `AI_API_URL`: URL donde corre tu API externo de LangChain/Ollama
- `AI_API_TIMEOUT`: Timeout en milisegundos (30000 = 30 segundos)
- `AI_API_KEY`: API Key para autenticación (opcional, dejar vacío si no se usa)
- `AI_MODEL`: Modelo de Ollama a usar (ej: qwen3:14b, llama3.2, etc.)
- `AI_TEMPERATURE`: Creatividad del modelo (0.0 = determinista, 1.0 = creativo)
- `AI_MAX_TOKENS`: Máximo de tokens en la respuesta
- `AI_USE_KNOWLEDGE_BASE`: Habilitar knowledge base RAG (true/false)
- `AI_USE_MONGODB_TOOLS`: Habilitar herramientas MongoDB MCP (true/false)

### Configuración de Producción

Para despliegue en producción (ej. Render):

```bash
AI_API_URL=https://tu-api-langchain.ejemplo.com
AI_API_TIMEOUT=45000
```

## Paso 2: API Externo de LangChain + Ollama

### Estructura Esperada del API

Tu API externo debe implementar:

**Endpoint**: `POST /chat/stream`

**Headers**:
```
Content-Type: application/json
X-API-KEY: tu-api-key-aqui (opcional)
```

**Request Body**:
```json
{
  "messages": [
    {
      "role": "system",
      "content": "Prompt del sistema con todo el contexto (automáticamente generado)"
    },
    {
      "role": "user",
      "content": "Mensaje del usuario: 'Sorpréndeme'"
    }
  ],
  "model": "qwen3:14b",
  "temperature": 0.7,
  "max_tokens": 1024,
  "use_knowledge_base": false,
  "use_mongodb_tools": false
}
```

**Nota Importante**: El backend de Medieval Manager construye automáticamente el prompt del sistema con toda la información del contexto del usuario (histórico, ingredientes frecuentes, catálogo disponible, etc.). El API solo necesita procesar el mensaje y devolver el JSON solicitado.

**Response Esperada (Streaming)**:

El API debe devolver un stream de texto que, al completarse, contenga un JSON válido con esta estructura:

```json
{
  "respuestaTexto": "Te propongo algo muy en tu línea: mantengo el pollo que sueles pedir y lo combino con pan integral y queso para darle un punto más sabroso.",
  "propuestaPedido": {
    "nombre": "Bocadillo de Pollo con Queso",
    "tamano": "normal",
    "tipoPan": "integral",
    "ingredientes": ["Pollo Miel", "Queso semi", "Lechuga", "Tomate"],
    "precioEstimado": 5.50
  },
  "alternativa": {
    "nombre": "Bocadillo Mediterráneo",
    "tamano": "normal",
    "tipoPan": "normal",
    "ingredientes": ["Jamón", "Queso", "Tomate"]
  },
  "tipoRecomendacion": "variacion_suave",
  "razonamiento": "El usuario suele pedir pollo, pero variamos el pan y añadimos queso",
  "confianza": 0.85,
  "metadatos": {
    "ingredientesNuevos": ["Queso semi"],
    "basadoEnPedido": "Bocadillo de Pollo Simple",
    "similitudConHistorico": 0.75
  }
}
```

### Ejemplo de Implementación con Python/FastAPI

**Nota**: Tu API externo ya está implementado con el formato correcto. Este es solo un ejemplo de referencia de cómo podría verse la implementación básica.

```python
from fastapi import FastAPI, Header
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import List, Optional
from langchain_community.llms import Ollama
import json

app = FastAPI()

# Configurar Ollama
llm = Ollama(model="qwen3:14b")

class Message(BaseModel):
    role: str
    content: str

class ChatRequest(BaseModel):
    messages: List[Message]
    model: str = "qwen3:14b"
    temperature: float = 0.7
    max_tokens: int = 1024
    use_knowledge_base: bool = False
    use_mongodb_tools: bool = False

async def generate_stream(messages: List[Message], model: str, temperature: float):
    # Obtener el prompt del sistema y el mensaje del usuario
    system_prompt = next((m.content for m in messages if m.role == "system"), "")
    user_message = next((m.content for m in messages if m.role == "user"), "")

    # Combinar en un solo prompt
    full_prompt = f"{system_prompt}\n\nUsuario: {user_message}\n\nAsistente:"

    # Llamar a Ollama con streaming
    response = llm.invoke(full_prompt)

    # Devolver el JSON en chunks (simulando streaming)
    for chunk in response:
        yield chunk

@app.post("/chat/stream")
async def chat_stream(
    request: ChatRequest,
    x_api_key: Optional[str] = Header(None)
):
    # Validar API key si está configurada
    if x_api_key != "tu-api-key-esperada" and x_api_key is not None:
        return {"error": "Invalid API key"}

    # Generar respuesta en streaming
    return StreamingResponse(
        generate_stream(request.messages, request.model, request.temperature),
        media_type="text/plain"
    )

# Ejemplo de uso:
# El LLM debe devolver un JSON válido siguiendo el formato especificado
# en el prompt del sistema que Medieval Manager envía automáticamente
```

**Importante**:
- Medieval Manager ya construye el prompt completo del sistema con todo el contexto
- Tu API solo necesita procesar los mensajes y devolver el JSON solicitado
- El prompt incluye instrucciones claras sobre el formato JSON esperado
- El LLM debe seguir las instrucciones del prompt y devolver solo JSON válido

### Prompt del Sistema Generado Automáticamente

Medieval Manager construye automáticamente un prompt detallado que incluye:

1. **Instrucciones del Asistente**: Rol, objetivo y comportamiento esperado
2. **Reglas Estrictas**: Qué puede y qué NO puede hacer (previene alucinaciones)
3. **Contexto del Usuario**:
   - Ingredientes frecuentes con frecuencia de uso
   - Combinaciones repetidas
   - Ingredientes nunca usados
   - Panes y tamaños preferidos
   - Últimos 5 pedidos
4. **Catálogo Disponible**: Ingredientes, panes y tamaños (SOLO usar estos)
5. **Intención Detectada**: sorprendeme, ligero, contundente, etc.
6. **Formato de Respuesta Obligatorio**: Schema JSON exacto esperado
7. **Contexto Temporal**: Hora, día, si es fin de semana

**Ejemplo de prompt generado**:

```
Eres un asistente conversacional de recomendación inteligente dentro de una app de pedidos de bocadillos.

## Reglas Estrictas (OBLIGATORIAS)
- ❌ Nunca inventes ingredientes, panes o combinaciones
- ❌ No propongas nada fuera del catálogo recibido
...

## Contexto del Usuario: EDUARDO CANALS

### Ingredientes Frecuentes
Pollo Miel (5 veces), Lechuga (4 veces), Tomate (4 veces), Queso semi (3 veces)

### Últimos 5 Pedidos
- Bocadillo de Pollo: Pollo Miel, Lechuga, Tomate (pan normal, tamaño normal)
- Bocadillo Clásico: Jamón, Queso semi, Tomate (pan integral, tamaño normal)
...

## Catálogo Disponible

### Ingredientes Disponibles (SOLO usa estos)
Pollo Miel, Costillas Miel, Jamón, Queso semi, Lechuga, Tomate, ...

### Tipos de Pan Disponibles
normal, integral, semillas

## Formato de Respuesta (OBLIGATORIO)
Debes devolver ÚNICAMENTE un objeto JSON válido con esta estructura exacta:
{
  "respuestaTexto": "...",
  "propuestaPedido": { ... },
  ...
}
```

Este prompt garantiza que el LLM tenga todo el contexto necesario para generar recomendaciones precisas y personalizadas.

### Probar el API Externo

Antes de integrar con Medieval Manager, prueba que tu API funcione correctamente:

```bash
curl -X POST http://localhost:8000/chat/stream \
  -H "Content-Type: application/json" \
  -H "X-API-KEY: tu-api-key" \
  -d '{
    "messages": [
      {
        "role": "system",
        "content": "Devuelve un JSON con esta estructura: {\"test\": \"ok\"}"
      },
      {
        "role": "user",
        "content": "Prueba"
      }
    ],
    "model": "qwen3:14b",
    "temperature": 0.7,
    "max_tokens": 1024,
    "use_knowledge_base": false,
    "use_mongodb_tools": false
  }'
```

Deberías recibir un stream de texto que contenga el JSON solicitado.

## Paso 3: Iniciar el Backend

```bash
cd backend
npm install  # Si no lo has hecho antes
npm run dev
```

Verifica en los logs que no haya errores:
```
✅ Conectado a MongoDB
🚀 Servidor corriendo en puerto 3000
```

## Paso 4: Iniciar el Frontend

```bash
cd frontend
npm install  # Si no lo has hecho antes
npm start
```

El frontend debería abrir en `http://localhost:4200`

## Paso 5: Probar el Sistema

### 1. Login

Accede con el usuario admin o crea un usuario de prueba:
- **Usuario**: admin
- **Password**: admin123

### 2. Ir a Pedidos

Navega a la página principal de pedidos.

### 3. Abrir el Chat IA

Haz clic en el botón flotante **"💡 Recomendador IA"** en la esquina inferior derecha.

### 4. Probar Sugerencias

Prueba las sugerencias rápidas:
- 🎲 Sorpréndeme
- 🥗 Algo ligero
- 🍔 Algo contundente

### 5. Verificar Recomendación

Deberías ver:
- ✅ Mensaje conversacional del asistente
- ✅ Tarjeta de recomendación con detalles
- ✅ Botones "Pedir este" y "Otra opción"
- ✅ Alternativa opcional

### 6. Aceptar Recomendación

Haz clic en **"✓ Pedir este"** y verifica:
- ✅ Se crea el bocadillo automáticamente
- ✅ Aparece en la lista de pedidos
- ✅ El chat se cierra

## Troubleshooting

### Error: "Error al conectar con el servicio de recomendaciones"

**Causa**: El backend no puede comunicarse con el API externo.

**Soluciones**:
1. Verificar que `AI_API_URL` esté configurada correctamente en `.env`
2. Comprobar que el API externo esté corriendo:
   ```bash
   curl -X POST http://localhost:8000/api/recommend \
     -H "Content-Type: application/json" \
     -d '{"test": true}'
   ```
3. Revisar logs del backend:
   ```bash
   cd backend
   npm run dev
   # Buscar líneas con "Error llamando al API externo"
   ```

**Sistema de Fallback**:
Si el API externo no responde, el sistema usa recomendaciones de fallback basadas en el histórico del usuario.

### Error: "No se pudo obtener una recomendación"

**Causa**: El API externo devolvió un error o respuesta inválida.

**Soluciones**:
1. Verificar logs del API externo
2. Comprobar que la respuesta tiene el formato correcto
3. Validar que los campos obligatorios estén presentes

### El chat no se muestra

**Causa**: El usuario no está en ventana de pedidos abierta.

**Solución**:
El chat solo se muestra cuando `isOrderingAllowed()` es `true`. Verifica:
1. La ventana de pedidos esté abierta (Viernes-Jueves 17:00)
2. No haya cierre administrativo activo

### Recomendaciones de baja calidad

**Causa**: El usuario no tiene suficiente histórico.

**Soluciones**:
1. Crear algunos bocadillos de prueba primero
2. Ajustar el prompt en el API externo para usuarios nuevos
3. Configurar mejor el modelo Ollama

## Configuración Avanzada

### Ajustar Timeout

Si el API externo es lento, aumenta el timeout:

```bash
# .env
AI_API_TIMEOUT=60000  # 60 segundos
```

### Nivel de Descubrimiento

Puedes ajustar qué tan "aventuradas" son las recomendaciones:

```typescript
// En backend/src/services/aiRecommendationService.ts
configuracion: {
  maxRecomendaciones: 1,
  incluirAlternativa: true,
  nivelDescubrimiento: 'bajo' | 'medio' | 'alto'  // Cambiar aquí
}
```

- **bajo**: Solo ingredientes conocidos del usuario
- **medio**: Variaciones suaves con 1-2 ingredientes nuevos
- **alto**: Puede sugerir ingredientes nunca usados

### Personalizar Sugerencias Rápidas

Edita el componente de chat:

```typescript
// En frontend/src/app/components/chat-recomendador/chat-recomendador.component.ts
sugerenciasRapidas = [
  { texto: 'Sorpréndeme', icono: '🎲' },
  { texto: 'Algo ligero', icono: '🥗' },
  // Agrega más aquí
];
```

## Despliegue en Producción

### Render / Railway / Heroku

1. Configura la variable de entorno `AI_API_URL` con la URL pública de tu API externo
2. Asegúrate de que el API externo acepte requests desde tu dominio (CORS)
3. Usa HTTPS para ambos servicios
4. Aumenta el timeout si es necesario

### Docker

Si usas Docker, agrega al `docker-compose.yml`:

```yaml
services:
  backend:
    environment:
      - AI_API_URL=http://ai-api:8000
      - AI_API_TIMEOUT=30000

  ai-api:
    image: tu-imagen-langchain-ollama
    ports:
      - "8000:8000"
```

## Monitoreo

### Logs importantes

```bash
# Ver logs del backend
cd backend
npm run dev

# Buscar líneas relacionadas con IA
grep "recomendación" logs/*.log
```

### Métricas a monitorear

- Latencia del API externo (`latenciaMs` en respuestas)
- Tasa de activación de fallback
- Tasa de aceptación de recomendaciones
- Errores del API externo

## Soporte

Si encuentras problemas:

1. Revisa la [documentación completa](./AI-RECOMMENDATION-SYSTEM.md)
2. Verifica los logs del backend y frontend
3. Comprueba que el API externo funcione independientemente
4. Crea un issue en el repositorio con:
   - Descripción del problema
   - Logs relevantes
   - Configuración de variables de entorno (sin credenciales)

---

**¿Todo funcionando?** 🎉

Si has llegado hasta aquí y todo funciona, ¡felicidades! Ahora tienes un sistema de recomendación inteligente completamente funcional.

**Próximos pasos**:
- Ajusta el prompt para mejorar las recomendaciones
- Personaliza el diseño del chat
- Implementa métricas y analytics
- Entrena el modelo con feedback de usuarios reales
