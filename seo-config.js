export const config = {
    baseUrl: 'https://nexmap.catzz.work',
    defaultLanguage: 'en',
    supportedLanguages: ['en', 'ja', 'ko', 'zh-CN', 'zh-TW'],

    // Routes to include in sitemap
    routes: [
        { path: '/', changefreq: 'daily', priority: 1.0 },
        { path: '/pricing', changefreq: 'weekly', priority: 0.8 },
        { path: '/history', changefreq: 'weekly', priority: 0.8 },
        { path: '/about', changefreq: 'monthly', priority: 0.7 },
    ],

    // Translation data for SEO tags
    translations: {
        en: {
            siteName: 'NexMap',
            defaultTitle: 'NexMap - AI-Powered Infinite Canvas Mind Map',
            defaultDescription: 'NexMap - AI-powered infinite canvas mind mapping tool. Visualize your thoughts with multi-modal AI chat, spatial organization, and recursive exploration. Free to use.',
            keywords: 'AI mind map, infinite canvas, visual thinking, mind mapping tool, AI chat, brainstorming, knowledge management, spatial notes'
        },
        ja: {
            siteName: 'NexMap',
            defaultTitle: 'NexMap - AI駆動の無限キャンバスマインドマップ',
            defaultDescription: 'NexMap - AI搭載の無限キャンバスマインドマップツール。マルチモーダルAIチャット、空間的な整理、再帰的な探索で思考を可視化します。無料で使用できます。',
            keywords: 'AIマインドマップ, 無限キャンバス, ビジュアルシンキング, マインドマップツール, AIチャット, ブレインストーミング, ナレッジマネジメント'
        },
        ko: {
            siteName: 'NexMap',
            defaultTitle: 'NexMap - AI 기반 무한 캔버스 마인드맵',
            defaultDescription: 'NexMap - AI 기반의 무한 캔버스 마인드맵 도구입니다. 멀티모달 AI 채팅, 공간적 정리, 재귀적 탐색으로 생각을 시각화하세요. 무료로 사용할 수 있습니다。',
            keywords: 'AI 마인드맵, 무한 캔버스, 시각적 사고, 마인드맵 도구, AI 채팅, 브레인스토밍, 지식 관리'
        },
        'zh-CN': {
            siteName: 'NexMap',
            defaultTitle: 'NexMap - AI 驱动的无限画布思维导图',
            defaultDescription: 'NexMap - AI 驱动的无限画布思维导图工具。通过多模态 AI 对话、空间整理和递归探索，可视化您的思维。免费使用。',
            keywords: 'AI 思维导图, 无限画布, 视觉思维, 思维导图工具, AI 对话, 头脑风暴, 知识管理, 空间笔记'
        },
        'zh-TW': {
            siteName: 'NexMap',
            defaultTitle: 'NexMap - AI 驅動的無限畫布思維導圖',
            defaultDescription: 'NexMap - AI 驅動的無限畫布思維導圖工具。通過多模態 AI 對話、空間整理和遞歸探索，可視化您的思維。免費使用。',
            keywords: 'AI 思維導圖, 無限畫布, 視覺思維, 思維導圖工具, AI 對話, 頭腦風暴, 知識管理, 空間筆記'
        }
    },

    // Per-page metadata overrides (path is relative to language root)
    // If a path isn't listed, it falls back to defaults
    pages: {
        '/': {
            // Uses defaults
        },
        '/pricing': {
            en: { title: 'Pricing - NexMap', description: 'Simple pricing for everyone. Start for free and upgrade as you grow.' },
            ja: { title: '料金 - NexMap', description: '誰でも利用しやすい料金プラン。無料で始めて、成長に合わせてアップグレードできます。' },
            ko: { title: '가격 - NexMap', description: '모두를 위한 합리적인 가격. 무료로 시작하고 필요에 따라 업그레이드하세요.' },
            'zh-CN': { title: '价格 - NexMap', description: '适合所有人的简单定价。免费开始，随需升级。' },
            'zh-TW': { title: '價格 - NexMap', description: '適合所有人的簡單定價。免費開始，隨需升級。' }
        },
        '/about': {
            en: { title: 'About - NexMap', description: 'Learn more about NexMap and our mission to revolutionize visual thinking with AI.' },
            ja: { title: 'NexMapについて', description: 'NexMapと、AIでビジュアルシンキングに革命を起こすという私たちの使命について詳しくご覧ください。' },
            ko: { title: 'NexMap 소개', description: 'NexMap과 AI로 시각적 사고를 혁신하려는 우리의 미션에 대해 더 알아보세요.' },
            'zh-CN': { title: '关于我们 - NexMap', description: '了解更多关于 NexMap 以及我们将 AI 引入视觉思维革命的使命。' },
            'zh-TW': { title: '關於我們 - NexMap', description: '了解更多關於 NexMap 以及我們將 AI 引入視覺思維革命的使命。' }
        },
        '/history': {
            en: { title: 'Update History - NexMap', description: 'See the latest updates, features, and improvements to NexMap.' },
            ja: { title: '更新履歴 - NexMap', description: 'NexMapの最新アップデート、機能、改善点をご覧ください。' },
            ko: { title: '업데이트 내역 - NexMap', description: 'NexMap의 최신 업데이트, 기능 및 개선 사항을 확인하세요.' },
            'zh-CN': { title: '更新历史 - NexMap', description: '查看 NexMap 的最新更新、功能和改进。' },
            'zh-TW': { title: '更新歷史 - NexMap', description: '查看 NexMap 的最新更新、功能和改進。' }
        }
    }
};
