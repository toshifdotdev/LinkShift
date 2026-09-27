import { describe, expect, it } from "vitest";
import { buildUtmUrl } from "../src/features/utm/utm.service";

/**
 * link.service.updateLink rebuilds the stored destination with buildUtmUrl on every
 * save, feeding it the merged tag set (untouched tags keep their stored value, cleared
 * tags arrive as null). These are the guarantees Edit Link's tag UI depends on.
 */

const tagged =
    "https://example.com/pricing?ref=partner&utm_source=newsletter&utm_medium=email&utm_campaign=spring&utm_term=deal&utm_content=banner";

describe("buildUtmUrl — editing tags on an existing link", () => {
    it("replaces a tag instead of appending a second one", () => {
        const url = new URL(
            buildUtmUrl(tagged, {
                utmSource: "newsletter",
                utmMedium: "email",
                utmCampaign: "summer",
                utmTerm: "deal",
                utmContent: "banner",
            }),
        );

        expect(url.searchParams.getAll("utm_campaign")).toEqual(["summer"]);
        expect(url.searchParams.get("utm_source")).toBe("newsletter");
    });

    it("leaves the rest of the query string untouched", () => {
        const url = new URL(buildUtmUrl(tagged, { utmSource: "podcast", utmMedium: "audio", utmCampaign: "launch" }));

        expect(url.searchParams.get("ref")).toBe("partner");
        expect(url.pathname).toBe("/pricing");
        expect(url.searchParams.has("utm_term")).toBe(false);
        expect(url.searchParams.has("utm_content")).toBe(false);
    });

    it("drops the tags a user cleared, without dropping the base URL", () => {
        // updateLink maps stored nulls through `?? undefined` before calling buildUtmUrl.
        const cleared = buildUtmUrl(tagged, {
            utmSource: undefined,
            utmMedium: undefined,
            utmCampaign: undefined,
            utmTerm: undefined,
            utmContent: undefined,
        });
        const url = new URL(cleared);

        expect(url.origin + url.pathname).toBe("https://example.com/pricing");
        expect(url.searchParams.get("ref")).toBe("partner");
        for (const key of ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content"]) {
            expect(url.searchParams.has(key)).toBe(false);
        }
    });

    it("is idempotent — re-saving the same tags does not change the destination", () => {
        const utm = { utmSource: "newsletter", utmMedium: "email", utmCampaign: "spring" };

        const once = buildUtmUrl("https://example.com/pricing?ref=partner", utm);
        const twice = buildUtmUrl(once, utm);

        expect(twice).toBe(once);
    });

    it("keeps untouched tags by relying on the caller's merged values", () => {
        const stored = {
            utmSource: "newsletter",
            utmMedium: "email",
            utmCampaign: "spring",
            utmTerm: "deal",
            utmContent: null,
        };
        // updateLink merges the patch over the stored tags: only utmCampaign changed.
        const merged = buildUtmUrl(tagged, {
            utmSource: stored.utmSource ?? undefined,
            utmMedium: stored.utmMedium ?? undefined,
            utmCampaign: "summer",
            utmTerm: stored.utmTerm ?? undefined,
            utmContent: stored.utmContent ?? undefined,
        });
        const url = new URL(merged);

        expect(url.searchParams.get("utm_campaign")).toBe("summer");
        expect(url.searchParams.get("utm_source")).toBe("newsletter");
        expect(url.searchParams.get("utm_medium")).toBe("email");
        expect(url.searchParams.get("utm_term")).toBe("deal");
        expect(url.searchParams.has("utm_content")).toBe(false);
    });

    it("keeps tags containing spaces or symbols URL-encoded", () => {
        const url = new URL(
            buildUtmUrl("https://example.com/", {
                utmSource: "paid search",
                utmMedium: "cpc",
                utmCampaign: "spring & summer",
            }),
        );

        expect(url.search).toContain("utm_source=paid+search");
        expect(url.searchParams.get("utm_campaign")).toBe("spring & summer");
    });
});
