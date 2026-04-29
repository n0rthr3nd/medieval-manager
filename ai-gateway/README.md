# AI Gateway

Thin auth + rate-limit proxy that sits in front of Ollama on the host inside the
Tailscale tailnet, exposed publicly via Tailscale Funnel. The medieval-manager
backend on Render is the only intended client.

```
[Render backend] --(HTTPS + X-API-KEY)--> [Tailscale Funnel] --> [AI Gateway :8080] --> [Ollama :11434]
```

## What it does

- Validates `X-API-KEY` (constant-time compare).
- Per-IP rate limit as a circuit breaker.
- Whitelists only `/v1/chat/completions`, `/api/chat`, `/api/tags`.
- SSE / chunked passthrough — no buffering — so streaming works end to end.

## Setup on the Ollama host

```bash
cd ai-gateway
npm install
cp .env.example .env
# Generate a strong key:
openssl rand -hex 32
# Paste it as GATEWAY_API_KEY in .env
```

Start it:

```bash
npm start
# [gateway] listening on :8080 -> http://127.0.0.1:11434
```

Smoke test from the same host:

```bash
curl -s http://127.0.0.1:8080/healthz
# {"ok":true}

curl -s -H "x-api-key: $GATEWAY_API_KEY" http://127.0.0.1:8080/api/tags | head
```

## Expose with Tailscale Funnel

Funnel exposes a Tailscale node to the public internet over HTTPS. Run on the
gateway host (one-time):

```bash
sudo tailscale funnel --bg --https=443 --set-path=/ http://localhost:8080
sudo tailscale funnel status
```

You'll get a URL like `https://your-host.tail-xxxx.ts.net`. Use that as
`AI_API_URL` in the medieval-manager backend env (Render).

## Backend env (Render)

```
AI_API_URL=https://your-host.tail-xxxx.ts.net
AI_API_KEY=<the same value as GATEWAY_API_KEY>
AI_MODEL=gpt-oss:120b
```

## Run the spike

After the gateway is reachable, run the spike from anywhere with internet:

```bash
GATEWAY_URL=https://your-host.tail-xxxx.ts.net \
GATEWAY_API_KEY=xxx \
MODEL=gpt-oss:120b \
npm run spike
```

Exit codes:
- `0` — plain, streaming, tools, tools+streaming all work. Commit to the plan.
- `2` — tools work but streaming is broken/buffered. Ship v1 without streaming.
- `3` — tool calling fails. Switch model (deepseek/kimi/glm/qwen) or fall back
  to JSON-mode prompt stuffing.

## Run as a service (systemd)

`/etc/systemd/system/ai-gateway.service`:

```ini
[Unit]
Description=Medieval Manager AI Gateway
After=network.target ollama.service

[Service]
Type=simple
User=youruser
WorkingDirectory=/path/to/medieval-manager/ai-gateway
EnvironmentFile=/path/to/medieval-manager/ai-gateway/.env
ExecStart=/usr/bin/node server.js
Restart=on-failure
RestartSec=5

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now ai-gateway
sudo journalctl -u ai-gateway -f
```

## Security notes

- Never expose Ollama (`:11434`) directly. It has no authentication.
- The gateway only allows `/v1/chat/completions`, `/api/chat`, `/api/tags`. No
  `/api/pull`, `/api/delete`, etc., so even a leaked key cannot mutate models.
- Rotate `GATEWAY_API_KEY` if leaked: update `.env` here, restart, then update
  `AI_API_KEY` in Render. The two need to match.
- Keep an eye on `journalctl -u ai-gateway` for `upstream_error` and 401s.
