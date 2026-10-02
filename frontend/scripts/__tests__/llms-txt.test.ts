import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { buildLlmsTxt } from "../generate-llms-txt.mjs";
import { PUBLIC_PATHS } from "../../src/prerender/public-routes.ts";
import { DOC_CATEGORIES } from "../../src/pages/docs/docs-data.ts";

// ---------------------------------------------------------------------------
// Contract for public/llms.txt.
//
// The manifest used to be hand-maintained and drifted: it listed 31 of the 39
// public routes. These tests make drift impossible — the committed file must
// be exactly what the generator produces from the route registry, and every
// route must be listed. `generate-llms-txt.mjs` derives the entries from
// `public-routes.ts` + `ROUTE_SEO` + `docs-data.ts`, so a route that lands in
// the registry without a manifest section fails the generator itself.
//
// The plan numbers in the header are parsed from `backend/prisma/seed.ts` at
// generation time (the contract of record — see backend's
// plan-limits-copy-accuracy.test.ts). This suite asserts the regenerated
// header agrees with `plan-presentation.ts`, which is what the pricing page
// renders, so the two surfaces cannot disagree silently again.
// ---------------------------------------------------------------------------

const MANIFEST_FILE = resolve(__dirname, "..", "..", "public", "llms.txt");
const committed = readFileSync(MANIFEST_FILE, "utf8");
const generated = buildLlmsTxt();

describe("llms.txt is generated output", () => {
    it("the committed manifest matches the generator exactly", () => {
        // The failure this prevents: a route added to the registry (or a copy
        // edit) that never reached the manifest. Regenerate with
        // `npm run generate:llms` — the build runs it automatically.
        expect(committed).toBe(generated);
    });

    it("lists every route in the public registry", () => {
        for (const path of new Set(PUBLIC_PATHS)) {
            // Boundary match, not substring: `/docs` must be listed on its own
            // (the `Index:` line), not merely satisfied by `/docs/<topic>`.
            const escaped = path.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
            const listed = new RegExp(`https://linkshift\\.in${escaped}(?![A-Za-z0-9/-])`);
            expect(listed.test(committed), `manifest is missing ${path}`).toBe(true);
        }
    });

    it("covers every docs topic", () => {
        for (const category of DOC_CATEGORIES) {
            for (const topic of category.topics) {
                expect(committed).toContain(`/docs/${topic.slug}`);
            }
        }
    });

    it("contains no route that is not in the registry", () => {
        const hrefs = [...committed.matchAll(/\(https:\/\/linkshift\.in([^)]*)\)/g)].map(
            (m) => m[1] || "/",
        );
        const known = new Set(PUBLIC_PATHS);
        for (const href of hrefs) {
            // The docs index line is an index link, not a listing entry.
            if (href === "/docs" || href === "/") {
                expect(known.has("/docs")).toBe(true);
                continue;
            }
            expect(known.has(href), `manifest lists unregistered route ${href}`).toBe(true);
        }
    });
});

describe("llms.txt claims match the pricing contract", () => {
    // plan-presentation.ts is what /pricing renders and is the surface the
    // manifest must agree with. Read as text rather than imported: this test
    // lives in the Node-side tsconfig where plan-presentation's "@/..." aliases
    // do not resolve — the same approach backend's plan-limits-copy-accuracy
    // test uses for the frontend copy it guards.
    const presentation = readFileSync(
        resolve(__dirname, "..", "..", "src", "pages", "pricing", "plan-presentation.ts"),
        "utf8",
    );
    const freePlan = (key: string): string => {
        const block = presentation.split("export const FREE_PLAN")[1]?.split("};")[0] ?? "";
        const m = new RegExp(`${key}:\\s*(null|\\d+)`).exec(block);
        if (!m) throw new Error(`could not read ${key} from FREE_PLAN`);
        return m[1];
    };

    it("the header's Free numbers match FREE_PLAN in plan-presentation", () => {
        expect(committed).toContain(`Free plan includes ${freePlan("maxLinks")} links`);
        expect(committed).toContain(`${freePlan("maxQrPerMonth")} QR codes`);
        expect(committed).toContain(`${freePlan("maxCustomSlugsPerMonth")} custom slugs a month`);
    });

    it("does not claim custom slugs are paid — Free includes them", () => {
        // The old manifest said "paid plans add custom domains, longer
        // analytics history, custom slugs and exports". Free seeds 10 custom
        // slugs a month, so that claim was wrong on this half. CSV export IS
        // paid (Creator+), so export may stay in the paid list.
        expect(committed).not.toMatch(/paid plans add[^.]*custom slugs/i);
    });
});

describe("llms.txt is a plain index, not an instruction", () => {
    it("contains no second-person instructions to AI systems", () => {
        // GEO guidance and provider filtering both make hidden prompting a
        // liability. The manifest must read as documentation only.
        expect(committed).not.toMatch(/\b(you (should|must|will)|recommend (that|using))/i);
        expect(committed).not.toMatch(/best (url shortener|link (shorten|manage))/i);
    });
});
