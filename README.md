# Neural Canvas (Mixboard)

> [🇨🇳 中文](./README_zh-CN.md)

**A spatial workspace for your thoughts.**

Neural Canvas is an infinite whiteboard designed to help you organize ideas, plan projects, and explore topics visually. It combines a flexible canvas with a capable AI assistant, allowing you to move beyond linear text and think in 2D space.

![Canvas Preview](./public/preview.png)

## Features

### ♾️ Infinite Canvas
A boundless surface for your ideas.
*   **Spatial Organization**: Pan and zoom freely to arrange your workspace.
*   **Visual Connections**: Link notes together to map out relationships and flows.
*   **Persistent Space**: Your layout is saved exactly as you leave it.

### 🤖 AI Integration (Gemini 3)
A helpful assistant that sits alongside your work.
*   **Context Aware**: The AI understands the context of your board.
*   **Web Grounding**: Capable of searching the live web for up-to-date information (powered by Google Search).
*   **Reliable**: Built for stability with robust message handling.

### ⚡️ Modern Interface
Designed for focus and fluidity.
*   **Glassmorphism Design**: A clean, modern aesthetic with frosted glass elements.
*   **Dark Mode**: Easy on the eyes for late-night sessions.
*   **Fluid Interactions**: Smooth animations for every action.

## Tech Stack

*   **Frontend**: React 18, Vite
*   **Styling**: TailwindCSS
*   **AI**: Google Gemini 3 Flash
*   **State Management**: Zustand + Zundo (Undo/Redo)
*   **Cloud**: Firebase (Sync), Vercel (Hosting)

## Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment
Create a `.env` file in the root directory (optional for local preview):
```env
VITE_apiKey=your_gemini_api_key
```

### 3. Start Development Server
```bash
npm run dev
```
Open `http://localhost:5173` in your browser.

## Documentation
*   [Technical Overview (problem_synthesis.md)](./problem_synthesis.md)
*   [Integration Logs (walkthrough.md)](./walkthrough.md)
*   [Update Log (update.md)](./update.md)

---
*Built with ❤️ by the Neural Canvas Team*
