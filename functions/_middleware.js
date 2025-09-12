import { config } from '../seo-config.js';

/**
 * Cloudflare Pages Function Middleware
 * Intercepts requests to inject localized SEO tags.
 */
export async function onRequest(context) {
    const url = new URL(context.request.url);
    const { pathname } = url;

    // 1. Identify Language
    let lang = config.defaultLanguage;
    let routePath = pathname;

    // Check if path starts with a supported language prefix
    // e.g., /ja/pricing -> lang='ja', routePath='/pricing'
    for (const supportedLang of config.supportedLanguages) {
        if (supportedLang === config.defaultLanguage) continue; // Skip default (usually root)
        if (pathname.startsWith(`/${supportedLang}/`) || pathname === `/${supportedLang}`) {
            lang = supportedLang;
            // Remove language prefix from route path for matching
            routePath = pathname.replace(`/${supportedLang}`, '') || '/';
            break;
        }
    }

    // 2. Determine Metadata
    // Find matching page config or fall back to default for that language
    let pageMeta = config.pages[routePath]?.[lang];

    // If strict match not found, check if it's strictly the root
    if (!pageMeta && routePath === '/') {
        // Explicit root page data if defined, else fallback
        pageMeta = config.pages['/']?.[lang];
    }

    // Fallback to language defaults
    const langConfig = config.translations[lang] || config.translations[config.defaultLanguage];

    const title = pageMeta?.title || langConfig.defaultTitle;
    const description = pageMeta?.description || langConfig.defaultDescription;

    // 3. Get Original Response (index.html)
    // We expect the upstream to serve index.html for SPA routes.
    const response = await context.next();

    // If validation fails or not HTML, return original
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.startsWith('text/html')) {
        return response;
    }

    // 4. Inject Tags using HTMLRewriter
    // We use the baseUrl + original pathname for canonical if it's the default lang,
    // or construct proper canonicals for others? 
    // Usually canonical points to itself.
    const currentUrl = `${config.baseUrl}${pathname}`;

    return new HTMLRewriter()
        .on('title', {
            element(e) {
                e.setInnerContent(title);
            }
        })
        .on('meta[name="description"]', {
            element(e) {
                e.setAttribute('content', description);
            }
        })
        .on('meta[property="og:title"]', {
            element(e) {
                e.setAttribute('content', title);
            }
        })
        .on('meta[property="og:description"]', {
            element(e) {
                e.setAttribute('content', description);
            }
        })
        .on('meta[property="og:url"]', {
            element(e) {
                e.setAttribute('content', currentUrl);
            }
        })
        .on('meta[property="og:locale"]', {
            element(e) {
                // Map supportedLang to og:locale format if needed (e.g. ja -> ja_JP)
                // For now using the lang code as is or simple mapping
                let locale = lang;
                if (lang === 'en') locale = 'en_US';
                if (lang === 'ja') locale = 'ja_JP';
                if (lang === 'ko') locale = 'ko_KR';
                if (lang === 'zh-CN') locale = 'zh_CN';
                if (lang === 'zh-TW') locale = 'zh_TW';
                e.setAttribute('content', locale);
            }
        })
        // Injects hreflang tags to head
        .on('head', {
            append(e) {
                let hreflangs = '';
                for (const l of config.supportedLanguages) {
                    // Construct URL for this language
                    let langUrl = config.baseUrl;
                    if (l !== config.defaultLanguage) {
                        langUrl += `/${l}`;
                    }
                    // Append the route path (clean)
                    if (routePath !== '/') {
                        langUrl += routePath;
                    }
                    hreflangs += `<link rel="alternate" hreflang="${l}" href="${langUrl}" />`;
                }
                // Also add x-default (usually point to en)
                // const defaultUrl = `${config.baseUrl}${routePath === '/' ? '' : routePath}`;
                // hreflangs += `<link rel="alternate" hreflang="x-default" href="${defaultUrl}" />`;

                e.append(hreflangs, { html: true });
            }
        })
        .transform(response);
}
