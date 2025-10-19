/**
 * English translations
 */
export const en = {
    nav: {
        about: "About",
        history: "History",
        pricing: "Pricing"
    },
    hero: {
        brand: "NexMap 2.0",
        title1: "Infinite",
        title2: "Canvas.",
        sub1: "Stop thinking in files and folders.",
        sub2: "Start thinking in connections.",
        ctaPrimary: "Start Thinking for Free",
        ctaSecondary: "See the magic",
        cards: {
            alpha: "Project Alpha",
            ideas: "Ideas",
            tags: "Tags flow",
            explore: "Exploration"
        }
    },
    bento: {
        headline: {
            pre: "For",
            highlight: "Professional",
            post: "LLM Users."
        },
        subtext: "To build the ultimate engine, we uncapped concurrency for massive parallel workloads, engineered a recursive graph-walker for deep context, and implemented spatial zoning for city-scale architecture.",
        graph: {
            badge: "Graph Context Walking",
            title: "It reads the connections.",
            text: "Traditional chat UIs are oblivious to structure. Our engine traverses the semantic graph of your canvas, pruning irrelevant nodes and injecting precise neighbor context into every generation.",
            stat1: "Token Window",
            stat2: "Depth"
        },
        sprout: {
            title: "Recursive \"Sprout\"",
            text: "Active ideation. Click \"Sprout\" to have the AI recursively branch one thought into five divergent execution paths."
        },
        concurrency: {
            title: "Unlimited Concurrency",
            text: "No \"Thinking...\" blockers. Fire off 50 streams simultaneous. Our non-blocking AIManager handles the load."
        },
        spatial: {
            badge: "Spatial Organization",
            title: "Semantic Zoning.",
            text: "Don't just organize—build cities. Group related thoughts into dynamic Zones that auto-adjust their bounding boxes. Like \"Cities: Skylines\" for your neural architecture.",
            zoneExample: "Zone: Architecture",
            autoExpand: "Auto-Expand"
        }
    },
    concurrency: {
        badge: "Non-Blocking Architecture",
        title: "Unlimited Concurrency.",
        text: "No \"Thinking...\" blockers. Fire off 50 streams simultaneous. Our non-blocking AIManager handles the load.",
        idle: "Idle..."
    },
    spatial: {
        title1: "Spatial",
        title2: "Organization.",
        text: "Semantic Zoning. Don't just organize—build cities. Group related thoughts into dynamic Zones that auto-adjust their bounding boxes. Like \"Cities: Skylines\" for your neural architecture.",
        stateOrganized: "STATE: ORGANIZED",
        stateChaos: "STATE: CHAOS",
        zones: {
            arch: "Zone: Architecture",
            eng: "Zone: Engineering"
        },
        cards: {
            floorPlans: "Floor Plans",
            elevations: "Elevations",
            materials: "Materials",
            structures: "Structures",
            electrical: "Electrical"
        }
    },
    sprout: {
        badge1: "128k Token Window",
        badge2: "∞ Depth",
        title1: "Recursive",
        title2: "\"Sprout\"",
        text: "Active ideation. Click \"Sprout\" to have the AI recursively branch one thought into five divergent execution paths."
    },
    graph: {
        badge: "Engine Core v2.1",
        title1: "Graph Context",
        title2: "Walking.",
        text: "It reads the connections. Traditional chat UIs are oblivious to structure. Our engine traverses the semantic graph of your canvas, pruning irrelevant nodes and injecting precise neighbor context into every generation."
    },
    demoInfinite: {
        title: "Continuous Order.",
        text: "Watch AI scan your scattered thoughts and instantly arrange them into a neat, organized structure.",
        organizing: "AI Organizing...",
        complete: "Structure Complete",
        cards: {
            roadmap: "Roadmap",
            planning: "Planning",
            assets: "Assets",
            design: "Design",
            schema: "Schema",
            dev: "Dev",
            ideas: "Ideas",
            brainstorm: "Brainstorm",
            sources: "Sources",
            research: "Research",
            sprints: "Sprints",
            agile: "Agile"
        }
    },
    sidebar: {
        global: "Global",
        board: "This Board",
        myPrompts: "My Prompts",
        addPrompt: "Add Prompt",
        save: "Save",
        cancel: "Cancel",
        deleteConfirm: "Delete this prompt?",
        instruction: "Instruction",
        dragHelp: "Drag to chat or canvas"
    },
    settings: {
        title: "Settings",
        configuration: "Configuration",
        general: "General",
        language: "Language",
        credits: "Credits",
        creditsDesc: "Manage usage & limits",
        advancedSettings: "Advanced Settings",
        aiConfiguration: "AI Configuration",
        provider: "Provider",
        providerDesc: "Models & API Keys",
        modelRoles: "Model Roles",
        modelRolesDesc: "Assign specialized models",
        dataStorage: "Data & Storage",
        storage: "Storage",
        storageDesc: "S3 & Cloud settings",
        cancel: "Cancel",
        saveChanges: "Save Changes",
        creditsUsage: "Credits & Usage",
        modelProvider: "Model Provider",
        storageSettings: "Storage Settings",
        settingsSaved: "Settings Saved!",
        applyingChanges: "Applying changes...",
        resetConfiguration: "Reset Configuration?",
        resetWarning: "This will remove all custom providers and API keys. The app will return to its default state.",
        yesReset: "Yes, Reset",
        customInstructions: "Custom Instructions",
        customInstructionsDesc: "Global AI behavior",
        customInstructionsHelp: "Instructions you add here will be included in every AI interaction across all cards and canvases.",
        customInstructionsPlaceholder: "Example: Always respond in a friendly, casual tone. Use bullet points for lists. Prefer concise answers.",
        customInstructionsNote: "How it works",
        customInstructionsInfo: "Your instructions are prepended to every AI request. Use them to set language preferences, response styles, or domain-specific context.",
        exampleInstructions: "Example Instructions",
        exampleInstruction1: "Always respond in Japanese",
        exampleInstruction2: "I am a software engineer, use technical terms",
        exampleInstruction3: "Keep responses under 200 words",
        connectionSuccess: "Connection Successful!",
        connectionFailed: "Connection Failed",
        testConnection: "Test Connection",
        testing: "Testing...",
        resetDefaults: "Reset Defaults",
        newProvider: "New Provider",
        providerName: "Provider Name",
        apiKey: "API Key",
        baseUrl: "Base URL",
        modelName: "Model Name",
        protocol: "Protocol",
        geminiNative: "Gemini Native",
        openaiCompat: "OpenAI Compatible",
        geminiKeyPlaceholder: "Gemini API Key",
        openaiKeyPlaceholder: "sk-...",
        urlPlaceholder: "https://api.openai.com/v1",
        modelPlaceholder: "gpt-4o",
        exampleUrlGemini: "Example: https://generativelanguage.googleapis.com/v1beta",
        exampleUrlOpenai: "Example: https://api.openai.com/v1",
        languageChoose: "Choose your preferred language for the interface.",
        languageNote: "Note:",
        languageNoteDesc: "Changing the language will instantly update the user interface. Some AI-generated content (like existing cards) will remain in their original language.",
        roles: {
            title: "Model Assignment",
            description: "Assign specific models to different functions. These settings are specific to",
            chatTitle: "Chat Conversations",
            chatDesc: "Main model for all card conversations",
            analysisTitle: "Sprout Ideas (Analysis)",
            analysisDesc: "Model for generating follow-up questions",
            imageTitle: "Image Generation",
            imageDesc: "Model for creating board backgrounds",
            important: "Important",
            importantText: "These role assignments are saved separately for each provider. When you switch providers, the system will automatically switch to the roles configured for that provider."
        },
        storageConfig: {
            byok: "BYOK (Bring Your Own Key)",
            byokDesc: "Use your own S3 storage (AWS, Cloudflare R2, MinIO) to store images.",
            enable: "Enable S3 Storage",
            enableDesc: "Upload images to your own cloud bucket",
            endpoint: "Endpoint URL",
            region: "Region",
            bucket: "Bucket Name",
            accessKey: "Access Key ID",
            secretKey: "Secret Access Key",
            recovery: "Data Recovery",
            backupFound: "Safety Backup Found",
            backupFoundDesc: "We found a local backup of your boards created before the last logout. You can attempt to restore this data to your cloud account.",
            restoreComplete: "Restoration Complete!",
            restore: "Restore Backup",
            restoring: "Restoring...",
            noBackup: "No pending safety backups found.",
            advancedRecovery: "Show Advanced Recovery (Manual Import)",
            hideAdvancedRecovery: "Hide Advanced Recovery",
            manualImport: "Manual JSON Import",
            manualImportDesc: "Paste the raw backup data JSON provided by support below.",
            importRestore: "Import & Restore",
            importing: "Importing...",
            scheduledBackups: "Scheduled Backups",
            scheduledDesc: "Auto backup at 3:00 AM and 4:00 PM daily (5-day history)",
            backupNow: "Backup Now",
            backingUp: "Backing up...",
            nextBackup: "Next backup:",
            noBackupsYet: "No backups yet. Backups are created automatically at scheduled times."
        },
        app: {
            settings: "Application Settings",
            showWelcome: "Show Welcome Screen",
            showWelcomeDesc: "View the introduction and guide again",
            show: "Show Welcome"
        }
    },
    credits: {
        noConfigNeeded: "No Configuration Needed",
        readyToUse: "We've pre-configured the best AI models for you. Your free quota supports approximately",
        interactions: "200",
        conversations: "conversations.",
        remainingCredits: "Remaining Credits",
        imageCredits: "Image Generation",
        fastResponse: "Fast Response",
        fastResponseDesc: "DeepSeek V3 High-Performance Model",
        longLasting: "Long Lasting",
        longLastingDesc: "No need to worry about running out",
        advancedNote: "*To use your own API Key (OpenAI, Google, Anthropic), go to",
        advancedLink: "Advanced Settings",
        toConfig: "to configure.",
        startExploring: "Start Exploring",
        poweredBy: "Powered by DeepSeek V3.2",
        welcomeTitle: "No Config, Just Start",
        initialCredits: "Initial credits support ~",
        plus: "+",
        noConfigDesc: "Everything's ready for you.",
        startJourney: "Start your card journey now.",
        redeemCode: "Redeem Code",
        redeemCodeDesc: "Use a code to get extra credits",
        enterCodePlaceholder: "ENTER CODE (XXXX-XXXX-XXXX)",
        redeem: "Redeem",
        proUser: "PRO USER",
        proFeaturesUnlocked: "You have unlocked premium features. Enjoy standard priority and exclusive access.",
        getMore: "Get More Credits / Pro",
        adminTools: "Admin Tools",
        hideAdminTools: "Hide Admin Tools"
    },
    contextMenu: {
        copyContent: "Copy Content",
        favorite: "Favorite",
        unfavorite: "Unfavorite",
        aiExpand: "AI Expand",
        createConnection: "Create Connection",
        delete: "Delete",
        newCard: "New Card",
        newNote: "New Note",
        paste: "Paste",
        deleteConnection: "Delete Connection",
        lineColor: "Line Color"
    },
    chatBar: {
        startNewBoard: "Start a new board...",
        askAboutSelected: "Ask about {count} selected items...",
        typeToCreate: "Type to create or ask...",
        uploadImage: "Upload Image",
        addStickyNote: "Add Sticky Note",
        expandTopics: "Expand marked topics",
        topics: "Topics",
        selectConnected: "Select Connected Cluster",
        createZone: "Create Zone (Group)",
        gridLayout: "Grid Layout",
        appendToChat: "Append to selected cards' chat"
    },
    gallery: {
        gallery: "Gallery",
        favorites: "Favorites",
        trash: "Trash",
        usageGuide: "💡 Usage Guide",
        newBoard: "New Board",
        signIn: "Sign In",
        pricing: "Plans & Pricing",
        signOut: "Sign Out",
        greetingMorning: "Good morning",
        greetingAfternoon: "Good afternoon",
        greetingEvening: "Good evening",
        creator: "Creator",
        readyToCreate: "Ready to capture your next big idea?",
        recentlyVisited: "Recently Visited",
        allBoards: "All Boards",
        account: "Account",
        whatToCreate: "What would you like to create?",
        start: "Start",
        releaseToUpload: "Release to upload",
        recycleBin: "Recycle Bin",
        trashHint: "Items deleted longer than 30 days are removed forever",
        emptyTrash: "Trash is empty",
        emptyTrashHint: "Items appearing here can be restored.",
        freshStart: "A fresh start",
        freshStartHint: "Your canvas is waiting. Create your first board above."
    },
    welcome: {
        badge: "New Way to Think",
        title: "Infinite Canvas × AI Collaboration",
        subtitle1: "Break free from linear conversations, freely express ideas in expansive 2D space.",
        subtitle2: "Call upon Gemini 3.0 Pro & Flash anytime, make every node intelligent.",
        aiChat: "AI Smart Chat",
        aiChatDesc: "Integrating Gemini 3.0 Pro & Flash with web search, visual recognition, and instant response.",
        infiniteCanvas: "Infinite Canvas",
        infiniteCanvasDesc: "Pinch to zoom, pan freely. As vast as your thoughts, so is this canvas.",
        smartConnections: "Smart Connections",
        smartConnectionsDesc: "Click to connect, AI instantly understands context. No tedious explanations needed.",
        autoLayout: "One-Click Auto Layout",
        autoLayoutDesc: "Messy? One click to organize. Mind-map algorithm instantly restores clear tree structure.",
        batchOperations: "Batch Operations",
        batchOperationsDesc: "Select multiple cards, batch rewrite, delete or create connections. 10x efficiency boost.",
        cloudSync: "Cloud Sync",
        cloudSyncDesc: "Real-time sync via Firebase. Ideas on your phone appear instantly on your computer.",
        startCreating: "Start Creating",
        firstVisitOnly: "💡 Only shown on first visit · Click button to enter canvas"
    },
    search: {
        placeholder: "Search cards, boards...",
        noResults: "No matching results found",
        enterKeywords: "Enter keywords to search all boards",
        openSearch: "Open Search",
        board: "Board",
        cards: "cards",
        navigate: "Navigate",
        open: "Open",
        inBoard: "in"
    },
    chat: {
        conversation: "Conversation",
        neuralReader: "Neural Reader",
        neuralNotepad: "Neural Notepad",
        capturedInsight: "Captured Insight",
        clearMarks: "Clear Marks",
        thinking: "Thinking...",
        sproutIdeas: "Sprout Ideas",
        quickSprout: "Sprout",
        branch: "Branch",
        captureAsNote: "Capture as Note",
        markTopic: "Mark Topic",
        refineNote: "Ask AI to refine this note...",
        refineThought: "Refine this thought...",
        insightArchive: "Insight Archive"
    },
    card: {
        newConversation: "New Conversation",
        copyResponse: "Copy response",
        createConnection: "Create connection",
        expand: "Expand",
        noMessagesYet: "No messages yet",
        thinking: "Thinking...",
        messages: "messages",
        generating: "Generating...",
        noImage: "No Image"
    },
    common: {
        cancel: "Cancel",
        save: "Save",
        delete: "Delete",
        confirm: "Confirm",
        close: "Close",
        loading: "Loading...",
        error: "Error",
        success: "Success",
        undo: "Undo"
    },
    feedback: {
        title: "Feedback",
        submitFeedback: "Send",
        placeholder: "Share your thoughts... (Enter to send)",
        emailHint: "Gmail, QQ, Outlook, 163, iCloud allowed",
        noFeedback: "No feedback yet. Be the first to share!",
        invalidEmail: "Please use a valid email (Gmail, QQ, Outlook, 163, iCloud)",
        hot: "Hot",
        top: "Top",
        recent: "Recent",
        inProgress: "In Progress",
        planned: "Planned",
        done: "Done",
        pending: "Pending",
        votes: "votes",
        comments: "comments",
        loginToVote: "Sign in to vote",
        voteLimitReached: "Vote limit reached (1)",
        votesRemaining: "Votes remaining",
        upvote: "Upvote",
        removeVote: "Remove vote"
    },
    pricing: {
        backToNexMap: "Back to NexMap",
        securedByStripe: "Secured by Stripe",
        tagline: "Simple, transparent pricing",
        heroTitle: "Unlock the Power of Spatial AI",
        heroDesc: "Start with the Pro plan for unlimited potential, or pick a credit pack for casual use.",
        creditPacks: "Credit Packs",
        creditPacksDesc: "Perfect for beginners or casual users. Pay as you go.",
        proLifetime: "Pro Lifetime",
        mostPopular: "Most Popular",
        bestValue: "Best Value",
        credits: "Credits",
        conversations: "conversations",
        getStarted: "Get Started",
        redirecting: "Redirecting...",
        upgradeNow: "Upgrade Now",
        oneTimePayment: "One-time payment",
        cancelAnytime: "Cancel anytime. 100% secure.",
        proTitle: "Pro Lifetime",
        proDesc: "The ultimate spatial thinking experience. Own your workflow, bring your own keys, and break free from limits.",
        proFeatures: [
            "Infinite Spatial Canvas — Think in 2D space, not just chat",
            "Multi-Thread AI Orchestration — Run 10+ agents simultaneously",
            "Ghost Streaming — Ultra-low latency (<50ms) AI responses",
            "Bring Your Own Keys (BYOK) — Private, direct connection to OpenAI/Anthropic",
            "Performance Unleashed — Smooth rendering for 500+ cards",
            "Lifetime Updates & Commercial License"
        ],
        ssl: "256-bit SSL Encryption",
        poweredByStripe: "Powered by Stripe",
        instantDelivery: "Instant Delivery",
        allRights: "All rights reserved.",
        regionBlocked: "Payment services unavailable in your region",
        regionBlockedDesc: "Due to regulatory requirements, online payment is temporarily unavailable in mainland China.",
        contactUs: "Contact Support",
        payAsYouGo: "Pay as you go",
        noExpiration: "No expiration",
        bestValuePerCredit: "Best value per credit",
        prioritySupport: "Priority support",
        forPowerUsers: "For power users",
        maxEfficiency: "Maximum efficiency",
        whyPro: "Why Go Pro?",
        whyProDesc: "Designed for power thinkers who need an infinite canvas, privacy, and uncompromised speed.",
        casualUser: "Start Free, Upgrade When Ready",
        casualUserDesc: "Everyone gets generous free credits. Buy more when you need them.",
        freeTierBadge: "FREE FOREVER",
        freeTierTitle: "Free Tier",
        freeTierDesc: "No credit card required. Resets every Monday.",
        chatsPerWeek: "Chats/Week",
        imagesPerWeek: "Images/Week",
        boards: "Boards",
        hiddenPrice: "---",
        privacy: "Privacy",
        terms: "Terms",
        ownKey: "Own API Key",
        ownKey: "Own API Key",
        unlimited: "Unlimited",
        getMorePower: "Get More Power",
        chatPacks: "Chat Packs",
        needMore: "Need more? Buy chat packs below",
        starter: "Starter",
        standard: "Standard",
        power: "Power",
        becomePro: "Become a Pro User",
        unlockPotential: "Unlock the full potential of NexMap with a one-time purchase.",
        processing: "Processing...",
        loginRequired: "Please login first to make a purchase.",
        youGet: "You get",
        perWeek: "per week",
        resetsMonday: "Resets Monday",
        images: "images"
    },
    footer: {
        title: "Start Thinking in Connections.",
        cta: "Launch Alpha",
        rights: "© 2024 NexMap. All rights reserved."
    },
    payment: {
        successTitle: "Payment Successful!",
        successDesc: "Thank you for your purchase. Your credits have been added.",
        orderNumber: "Order Number",
        copy: "Copy",
        copied: "Copied!",
        product: "Product",
        amount: "Amount",
        creditsAdded: "Credits Added",
        proUnlocked: "Pro Status Unlocked!",
        welcomePro: "Welcome to Pro!",
        contactSupport: "Questions? Contact us:"
    },
    stats: {
        title: "Your Creative Journey",
        totalBoards: "Creative Universe",
        activeBoards: "Active Projects",
        trashBoards: "Archived",
        totalCards: "Thoughts Captured",
        cardsSubtitle: "Across your entire canvas",
        aiCredits: "Neural Energy",
        creditsRemaining: "Remaining",
        creditsUsed: "Used",
        globalTokens: "Context Processed",
        lastActive: "Last Brainstorm",
        never: "Not yet",
        signIn: "Sign in to view your neural stats",
        loading: "Loading neural metrics...",
        dailyActivity: "Neural Activity",
        today: "Today Generated",
        yesterday: "Yesterday",
        globalChars: "Total Characters"
    },
    // ===== TOOLBAR TRANSLATIONS =====
    toolbar: {
        items: "items",
        retry: "Retry",
        sprout: "Sprout",
        zone: "Zone",
        delete: "Delete",
        expand: "Expand"
    },
    favorites: {
        collection: "Collection",
        noFavorites: "No favorites yet",
        noFavoritesDesc: "Star your most important conversations to keep them handy here.",
        note: "Note",
        shareTooltip: "Share as image",
        removeTooltip: "Remove from favorites",
        from: "From",
        goToSource: "Go to source board",
        favoriteNoteTitle: "Favorite Note",
        share: "Share",
        source: "Source",
        goToBoard: "Go to Board"
    },
    zone: {
        dragToMove: "Drag title to move zone",
        description: "Notes",
        descriptionPlaceholder: "Add notes...",
        icon: "Icon",
        customColor: "Custom Color",
        cardCount: "{count} Cards",
        messageCount: "{count} Messages",
        colorPresets: "Presets",
        selectEmoji: "Select Icon"
    },
    about: {
        backHome: "BACK TO HOME",
        manifesto: "OUR MANIFESTO",
        title: "Beyond the Chatbox.",
        subtitle: "We believe that the current interface of Large Language Models—the chatbox—is a bottleneck for human creativity.",
        builtFor: "BUILT FOR THE REBELS.",
        s1: {
            title: "The Cognitive Cage",
            text: "Look at how we interact with the most powerful intelligence humanity has ever created. It's confined to a linear, text-based terminal. It feels like talking to a genius through a telegram wire. We are forcing multi-dimensional thoughts into a single dimension of text stream. This is not how our brains work. We think in connections, in spaces, in chaotic webs of related ideas."
        },
        s2: {
            title: "Breaking the Linear Wall",
            text: "MixBoard isn't just a canvas; it's a rebellion against the linearity of modern AI interfaces. We are building a space where your thoughts can explode, branch out, and reconnect. Where an AI response isn't the end of a conversation, but the seed of a new forest. We want to unleash the true potential of LLMs by giving them a spatial dimension to live in."
        },
        s3: {
            title: "The Future is Infinite",
            text: "We are just getting started. The future of AI interaction won't be scrolling through a history of 500 messages to find that one code snippet. It will be a living, breathing map of your intellect, augmented by an AI that understands context, structure, and intent. We are building the tools for the next generation of thinkers, creators, and dreamers.",
            extra: "Welcome to the infinite canvas."
        }
    },
    aboutPage: {
        backToHome: "BACK TO HOME",
        manifesto: "OUR MANIFESTO",
        title: "Beyond the Chatbox.",
        subtitle: "We believe that the current interface of Large Language Models—the chatbox—is a bottleneck for human creativity.",
        section1: {
            title: "The Cognitive Cage",
            text: "Look at how we interact with the most powerful intelligence humanity has ever created. It's confined to a linear, text-based terminal. It feels like talking to a genius through a telegram wire. We are forcing multi-dimensional thoughts into a single dimension of text stream. This is not how our brains work. We think in connections, in spaces, in chaotic webs of related ideas."
        },
        section2: {
            title: "Breaking the Linear Wall",
            text: "MixBoard isn't just a canvas; it's a rebellion against the linearity of modern AI interfaces. We are building a space where your thoughts can explode, branch out, and reconnect. Where an AI response isn't the end of a conversation, but the seed of a new forest. We want to unleash the true potential of LLMs by giving them a spatial dimension to live in."
        },
        section3: {
            title: "The Future is Infinite",
            text: "We are just getting started. The future of AI interaction won't be scrolling through a history of 500 messages to find that one code snippet. It will be a living, breathing map of your intellect, augmented by an AI that understands context, structure, and intent. We are building the tools for the next generation of thinkers, creators, and dreamers.",
            extra: "Welcome to the infinite canvas."
        },
        footer: "BUILT FOR THE REBELS."
    },
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
            {
                date: "Jan 03, 2026",
                version: "0.0.26",
                title: "SEO & Accessibility",
                items: [
                    "Implemented dynamic SEO with per-page meta tags (react-helmet-async)",
                    "Added proper favicon for Google Search display",
                    "Fixed unclickable user menu buttons (CSS stacking context)",
                    "Added free image generation for free users (20/week)",
                    "Switched free tier conversation model to Kimi-K2-Thinking"
                ]
            },
            {
                date: "Jan 03, 2026",
                version: "0.0.25",
                title: "Internationalization & Sync",
                items: [
                    "Complete 4-language support (EN, ZH, JA, KO)",
                    "Updated app icons with new NexMap mind map logo",
                    "Fixed board prompts (tags) cloud sync issue",
                    "Fixed Mac IME positioning issues in Sidebar"
                ]
            },
            {
                date: "Jan 03, 2026",
                version: "0.0.24",
                title: "Sidebar & Zone",
                items: [
                    "Redesigned Sidebar to floating Notion-style tags",
                    "Added Zone button for quick card grouping",
                    "Implemented Prompt Sidebar with Drag-and-Drop",
                    "Fixed infinite loop bug in BoardPage"
                ]
            },
            {
                date: "Dec 31, 2025",
                version: "0.0.23",
                title: "Sprout & Branch",
                items: [
                    "Added Quick Sprout for one-click topic decomposition",
                    "Implemented 'Curiosity Maximization' prompt strategy",
                    "Standard mindmap layout for Sprout/Branch",
                    "Added collision detection for new card placement"
                ]
            },
            {
                date: "Dec 31, 2025",
                version: "0.0.22",
                title: "Image & Export",
                items: [
                    "Refined image generation with Irasutoya style prompts",
                    "Fixed iPad Safari image export issues",
                    "Added user custom instructions support",
                    "Modularized Gemini provider for better error handling"
                ]
            },
            {
                date: "Dec 30, 2025",
                version: "0.0.21",
                title: "Gallery Modernization",
                items: [
                    "Modernized Gallery UI with glassmorphism",
                    "Resolved scrolling issues on mobile",
                    "Added auto-retry (max 2) for API errors",
                    "Enabled manual language switching via settings"
                ]
            },
            {
                date: "Dec 29, 2025",
                version: "0.0.19",
                title: "AI Manager",
                items: [
                    "Fixed Gemini 400 validation errors",
                    "Resolved AIManager message loss issue",
                    "Sanitized image data for API compatibility"
                ]
            },
            {
                date: "Dec 28, 2025",
                version: "0.0.17",
                title: "Security & Backup",
                items: [
                    "Added 5-day timed sync rollback feature",
                    "Fixed data clearing bug on login",
                    "Introduced logout safety lock",
                    "Made manual JSON import always visible for recovery"
                ]
            },
            {
                date: "Dec 28, 2025",
                version: "0.0.16",
                title: "Localization",
                items: [
                    "Localized Pricing page content (EN, ZH, JA)",
                    "Added Tokushoho and Privacy Policy pages",
                    "Implemented region-based access restriction"
                ]
            },
            {
                date: "Dec 27, 2025",
                version: "0.0.15",
                title: "Stability",
                items: [
                    "Fixed ghost logout issues",
                    "Prevented welcome popup from reappearing",
                    "Optimized code structure"
                ]
            },
            {
                date: "Nov 2025",
                version: "0.0.1",
                title: "Initial Release",
                items: [
                    "Basic infinite canvas functionality",
                    "Real-time Google Firebase sync",
                    "Markdown support in cards",
                    "Multi-modal AI chat integration"
                ]
            }
        ]
    }
};
