import { fileURLToPath, URL } from "node:url";
import { writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { PUBLIC_PATHS } from "./src/prerender/public-routes.ts";


function sitemapPlugin(): Plugin {
  let outDir: string | null = null;
  return {
    name: "sitemap",
    apply: "build",
    configResolved(config) {
      if (config.build.ssr) return;
      outDir = config.build.outDir;
    },
    closeBundle() {
      if (!outDir) return;
      const ORIGIN = "https://linkshift.in";
      const today = new Date().toISOString().slice(0, 10);

      const urls = PUBLIC_PATHS.map(
        (path) =>
          `  <url>\n    <loc>${ORIGIN}${path}</loc>\n    <lastmod>${today}</lastmod>\n  </url>`,
      ).join("\n");

      const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;

      writeFileSync(resolve(outDir, "sitemap.xml"), xml, "utf8");
      console.log(`\x1b[36m[sitemap]\x1b[0m sitemap.xml written (${PUBLIC_PATHS.length} URLs)`);
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
