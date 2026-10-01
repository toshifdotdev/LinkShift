import { describe, expect, it } from "vitest";
import { DOC_CATEGORIES } from "./docs-data";

// ---------------------------------------------------------------------------
// The public docs make behavioural claims about analytics. This page had two
// claims that were no longer true, and neither was caught by a test:
//
//   "Scan rows ... are removed after it."
//       Nothing removes them. Analytics queries filter on a cutoff, so rows age
//       out of the dashboard and are otherwise retained until the link or the
//       account is deleted (Link -> Scan is onDelete: Cascade).
//
//   "Bots and link-preview crawlers are currently counted as clicks;
//    filtered click counts are not available yet."
//       False since bot classification shipped. Human clicks drive analytics
//       and quota; bot requests are stored and disclosed separately.
//
// A docs page is the one place a stale behavioural claim ships silently, so
// the two corrections are pinned here rather than left to review.
// ---------------------------------------------------------------------------

const topic = DOC_CATEGORIES.flatMap((c) => c.topics).find(
    (t) => t.slug === "what-we-record"
);

const text = (): string =>
    (topic?.body ?? [])
        .map((block) => {
            if (block.kind === "p" || block.kind === "note") return block.text;
            if (block.kind === "steps") return block.items.join(" ");
            return "";
        })
        .join(" \n ");

describe("docs: what we record on a click", () => {
    it("exists and is reachable from the docs navigation", () => {
        expect(topic).toBeDefined();

        const listed = DOC_CATEGORIES.some((c) =>
            c.topics.some((t) => t.slug === "what-we-record")
        );
        expect(listed).toBe(true);
    });

    describe("retention claim", () => {
        it("no longer claims scan rows are removed", () => {
            expect(text()).not.toMatch(/removed after/i);
            expect(text()).not.toMatch(/are removed after it/i);
        });

        it("says older scans age out of the analytics window instead", () => {
            expect(text()).toMatch(/stop appearing in your analytics/i);
            expect(text()).toMatch(/kept rather than deleted/i);
        });

        it("still states the plan history window range", () => {
            expect(text()).toMatch(/30 days on Free/i);
            expect(text()).toMatch(/3 years on Pro/i);
        });

        it("explains when data does go away", () => {
            // Deleting the link or the account cascades to Scan rows, so this
            // is the accurate statement of the deletion path.
            expect(text()).toMatch(/delete the link or the account/i);
        });
    });

    describe("bot handling claim", () => {
        it("no longer claims bots are counted as clicks", () => {
            expect(text()).not.toMatch(/currently counted as clicks/i);
            expect(text()).not.toMatch(/not available yet/i);
        });

        it("states that machine requests are not counted as clicks", () => {
            expect(text()).toMatch(/not counted as clicks/i);
        });

        it("names the request types it excludes, so the claim is specific", () => {
            // Keep this honest: the classifier covers previews, scanners,
            // crawlers and uptime monitors, and the page should say so.
            for (const agent of [
                "Chat previews",
                "security scanners",
                "crawlers",
                "uptime monitors",
            ]) {
                expect(text()).toContain(agent);
            }
        });

        it("says recorded bot traffic is disclosed rather than hidden", () => {
            expect(text()).toMatch(/recorded and shown separately/i);
        });

        it("says bots are not charged against the redirect allowance", () => {
            expect(text()).toMatch(/not charged against your monthly redirects/i);
        });
    });

    describe("claims left intact", () => {
        it("keeps the IP truncation disclosure", () => {
            expect(text()).toMatch(/stored truncated, never in full/i);
            expect(text()).toMatch(/first three octets/i);
            expect(text()).toMatch(/first 48 bits/i);
        });

        it("keeps the no-cookies statement for visitors", () => {
            expect(text()).toMatch(/no cookies/i);
        });

        it("keeps the record-complete sentence and the enumerated fields", () => {
            // `isBot` and `botReason` are derived classification, not collected
            // data, so the enumeration of collected fields is still accurate.
            expect(text()).toMatch(/That is the whole record/i);
            expect(text()).toMatch(/no fingerprinting/i);
        });
    });
});
