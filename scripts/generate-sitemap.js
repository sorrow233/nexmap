/**
 * Sitemap Generator
 * Generates sitemap.xml with hreflang tags for all supported languages.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { SEO_CONFIG, LANGUAGES, BASE_URL, ROUTES } from '../seo-config.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const generateSitemap = () => {
    let sitemapContent = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xhtml="http://www.w3.org/1999/xhtml">
`;

    ROUTES.forEach(route => {
        // For each route, we generate an entry for each language (or just one entry with xhtml:link alternate?)
        // Google recommendation: distinct URL for each language version.
        // Assuming our structure is domain.com/lang/page AND domain.com/page (default=en)

        // 1. Default Language Entry (e.g., /about -> implies English)
        // It should contain xhtml:link to all other variants including itself

        const generateEntry = (langCode, isDefault = false) => {
            let pagePath = route.path;
            if (pagePath.startsWith('/')) pagePath = pagePath.substring(1);

            let url;
            if (isDefault) {
                url = `${BASE_URL}/${pagePath}`; // e.g. https://.../about
            } else {
                url = `${BASE_URL}/${langCode}/${pagePath}`; // e.g. https://.../ja/about
            }

            // Clean trailing slashes if any (except root)
            if (url.endsWith('/') && url.length > BASE_URL.length + 1) {
                url = url.slice(0, -1);
            }

            let entry = `  <url>
    <loc>${url}</loc>
    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>
    <changefreq>${route.changefreq}</changefreq>
    <priority>${route.priority}</priority>
`;

            // Add hreflang links
            // Self reference
            //   entry += `    <xhtml:link rel="alternate" hreflang="${isDefault ? 'x-default' : langCode}" href="${url}" />\n`; 

            // Add references to ALL other languages for this page
            LANGUAGES.forEach(lang => {
                let langUrl;
                if (lang === 'en') {
                    // Assuming 'en' is default and mapped to root paths
                    let p = route.path;
                    if (p.startsWith('/')) p = p.substring(1);
                    langUrl = `${BASE_URL}/${p}`;
                } else {
                    let p = route.path;
                    if (p.startsWith('/')) p = p.substring(1);
                    langUrl = `${BASE_URL}/${lang}/${p}`;
                }

                if (langUrl.endsWith('/') && langUrl.length > BASE_URL.length + 1) langUrl = langUrl.slice(0, -1);

                entry += `    <xhtml:link rel="alternate" hreflang="${lang}" href="${langUrl}" />\n`;
            });

            entry += `  </url>\n`;
            return entry;
        };

        // Generate for Default (Root paths) - Treating 'en' as default/root
        sitemapContent += generateEntry('en', true);

        // Generate for other languages
        LANGUAGES.filter(l => l !== 'en').forEach(lang => {
            sitemapContent += generateEntry(lang, false);
        });

    });

    sitemapContent += `</urlset>`;

    const publicDir = path.resolve(__dirname, '../public');
    if (!fs.existsSync(publicDir)) {
        // Try root if public doesn't exist (Vite public dir)
        // Usually project root/public
        console.warn("Public directory not found specific path, trying default...");
    }

    const targetPath = path.join(path.resolve(__dirname, '../public'), 'sitemap.xml');

    fs.writeFileSync(targetPath, sitemapContent);
    console.log(`Sitemap generated at ${targetPath}`);
};

try {
    generateSitemap();
} catch (e) {
    console.error("Failed to generate sitemap:", e);
    process.exit(1);
}
