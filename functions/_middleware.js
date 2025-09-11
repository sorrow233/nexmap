/**
 * Cloudflare Pages Middleware for Multi-Language SEO
 * 
 * This middleware intercepts HTML requests and uses HTMLRewriter to dynamically
 * modify SEO tags based on the URL language prefix.
 * 
 * Supported languages: en (default), zh, ja, ko
 */

const BASE_URL = 'https://nexmap.catzz.work';

// SEO Configuration for each language
const SEO_CONFIG = {
    en: {
        lang: 'en',
        locale: 'en_US',
        title: 'NexMap - AI-Powered Infinite Canvas Mind Map',
        description: 'Visualize your thoughts with AI. Multi-modal chat, spatial organization, and recursive exploration on an infinite canvas. Free to use.',
        ogTitle: 'NexMap - AI-Powered Infinite Canvas Mind Map',
        ogDescription: 'Visualize your thoughts with AI on an infinite canvas. Free multi-modal mind mapping.',
        twitterTitle: 'NexMap - AI-Powered Infinite Canvas Mind Map',
        twitterDescription: 'Visualize your thoughts with AI on an infinite canvas. Free multi-modal mind mapping.',
    },
    zh: {
        lang: 'zh-CN',
        locale: 'zh_CN',
        title: 'NexMap - AI驱动的无限画布思维导图',
        description: '用AI可视化你的思维。多模态对话、空间组织和递归探索，尽在无限画布。免费使用。',
        ogTitle: 'NexMap - AI驱动的无限画布思维导图',
        ogDescription: '用AI在无限画布上可视化你的思维。免费的多模态思维导图工具。',
        twitterTitle: 'NexMap - AI驱动的无限画布思维导图',
        twitterDescription: '用AI在无限画布上可视化你的思维。免费的多模态思维导图工具。',
    },
    ja: {
        lang: 'ja',
        locale: 'ja_JP',
        title: 'NexMap - AI搭載の無限キャンバスマインドマップ',
        description: 'AIで思考を可視化。マルチモーダルチャット、空間整理、再帰的探索を無限キャンバスで。無料でご利用いただけます。',
        ogTitle: 'NexMap - AI搭載の無限キャンバスマインドマップ',
        ogDescription: 'AIで無限キャンバス上に思考を可視化。無料のマルチモーダルマインドマッピング。',
        twitterTitle: 'NexMap - AI搭載の無限キャンバスマインドマップ',
        twitterDescription: 'AIで無限キャンバス上に思考を可視化。無料のマルチモーダルマインドマッピング。',
    },
    ko: {
        lang: 'ko',
        locale: 'ko_KR',
        title: 'NexMap - AI 기반 무한 캔버스 마인드맵',
        description: 'AI로 생각을 시각화하세요. 멀티모달 채팅, 공간 구성, 재귀적 탐색을 무한 캔버스에서. 무료로 사용하세요.',
        ogTitle: 'NexMap - AI 기반 무한 캔버스 마인드맵',
        ogDescription: 'AI로 무한 캔버스에서 생각을 시각화하세요. 무료 멀티모달 마인드맵 도구.',
        twitterTitle: 'NexMap - AI 기반 무한 캔버스 마인드맵',
        twitterDescription: 'AI로 무한 캔버스에서 생각을 시각화하세요. 무료 멀티모달 마인드맵 도구.',
    },
};

