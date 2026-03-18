# NexMap

NexMap is an AI-first infinite canvas for organizing ideas, conversations, notes, and visual context on a spatial board.

Documentation snapshot: `v2.2.190` on `2026-03-13`

## What The App Includes

- Infinite canvas with cards, notes, groups, connections, zoom/pan, selection, and board-level prompts
- AI chat orchestration with per-card task isolation, streaming output, batch chat, sprout/branch workflows, and image generation
- Multi-provider model settings: Gemini native, OpenAI-compatible providers, and built-in system credits for users without their own keys
- Gallery workflows: search across boards, notes center, favorites, statistics, trash, pricing, feedback, and admin entry
- Cloud sync with Firebase plus local IndexedDB caching, offline fallback, retry queues, and read-only tab locking
- Cloudflare Pages Functions for AI proxying, system credits, payments, redemption codes, feedback, and utility endpoints
- Optional browser extension for sending selected web content into the broader workflow

## Tech Stack

| Area | Current stack |
| --- | --- |
| Frontend | React 18, Vite, React Router 7 |
| State | Zustand slices + Zundo temporal history |
| Styling | Tailwind CSS, Framer Motion, Lucide |
| Persistence | IndexedDB, localStorage, Firebase Firestore/Auth |
| AI | Gemini native protocol, OpenAI-compatible protocol, Cloudflare proxy chain |
| Hosting | Cloudflare Pages + Cloudflare Functions |
| Payments | Stripe REST API through Functions |

## Project Layout

```text
src/
  components/        UI building blocks, board UI, chat UI, settings, share UI
  hooks/             board orchestration, sync, gestures, naming, summaries
  pages/             gallery, board, pricing, feedback, admin, legal pages
  services/          LLM, sync, storage, notes, linkage, exports, stats
  store/             Zustand store and slices
  modules/landing/   marketing landing page
functions/
  api/               Cloudflare Pages Functions endpoints
browser-extension/   browser selection/import extension
docs/                codebase documentation
```

## Quick Start

```bash
npm install
npm run dev
```

Useful scripts:

```bash
npm run build
npm run deploy:main
npm run deploy:beta
npm run ext:build
npm run ext:zip
```

`npm run build` also regenerates the sitemap before running Vite build.

## Current Architecture Notes

- `src/App.jsx` owns route composition, board loading, global dialogs, and search modal orchestration.
- `src/pages/BoardPage.jsx` is the runtime shell for the canvas, chat bar, note overlay, board instruction panel, and settings modal.
- `src/store/useStore.js` combines 10 Zustand slices and keeps temporal history for cards, connections, groups, and board prompts.
- `src/services/llm/` contains the provider registry/factory plus the Gemini/OpenAI/system-credits implementations.
- `src/services/syncService.js` now contains the heavier conflict handling, retry scheduling, offline fallback, and Firestore listeners.

## Documentation

- [Chinese README](./README_zh-CN.md)
- [Codebase Documentation](./docs/CODEBASE_DOCUMENTATION.md)
- [API / Functions](./docs/API.md)
- [History](./docs/HISTORY.md)
