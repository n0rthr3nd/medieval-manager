# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Medieval Manager** is a full-stack app for managing weekly office sandwich (bocadillo) orders. Users place orders from **Saturday 00:00 until Friday 23:59** for the upcoming Friday. It includes an admin dashboard, AI-powered recommendations, a streaming chatbot with tool-calling, and push notifications.

## Commands

### Backend
```bash
cd backend
npm run dev        # tsx watch (hot reload)
npm run build      # compile to dist/
npm start          # run compiled dist/index.js
```

### Frontend
```bash
cd frontend
npm start          # ng serve (localhost:4200)
npm run build      # output: dist/bocadillos-frontend/browser/
npm test           # karma unit tests
```

### AI Gateway
```bash
cd ai-gateway
npm run dev        # node --watch server.js
npm run spike      # test tool-calling (scripts/spike-tools.js)
```

### One-off scripts (after building backend)
```bash
cd backend
npx tsx src/scripts/createAdmin.ts         # seed admin user
npx tsx src/scripts/migrateIngredientes.ts # migrate ingredient data
```

### Update production frontend URL
```bash
./update-backend-url.sh   # patches environment.prod.ts, then commit + push
```

## Architecture

Three independent packages — `frontend/`, `backend/`, `ai-gateway/` — each with their own `package.json` and `node_modules/`.

### Backend (`backend/src/`)
Express + TypeScript + MongoDB (Mongoose). Standard layered structure: `routes/` → `controllers/` → `services/` → `models/`. Key middleware:

- `middleware/auth.ts` — `authenticateToken` (JWT) and `requireAdmin`
- `middleware/orderWindow.ts` — blocks order mutations outside Saturday–Friday 23:59
- `middleware/chatbotGate.ts` — feature flag for the chatbot endpoint

Validation uses **Zod** in `validators/`. On startup (`index.ts`), the backend auto-creates the admin user and seeds ingredients if the DB is empty.

### Frontend (`frontend/src/app/`)
Angular 19 standalone components with signal-based reactivity. Pages are lazy-loaded via `app.routes.ts`. Auth is handled by:

- `interceptors/auth.interceptor.ts` — injects `Authorization: Bearer <token>` on every request
- `guards/auth.guard.ts` — `authGuard` and `adminGuard` protecting routes

Environment-specific API URLs live in `src/environments/environment.ts` (dev) and `environment.prod.ts` (prod).

### AI Gateway (`ai-gateway/server.js`)
Single-file thin proxy. Sits between the backend and a local Ollama instance. Adds API key auth (`X-API-KEY` header) and per-IP rate limiting, then pipes streaming SSE/chunked responses without buffering. Exposed to the internet via Tailscale Funnel.

### Chatbot / AI Flow
- **`/api/chat`** — SSE endpoint; `chatbotService.ts` runs a tool-calling loop against the Ollama gateway (OpenAI-compatible endpoint). Tools are defined in `services/chatbot/tools.ts` and can create/update orders and fetch ingredients.
- **`/api/chat/recommendations`** — legacy SSE endpoint for AI-driven sandwich suggestions.

### Push Notifications
VAPID-based web push. The client subscribes via `push-notification.service.ts`; endpoints are stored in the `pushsubscriptions` collection. `notificationScheduler.ts` uses `node-cron` to send daily reminders.

## Environment Variables

**Backend** (`.env` in `backend/`):
```
PORT=3000
MONGODB_URI=mongodb://localhost:27017/bocadillos
JWT_SECRET=
FRONTEND_URL=http://localhost:4200
VAPID_PUBLIC_KEY=
VAPID_PRIVATE_KEY=
VAPID_SUBJECT=mailto:...
AI_API_URL=http://localhost:8080
AI_MODEL=gemma2:2b
```

**AI Gateway** (`.env` in `ai-gateway/`):
```
PORT=8080
OLLAMA_URL=http://127.0.0.1:11434
GATEWAY_API_KEY=
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX=60
```

## Deployment

| Service | Host | Notes |
|---|---|---|
| Frontend | Vercel | Build: `npm run build`, output: `dist/bocadillos-frontend/browser` |
| Backend | Render | Build: `npm run build`, start: `npm start`; must set `FRONTEND_URL` for CORS |
| Database | MongoDB Atlas | Free M0, connection via `MONGODB_URI` |
| AI Gateway | Self-hosted (Tailscale) | Not on Render/Vercel; requires local Ollama |

## Key Constraints

- **Order window** is enforced server-side in `orderWindow.ts` (Saturday 00:00 → Friday 23:59, Spanish timezone). It cannot be bypassed client-side.
- **CORS** currently allows all origins in development (`cors()` with no config). Restrict via `FRONTEND_URL` in production.
- The chatbot uses the `chatbotMode` field on the `User` model to determine which Ollama model/behavior to use.
- Ingredient bread rules (integral/seeds only for normal size) are validated in `bocadilloController.ts`, not just the frontend form.
