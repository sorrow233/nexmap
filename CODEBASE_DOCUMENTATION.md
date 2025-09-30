# MixBoard Canvas Codebase Documentation

> 📚 This document serves as the main index for the MixBoard Canvas codebase documentation. The documentation has been modularized into separate files for better maintainability and readability.

## 📖 Table of Contents

### 1. [Overview](docs/OVERVIEW.md)
*   **Project Overview**: What MixBoard Canvas is and its key features.
*   **Tech Stack**: The technologies used in the project.
*   **Directory Structure**: The file organization of the codebase.

### 2. [Architecture](docs/ARCHITECTURE.md)
*   **Core Architecture**: High-level architecture diagram and description.
*   **Data Flow**: How data moves through the application, including user interactions, board diagrams, and startup flows.

### 3. [State Management](docs/STATE_MANAGEMENT.md)
*   **Zustand Store**: How the global state is managed.
*   **Slices**: Details on individual state slices like `cardSlice`, `aiSlice`, `canvasSlice`, etc.
*   **Undo/Redo**: Implementation of temporal history.

### 4. [Services](docs/SERVICES.md)
*   **LLM Service**: Architecture for multi-provider AI support (Gemini, OpenAI).
*   **AI Manager**: Task queue system for AI requests.
*   **Board Service**: Logic for creating, saving, and loading boards.
*   **Sync Service**: Cloud synchronization with Firebase.
*   **Storage**: Local storage mechanisms (IndexedDB, localStorage).

### 5. [Components](docs/COMPONENTS.md)
*   **Component Relationships**: How components interact.
*   **Core Components**: Details on `App`, `BoardPage`, `Canvas`, `Card`, etc.

### 6. [Hooks](docs/HOOKS.md)
*   **Custom Hooks**: Documentation for reusable logic like `useCardCreator`, `useDraggable`, `useAISprouting`.

### 7. [API (Cloudflare Functions)](docs/API.md)
*   **Endpoints**: Documentation for server-side functions like `gmi-proxy`, `system-credits`.

### 8. [Business Logic](docs/BUSINESS_LOGIC.md)
*   **Key Logic**: Deep dives into specific features like Multi-Provider support, Credits System, and Auto-Layout.

### 9. [Deployment](docs/DEPLOYMENT.md)
*   **Commands**: How to run, build, and deploy the application.
*   **Environment Variables**: Required configuration.

### 10. [FAQ & Notes](docs/FAQ.md)
*   **Common Questions**: State persistence details, security notes, performance tips.

### 11. [History](docs/HISTORY.md)
*   **Git History**: Summary of important changes, features, and bug fixes over time.