// Page-specific SEO overrides (optional, for different pages like pricing)
const PAGE_SEO_OVERRIDES = {
    '/pricing': {
        en: {
            title: 'Pricing - NexMap | Simple, Transparent Plans',
            description: 'Choose the perfect plan for your spatial thinking needs. Free tier available, Pro lifetime with unlimited canvas and BYOK support.',
        },
        zh: {
            title: '价格方案 - NexMap | 简单透明的定价',
            description: '选择适合您空间思维需求的完美方案。提供免费层，Pro终身版支持无限画布和自带API密钥。',
        },
        ja: {
            title: '料金プラン - NexMap | シンプルで透明な価格設定',
            description: 'あなたの空間思考ニーズに最適なプランをお選びください。無料プランあり、Pro永久版は無限キャンバスとBYOK対応。',
        },
        ko: {
            title: '요금제 - NexMap | 간단하고 투명한 가격',
            description: '공간 사고 요구에 맞는 완벽한 플랜을 선택하세요. 무료 티어 제공, Pro 평생 버전은 무한 캔버스와 BYOK 지원.',
        },
    },
    '/gallery': {
        en: {
            title: 'Gallery - NexMap | Your Mind Map Workspace',
            description: 'Access all your AI-powered mind maps in one place. Create, organize, and explore your spatial thinking boards.',
        },
        zh: {
            title: '画廊 - NexMap | 您的思维导图工作区',
            description: '在一个地方访问所有AI驱动的思维导图。创建、组织和探索您的空间思维画板。',
        },
        ja: {
            title: 'ギャラリー - NexMap | マインドマップワークスペース',
            description: 'すべてのAI搭載マインドマップを一か所でアクセス。空間思考ボードを作成、整理、探索。',
        },
        ko: {
            title: '갤러리 - NexMap | 마인드맵 워크스페이스',
            description: '모든 AI 기반 마인드맵을 한 곳에서 접근하세요. 공간 사고 보드를 생성, 구성, 탐색하세요.',
        },
    },
    '/free-trial': {
        en: {
            title: 'Free Trial - NexMap | Try AI Mind Mapping Free',
            description: 'Experience the power of AI-driven spatial thinking. No credit card required. Start your infinite canvas journey today.',
        },
        zh: {
            title: '免费试用 - NexMap | 免费体验AI思维导图',
            description: '体验AI驱动的空间思维的力量。无需信用卡。今天就开始您的无限画布之旅。',
        },
        ja: {
            title: '無料トライアル - NexMap | AIマインドマップを無料で試す',
            description: 'AI駆動の空間思考の力を体験。クレジットカード不要。今日から無限キャンバスの旅を始めましょう。',
        },
        ko: {
            title: '무료 체험 - NexMap | AI 마인드맵 무료 체험',
            description: 'AI 기반 공간 사고의 힘을 경험하세요. 신용카드 불필요. 오늘 무한 캔버스 여정을 시작하세요.',
        },
    },
    '/feedback': {
        en: {
            title: 'Feedback - NexMap | Share Your Ideas',
            description: 'Help us improve NexMap. Share your feedback, vote on features, and shape the future of spatial AI thinking.',
        },
        zh: {
            title: '反馈 - NexMap | 分享您的想法',
            description: '帮助我们改进NexMap。分享您的反馈、为功能投票，共同塑造空间AI思维的未来。',
        },
        ja: {
            title: 'フィードバック - NexMap | アイデアを共有',
            description: 'NexMapの改善にご協力ください。フィードバックを共有し、機能に投票し、空間AI思考の未来を形作りましょう。',
        },
        ko: {
            title: '피드백 - NexMap | 아이디어 공유',
            description: 'NexMap 개선에 도움을 주세요. 피드백을 공유하고, 기능에 투표하고, 공간 AI 사고의 미래를 만들어가세요.',
        },
    },
    '/about': {
        en: {
            title: 'About - NexMap | Our Vision for Spatial AI',
            description: 'Learn about NexMap\'s mission to revolutionize how you think and organize ideas with AI-powered infinite canvas technology.',
        },
        zh: {
            title: '关于我们 - NexMap | 空间AI的愿景',
            description: '了解NexMap的使命：通过AI驱动的无限画布技术，革新您思考和组织想法的方式。',
        },
        ja: {
            title: '私たちについて - NexMap | 空間AIのビジョン',
            description: 'NexMapのミッションをご紹介。AI搭載の無限キャンバス技術で、思考とアイデア整理の方法を革新します。',
        },
        ko: {
            title: '소개 - NexMap | 공간 AI 비전',
            description: 'NexMap의 미션을 알아보세요. AI 기반 무한 캔버스 기술로 생각하고 아이디어를 정리하는 방식을 혁신합니다.',
        },
    },
    '/history': {
        en: {
            title: 'History - NexMap | Our Journey',
            description: 'Explore the development history of NexMap. See how we built the ultimate AI-powered spatial thinking tool.',
        },
        zh: {
            title: '发展历程 - NexMap | 我们的旅程',
            description: '探索NexMap的发展历程。了解我们如何构建终极AI驱动的空间思维工具。',
        },
        ja: {
            title: '開発履歴 - NexMap | 私たちの歩み',
            description: 'NexMapの開発の歴史を探る。究極のAI搭載空間思考ツールをどのように構築したかをご覧ください。',
        },
        ko: {
            title: '역사 - NexMap | 우리의 여정',
            description: 'NexMap의 개발 역사를 탐험하세요. 궁극의 AI 기반 공간 사고 도구를 어떻게 구축했는지 확인하세요.',
        },
    },
};

// Supported language prefixes
const SUPPORTED_LANGS = ['en', 'zh', 'ja', 'ko'];

/**
 * Parse language and path from URL
 * Examples:
 *   /ja/pricing -> { lang: 'ja', path: '/pricing' }
 *   /pricing -> { lang: 'en', path: '/pricing' }
 *   / -> { lang: 'en', path: '/' }
 */
function parseUrlLanguage(pathname) {
    const parts = pathname.split('/').filter(Boolean);

    if (parts.length > 0 && SUPPORTED_LANGS.includes(parts[0])) {
        const lang = parts[0];
        const restPath = '/' + parts.slice(1).join('/') || '/';
        return { lang, path: restPath };
    }

    return { lang: 'en', path: pathname };
}

/**
 * Get SEO config for a specific language and page
 */
