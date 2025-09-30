# NexMap Codebase Documentation

## 1. Overview
NexMap is an AI-native, infinite canvas thinking tool designed for brainstorming, mind mapping, and creative exploration. It combines a spatial UI with powerful LLM capabilities (Gemini, Kimi, DeepSeek) to help users generate, organize, and expand ideas.

**Tech Stack:**
- **Frontend:** React (Vite), TailwindCSS, Framer Motion (animations).
- **State Management:** Zustand (Global State) + Zundo (Temporal/Undo-Redo).
- **Backend/Edge:** Cloudflare Pages Functions (Serverless API), Cloudflare KV (Credits/Usage).
- **Database:** Firebase Firestore (Cloud Sync) + IndexedDB (Local Cache/Offline).
- **AI:** Google Gemini (Primary), DeepSeek/Moonshot (System Credits/Reasoning), DALL-E 3 (Image Gen - via GMI).

## 2. Architecture Visual

```mermaid
graph TD
    User[User Client] -->|React/Canvas| Store[Zustand Store]
    Store -->|Persist| IDB[IndexedDB (Local)]
    Store -->|Sync| SyncService[Sync Service]
    SyncService -->|Firestore SDK| Firebase[Firebase Firestore]
    
    User -->|API Requests| Edge[Cloudflare Functions]
    Edge -->|Proxy| GMI[GMI Cloud / Gemini API]
    Edge -->|KV Check| KV[Cloudflare KV (Credits)]
    Edge -->|Proxy| OpenAI[OpenAI Compatible APIs]
```

## 3. Key Directory Structure

```
src/
├── components/       # UI Components
│   ├── board/        # Board-specific (Sidebar, TopBar)
│   ├── chat/         # Chat UI (MessageItem, CodeBlock)
│   ├── Canvas.jsx    # Core Infinite Canvas Engine
│   ├── Card.jsx      # Node Component
│   ├── Zone.jsx      # Grouping Component
│   └── ...
├── services/         # Business Logic & Singletons
│   ├── ai/           # AI Manager & Prompt Utils
│   ├── llm/          # LLM Providers (Gemini, etc.)
│   ├── syncService.js # Cloud Sync (Firestore)
│   ├── storage.js    # Storage Facade
│   └── ...
├── store/            # State Management
│   ├── useStore.js   # Main Store Entry
│   └── slices/       # Modular State Slices (cardSlice, boardSlice...)
├── hooks/            # Custom Hooks (useAppInit, useCardCreator...)
├── pages/            # Route Pages (BoardPage, HomePage...)
└── ...
functions/            # Cloudflare Backend
├── api/
│   ├── gmi-serving.js    # Universal AI Proxy
│   ├── system-credits.js # Free Trial Logic
│   └── image-gen.js      # Image Gen Proxy
└── _middleware.js        # SEO & HTML Rewriter
```

## 4. Core Systems

### 4.1. Infinite Canvas Engine (`Canvas.jsx`)
- **Interaction:** Handles Panning (Space/Middle Click) vs. Selecting (Drag).
- **Gestures:** `useCanvasGestures` handles wheel zoom, pinch-to-zoom, and momentum panning.
- **Rendering:**
  - **Viewport Culling:** Only renders cards visible within the viewport (+ buffer) to maintain 60fps with hundreds of cards.
  - **Layers:** Connection lines (SVG) are rendered below cards. Active connections ("Liquid Light") are rendered on top.

### 4.2. State Management (`store/`)
- **Slices:** State is divided into slices (`cardSlice`, `boardSlice`, etc.) for maintainability.
- **Temporal:** `zundo` middleware provides infinite Undo/Redo capability for the entire store.
- **Initialization:** `useAppInit` hydrates state from IndexedDB first, then attempts to sync with Firebase.

### 4.3. Synchronization (`syncService.js`)
- **Hybrid approach:** "Local First" experience with Cloud backup.
- **Conflict Resolution:** Uses `syncVersion` (logical clock) and `lastUpdated` timestamps.
- **Deduplication:** Hashing mechanism prevents redundant writes to Firestore (saves quota).
- **Offline Mode:** Automatically detects quota errors or network issues and switches to offline mode.

### 4.4. AI Engine (`services/ai/`)
- **AIManager:** Singleton that manages task queues (Priority: Critical/High/Low).
- **Streaming:** Supports real-time text streaming from LLMs.
- **Context Awareness:** Chat requests include "Time Awareness" (System time) and "Card Context" (History).
- **System Credits:** Middleware (`system-credits.js`) manages limits for free users using Cloudflare KV.

## 5. Backend & Edge

### 5.1. Proxies
- **`gmi-serving.js`**: Hides API keys. Proxies requests to GMI Cloud/Gemini. Supports streaming responses via `TransformStream`.
- **`image-gen.js`**: Handles async polling for image generation tasks (Submit -> Poll -> Result).

### 5.2. SEO Middleware (`_middleware.js`)
- Intercepts HTML requests.
- Uses `HTMLRewriter` to inject dynamic OpenGraph tags, JSON-LD, and Hreflang tags based on the URL path and language prefix (e.g., `/ja/board/...`).

## 6. Key Features Implementation

### 6.1. Cards & Nodes
- **Data Structure:** Cards contain `data` (content, title, messages) and `layout` (x, y, width, height).
- **Markdown:** Supports GitHub Flavored Markdown, Code Blocks, and Mathematical rendering (KaTeX).
- **Fluid Typewriter:** Custom hook `useFluidTypewriter` creates a smooth text revealing effect during AI streaming.

### 6.2. Zones
- Visual grouping containers.
- Dragging a Zone title moves all contained cards.
- Supports custom headers, colors, and emojis.

### 6.3. Connections
- **Bezier Curves:** Calculated dynamically based on card positions.
- **Auto Layout:** Force-directed graph algorithm (d3-force style) or Grid layout for organizing messy boards.

## 7. Developer Notes
- **Commit Strategy:** Always check `npm` and `git` status. Commits should be granular.
- **Aesthetics:** "Premium" feel is mandatory. Use glassmorphism, subtle borders, and smooth transitions.
- **Performance:** Watch out for re-renders in `Canvas`. Use `React.memo` and granular selector subscriptions in `useStore`.
