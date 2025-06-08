# Project Architecture & Logic Map

This document outlines the high-level architecture, directory structure, and key logic locations for the project. It is designed to assist AI agents and developers in navigating the codebase.

## 1. Technology Stack
- **Framework**: React + Vite
- **State Management**: Zustand (using Slices pattern + Zundo for undo/redo)
- **Styling**: Tailwind CSS
- **Testing**: Vitest
- **AI Integration**: Custom service layer wrapping LLM providers
- **Deployment**: Cloudflare Pages

## 2. Directory Structure

### Root (`/src`)
| Directory | Description |
|-----------|-------------|
| **`components/`** | Shared, reusable UI components. |
| **`contexts/`** | React Context Providers (Global app state not in store, e.g., `LanguageContext`). |
| **`hooks/`** | Custom React hooks (e.g., UI logic, keyboard shortcuts). |
| **`modules/`** | Feature-specific domains (e.g., `landing` page). |
| **`services/`** | **[CRITICAL]** Business logic, API calls, and external integrations. |
| **`store/`** | **[CRITICAL]** Global state management (Zustand). |
| **`utils/`** | Helper functions (formatting, validation, debug loggers). |

## 3. Key Logic Locations

### 🧠 State Management (Zustand)
Located in `src/store/`.
- **Entry Point**: `src/store/useStore.js` (Combines slices, adds temporal middleware).
- **Slices** (`src/store/slices/`):
  - `canvasSlice.js`: Viewport, scale, and canvas interactions.
  - `cardSlice.js`: CRUD operations for cards/notes on the board.
  - `aiSlice.js`: AI generation state and message history.
  - `selectionSlice.js`: Managing selected items.
  - `connectionSlice.js`: Lines/connections between cards.

### 🤖 AI & LLM Services
Located in `src/services/`.
- **Main Entry**: `src/services/llm.js` (Chat completion, streaming, image generation wrappers).
- **Factory/Registry**: `src/services/llm/` (Model provider configuration).
- **Prompts**: Logic often resides within `llm.js` or specialized handlers in `aiSlice.js`.

### 💾 Data & Board Management
- **Board Logic**: `src/services/boardService.js` (Loading/saving boards, data transformation).
- **Synchronization**: `src/services/syncService.js` (Syncs state with remote storage/DB).
- **Persistence**: `src/services/storage.js`, `firebase.js`, `s3.js`.

### 🎨 UI & Interaction
- **Main Canvas**: Likely in `src/components/` (e.g., `Canvas`, `Board`).
- **Tools**: Interaction handlers often found in `src/hooks/` (e.g., generic drag/drop) or `slices/` (state updates).

## 4. Conventions
- **State Updates**: Logic for modifying application state should primarily reside in **Zustand Slices** (`src/store/slices/*.js`). Components should dispatch actions from these slices.
- **Business Logic**: Complex logic (e.g., parsing files, talking to APIs) belongs in **Services** (`src/services/*.js`), called by Slices or Components.
- **Debug**: `src/utils/debugLogger.js` is used for conditional logging in Beta/Dev environments.

## 5. Deployment Workflow
- **Beta**: `npm run ship:beta` (Builds & Deploys to Cloudflare Beta -> Pushes to Git `beta` branch).
- **Main**: Production releases.
