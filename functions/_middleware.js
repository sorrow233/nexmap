/**
 * Cloudflare Pages Functions Middleware
 * Performs Edge Injection for SEO meta tags based on the requested URL and language.
 */
import { SEO_CONFIG, DEFAULT_LANG, LANGUAGES } from '../seo-config.js';

export async function onRequest(context) {
    const url = new URL(context.request.url);
    const userAgent = context.request.headers.get('User-Agent') || '';
    const isBot = /bot|spider|crawl|facebook|twitter|linkedin|discord/i.test(userAgent);

    // If it's not a bot/crawler, simply pass through to the origin (SPA)
    // Or if it's a static asset, pass through
    if (!isBot || url.pathname.includes('.')) {
        return context.next();
    }

    // Determine language from URL path (e.g., /ja/about)
    // Assuming structure is /{lang}/{path} or just /{path} for default lang
    const pathSegments = url.pathname.split('/').filter(Boolean);
    let lang = DEFAULT_LANG;
    let routePath = url.pathname;

    if (pathSegments.length > 0 && LANGUAGES.includes(pathSegments[0])) {
        lang = pathSegments[0];
        // Reconstruct path without lang prefix
        // e.g., /ja/about -> /about
        // e.g., /ja -> /
        const remainingSegments = pathSegments.slice(1);
        routePath = '/' + remainingSegments.join('/');
    }

    // Handle root path specific case when inferred from empty segments
    if (routePath === '') routePath = '/';

    // Lookup SEO config
    const pageConfigKey = Object.keys(SEO_CONFIG).find(key => {
        // Exact match
        if (key === routePath) return true;
        // Handle trailing slashes normalization if needed, but config keys usually don't have them
        return false;
    });

    const pageConfig = pageConfigKey ? SEO_CONFIG[pageConfigKey] : SEO_CONFIG['/'];
    const seoData = pageConfig[lang] || pageConfig[DEFAULT_LANG];

    // Fetch the original index.html
    const response = await context.next();
    const originalBody = await response.text();

    // Inject meta tags
    // We replace basic placeholders or specific tags. Since this is an SPA, 
    // the index.html usually has generic tags. We'll use regex to replace them.

    let modifiedBody = originalBody;

    if (seoData) {
        // Replace <title>
        modifiedBody = modifiedBody.replace(
            /<title>.*?<\/title>/s,
            `<title>${seoData.title}</title>`
        );

        // Replace or Inject Description
        if (modifiedBody.includes('<meta name="description"')) {
            modifiedBody = modifiedBody.replace(
                /<meta name="description" content=".*?" \/>|<meta name="description" content=".*?"\/>/s,
                `<meta name="description" content="${seoData.description}" />`
            );
        } else {
            // Inject if missing (search for /head)
            modifiedBody = modifiedBody.replace(
                /<\/head>/,
                `<meta name="description" content="${seoData.description}" />\n</head>`
            );
        }

        // Inject OG Tags if available (Optional, but good for social bots which are also bots)
        if (seoData.ogTitle) {
            // Naive replacement/injection for OG tags could be added here
            // For brevity, relying on basic Title/Desc for now as requested, 
            // but adding OG Title/Desc support is good practice.
            const ogTags = `
    <meta property="og:title" content="${seoData.ogTitle || seoData.title}" />
    <meta property="og:description" content="${seoData.ogDescription || seoData.description}" />
    <meta property="og:url" content="${url.href}" />
         `;
            modifiedBody = modifiedBody.replace(/<\/head>/, `${ogTags}\n</head>`);
        }
    }

    return new Response(modifiedBody, {
        headers: response.headers,
        status: response.status,
    });
}
