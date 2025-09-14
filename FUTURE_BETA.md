# FUTURE_BETA: Practical Improvements & Debt Paydown

> This document outlines realistic, high-impact improvements to the code base that can be implemented in the near term to improve stability, maintainability, and performance.

## 1. Modularization & Architecture

### 1.1 Complete Component Decomposition
We have started modularizing "God Files" (e.g., `FeedbackView.jsx`, `gemini.js`), but more work is needed:
- **`Canvas.jsx`**: This is likely the largest and most complex component. It should be split into:
    - `CanvasRenderer.jsx`: Handles direct canvas drawing/rendering.
    - `CanvasInteraction.jsx`: Handles gestures and input.
    - `CanvasState.jsx`: Manages local state if not fully in Zustand.
- **`SettingsModal.jsx`**: Split tabs into separate files (partially done, ensure consistency).

### 1.2 TypeScript Migration
The codebase is currently JavaScript. Migrating to TypeScript will prevent a class of bugs (undefined properties, type mismatches) especially in the complex data structures of `cards` and `connections`.
- **Strategy**: Incremental migration. Start with `src/utils` and `src/services`, then move to leaf components (`Card.jsx`, `CommentItem.jsx`).

## 2. Testing & Quality Assurance

### 2.1 Unit Testing Framework
Currently, there are no visible `.test.js` files.
- **Action**: Install `vitest` and `react-testing-library`.
- **Targets**: 
    - `src/utils/format.js` (easy win).
    - `src/services/image/geminiImageGenerator.js` (mock fetch).
    - `src/components/feedback/FeedbackCard.jsx` (interaction testing).

### 2.2 End-to-End (E2E) Testing
- **Action**: Setup Playwright or Cypress.
- **Critical Flows**: 
    - Creating a new board.
    - Sprouting a card.
    - Switching models.

## 3. Performance Optimization

### 3.1 Virtualization
As specific boards grow "infinite", rendering performance will degrade.
- **Action**: Implement viewport culling (only render cards visible in the viewport + buffer).

### 3.2 Bundle Size Analysis
- **Action**: Run `vite-bundle-visualizer` to identify heavy dependencies.
- **Potential**: Lazy load heavy components like `Canvas` or specific AI provider libraries.

## 4. User Experience Polish

### 4.1 Error Boundaries
- **Action**: Wrap `Canvas` and critical modals in `ErrorBoundary` components to prevent white screens on crash.
- **Action**: Improve "Service Unavailable" messages with retry actions (partially done in `gemini.js`).

### 4.2 Accessibility (a11y)
- **Action**: Audit `aria-labels` on icon-only buttons (Toolbar, ChatBar).
- **Action**: Ensure keyboard navigation works for the Canvas (moving selection with arrows).
