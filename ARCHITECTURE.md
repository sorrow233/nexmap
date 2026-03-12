# Project Architecture Map

This file is a quick navigation map for developers and coding agents. It reflects the codebase as of `2026-03-13`.

## Runtime Structure

- `src/App.jsx`
  Handles routes, board loading, global search, login/logout, board CRUD handoff, and top-level dialogs.
- `src/pages/GalleryPage.jsx`
  Hosts gallery, notes center, favorites, statistics, trash, feedback, and settings entry points.
- `src/pages/BoardPage.jsx`
  The board runtime shell. Composes canvas, chat bar, note overlay, board instruction panel, sidebar, and top bar.
- `src/hooks/useBoardLogic.js`
  Main board orchestration hook. It pulls together store state, board actions, AI actions, routing, and canvas interactions.

## Where Major Logic Lives

### State

- `src/store/useStore.js`: root Zustand store with temporal history
- `src/store/slices/`: canvas, cards, connections, groups, selection, AI, settings, share, credits, board metadata

### AI

- `src/services/llm.js`: public chat/stream/image entry points
- `src/services/llm/factory.js`: provider selection
- `src/services/llm/providers/gemini.js`: Gemini native transport, retries, search tool behavior, concurrency gate, fallback rules
- `src/services/ai/AIManager.js`: centralized task queue with card-level concurrency

### Persistence And Sync

- `src/services/boardService.js`: local board CRUD and metadata persistence
- `src/services/storage.js`: compatibility facade
- `src/services/syncService.js`: Firestore listeners, cloud writes, offline fallback, retry scheduling
- `src/services/imageStore.js`: IndexedDB image persistence

### Board Intelligence

- `src/services/customInstructionsService.js`: instruction catalog normalization and board-level enablement
- `src/services/boardTitle/metadata.js`: placeholder/manual/auto title rules
- `src/hooks/useAutoBoardNaming.js`: async automatic board naming
- `src/hooks/useAutoBoardSummaries.js`: auto summary / background trigger queue
- `src/hooks/useBoardBackground.js`: summary/background generation entry

### Edge / Server

- `functions/api/gmi-serving.js`: AI proxy
- `functions/api/system-credits.js`: free quota and image quota service
- `functions/api/create-checkout.js`, `webhook.js`, `order-details.js`: payments
- `functions/api/redeem.js`, `functions/api/admin/codes.js`: redemption code lifecycle
- `functions/api/feedback.js`: feedback and comments API
- `functions/_middleware.js`: bot-only SEO tag injection

## Editing Guide

- Canvas interaction bugs: inspect `src/components/Canvas.jsx`, `src/hooks/useCanvasGestures.js`, `src/hooks/useSelection.js`, and the canvas/card slices.
- AI transport bugs: inspect `src/services/llm/providers/gemini.js`, `src/services/llm/keyPoolManager.js`, `src/services/llm/providers/gemini/*`, and `functions/api/gmi-serving.js`.
- Sync/data loss bugs: inspect `src/services/syncService.js`, `src/services/boardService.js`, and `src/hooks/useBoardSync.js`.
- Settings/model selection bugs: inspect `src/store/slices/settingsSlice.js`, `src/components/settings/*`, and `src/components/ModelSwitcher.jsx`.

## Important Current Behaviors

- History only tracks `cards`, `connections`, `groups`, and `boardPrompts`.
- AI concurrency is globally scheduled and additionally constrained per card/model path.
- Official Gemini direct mode and proxy mode now follow different retry/search defaults.
- Search modal loads board content lazily with bounded concurrency instead of eager full hydration.
- Cloud sync can auto-switch into offline mode when quota/network failures are detected.
