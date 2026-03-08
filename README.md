# Craftly — AI-Powered Canvas Design Editor

> A **Canva-style** design editor built with **Angular 17 + Signals**, featuring AI template generation, canvas panning, dynamic background fills, and pixel-perfect PNG export.

---

## ✨ Feature Highlights

### 🎨 Design Editor
| Feature | Description |
|---|---|
| **Template Setup Modal** | Name your design, pick from 10 preset sizes (Instagram, A4, YouTube, etc.) or enter custom dimensions |
| **Dynamic Canvas** | The canvas scales to your chosen template dimensions — 1080×1080, 1920×1080, or anything custom |
| **Canvas Background Fill** | Set any solid color, gradient preset, or custom CSS gradient as the canvas background — fills the entire canvas at once |
| **Canvas Panning** | Drag the background, hold **Space + drag**, or use **middle mouse button** to pan around the infinite workspace |
| **Ctrl + Scroll to Zoom** | Pinch/scroll zoom with Ctrl held — works alongside the zoom controls in the top-right overlay |
| **Fit to Screen** | One-click zoom reset that re-centers the canvas in the viewport |

### 🧩 Sidebar (Canva-style Icon Rail)
| Tab | What it does |
|---|---|
| **Templates** | AI prompt input + Quick Start preset cards (Social Post, Minimal, Dark Card, Event Flyer) |
| **Text** | Add Heading, Subheading, or Body text elements with one click |
| **Images** | Upload images via drag-and-drop or file picker |
| **Shapes** | Add solid rectangles — more shapes coming soon |
| **Uploads** | Dedicated upload panel |
| **Layers** | Layer list showing all elements, with reorder and lock controls |

### 🖼️ Canvas Elements
- **Rect** — filled rectangles, corner radius, solid or gradient fill, opacity
- **Text** — font family (Syne / DM Sans / Georgia / Courier), size, weight, color, alignment
- **Image** — upload from disk or generate via AI; placeholder shows until an image is assigned
- **Drag & resize** — 8-handle resize with shift-to-snap; Arrow key nudge (1px / 10px with Shift)
- **Layer controls** — move up/down, duplicate, lock/unlock, delete (or press `Del`)
- **Double-click to edit text** inline

### 🤖 AI Generation
- **AI Template Generator** — describe your design in natural language, pick a visual style (Bold / Minimal / Elegant / Playful / Dark / Retro), and Gemini generates a complete layout
- **Dynamic prompt dimensions** — the AI prompt is built with your **actual canvas size** (not hardcoded 600×800), so zones, font examples, and margin rules all scale correctly
- **Auto-fills canvas background** — the AI's background element color is extracted and applied to the canvas background signal so the full canvas is always filled
- **AI Image Generation** — `aiPrompt` fields in AI layouts generate images via the Pollinations API
- **Overlap resolver** — post-processes the AI JSON to push overlapping elements apart before rendering

### 💾 Export
- **Download PNG** — renders via native **Canvas 2D API** (not html2canvas) at the exact template pixel dimensions — completely zoom/DOM-independent
  - Solid colors and CSS `linear-gradient` backgrounds both export correctly
  - Images render with `object-fit: cover` behavior
  - Text is word-wrapped and clipped to element bounds
  - Output is at `devicePixelRatio` (minimum 2×) for hi-DPI sharpness

### 🎛️ Properties Panel
- Always visible on the right side
- **No element selected** → Canvas Background panel (solid color picker, 16 quick chips, 10 gradient presets, custom CSS input + Reset to White)
- **Element selected** → Element-specific properties (position, size, fill, typography, alignment, opacity, lock, duplicate, delete)

---

## ⚡ Quick Start

### 1. Install dependencies
```bash
npm install
```

### 2. Set your Gemini API key

The app uses the **Gemini API** via a local Express proxy.

**Windows (PowerShell):**
```powershell
$env:GEMINI_API_KEY="AIza-your-key-here"
```

