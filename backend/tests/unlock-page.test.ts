import { describe, expect, it } from "vitest";
import { renderUnlockPage } from "../src/utils/unlockPage";

describe("renderUnlockPage", () => {
    it("builds the form action from shortId, tail and query", () => {
        const html = renderUnlockPage({ shortId: "abc1234", rest: "products/123", query: "ref=campaign" });
        expect(html).toContain('action="/abc1234/unlock/products/123?ref=campaign"');
        expect(html).toContain('name="password"');
        expect(html).toContain('method="post"');
    });

    it("omits tail and query when the visitor arrived at the bare slug", () => {
        const html = renderUnlockPage({ shortId: "abc1234", rest: "", query: "" });
        expect(html).toContain('action="/abc1234/unlock"');
    });

    it("HTML-escapes the query so it cannot break out of the action attribute", () => {
        const html = renderUnlockPage({
            shortId: "abc1234",
            rest: "docs",
            query: 'a=1"><script>alert(1)</script>',
        });
        expect(html).not.toContain("<script>alert(1)");
        expect(html).toContain("&quot;&gt;&lt;script&gt;alert(1)&lt;/script&gt;");
        expect(html).toContain("a=1");
    });

    it("escapes ampersands in the query per HTML attribute rules", () => {
        const html = renderUnlockPage({ shortId: "abc1234", rest: "", query: "a=1&b=2" });
        expect(html).toContain('action="/abc1234/unlock?a=1&amp;b=2"');
    });
});
