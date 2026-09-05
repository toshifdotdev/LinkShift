/*
 * Build-time prerender step.
 *
 * Consumes:
 *   dist/index.html          — the SPA shell emitted by `vite build`
 *   dist-ssr/prerender-entry.js — the SSR bundle emitted by
 *                                `vite build --ssr src/prerender/prerender-entry.tsx`
 *
 * Produces:
 *   dist/index.html                 — prerendered homepage
 *   dist/<route>/index.html         — one static file per PUBLIC_PATHS route
 *
 * Each file gets route-specific title/description/canonical/OG/Twitter/robots
 * and the page's JSON-LD (tagged `data-seo`, the same marker the runtime
 * useSeo() manages, so hydration replaces rather than duplicates).
 * The React root is filled with the server-rendered markup; the client still
 * boots with createRoot (no hydration contract).
 */

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { renderRoute, headForPath, PUBLIC_PATHS } from "../dist-ssr/prerender-entry.js";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const distDir = join(root, "dist");
const template = readFileSync(join(distDir, "index.html"), "utf8");
const ORIGIN = "https://linkshift.in";

/** Replace the content value of an attribute-selected meta tag. */
function replaceMetaContent(html, selector, content) {
    const re = new RegExp(`(<meta[^>]*${selector}[^>]*content=")[^"]*(")`);
    if (!re.test(html)) {
        throw new Error(`prerender: meta tag not found in template for ${selector}`);
    }
    return html.replace(re, `$1${escapeHtml(content)}$2`);
}

function escapeHtml(s) {
    return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/** Escape a string for safe embedding inside a <script> JSON payload. */
function escapeJsonForScript(json) {
    return json.replace(/</g, "\\u003c");
}

function buildPage(path) {
    const head = headForPath(path);
    const body = renderRoute(path);

    let html = template;
    html = html.replace(/(<title>)[^<]*(<\/title>)/, `$1${escapeHtml(head.title)}$2`);
    html = replaceMetaContent(html, 'name="description"', head.description);
    html = html.replace(
        /(<link rel="canonical" href=")[^"]*(")/,
        `$1${head.canonical}$2`,
    );
    html = replaceMetaContent(html, 'property="og:title"', head.title);
    html = replaceMetaContent(html, 'property="og:description"', head.description);
    html = replaceMetaContent(html, 'property="og:url"', `${ORIGIN}${path === "/" ? "/" : path}`);
    html = replaceMetaContent(html, 'name="twitter:title"', head.title);
    html = replaceMetaContent(html, 'name="twitter:description"', head.description);

    // Explicit index directive for crude crawlers; runtime useSeo() removes
    // this tag for parity with its default index,follow behavior.
    const robotsMeta = '<meta name="robots" content="index,follow" />';
    html = html.replace("</head>", `    ${robotsMeta}\n</head>`);

    if (head.jsonLd) {
        const script = `<script type="application/ld+json" data-seo>${escapeJsonForScript(
            JSON.stringify(head.jsonLd),
        )}</script>`;
        html = html.replace("</head>", `${script}\n</head>`);
    }

    html = html.replace("<div id=\"root\"></div>", `<div id="root">${body}</div>`);
    if (html.includes('id="root"></div>')) {
        throw new Error(`prerender: React root not injected for ${path}`);
    }

    return html;
}

let count = 0;
for (const path of PUBLIC_PATHS) {
    const html = buildPage(path);
    const outFile =
        path === "/" ? join(distDir, "index.html") : join(distDir, path, "index.html");
    mkdirSync(dirname(outFile), { recursive: true });
    writeFileSync(outFile, html, "utf8");
    count += 1;
    console.log(`[prerender] ${path} → ${outFile.replace(distDir, "dist")}`);
}

console.log(`[prerender] ${count} public routes rendered to static HTML.`);