**Mac / Linux:**
```bash
export GEMINI_API_KEY=AIza-your-key-here
```

Get your key → https://aistudio.google.com/app/apikey

### 3. Start both servers
```bash
npm run dev
```

Runs in parallel:
- `http://localhost:3000` — Express CORS proxy (Gemini + Image APIs)
- `http://localhost:4200` — Angular dev server

Then open **http://localhost:4200**.

---

## 🏗️ Architecture

### Why a proxy server?

Browsers block direct calls to `generativelanguage.googleapis.com` due to CORS. A tiny Node.js proxy (`server/proxy.js`) forwards requests and adds your API key server-side — it never touches the browser.

```
Browser (Angular :4200)
    │  POST /api/claude  (layout generation)
    │  POST /api/image   (image generation)
    ▼
Express Proxy (:3000)
    │  Adds x-goog-api-key header server-side
    ▼
Gemini API / Pollinations AI
```

### State Management

All editor state lives in **`CanvasService`** using Angular Signals:

| Signal | Type | Purpose |
|---|---|---|
| `elements` | `CanvasElement[]` | All canvas elements in z-order |
| `selectedId` | `string \| null` | Currently selected element |
| `editingId` | `string \| null` | Element being text-edited |
| `zoom` | `number` | Current zoom level |
| `canvasWidth` | `number` | Template width in px |
| `canvasHeight` | `number` | Template height in px |
| `canvasBg` | `string` | Canvas background (color or gradient) |
| `templateName` | `string` | Design name shown in topbar |
| `showSetup` | `boolean` | Whether template setup modal is showing |

---

## 📁 Project Structure

```
craftly/
├── server/
│   └── proxy.js                    ← Node.js CORS proxy
├── src/
│   ├── app/
│   │   ├── app.component.ts        ← Root shell (setup → editor routing)
│   │   ├── models/
│   │   │   └── canvas.model.ts     ← Element types, PRESETS, specToElement()
│   │   ├── services/
│   │   │   ├── canvas.service.ts   ← Central state (Signals)
│   │   │   ├── ai.service.ts       ← AI layout + image generation
│   │   │   └── download.service.ts ← Canvas 2D API export
│   │   └── components/
│   │       ├── template-setup/     ← New design modal (name + size picker)
│   │       ├── topbar/             ← Logo, name, zoom, undo/redo, download
│   │       ├── sidebar/            ← Icon rail + expandable panels
│   │       ├── canvas/             ← Drag, resize, pan, element rendering
│   │       ├── properties-panel/   ← BG panel + element properties
│   │       ├── ai-modal/           ← AI template generator modal
│   │       └── img-modal/          ← AI image replacement modal
│   ├── styles.scss                 ← Global design tokens (CSS vars)
│   └── index.html
├── .gitignore
├── package.json
└── angular.json
```

---

## 🖥️ Running Separately (Two Terminals)

**Terminal 1 — Proxy:**
```bash
node server/proxy.js
```

**Terminal 2 — Angular:**
```bash
npm start
```

---

## 📦 Production Build
```bash
npm run build
# Output → dist/craftly-editor/
```

---

## 🔑 Keyboard Shortcuts

| Shortcut | Action |
|---|---|
| `Space + Drag` | Pan canvas |
| `Middle Mouse Drag` | Pan canvas |
| `Ctrl / ⌘ + Scroll` | Zoom in/out |
| `Arrow Keys` | Nudge selected element 1px |
| `Shift + Arrow Keys` | Nudge selected element 10px |
| `Delete` / `Backspace` | Delete selected element |
| `Escape` | Deselect element |
| `Double Click` | Edit text inline |

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| Framework | Angular 17 (Standalone components + Signals) |
| Styling | Vanilla CSS (component-scoped) + CSS custom properties |
| AI Text | Gemini API — `gemini-1.5-pro` (via local proxy) |
| AI Images | Pollinations API |
| Export | Native Canvas 2D API (no html2canvas dependency for rendering) |
| Fonts | Google Fonts — Syne + DM Sans |
