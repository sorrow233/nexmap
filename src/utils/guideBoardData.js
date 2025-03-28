export const getGuideBoardData = () => {
    const centerX = 0;
    const centerY = 0;

    return {
        cards: [
            // 1. Welcome Card
            {
                id: 'guide-welcome',
                x: centerX,
                y: centerY - 300,
                w: 400,
                h: 200,
                content: "# Welcome to Neural Canvas! 🚀\n\nYour infinite space for AI-powered thinking.\n\n**Double-click anywhere** to create a card, or drag from the bottom toolbar.",
                color: '#ffffff',
                type: 'note'
            },
            // 2. AI Chat
            {
                id: 'guide-ai',
                x: centerX - 500,
                y: centerY,
                w: 350,
                h: 250,
                content: "## 🤖 AI Smart Chat\n\nEvery card is intelligent.\n\n1. Type in a card\n2. Click the **Sparkles** icon (✨)\n3. Ask Gemini to expand, summarize, or brainstorm.\n\n*Try dragging me to connect with other ideas!*",
                color: '#eef2ff', // Light Blue
                type: 'note'
            },
            // 3. Connections
            {
                id: 'guide-connect',
                x: centerX + 500,
                y: centerY,
                w: 350,
                h: 200,
                content: "## 🔗 Smart Connections\n\nConnect thoughts instantly.\n\n- **Drag** from one card's handle to another.\n- AI understands the context between connected nodes.",
                color: '#fff7ed', // Orange tint
                type: 'note'
            },
            // 4. Tools
            {
                id: 'guide-tools',
                x: centerX,
                y: centerY + 300,
                w: 400,
                h: 200,
                content: "## 🛠 Toolbar & Shortcuts\n\n- **Space**: Pan canvas\n- **Scroll**: Zoom in/out\n- **Cmd+Z**: Undo\n- **Auto Layout**: Magic wand in tool bar cleaning up your mess.",
                color: '#f0fdf4', // Green tint
                type: 'note'
            }
        ],
        connections: [
            { from: 'guide-welcome', to: 'guide-ai', id: 'c1' },
            { from: 'guide-welcome', to: 'guide-connect', id: 'c2' },
            { from: 'guide-welcome', to: 'guide-tools', id: 'c3' }
        ]
    };
};
