#!/usr/bin/env node
/**
 * Multi-Language Sitemap Generator for NexMap
 * 
 * Generates a comprehensive sitemap.xml with all language variants
 * and xhtml:link hreflang attributes for each page.
 * 
 * Usage: node scripts/generate-sitemap.js
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { ROUTES, LANGUAGES, BASE_URL } from '../src/config/seoConfig.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure output is to public (for dev) and dist (for build)
// Usually Cloudflare Pages serves from 'dist' after build.
// But locally we might want it in 'public' too if we change it dynamically, 
// but static gen usually goes to dist/sitemap.xml post-build.
// The package.json script says: "build": "npx vite build && node scripts/generate-sitemap.js"
// Vite builds to 'dist', so we should write to 'dist'.
const OUTPUT_PATH = path.join(__dirname, '..', 'dist', 'sitemap.xml');

/**
 * Get the full URL for a given path and language
 */
function getFullUrl(routePath, lang) {
    if (lang === 'en') {
        return `${BASE_URL}${routePath}`;
    }
    // For non-English, prepend language prefix
    // Handle root / correctly: /ja not /ja/
    // Actually standard is /ja/ or /ja.
    // Middleware expects /ja/... 
    // If routePath is '/', result should be '/ja' or '/ja/'?
    // Middleware: parts[0] is lang.
    // If url is /ja, parts=['ja']. lang=ja, path=/
    // So /ja is correct.
    const langPath = routePath === '/' ? `/${lang}` : `/${lang}${routePath}`;
    return `${BASE_URL}${langPath}`;
}

/**
 * Get hreflang code for a language
 */
function getHreflang(lang) {
    if (lang === 'en') return 'en';
    if (lang === 'zh') return 'zh-Hans';
    return lang;
}

/**
 * Generate <xhtml:link> elements for all language alternates
 */
function generateAlternateLinks(routePath) {
    const links = LANGUAGES.map(lang => {
        const href = getFullUrl(routePath, lang);
        const hreflang = getHreflang(lang);
        return `      <xhtml:link rel="alternate" hreflang="${hreflang}" href="${href}" />`;
    });

    // Add x-default pointing to English version
    links.push(`      <xhtml:link rel="alternate" hreflang="x-default" href="${BASE_URL}${routePath}" />`);

    return links.join('\n');
}

/**
 * Generate a single <url> entry for the sitemap
 */
function generateUrlEntry(routePath, lang, priority, changefreq) {
    const loc = getFullUrl(routePath, lang);
    const lastmod = new Date().toISOString().split('T')[0];
    const alternateLinks = generateAlternateLinks(routePath);

    return `  <url>
    <loc>${loc}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>${changefreq}</changefreq>
    <priority>${priority}</priority>
${alternateLinks}
  </url>`;
}

/**
 * Generate the complete sitemap XML
 */
function generateSitemap() {
    const urlEntries = [];

    // Generate entries for each route × language combination
    for (const route of ROUTES) {
        for (const lang of LANGUAGES) {
            urlEntries.push(generateUrlEntry(route.path, lang, route.priority, route.changefreq));
        }
    }

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset 
  xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
  xmlns:xhtml="http://www.w3.org/1999/xhtml">
${urlEntries.join('\n')}
</urlset>
`;

    return xml;
}

/**
 * Main execution
 */
function main() {
    console.log('🗺️  Generating multi-language sitemap...');

    // Ensure dist directory exists
    const distDir = path.dirname(OUTPUT_PATH);
    if (!fs.existsSync(distDir)) {
        console.log(`📁 Creating dist directory: ${distDir}`);
        fs.mkdirSync(distDir, { recursive: true });
    }

    // Generate and write sitemap
    const sitemap = generateSitemap();
    fs.writeFileSync(OUTPUT_PATH, sitemap, 'utf8');

    const urlCount = ROUTES.length * LANGUAGES.length;
    console.log(`✅ Sitemap generated with ${urlCount} URLs (${ROUTES.length} routes × ${LANGUAGES.length} languages)`);
    console.log(`📍 Output: ${OUTPUT_PATH}`);
}

main();
