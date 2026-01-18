# Contexto Técnico: IA Chatbot Medieval Manager

Este documento sirve como contexto técnico para agentes de IA (como Gemini) sobre la implementación del chatbot en `medieval-manager`.

## Arquitectura

*   **Tipo**: RAG-lite + Prompt Engineering.
*   **Backend**: Node.js (Express) + Mongoose.
*   **IA Engine**: Servicio externo HTTP (LangChain + Ollama), desacoplado del backend principal.

## Archivos Clave

1.  **`backend/src/services/aiRecommendationService.ts`** (CORE)
    *   Gestiona la lógica de negocio.
    *   **Método `generarRecomendacion`**: Orquesta todo el flujo.
    *   **Método `construirContextoUsuario`**: Agrega métricas (frecuencia de ingredientes, histórico).
    *   **Método `llamarAPIExterno`**: Realiza `POST` a `${AI_API_URL}/chat/stream`.
    *   **Fallback**: Si falla la IA, usa `generarRecomendacionFallback` (lógica determinista simple).

2.  **`backend/src/controllers/aiRecommendationController.ts`**
    *   Exponer endpoints REST. Mantiene la sesión de chat en MongoDB (`ConversacionChat`).

3.  **`backend/src/models/`**
    *   `Bocadillo`: Modelo de pedidos.
    *   `ConversacionChat`: Historial de mensajes.

## Flujo de Datos

1.  **Input**: Usuario envía string `mensajeUsuario`.
2.  **Context Building**:
    *   Se extrae histórico de `Bocadillo`.
    *   Se calculan `IngredienteFrecuencia`, `CombinacionFrecuente`.
    *   Variables temporales (hora, día) para contexto situacional.
3.  **Prompting**:
    *   Se construye un System Prompt masivo inyectando todo el contexto JSON.
    *   Se instruye al modelo a responder **SOLO JSON**.
4.  **External Call**:
    *   Endpoint: `POST http://localhost:8000/chat/stream` (Configurable vía `AI_API_URL`).
    *   Body: `{ messages: [...], model: "qwen3:14b", ... }`.
5.  **Parsing**:
    *   Lectura de stream raw.
    *   Intento de `JSON.parse(response)`.
    *   Regex fallback: `/\{[\s\S]*\}/` para extraer JSON si el modelo "alucina" texto extra.

## Problemas Conocidos / Áreas de Atención

*   **Endpoint Mismatch**: Documentación antigua dice `/api/recommend`, código usa `/chat/stream`.
*   **Fragilidad JSON**: Dependencia crítica de que el LLM genere JSON válido. El parser es básico.
*   **Conectividad**: Dependencia dura de `localhost:8000`. Si falla, silencia el error y usa fallback (advertencia en logs).
*   **Modelo Hardcoded**: `qwen3:14b` es el default en código si no se especifica en ENV, lo cual puede no existir en el servidor Ollama del usuario.

## Comandos Útiles para Debug

*   Verificar logs backend: `docker logs <backend_container_id>`
*   Verificar respuesta raw de IA: Insertar `console.log(fullText)` en línea 492 de `aiRecommendationService.ts`.
