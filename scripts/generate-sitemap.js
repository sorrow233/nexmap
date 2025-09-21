import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { config } from '../seo-config.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC_DIR = path.join(__dirname, '../public');
const SITEMAP_PATH = path.join(PUBLIC_DIR, 'sitemap.xml');

// Helper to format date YYYY-MM-DD
const formatDate = (date) => date.toISOString().split('T')[0];

function generateSitemap() {
    console.log('Generating sitemap...');

    const baseUrl = config.baseUrl;
    const urls = [];

    // Iterate over all routes
    for (const route of config.routes) {
        // For each route, generate entries for all supported languages
        for (const lang of config.supportedLanguages) {
            const isDefault = lang === config.defaultLanguage;

            // Construct URL
            // If default language (en), url is /path
            // If other language, url is /lang/path
            let urlPath = route.path;
            if (!isDefault) {
                urlPath = `/${lang}${route.path === '/' ? '' : route.path}`;
            }
            const loc = `${baseUrl}${urlPath}`;

            // Construct hreflang links for this URL
            const xhtmlLinks = config.supportedLanguages.map(l => {
                const isLDefault = l === config.defaultLanguage;
                let lPath = route.path;
                if (!isLDefault) {
                    lPath = `/${l}${route.path === '/' ? '' : route.path}`;
                }
                return `      <xhtml:link rel="alternate" hreflang="${l}" href="${baseUrl}${lPath}" />`;
            }).join('\n');

            urls.push(`
  <url>
    <loc>${loc}</loc>
    <lastmod>${formatDate(new Date())}</lastmod>
    <changefreq>${route.changefreq}</changefreq>
    <priority>${route.priority}</priority>
${xhtmlLinks}
  </url>`);
        }
    }

    const sitemapContent = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
${urls.join('')}
</urlset>`;

    fs.writeFileSync(SITEMAP_PATH, sitemapContent);
    console.log(`Sitemap generated at ${SITEMAP_PATH}`);
}

generateSitemap();
