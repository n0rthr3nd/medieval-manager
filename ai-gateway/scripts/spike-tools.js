/**
 * Spike: validate that the chosen model behaves correctly with tools and streaming
 * via the OpenAI-compatible Ollama endpoint, going through the gateway.
 *
 * Run:
 *   GATEWAY_URL=https://your-funnel.ts.net \
 *   GATEWAY_API_KEY=xxx \
 *   MODEL=gpt-oss:120b \
 *   node scripts/spike-tools.js
 *
 * Tries 4 scenarios:
 *  1. Plain non-streaming completion
 *  2. Streaming completion
 *  3. Tool calling (non-streaming)
 *  4. Tool calling + streaming combined
 *
 * Prints OK/FAIL per scenario so you know whether to commit to tool-calling
 * with this model or fall back to JSON-mode + prompt stuffing.
 */

const GATEWAY_URL = (process.env.GATEWAY_URL || 'http://127.0.0.1:8080').replace(/\/$/, '');
const API_KEY = process.env.GATEWAY_API_KEY || '';
const MODEL = process.env.MODEL || 'gpt-oss:120b';

if (!API_KEY) {
  console.error('GATEWAY_API_KEY is required');
  process.exit(1);
}

const TOOLS = [
  {
    type: 'function',
    function: {
      name: 'listar_ingredientes',
      description: 'Lista los ingredientes disponibles para hacer un bocadillo.',
      parameters: {
        type: 'object',
        properties: {
          filtro_perfil: {
            type: 'string',
            enum: ['ligero', 'contundente', 'normal'],
            description: 'Filtra ingredientes por su perfil nutricional.',
          },
        },
        required: [],
      },
    },
  },
];

const headers = {
  'content-type': 'application/json',
  'x-api-key': API_KEY,
};

const url = `${GATEWAY_URL}/v1/chat/completions`;

async function scenario1Plain() {
  const res = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      model: MODEL,
      stream: false,
      messages: [
        { role: 'system', content: 'Eres un asistente conciso. Responde en español.' },
        { role: 'user', content: 'Saluda en una frase.' },
      ],
    }),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);
  const json = await res.json();
  const text = json?.choices?.[0]?.message?.content;
  if (!text) throw new Error('No content in response');
  return text.slice(0, 120);
}

async function scenario2Streaming() {
  const res = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      model: MODEL,
      stream: true,
      messages: [
        { role: 'system', content: 'Eres un asistente conciso.' },
        { role: 'user', content: 'Cuenta del 1 al 5 separados por comas.' },
      ],
    }),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);
  let chunks = 0;
  let assembled = '';
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';
    for (const line of lines) {
      if (!line.startsWith('data: ')) continue;
      const payload = line.slice(6).trim();
      if (payload === '[DONE]') continue;
      try {
        const obj = JSON.parse(payload);
        const delta = obj?.choices?.[0]?.delta?.content;
        if (delta) { assembled += delta; chunks++; }
      } catch { /* ignore */ }
    }
  }
  if (chunks < 2) throw new Error(`Got only ${chunks} chunks; streaming may be buffered`);
  return `chunks=${chunks} text=${assembled.slice(0, 80)}`;
}

async function scenario3Tools() {
  const res = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      model: MODEL,
      stream: false,
      tools: TOOLS,
      tool_choice: 'auto',
      messages: [
        { role: 'system', content: 'Eres un asistente para pedir bocadillos. Usa las tools disponibles cuando aplique.' },
        { role: 'user', content: '¿Qué ingredientes ligeros hay?' },
      ],
    }),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);
  const json = await res.json();
  const msg = json?.choices?.[0]?.message;
  const calls = msg?.tool_calls;
  if (!calls || calls.length === 0) {
    throw new Error(`Expected tool_calls. Got message content instead: ${JSON.stringify(msg).slice(0, 200)}`);
  }
  const call = calls[0];
  if (call.function?.name !== 'listar_ingredientes') {
    throw new Error(`Wrong tool called: ${call.function?.name}`);
  }
  return `tool=${call.function.name} args=${call.function.arguments}`;
}

async function scenario4ToolsStreaming() {
  const res = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      model: MODEL,
      stream: true,
      tools: TOOLS,
      tool_choice: 'auto',
      messages: [
        { role: 'system', content: 'Eres un asistente para pedir bocadillos. Usa las tools disponibles cuando aplique.' },
        { role: 'user', content: 'Lista los ingredientes contundentes que tienes.' },
      ],
    }),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let toolName = null;
  let argsAcc = '';
  let textAcc = '';
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';
    for (const line of lines) {
      if (!line.startsWith('data: ')) continue;
      const payload = line.slice(6).trim();
      if (payload === '[DONE]') continue;
      try {
        const obj = JSON.parse(payload);
        const delta = obj?.choices?.[0]?.delta;
        if (delta?.content) textAcc += delta.content;
        const tc = delta?.tool_calls?.[0];
        if (tc) {
          if (tc.function?.name) toolName = tc.function.name;
          if (tc.function?.arguments) argsAcc += tc.function.arguments;
        }
      } catch { /* ignore */ }
    }
  }
  if (!toolName) throw new Error(`Expected tool_call in stream. Got text: ${textAcc.slice(0, 200)}`);
  return `tool=${toolName} args=${argsAcc.slice(0, 100)}`;
}

async function run(label, fn) {
  process.stdout.write(`[${label}]... `);
  const t0 = Date.now();
  try {
    const out = await fn();
    console.log(`OK (${Date.now() - t0}ms) :: ${out}`);
    return true;
  } catch (err) {
    console.log(`FAIL (${Date.now() - t0}ms) :: ${err.message}`);
    return false;
  }
}

(async () => {
  console.log(`Gateway: ${GATEWAY_URL}`);
  console.log(`Model:   ${MODEL}`);
  console.log('');

  const r1 = await run('1. plain', scenario1Plain);
  const r2 = await run('2. streaming', scenario2Streaming);
  const r3 = await run('3. tools', scenario3Tools);
  const r4 = await run('4. tools+streaming', scenario4ToolsStreaming);

  console.log('');
  if (r1 && r2 && r3 && r4) {
    console.log('All scenarios passed. Safe to commit to tool-calling + streaming with this model.');
    process.exit(0);
  } else if (r1 && r3) {
    console.log('Tool calling works but streaming has issues. Consider non-streaming v1.');
    process.exit(2);
  } else {
    console.log('Tool calling failed. Plan B: switch model or fall back to JSON-mode + prompt stuffing.');
    process.exit(3);
  }
})();
