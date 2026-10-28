import { defineConfig, loadEnv, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

/**
 * Writes robots.txt and sitemap.xml into the build using VITE_SITE_URL,
 * so they always point at the right address (GitHub Pages now, custom domain later).
 */
function seoFiles(siteUrl: string): Plugin {
  return {
    name: 'synonymy-seo-files',
    apply: 'build',
    generateBundle() {
      const today = new Date().toISOString().slice(0, 10);
      this.emitFile({
        type: 'asset',
        fileName: 'robots.txt',
        source: `User-agent: *\nAllow: /\n\nSitemap: ${siteUrl}sitemap.xml\n`,
      });
      this.emitFile({
        type: 'asset',
        fileName: 'sitemap.xml',
        source: `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${siteUrl}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
</urlset>
`,
      });
    },
  };
}

export default defineConfig(({ command, mode, isPreview }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const siteUrl = env.VITE_SITE_URL ?? 'http://localhost:5173/';

  return {
    // The path part of the site URL: "/synonymy/" on GitHub Pages, "/" on a custom domain.
    // Local dev always runs at "/".
    base: command === 'serve' && !isPreview ? '/' : new URL(siteUrl).pathname,
    plugins: [react(), tailwindcss(), seoFiles(siteUrl)],
  };
});
