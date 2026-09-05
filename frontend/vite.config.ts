import { fileURLToPath, URL } from "node:url";
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

/**
 * Build-time sitemap generator.
 *
 * Reads docs-data.ts as text and extracts topic slugs via regex
 * (the module is pure data with a regular structure — no transitive
 * imports or side effects).  Writes dist/sitemap.xml with canonical
 * https://linkshift.in URLs for every public route.
 */
function sitemapPlugin(): Plugin {
  let outDir = resolve(__dirname, "dist");
  return {
    name: "sitemap",
    apply: "build",
    configResolved(config) {
      outDir = config.build.outDir;
    },
    closeBundle() {
      const ORIGIN = "https://linkshift.in";

      /* Static public routes (no /app/*, no auth callbacks, no 404) */
      const staticPaths = [
        "/",
        "/pricing",
        "/docs",
        "/faq",
        "/contact",
        "/privacy",
        "/terms",
        "/refunds",
        "/shipping",
        "/acceptable-use",
        "/register",
      ];

      /* Extract topic slugs from the data source.
         Each topic entry looks like:
           slug: "some-slug",
         inside the topics[] arrays of DOC_CATEGORIES. */
      const docsSource = readFileSync(
        resolve(__dirname, "src/pages/docs/docs-data.ts"),
        "utf-8",
      );

      // Match `slug: "..."` only inside topic objects (not category slugs).
      // Extract all slug values, then filter out category slugs.
      // Category slugs are followed by `index:` on the next line; topic slugs are not.
      const allSlugRegex = /slug:\s*"([^"]+)"/g;
      const categorySlugRegex = /slug:\s*"([^"]+)",\s*\n\s*index:/g;
      const allSlugs: string[] = [];
      const categorySlugs = new Set<string>();
      let slugMatch;
      while ((slugMatch = allSlugRegex.exec(docsSource)) !== null) {
        allSlugs.push(slugMatch[1]);
      }
      while ((slugMatch = categorySlugRegex.exec(docsSource)) !== null) {
        categorySlugs.add(slugMatch[1]);
      }
      const topicSlugs = allSlugs.filter((s) => !categorySlugs.has(s));
      const docTopicPaths = topicSlugs.map((s) => `/docs/${s}`);
      const allPaths = [...staticPaths, ...docTopicPaths];
      const today = new Date().toISOString().slice(0, 10);

      const urls = allPaths
        .map(
          (path) =>
            `  <url>\n    <loc>${ORIGIN}${path}</loc>\n    <lastmod>${today}</lastmod>\n  </url>`,
        )
        .join("\n");

      const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;

      /* outDir captured from configResolved */
      writeFileSync(resolve(outDir, "sitemap.xml"), xml, "utf-8");
      console.log(`\x1b[36m[sitemap]\x1b[0m sitemap.xml written (${allPaths.length} URLs)`);
    },
  };
}

export default defineConfig({
    plugins: [
        react(),
        tailwindcss(),
        sitemapPlugin(),
    ],

    resolve: {
        alias: {
            "@": fileURLToPath(new URL("./src", import.meta.url)),
        },
    },

    server: {
        proxy: {
            "/api": {
                target: "http://localhost:3000",
                changeOrigin: true,
            },
        },
    },
});
