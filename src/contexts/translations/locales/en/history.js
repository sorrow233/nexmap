export const history = {
    historyPage: {
        seoTitle: "Changelog",
        seoDesc: "See what's new in NexMap. A transparent look at our development journey.",
        backToHome: "BACK TO HOME",
        label: "CHANGELOG",
        titlePrefix: "Evolution of",
        titleHighlight: "NexMap",
        subtitle: "A transparent look at our journey from a rough prototype to a spatial thinking engine. We ship fast and iterate often.",
        endOfRecords: "End of records. The journey continues.",
        changes: [
            // ===== JANUARY 2026 =====
            {
                date: "Jan 06, 2026",
                version: "2.2.8",
                title: "Global Intelligence & SEO",
                items: [
                    "Implemented full-stack localized SEO (Hreflang) for EN/ZH/JA/KO/TW",
                    "Launched 'Manifesto' About page with bilingual support",
                    "Added neural usage analytics: Client-side token/character tracking & daily stats",
                    "Refined 'Branch' engine: Now uses AI to intelligently segment topics instead of regex",
                    "Visual Overhaul: New Bento Grid landing animations & simplified pricing flow",
                    "Modularized translation files into `locales/` directory for maintainability"
                ]
            },
            {
                date: "Jan 06, 2026",
                version: "2.2.7",
                title: "Core Experience",
                items: [
                    "Feature: Added 'Reference Index' sidebar for quick chat navigation",
                    "Fix: Resolved StickyNote persistence issues (delete/edit/duplicate bugs)",
                    "Performance: Auto-background generation for large boards (>10 cards)",
                    "AI: Enhanced Irasutoya prompt engineering for complex scene composition",
                    "UX: Decoupled 'New Note' creation for faster ideation",
                    "Refactor: Centralized S3 configuration for global bucket management"
                ]
            },
            {
                date: "Jan 05, 2026",
                version: "2.2.1",
                title: "Mobile & Infrastructure",
                items: [
                    "Mobile: Implemented long-press multi-select for touch interfaces",
                    "Layout: Optimized mobile bottom bar to prevent overlapping",
                    "Commerce: Added Order Number system & validated Payment Success modal",
                    "Security: Audit & removal of sensitive logs from settings",
                    "Bumped core version to 2.2 series",
                    "Fixed: Retry button for failed AI generations"
                ]
            },
            {
                date: "Jan 04, 2026",
                version: "2.1.4",
                title: "Stability Protocol",
                items: [
                    "Core: Removed artificial context truncation limits for larger models",
                    "Fix: Model switching now correctly applies to pre-existing cards",
                    "Fix: 'Edit Prompt' persistence issues resolved",
                    "Fix: React error #310 in Zone component resolved during high-concurrency",
                    "Improved error handling in AIManager for edge cases"
                ]
            },
            {
                date: "Jan 03, 2026",
                version: "2.1.1",
                title: "Identity & Sync",
                items: [
                    "Rebranding: Updated all app icons to new NexMap visual identity",
                    "Sync: Fixed Board Prompts (tags) cloud synchronization",
                    "Localization: Fixed Mac IME positioning bugs in Sidebar inputs",
                    "Export: Corrected logo watermark in exported images",
                    "Added dynamic SEO with react-helmet-async"
                ]
            },
            {
                date: "Jan 03, 2026",
                version: "2.1.0",
                title: "The Spatial Update",
                items: [
                    "Major: Redesigned Sidebar to floating Notion-style tags",
                    "Feature: Added 'Zone' for semantic spatial grouping",
                    "Feature: Prompt Sidebar with Drag-and-Drop capability",
                    "Fix: Resolved infinite render loop in BoardPage",
                    "Improved card selection visual feedback"
                ]
            },
            // ===== DECEMBER 2025 =====
            {
                date: "Dec 31, 2025",
                version: "2.0.0",
                title: "NexMap 2.0: Sprout",
                items: [
                    "Major Release: Quick Sprout for one-click recursive topic decomposition",
                    "AI Strategy: Implemented 'Curiosity Maximization' prompt chains",
                    "Layout: Standardized mindmap auto-layout for Sprout/Branch",
                    "Physics: Added collision detection for non-overlapping card placement",
                    "Complete UI overhaul with premium glassmorphism design"
                ]
            },
            {
                date: "Dec 30, 2025",
                version: "1.9.5",
                title: "Image & Export",
                items: [
                    "Refined image generation with Irasutoya style prompts",
                    "Fixed iPad Safari image export issues",
                    "Added user custom instructions support in settings",
                    "Modularized Gemini provider for better error handling",
                    "Improved share modal with multiple export formats"
                ]
            },
            {
                date: "Dec 29, 2025",
                version: "1.9.0",
                title: "Gallery Modernization",
                items: [
                    "Modernized Gallery UI with glassmorphism effects",
                    "Resolved scrolling issues on mobile devices",
                    "Added auto-retry (max 2) for API errors",
                    "Enabled manual language switching via settings",
                    "Improved board card hover animations"
                ]
            },
            {
                date: "Dec 28, 2025",
                version: "1.8.5",
                title: "AI Manager Overhaul",
                items: [
                    "Fixed Gemini 400 validation errors",
                    "Resolved AIManager message loss issue during streaming",
                    "Sanitized image data for API compatibility",
                    "Added support for multiple concurrent AI streams",
                    "Improved error messages for quota exhaustion"
                ]
            },
            {
                date: "Dec 27, 2025",
                version: "1.8.0",
                title: "Security & Backup",
                items: [
                    "Added 5-day timed sync rollback feature",
                    "Fixed data clearing bug on login",
                    "Introduced logout safety lock",
                    "Made manual JSON import always visible for recovery",
                    "Added scheduled auto-backup at 3 AM and 4 PM"
                ]
            },
            {
                date: "Dec 25, 2025",
                version: "1.7.5",
                title: "Localization",
                items: [
                    "Localized Pricing page content (EN, ZH, JA)",
                    "Added Tokushoho and Privacy Policy pages",
                    "Implemented region-based access restriction for payments",
                    "Added Korean language support (KO)",
                    "Improved date formatting for locales"
                ]
            },
            {
                date: "Dec 23, 2025",
                version: "1.7.0",
                title: "Stability & Polish",
                items: [
                    "Fixed ghost logout issues",
                    "Prevented welcome popup from reappearing after first visit",
                    "Optimized code structure with component splitting",
                    "Reduced initial bundle size by 15%",
                    "Improved loading state animations"
                ]
            },
            {
                date: "Dec 20, 2025",
                version: "1.6.5",
                title: "Connection Engine",
                items: [
                    "Refactored connection line rendering for better performance",
                    "Added curved Bezier paths for connections",
                    "Implemented connection color customization",
                    "Fixed connection persistence on board reload",
                    "Added 'Select Connected Cluster' feature"
                ]
            },
            {
                date: "Dec 18, 2025",
                version: "1.6.0",
                title: "Context Walking",
                items: [
                    "Implemented Graph Context Walking algorithm",
                    "AI now reads connected cards for better context",
                    "Added neighbor-depth configuration (1-3 levels)",
                    "Optimized token usage by pruning irrelevant nodes",
                    "Improved relevance scoring for context injection"
                ]
            },
            {
                date: "Dec 15, 2025",
                version: "1.5.5",
                title: "Card Improvements",
                items: [
                    "Added card resize handles for manual sizing",
                    "Implemented card pinning to prevent accidental moves",
                    "Added keyboard shortcuts for common actions",
                    "Fixed card z-index issues during drag",
                    "Improved card shadow and depth perception"
                ]
            },
            {
                date: "Dec 12, 2025",
                version: "1.5.0",
                title: "Markdown Rendering",
                items: [
                    "Enhanced Markdown support with syntax highlighting",
                    "Added code block copy button",
                    "Implemented table rendering in cards",
                    "Added LaTeX math formula support (experimental)",
                    "Fixed list indentation issues"
                ]
            },
            {
                date: "Dec 10, 2025",
                version: "1.4.5",
                title: "Batch Operations",
                items: [
                    "Added multi-select for cards (Shift+Click)",
                    "Implemented batch delete for selected cards",
                    "Added batch connection creation from selection",
                    "Introduced floating toolbar for selections",
                    "Grid layout for selected cards"
                ]
            },
            {
                date: "Dec 08, 2025",
                version: "1.4.0",
                title: "Search & Navigate",
                items: [
                    "Implemented global search across all boards",
                    "Added Cmd/Ctrl+K shortcut for quick search",
                    "Search results show preview snippets",
                    "Added keyboard navigation in search results",
                    "Improved search indexing performance"
                ]
            },
            // ===== NOVEMBER 2025 =====
            {
                date: "Dec 05, 2025",
                version: "1.3.5",
                title: "Cloud Sync",
                items: [
                    "Integrated Firebase Firestore for real-time sync",
                    "Added conflict resolution for simultaneous edits",
                    "Implemented offline mode with local fallback",
                    "Added sync status indicator in status bar",
                    "Fixed sync delay issues on slow networks"
                ]
            },
            {
                date: "Dec 02, 2025",
                version: "1.3.0",
                title: "Authentication",
                items: [
                    "Added Google Sign-In authentication",
                    "Implemented anonymous guest mode",
                    "Added account linking for guest-to-user upgrade",
                    "Created user profile management",
                    "Added session persistence across tabs"
                ]
            },
            {
                date: "Nov 28, 2025",
                version: "1.2.5",
                title: "Provider System",
                items: [
                    "Added multi-provider support (Gemini, OpenAI, Anthropic)",
                    "Implemented BYOK (Bring Your Own Key) feature",
                    "Added OpenAI-compatible protocol support",
                    "Created model selection dropdown per provider",
                    "Added connection testing for API keys"
                ]
            },
            {
                date: "Nov 25, 2025",
                version: "1.2.0",
                title: "Settings Panel",
                items: [
                    "Designed new Settings modal with tabs",
                    "Added language preference settings",
                    "Created credits & usage tracking panel",
                    "Implemented provider configuration UI",
                    "Added custom instructions for AI behavior"
                ]
            },
            {
                date: "Nov 22, 2025",
                version: "1.1.5",
                title: "Image Support",
                items: [
                    "Added image upload to cards (drag & drop)",
                    "Implemented image paste from clipboard",
                    "Added image preview in chat messages",
                    "Integrated vision models for image analysis",
                    "Created image gallery view in card"
                ]
            },
            {
                date: "Nov 18, 2025",
                version: "1.1.0",
                title: "AI Streaming",
                items: [
                    "Implemented streaming responses from Gemini",
                    "Added typing indicator during generation",
                    "Created abort mechanism for long generations",
                    "Optimized token counting for context window",
                    "Added retry mechanism for failed requests"
                ]
            },
            {
                date: "Nov 15, 2025",
                version: "1.0.5",
                title: "Canvas Controls",
                items: [
                    "Implemented pinch-to-zoom on touch devices",
                    "Added zoom controls (+/- buttons)",
                    "Created minimap for large canvases",
                    "Implemented pan with spacebar + drag",
                    "Added zoom-to-fit function"
                ]
            },
            {
                date: "Nov 12, 2025",
                version: "1.0.0",
                title: "First Stable Release",
                items: [
                    "Launched initial production version",
                    "Stabilized core infinite canvas functionality",
                    "Finalized card creation and deletion logic",
                    "Implemented basic AI chat per card",
                    "Added board management (create/rename/delete)"
                ]
            },
            {
                date: "Nov 08, 2025",
                version: "0.9.0",
                title: "Beta Testing",
                items: [
                    "Opened beta to limited testers",
                    "Fixed critical rendering bugs on Safari",
                    "Improved mobile responsiveness",
                    "Added board thumbnail generation",
                    "Collected initial user feedback"
                ]
            },
            {
                date: "Nov 05, 2025",
                version: "0.5.0",
                title: "Alpha Prototype",
                items: [
                    "Created initial canvas with drag-and-drop cards",
                    "Integrated basic Gemini API connection",
                    "Built React component architecture",
                    "Implemented Zustand state management",
                    "Deployed first version to Cloudflare Pages"
                ]
            }
        ]
    }
};
