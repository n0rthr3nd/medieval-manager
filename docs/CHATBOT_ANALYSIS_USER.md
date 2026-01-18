# Análisis del Chatbot "Medieval Manager"

Este documento explica cómo funciona actualmente el chatbot de recomendaciones en la aplicación Medieval Manager.

## 1. Visión General

El chatbot es un **Asistente de Recomendaciones IA** integrado en la aplicación. Su objetivo es sugerir bocadillos personalizados a los usuarios basándose en su historial de pedidos y preferencias.

Cuando un usuario escribe en el chat (o usa una sugerencia rápida), el sistema analiza su historial, construye un "perfil" temporal y consulta a una Inteligencia Artificial externa para generar una recomendación precisa.

## 2. Flujo de Funcionamiento Paso a Paso

1.  **Interacción del Usuario**: El usuario envía un mensaje (ej: "Quiero algo picante") desde la interfaz web (Frontend Angular).
2.  **Recepción en Backend**: El servidor (`aiRecommendationController.ts`) recibe la solicitud.
3.  **Recopilación de Contexto (`aiRecommendationService.ts`)**:
    *   El sistema busca en la base de datos (MongoDB) los últimos 50 pedidos del usuario.
    *   Calcula estadísticas: ingredientes favoritos, panes preferidos, combinaciones frecuentes, etc.
    *   Identifica ingredientes disponibles en el catálogo actual.
    *   Detecta la intención básica del usuario (ej: "Sorpréndeme", "Lo de siempre", "Algo ligero").
4.  **Generación del Prompt**:
    *   Se crea instrucciones detalladas para la IA, incluyendo reglas estrictas (ej: "No inventar ingredientes") y los datos recopilados del usuario.
5.  **Consulta a la IA Externa**:
    *   El backend envía una solicitud a un servicio externo (probablemente Python/LangChain con Ollama) en la dirección `http://localhost:8000/chat/stream`.
    *   **Punto Crítico**: Se espera que la IA responda con un formato JSON específico.
6.  **Procesamiento de la Respuesta**:
    *   El backend recibe la respuesta de la IA.
    *   Intenta leer el flujo de datos (stream) y convertirlo a un objeto JSON.
    *   Si la IA falla o el formato es incorrecto, se activa un **Mecanismo de Respaldo (Fallback)**.
        *   *Fallback*: Recomienda el pedido más frecuente del usuario o un bocadillo clásico si es nuevo.
7.  **Respuesta al Usuario**:
    *   La recomendación se guarda en el historial del chat.
    *   Se envía al frontend para mostrarse como una tarjeta interactiva donde el usuario puede "Aceptar" (pedir directamente) o rechazar.

## 3. Puntos de Posible Fallo (Diagnóstico)

Basado en el código actual, estas son las razones más probables por las que "no está funcionando correctamente":

1.  **Conexión con la IA (`http://localhost:8000`)**:
    *   Si el servicio de IA (Ollama/LangChain) no está corriendo o el puerto 8000 no es accesible desde el contenedor del backend, fallará inmediatamente y usará el "Fallback".
    *   Hay una discrepancia en la documentación antigua que mencionaba `/api/recommend`, pero el código real usa `/chat/stream`.

2.  **Formato de Respuesta de la IA**:
    *   El código espera que la IA devuelva **exclusivamente** JSON o que el JSON pueda extraerse fácilmente del texto.
    *   Modelos de lenguaje (como `qwen3:14b`) a veces son "verborrágicos" (añaden texto antes o después del JSON). Si el código de limpieza (`fullText.match`) no es perfecto, fallará al leer la respuesta (`JSON.parse error`).

3.  **Tiempo de Espera (Timeout)**:
    *   El timeout está configurado en 30 segundos (`AI_API_TIMEOUT`). Si la generación de la IA es lenta (común en hardware local), la conexión se cortará antes de recibir la respuesta.

4.  **Parsing del Stream**:
    *   El código lee el stream manualmente (`reader.read()`). Si el servidor de IA envía los datos en chunks que cortan el JSON de forma extraña o hay problemas de codificación, podría fallar al reconstruir el texto completo.
