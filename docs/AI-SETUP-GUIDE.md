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
```

**Notas**:
- `AI_API_URL`: URL donde corre tu API externo de LangChain/Ollama
- `AI_API_TIMEOUT`: Timeout en milisegundos (30000 = 30 segundos)

### Configuración de Producción

Para despliegue en producción (ej. Render):

```bash
AI_API_URL=https://tu-api-langchain.ejemplo.com
AI_API_TIMEOUT=45000
```

## Paso 2: API Externo de LangChain + Ollama

### Estructura Esperada del API

Tu API externo debe implementar:

**Endpoint**: `POST /api/recommend`

**Headers**:
```
Content-Type: application/json
```

**Request Body**:
```json
{
  "userId": "string",
  "intencion": "sorprendeme|ligero|contundente|lo_de_siempre|probar_distinto|mucha_hambre|personalizado",
  "mensajeUsuario": "string",
  "contextoUsuario": {
    "userId": "string",
    "nombre": "string",
    "historicoCompleto": [
      {
        "nombre": "string",
        "tamano": "normal|grande",
        "tipoPan": "normal|integral|semillas",
        "ingredientes": ["string"],
        "fechaCreacion": "ISO-8601",
        "semana": number,
        "ano": number
      }
    ],
    "ingredientesFrecuentes": [
      {
        "ingrediente": "string",
        "frecuencia": number,
        "ultimaVez": "ISO-8601"
      }
    ],
    "ingredientesRaros": ["string"],
    "ingredientesNuncaUsados": ["string"],
    "combinacionesRepetidas": [
      {
        "ingredientes": ["string"],
        "frecuencia": number,
        "ultimaVez": "ISO-8601"
      }
    ],
    "panesPreferidos": ["normal"|"integral"|"semillas"],
    "tamanosPreferidos": ["normal"|"grande"],
    "contextoTemporal": {
      "hora": number,
      "dia": "string",
      "esFinDeSemana": boolean
    }
  },
  "catalogoDisponible": {
    "ingredientes": ["string"],
    "tiposPan": ["normal", "integral", "semillas"],
    "tamanos": ["normal", "grande"]
  },
  "configuracion": {
    "maxRecomendaciones": 1,
    "incluirAlternativa": true,
    "nivelDescubrimiento": "bajo|medio|alto"
  }
}
```

**Response Esperada**:
```json
{
  "recomendacion": {
    "respuestaTexto": "Te propongo algo muy en tu línea: mantengo el pollo que sueles pedir y lo combino con pan rústico y queso para darle un punto más sabroso.",
    "propuestaPedido": {
      "nombre": "Bocadillo de Pollo con Queso",
      "tamano": "normal",
      "tipoPan": "integral",
      "ingredientes": ["Pollo", "Queso", "Lechuga", "Tomate"],
      "precioEstimado": 5.50
    },
    "alternativa": {
      "nombre": "Bocadillo Mediterráneo",
      "tamano": "normal",
      "tipoPan": "normal",
      "ingredientes": ["Jamón", "Queso", "Tomate"],
      "precioEstimado": 4.50
    },
    "tipoRecomendacion": "variacion_suave",
    "razonamiento": "El usuario suele pedir pollo, pero variamos el pan y añadimos queso",
    "confianza": 0.85,
    "metadatos": {
      "ingredientesNuevos": ["Queso"],
      "basadoEnPedido": "Bocadillo de Pollo Simple",
      "similitudConHistorico": 0.75
    }
  }
}
```

### Ejemplo de Implementación con Python/FastAPI

```python
from fastapi import FastAPI
from pydantic import BaseModel
from typing import List, Optional
from langchain_community.llms import Ollama
from langchain.prompts import PromptTemplate

app = FastAPI()

# Configurar Ollama
llm = Ollama(model="llama3.2")

class PropuestaPedido(BaseModel):
    nombre: str
    tamano: str
    tipoPan: str
    ingredientes: List[str]
    precioEstimado: Optional[float] = None

class Recomendacion(BaseModel):
    respuestaTexto: str
    propuestaPedido: PropuestaPedido
    alternativa: Optional[PropuestaPedido] = None
    tipoRecomendacion: str
    razonamiento: str
    confianza: float
    metadatos: Optional[dict] = None

@app.post("/api/recommend")
async def recommend(request: dict):
    # Extraer contexto
    contexto = request["contextoUsuario"]
    catalogo = request["catalogoDisponible"]
    intencion = request["intencion"]
    mensaje = request["mensajeUsuario"]

    # Construir prompt
    prompt = construir_prompt(contexto, catalogo, intencion, mensaje)

    # Llamar a Ollama
    respuesta = llm.invoke(prompt)

    # Parsear respuesta y construir recomendación
    recomendacion = parsear_respuesta(respuesta, contexto, catalogo)

    return {"recomendacion": recomendacion}

def construir_prompt(contexto, catalogo, intencion, mensaje):
    # Aquí va el prompt proporcionado en el documento principal
    # Ver docs/AI-RECOMMENDATION-SYSTEM.md
    pass

def parsear_respuesta(respuesta, contexto, catalogo):
    # Parsear la respuesta del LLM y construir objeto Recomendacion
    pass
```

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
