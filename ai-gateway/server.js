/**
 * AI Gateway: thin auth + rate-limit proxy in front of Ollama.
 *
 * Sits on the same host as Ollama (inside the Tailscale tailnet) and is exposed
 * to the public internet via Tailscale Funnel. The medieval-manager backend on
 * Render is the only intended client; it authenticates with X-API-KEY.
 *
 * Streaming-aware: SSE / chunked responses are piped through without buffering.
 */

const crypto = require('node:crypto');
const { Readable } = require('node:stream');
const express = require('express');
const rateLimit = require('express-rate-limit');

require('node:fs').existsSync('.env') && require('node:fs')
  .readFileSync('.env', 'utf8')
  .split('\n')
  .filter(line => line && !line.startsWith('#'))
  .forEach(line => {
    const idx = line.indexOf('=');
    if (idx > 0) {
      const key = line.slice(0, idx).trim();
      const value = line.slice(idx + 1).trim();
      if (!process.env[key]) process.env[key] = value;
    }
  });

const PORT = parseInt(process.env.PORT || '8080', 10);
const OLLAMA_URL = (process.env.OLLAMA_URL || 'http://127.0.0.1:11434').replace(/\/$/, '');
const GATEWAY_API_KEY = process.env.GATEWAY_API_KEY || '';
const RATE_LIMIT_WINDOW_MS = parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000', 10);
const RATE_LIMIT_MAX = parseInt(process.env.RATE_LIMIT_MAX || '60', 10);
const UPSTREAM_TIMEOUT_MS = parseInt(process.env.UPSTREAM_TIMEOUT_MS || '120000', 10);

if (!GATEWAY_API_KEY || GATEWAY_API_KEY === 'change_me_to_a_long_random_string') {
  console.error('FATAL: GATEWAY_API_KEY is not set. Refusing to start.');
  process.exit(1);
}

const app = express();
app.disable('x-powered-by');
app.set('trust proxy', 1);

// Health endpoint (no auth) so Tailscale/Render can probe.
app.get('/healthz', (_req, res) => res.json({ ok: true }));

// API key check (constant-time compare).
app.use((req, res, next) => {
  const presented = req.header('x-api-key') || '';
  const expected = GATEWAY_API_KEY;
  const a = Buffer.from(presented);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    return res.status(401).json({ error: 'unauthorized' });
  }
  next();
});

// Per-IP rate limit. The backend on Render has a stable egress so this is
// mostly a circuit breaker against a leaked key + abuser pair.
app.use(rateLimit({
  windowMs: RATE_LIMIT_WINDOW_MS,
  max: RATE_LIMIT_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'rate_limited' },
}));

app.use(express.json({ limit: '256kb' }));

const ALLOWED_PATHS = new Set([
  '/v1/chat/completions',  // OpenAI-compatible (supports tools)
  '/api/chat',             // Ollama native (also supports tools)
  '/api/tags',             // List available models (debug)
]);

app.all('*', async (req, res) => {
  if (!ALLOWED_PATHS.has(req.path)) {
    return res.status(404).json({ error: 'not_found' });
  }

  const upstreamUrl = `${OLLAMA_URL}${req.path}`;
  const isStreamRequested = req.body && req.body.stream === true;

  const controller = new AbortController();
  const timeout = isStreamRequested
    ? null
    : setTimeout(() => controller.abort(), UPSTREAM_TIMEOUT_MS);

  let upstream;
  try {
    upstream = await fetch(upstreamUrl, {
      method: req.method,
      headers: { 'content-type': 'application/json' },
      body: ['GET', 'HEAD'].includes(req.method) ? undefined : JSON.stringify(req.body || {}),
      signal: controller.signal,
    });
  } catch (err) {
    if (timeout) clearTimeout(timeout);
    console.error('[gateway] upstream error:', err.message);
    return res.status(502).json({ error: 'upstream_error', detail: err.message });
  }

  if (!upstream.ok && !isStreamRequested) {
    if (timeout) clearTimeout(timeout);
    const text = await upstream.text();
    return res.status(upstream.status).type('application/json').send(text);
  }

  // Forward content-type and disable any buffering layer in the path.
  res.status(upstream.status);
  const ct = upstream.headers.get('content-type');
  if (ct) res.setHeader('content-type', ct);
  res.setHeader('cache-control', 'no-cache, no-transform');
  res.setHeader('x-accel-buffering', 'no');
  res.flushHeaders?.();

  if (!upstream.body) {
    if (timeout) clearTimeout(timeout);
    return res.end();
  }

  // Pipe upstream body straight through.
  const nodeStream = Readable.fromWeb(upstream.body);
  nodeStream.pipe(res);

  const cleanup = () => {
    if (timeout) clearTimeout(timeout);
    try { controller.abort(); } catch {}
    try { nodeStream.destroy(); } catch {}
  };

  req.on('close', cleanup);
  nodeStream.on('error', err => {
    console.error('[gateway] stream error:', err.message);
    cleanup();
    if (!res.writableEnded) res.end();
  });
  nodeStream.on('end', () => {
    if (timeout) clearTimeout(timeout);
  });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`[gateway] listening on :${PORT} -> ${OLLAMA_URL}`);
});
