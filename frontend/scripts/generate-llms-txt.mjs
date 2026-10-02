#!/usr/bin/env node
/**
 * Generates public/llms.txt from the route registry.
 *
 * The manifest was previously hand-maintained and drifted: it listed 31 of the
 * 39 public routes, missing /status, the three use-case pages, /login,
 * /register and two docs topics. This generator derives every listing from the
 * same registry the sitemap and prerender use — `src/prerender/public-routes.ts`
 * — plus the per-route SEO metadata (`ROUTE_SEO`, `docs-data.ts`), so a new
 * route cannot silently drop out of the manifest.
 *
 * The one thing not derived from a registry is the plan summary in the header,
 * whose numbers come from `backend/prisma/seed.ts` (the contract of record for
 * plan limits — `backend/tests/plan-limits-copy-accuracy.test.ts` treats the
 * seed as the source of truth). They are parsed here rather than typed, so a
 * limit change flows into the manifest without anyone remembering to.
 *
 * Output: public/llms.txt. Run via `npm run generate:llms`; the frontend build
 * runs it before `vite build`, so dist/llms.txt is always generated output.
 * `scripts/__tests__/llms-txt.test.ts` fails when the committed file differs
 * from what this script generates.
 */

import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { PUBLIC_PATHS } from "../src/prerender/public-routes.ts";
import { ROUTE_SEO } from "../src/lib/seo.ts";
import { DOC_CATEGORIES } from "../src/pages/docs/docs-data.ts";

const ORIGIN = "https://linkshift.in";
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const OUT_FILE = join(root, "public", "llms.txt");

/**
 * Manifest sections. Every route must be assigned here or the coverage check
 * below throws, so adding a route to `public-routes.ts` without listing it
 * fails the build instead of shipping a manifest that omits it.
 */
const PRODUCT_PATHS = [
    "/",
    "/pricing",
    "/faq",
    "/status",
    "/campaign-links",
    "/qr-codes",
    "/url-migration",
];
const DOCS_INDEX = "/docs";
const ACCOUNT_PATHS = ["/login", "/register"];
const POLICY_PATHS = [
    "/contact",
    "/privacy",
    "/terms",
    "/refunds",
    "/shipping",
    "/acceptable-use",
];

/** Parse the four plan blocks out of the seed, the same way the backend guard does. */
function parseSeedLimits(planName) {
    const seed = readFileSync(
        join(root, "..", "backend", "prisma", "seed.ts"),
        "utf8",
    );
    const markers = [...seed.matchAll(/name:\s*PlanName\.(\w+)/g)];
    for (const [index, marker] of markers.entries()) {
        if (marker[1] !== planName) continue;
        const start = marker.index + marker[0].length;
        const end = markers[index + 1]?.index ?? seed.length;
        const limits = {};
        for (const m of seed
            .slice(start, end)
            .matchAll(/(max[A-Za-z]+|analyticsDays)\s*:\s*(null|\d+)/g)) {
            limits[m[1]] = m[2] === "null" ? null : Number(m[2]);
        }
        return limits;
    }
    throw new Error(`generate-llms-txt: plan ${planName} not found in seed.ts`);
}

/**
 * The header blurb. Kept factual and checkable: the Free numbers are pulled
 * from the seed at generation time, and `llms-txt.test.ts` asserts they match
 * `plan-presentation.ts`, which is what the pricing page renders.
 */
function buildSummary() {
    const free = parseSeedLimits("FREE");
    return [
        "LinkShift is a URL shortener for people who care about every click: precise",
        "short links on your own domain, matching QR codes, and per-link click",
        `analytics. The Free plan includes ${free.maxLinks} links, ${free.maxQrPerMonth} QR codes and`,
        `${free.maxCustomSlugsPerMonth} custom slugs a month; paid plans add custom domains, a longer`,
        "analytics window, CSV export and bulk import.",
    ];
}

/** Link text from the registered SEO title, with the brand suffix trimmed. */
function entryTitle(title) {
    return title.replace(/\s+—\s+LinkShift$/, "");
}

function routeEntry(path) {
    const route = ROUTE_SEO[path];
    if (!route) {
        throw new Error(
            `generate-llms-txt: no ROUTE_SEO entry for ${path}, so the manifest has no description for it`,
        );
    }
    const href = `${ORIGIN}${path === "/" ? "/" : path}`;
    return `- [${entryTitle(route.title)}](${href}): ${route.description}`;
}

function docsTopicEntry(topic) {
    return `- [${topic.title}](${ORIGIN}/docs/${topic.slug}): ${topic.summary}`;
}

/** Every path the manifest must list, used for the coverage check. */
function expectedPaths() {
    return [
        ...PRODUCT_PATHS,
        DOCS_INDEX,
        ...DOC_CATEGORIES.flatMap((c) => c.topics.map((t) => `/docs/${t.slug}`)),
        ...ACCOUNT_PATHS,
        ...POLICY_PATHS,
    ];
}

function assertFullCoverage() {
    const listed = new Set(expectedPaths());
    const missing = [...new Set(PUBLIC_PATHS)].filter((p) => !listed.has(p));
    if (missing.length > 0) {
        throw new Error(
            `generate-llms-txt: routes present in public-routes.ts but assigned to no manifest section: ${missing.join(", ")}`,
        );
    }
    const unknown = [...listed].filter((p) => !PUBLIC_PATHS.includes(p));
    if (unknown.length > 0) {
        throw new Error(
            `generate-llms-txt: manifest lists routes that are not in public-routes.ts: ${unknown.join(", ")}`,
        );
    }
}

export function buildLlmsTxt() {
    assertFullCoverage();

    const lines = [];
    lines.push("# LinkShift", "");
    for (const line of buildSummary()) lines.push(`> ${line}`);
    lines.push("");
    lines.push(`Public site: ${ORIGIN}`, "");

    lines.push("## Product", "");
    for (const path of PRODUCT_PATHS) lines.push(routeEntry(path));
    lines.push("");

    lines.push("## Documentation", "");
    lines.push(`Index: ${ORIGIN}/docs`, "");
    for (const category of DOC_CATEGORIES) {
        lines.push(`${category.title}:`);
        for (const topic of category.topics) lines.push(docsTopicEntry(topic));
        lines.push("");
    }

    lines.push("## Account", "");
    for (const path of ACCOUNT_PATHS) lines.push(routeEntry(path));
    lines.push("");

    lines.push("## Company & policies", "");
    for (const path of POLICY_PATHS) lines.push(routeEntry(path));
    lines.push("");

    lines.push(
        "LinkShift is operated as a sole proprietorship from Dehradun, Uttarakhand,",
        "India. The default shared short-link domain is go.linkshift.in; short links on",
        "that domain redirect visitors — they are not documentation pages.",
    );

    return `${lines.join("\n")}\n`;
}

const invokedDirectly =
    process.argv[1] &&
    resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url));
if (invokedDirectly) {
    const manifest = buildLlmsTxt();
    writeFileSync(OUT_FILE, manifest, "utf8");
    const routes = expectedPaths().length;
    console.log(`[llms.txt] wrote ${routes} routes to public/llms.txt`);
}
