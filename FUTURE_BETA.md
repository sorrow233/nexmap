# FUTURE_BETA: Practical Evolution Roadmap

Based on the current codebase (NexMap with Gemini integration), here are practical, high-value features that can be implemented to significantly enhance the user experience.

## 1. Smart Layout Engine
**Current State**: Basic manual positioning with some helper functions (`calculateMindmapChildPositions`).
**Feature**: Implement a dynamic auto-layout system.
- **Force-Directed Graph**: Toggle to let nodes naturally repel/attract for organic organization.
- **Auto-Tree**: One-click cleanup to align a messy brainstorming session into a strict hierarchy.
- **Smart Collision**: Real-time prevention of card overlaps during "Sprout" generation (partially improved recently, but can be robust global constraints).

## 2. Multi-Modal Node Types
**Current State**: Nodes are primarily text/markdown with image support.
**Feature**: Richer interaction types within cards.
- **Checklist Nodes**: Native tasks with progress bars that roll up to parent nodes.
- **Embed Nodes**: YouTube, Website, or Figma embeds directly on the canvas.
- **Code Execution**: Javascript/Python cells that run locally (like Jupyter on canvas) for quick calculations or data handling.

## 3. AI "Gardener" Mode (Async Organization)
**Current State**: AI interaction is user-initiated (Chat/Sprout).
**Feature**: Background AI agent.
- **Duplicate Detection**: AI suggests merging similar ideas across the board.
- **Semantic Clustering**: "I noticed these 5 cards are about 'Marketing', shall I group them?"
- **Auto-Tagging**: AI automatically applies tags/colors based on card content for visual filtering.

## 4. Enhanced Knowledge Export
**Current State**: Likely JSON/Image export (inferred from `saveBoard`).
**Feature**: Deep integration with PKM tools.
- **Obsidian/Notion Sync**: Bi-directional sync where map nodes become pages and links become relations.
- **PDF Report Generation**: Turn a mind map into a linear document/outline automatically.

## 5. Offline-First PWA with Realtime Sync
**Current State**: IndexedDB (local) + Cloud Sync (snapshot based).
**Feature**: Conflict-free Replicated Data Types (CRDTs).
- **True Collaboration**: Multi-user cursor tracking and simultaneous editing.
- **Robust Offline**: Edits verify against a local CRDT log and merge gracefully when online.
