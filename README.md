# Craftly — AI Template Editor (Angular 17)

A Canva-like design editor with AI-powered template generation and image creation.

---

## ⚡ Quick Start

### 1. Install dependencies
```bash
npm install
```

### 2. Set your Anthropic API key

**Windows (Command Prompt):**
```cmd
set ANTHROPIC_API_KEY=sk-ant-your-key-here
```

**Windows (PowerShell):**
```powershell
$env:ANTHROPIC_API_KEY="sk-ant-your-key-here"
```

**Mac / Linux:**
```bash
export ANTHROPIC_API_KEY=sk-ant-your-key-here
```

Get your key at → https://console.anthropic.com/

### 3. Start both servers together
```bash
npm run dev
```

This runs **both** in parallel:
- `http://localhost:3000` — Express proxy (talks to Anthropic API)
- `http://localhost:4200` — Angular dev server (your app)

Then open **http://localhost:4200** in your browser.

---

## Why a proxy server?

Browsers block direct calls to `api.anthropic.com` due to **CORS policy** — the Anthropic API is designed for server-to-server use only.

The solution: a tiny Node.js proxy (`server/proxy.js`) runs locally and forwards requests from Angular to Anthropic, adding your API key server-side where it's safe.

```
Browser (Angular :4200)
    │  POST http://localhost:3000/api/claude
    ▼
Express Proxy (:3000)
    │  POST https://api.anthropic.com/v1/messages
    │  x-api-key: sk-ant-...  ← added server-side, never in browser
    ▼
Anthropic API
```

---

## Running separately (two terminals)

**Terminal 1 — Proxy:**
```bash
# Set API key first, then:
node server/proxy.js
```

**Terminal 2 — Angular:**
```bash
npm start
```

---

## Production build
```bash
npm run build
# Output → dist/craftly-editor/
```

---

## Project Structure

```
craftly/
├── server/
│   └── proxy.js                  ← Node.js CORS proxy (no npm deps needed)
├── src/
│   ├── app/
│   │   ├── app.component.ts
│   │   ├── models/canvas.model.ts
│   │   ├── services/
│   │   │   ├── canvas.service.ts ← State via Angular Signals
│   │   │   └── ai.service.ts     ← Calls proxy + Gemini (text & images)
│   │   └── components/
│   │       ├── topbar/
│   │       ├── sidebar/
│   │       ├── canvas/
│   │       ├── properties-panel/
│   │       ├── ai-modal/
│   │       └── img-modal/
│   ├── styles.scss
│   └── index.html
├── package.json
└── angular.json
```
