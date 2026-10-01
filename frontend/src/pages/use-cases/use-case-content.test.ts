import { describe, expect, it } from "vitest";

import { USE_CASES } from "./use-case-content";

/**
 * Copy-accuracy guard for the use-case pages.
 *
 * These pages make factual claims about the product, and a marketing page is
 * the one place a wrong claim ships without a test failing. The specific
 * regression this file exists to prevent: the campaign page previously said
 * UTM parameters are applied "on every redirect". They are not.
 * `buildUtmUrl` runs only in `link.service.ts`, at create and update, and
 * composes the destination once; the redirect pipeline never touches UTM.
 * The observable result is the same for a given link, so only the wording was
 * wrong — which is exactly why nothing else would have caught it.
 */

const campaign = USE_CASES["/campaign-links"];

const allCopy = (content: { subhead: string; proof: string; steps: { title: string; body: string }[]; capabilities: string[]; faqs: { q: string; a: string }[] }): string =>
    [
        content.subhead,
        content.proof,
        ...content.steps.flatMap((s) => [s.title, s.body]),
        ...content.capabilities,
        ...content.faqs.flatMap((f) => [f.q, f.a]),
    ].join(" \n ");

describe("campaign-links copy accuracy", () => {
    it("does not claim UTM parameters are applied on each redirect", () => {
        const copy = allCopy(campaign);

        // Phrasings that imply a per-request UTM rewrite are all false here.
        expect(copy).not.toMatch(/on every redirect/i);
        expect(copy).not.toMatch(/every redirect (that|which)/i);
        expect(copy).not.toMatch(/written onto every/i);
        expect(copy).not.toMatch(/dynamically applied/i);
    });

    it("describes the destination as being built when the link is saved", () => {
        const copy = allCopy(campaign);

        // "built" is the accurate verb: the destination is composed at save time.
        expect(copy).toMatch(/destination (address )?is built/i);
        expect(copy).toMatch(/saved with the link/i);
        expect(copy).toMatch(/when it is saved/i);
    });

    it("still promises the behaviour the product actually has", () => {
        const copy = allCopy(campaign);

        // UTM keys really are cleared and replaced, and other parameters kept.
        expect(copy).toMatch(/cleared and replaced/i);
        expect(copy).toMatch(/every other query parameter/i);

        // All five parameters are the ones the schema actually stores.
        for (const param of ["Source, medium, campaign, term and content"]) {
            expect(copy).toContain(param);
        }
    });

    it("discloses that UTM tagging is gated to Creator and above", () => {
        // `checkUtmAccess` in billing.service.ts allows CREATOR and PRO only.
        // A page that implies the tags are on every plan misprices the product.
        const planFaq = campaign.faqs.find((f) => /which plan/i.test(f.q));

        expect(planFaq, "campaign page must answer which plan includes UTM tags").toBeDefined();
        expect(planFaq?.a).toMatch(/Creator and above/i);
    });
});

describe("use-case page integrity", () => {
    for (const [path, content] of Object.entries(USE_CASES)) {
        it(`${path} is fully populated and self-consistent`, () => {
            expect(content.kicker.length).toBeGreaterThan(0);
            expect(content.headline.length).toBeGreaterThan(0);
            expect(content.subhead.length).toBeGreaterThan(0);
            expect(content.proof.length).toBeGreaterThan(0);
            expect(content.ctaLabel.length).toBeGreaterThan(0);

            expect(content.steps.length).toBeGreaterThanOrEqual(3);
            expect(content.capabilities.length).toBeGreaterThanOrEqual(5);
            expect(content.faqs.length).toBeGreaterThanOrEqual(4);

            for (const step of content.steps) {
                expect(step.title.length).toBeGreaterThan(0);
                expect(step.body.length).toBeGreaterThan(0);
            }
            for (const faq of content.faqs) {
                expect(faq.q.length).toBeGreaterThan(0);
                expect(faq.a.length).toBeGreaterThan(0);
            }

            // The breadcrumb must end on the page it describes, or the
            // structured data points at the wrong URL.
            expect(content.seo.canonicalPath).toBe(path);
            expect(content.seo.breadcrumbs.at(-1)?.path).toBe(path);
        });
    }

    it("keeps metadata lengths inside search-result limits", () => {
        for (const [path, content] of Object.entries(USE_CASES)) {
            expect(content.seo.title.length, `${path} title`).toBeLessThanOrEqual(70);
            expect(content.seo.description.length, `${path} description`).toBeLessThanOrEqual(180);
        }
    });
});