function getSeoConfig(lang, path) {
    const baseConfig = SEO_CONFIG[lang] || SEO_CONFIG['en'];

    // Normalize path for lookup (remove trailing slash, handle root)
    const normalizedPath = path === '/' ? '/' : path.replace(/\/$/, '');

    // Check for page-specific overrides
    const pageOverrides = PAGE_SEO_OVERRIDES[normalizedPath];
    if (pageOverrides && pageOverrides[lang]) {
        return { ...baseConfig, ...pageOverrides[lang] };
    }

    return baseConfig;
}

/**
 * Generate hreflang link tags for all supported languages
 */
function generateHreflangTags(path, currentLang) {
    const tags = SUPPORTED_LANGS.map(lang => {
        const href = lang === 'en'
            ? `${BASE_URL}${path}`
            : `${BASE_URL}/${lang}${path === '/' ? '' : path}`;
        const hreflang = lang === 'en' ? 'en' : (lang === 'zh' ? 'zh-Hans' : lang);
        return `<link rel="alternate" hreflang="${hreflang}" href="${href}" />`;
    });

    // Add x-default (points to English version)
    tags.push(`<link rel="alternate" hreflang="x-default" href="${BASE_URL}${path}" />`);

    return tags.join('\n    ');
}

/**
 * HTMLRewriter handlers
 */
class HtmlLangHandler {
    constructor(lang) {
        this.lang = lang;
    }

    element(element) {
        element.setAttribute('lang', this.lang);
    }
}

class TitleHandler {
    constructor(title) {
        this.title = title;
    }

    element(element) {
        element.setInnerContent(this.title);
    }
}

class MetaHandler {
    constructor(seoConfig, canonicalUrl) {
        this.seoConfig = seoConfig;
        this.canonicalUrl = canonicalUrl;
    }

    element(element) {
        const name = element.getAttribute('name');
        const property = element.getAttribute('property');

        // Description meta
        if (name === 'description') {
            element.setAttribute('content', this.seoConfig.description);
        }

        // Open Graph meta
        if (property === 'og:title') {
            element.setAttribute('content', this.seoConfig.ogTitle || this.seoConfig.title);
        }
        if (property === 'og:description') {
            element.setAttribute('content', this.seoConfig.ogDescription || this.seoConfig.description);
        }
        if (property === 'og:url') {
            element.setAttribute('content', this.canonicalUrl);
        }
        if (property === 'og:locale') {
            element.setAttribute('content', this.seoConfig.locale);
        }

        // Twitter meta
        if (name === 'twitter:title') {
            element.setAttribute('content', this.seoConfig.twitterTitle || this.seoConfig.title);
        }
        if (name === 'twitter:description') {
            element.setAttribute('content', this.seoConfig.twitterDescription || this.seoConfig.description);
        }
    }
}

class CanonicalHandler {
    constructor(canonicalUrl) {
        this.canonicalUrl = canonicalUrl;
    }

    element(element) {
        const rel = element.getAttribute('rel');
        if (rel === 'canonical') {
            element.setAttribute('href', this.canonicalUrl);
        }
    }
}

class HeadEndHandler {
    constructor(hreflangTags) {
        this.hreflangTags = hreflangTags;
    }

    element(element) {
        // Inject hreflang tags at the end of <head>
        element.append(`\n    <!-- Hreflang for multi-language SEO -->\n    ${this.hreflangTags}\n`, { html: true });
    }
}

/**
 * Main middleware function
 */
export async function onRequest(context) {
    const { request, next } = context;
    const url = new URL(request.url);

    // Only process HTML requests (not API, assets, etc.)
    // Skip if requesting static assets
    const pathname = url.pathname;
    if (
        pathname.startsWith('/api/') ||
        pathname.startsWith('/_next/') ||
        pathname.match(/\.(js|css|png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf|eot|json|xml|txt|webp|mp4|webm)$/i)
    ) {
        return next();
    }

    // Get the response from the origin (Vite/static files)
    const response = await next();

    // Only rewrite HTML responses
    const contentType = response.headers.get('content-type') || '';
    if (!contentType.includes('text/html')) {
        return response;
    }

    // Parse language from URL
    const { lang, path } = parseUrlLanguage(pathname);
    const seoConfig = getSeoConfig(lang, path);

    // Build canonical URL
    const canonicalUrl = lang === 'en'
        ? `${BASE_URL}${path}`
        : `${BASE_URL}/${lang}${path === '/' ? '' : path}`;

    // Generate hreflang tags
    const hreflangTags = generateHreflangTags(path, lang);

    // Apply HTMLRewriter transformations
    const rewriter = new HTMLRewriter()
        .on('html', new HtmlLangHandler(seoConfig.lang))
        .on('title', new TitleHandler(seoConfig.title))
        .on('meta[name="description"]', new MetaHandler(seoConfig, canonicalUrl))
        .on('meta[property^="og:"]', new MetaHandler(seoConfig, canonicalUrl))
        .on('meta[name^="twitter:"]', new MetaHandler(seoConfig, canonicalUrl))
        .on('link[rel="canonical"]', new CanonicalHandler(canonicalUrl))
        .on('head', new HeadEndHandler(hreflangTags));

    return rewriter.transform(response);
}
