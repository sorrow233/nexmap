/**
 * Cloudflare Pages Middleware for Multi-Language SEO
 * 
 * This middleware intercepts HTML requests and uses HTMLRewriter to dynamically
 * modify SEO tags based on the URL language prefix.
 * 
 * Supported languages: en (default), zh, ja, ko
 */

import { SEO_CONFIG, LANGUAGES, BASE_URL } from '../src/config/seoConfig.js';
// Note: Relative import from src should work in Cloudflare Pages build environment if configured correctly.
// If not, we might need a build step to copy config, but standard bundlers handle this.

/**
 * Parse language and path from URL
 * Examples:
 *   /ja/pricing -> { lang: 'ja', path: '/pricing' }
 *   /pricing -> { lang: 'en', path: '/pricing' }
 *   / -> { lang: 'en', path: '/' }
 */
function parseUrlLanguage(pathname) {
    const parts = pathname.split('/').filter(Boolean);

    if (parts.length > 0 && LANGUAGES.includes(parts[0])) {
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
    // Normalize path to remove trailing slashes (except root) and query params if any
    // The middleware receives pure pathname, so just handle trailing slash
    const normalizedPath = path === '/' ? '/' : path.replace(/\/$/, '');

    // Look up in the centralized config
    // We check exact match for now. 
    // If we had dynamic routes (e.g. /board/:id), we would need regex matching or wildcard logic here.
    // Given the current config structure, it is static paths.

    let pageConfig = SEO_CONFIG[normalizedPath];
    if (!pageConfig) {
        // Fallback to home/default if page not found in config (effectively a 404 from SEO perspective, but we still serve the app)
        // Ideally we might want generic metadata or just keep the defaults if we implement 404 page separately.
        // For now, let's use the Home config as a safe fallback for "site-wide" values if specific page missing
        // OR better: use a default generic set.
        // Let's fallback to Home but maybe indicate... 
        // Actually, if it's a board page (/board/...), the BoardPage component handles specific titles client-side.
        // But for OG tags, unless we fetch dynamic data here, we can only provide generic ones.
        // Let's check if it starts with /board/
        if (normalizedPath.startsWith('/board/')) {
            // Use Gallery or partial generic config
            pageConfig = SEO_CONFIG['/gallery']; // Use gallery metadata as a proxy for app workspace
        } else {
            pageConfig = SEO_CONFIG['/'];
        }
    }

    return pageConfig[lang] || pageConfig['en'];
}

/**
 * Generate hreflang link tags for all supported languages
 */
function generateHreflangTags(path, currentLang) {
    const tags = LANGUAGES.map(lang => {
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
 * Generate JSON-LD for the page
 */
function generateJsonLd(seoConfig, canonicalUrl, lang) {
    // Basic WebApplication Schema
    const schema = {
        "@context": "https://schema.org",
        "@type": "WebApplication",
        "name": "NexMap",
        "description": seoConfig.description,
        "url": canonicalUrl,
        "applicationCategory": "ProductivityApplication",
        "operatingSystem": "Web Browser",
        "offers": {
            "@type": "Offer",
            "price": "0",
            "priceCurrency": "USD"
        },
        "inLanguage": lang
    };

    return JSON.stringify(schema);
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
    constructor(seoConfig, info) {
        this.seoConfig = seoConfig;
        this.info = info; // { canonicalUrl, lang }
    }

    element(element) {
        const name = element.getAttribute('name');
        const property = element.getAttribute('property');

        // Description meta
        if (name === 'description') {
            element.setAttribute('content', this.seoConfig.description);
        }

        // Keywords meta (if exists)
        if (name === 'keywords' && this.seoConfig.keywords) {
            element.setAttribute('content', this.seoConfig.keywords);
        }

        // Open Graph meta
        if (property === 'og:title') {
            element.setAttribute('content', this.seoConfig.ogTitle || this.seoConfig.title);
        }
        if (property === 'og:description') {
            element.setAttribute('content', this.seoConfig.ogDescription || this.seoConfig.description);
        }
        if (property === 'og:url') {
            element.setAttribute('content', this.info.canonicalUrl);
        }
        if (property === 'og:locale') {
            // Map simplified lang to locale if possible, or just use lang
            const localeMap = { 'en': 'en_US', 'zh': 'zh_CN', 'ja': 'ja_JP', 'ko': 'ko_KR' };
            element.setAttribute('content', localeMap[this.info.lang] || this.info.lang);
        }

        // Twitter meta
        if (name === 'twitter:title') {
            element.setAttribute('content', this.seoConfig.ogTitle || this.seoConfig.title);
        }
        if (name === 'twitter:description') {
            element.setAttribute('content', this.seoConfig.ogDescription || this.seoConfig.description);
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
    constructor(hreflangTags, jsonLd) {
        this.hreflangTags = hreflangTags;
        this.jsonLd = jsonLd;
    }

    element(element) {
        // Inject hreflang tags
        element.append(`\n    <!-- Hreflang for multi-language SEO -->\n    ${this.hreflangTags}\n`, { html: true });

        // Inject JSON-LD
        if (this.jsonLd) {
            element.append(`\n    <!-- JSON-LD Structured Data -->\n    <script type="application/ld+json">\n    ${this.jsonLd}\n    </script>\n`, { html: true });
        }
    }
}

/**
 * Main middleware function
 */
export async function onRequest(context) {
    const { request, next } = context;
    const url = new URL(request.url);

    // Only process HTML requests (not API, assets, etc.)
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

    // Generate JSON-LD
    const jsonLd = generateJsonLd(seoConfig, canonicalUrl, lang);

    // Apply HTMLRewriter transformations
    const rewriter = new HTMLRewriter()
        .on('html', new HtmlLangHandler(lang))
        .on('title', new TitleHandler(seoConfig.title))
        .on('meta', new MetaHandler(seoConfig, { canonicalUrl, lang })) // Handle all meta via one handler selector if possible, or specific selectors. 
        // Note: 'meta' selector matches ALL meta tags. Efficient but need careful logic inside.
        // Actually, let's use specific attributes to be safer and avoid iterating unnecessary tags.
        .on('meta[name="description"]', new MetaHandler(seoConfig, { canonicalUrl, lang }))
        .on('meta[name="keywords"]', new MetaHandler(seoConfig, { canonicalUrl, lang }))
        .on('meta[property^="og:"]', new MetaHandler(seoConfig, { canonicalUrl, lang }))
        .on('meta[name^="twitter:"]', new MetaHandler(seoConfig, { canonicalUrl, lang }))
        .on('link[rel="canonical"]', new CanonicalHandler(canonicalUrl))
        .on('head', new HeadEndHandler(hreflangTags, jsonLd));

    return rewriter.transform(response);
}
