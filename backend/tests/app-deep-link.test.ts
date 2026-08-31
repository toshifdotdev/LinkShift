import { describe, expect, it } from "vitest";
import {
    buildAppUrl,
    buildIntentUrl,
    detectMobilePlatform,
    extractQuery,
    extractRest,
    isAndroidChromium,
    renderAppInterstitial,
    type AppDeepLinkConfig,
} from "../src/utils/appDeepLink";

const cfg: AppDeepLinkConfig = {
    appScheme: "myapp",
    androidPackage: "com.example.app",
    appPath: "content",
    iosStoreUrl: "https://apps.apple.com/app/id123",
    androidStoreUrl: "https://play.google.com/store/apps/details?id=com.example.app",
};

const cfgMinimal: AppDeepLinkConfig = {
    appScheme: "myapp",
    androidPackage: null,
    appPath: null,
    iosStoreUrl: null,
    androidStoreUrl: null,
};

describe("detectMobilePlatform", () => {
    it("detects iOS devices", () => {
        expect(
            detectMobilePlatform(
                "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1",
            ),
        ).toBe("ios");
        expect(
            detectMobilePlatform("Mozilla/5.0 (iPad; CPU OS 17_5 like Mac OS X)"),
        ).toBe("ios");
    });

    it("detects Android devices", () => {
        expect(
            detectMobilePlatform(
                "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Mobile Safari/537.36",
            ),
        ).toBe("android");
    });

    it("returns null for desktop agents", () => {
        expect(
            detectMobilePlatform(
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
            ),
        ).toBeNull();
        expect(detectMobilePlatform("")).toBeNull();
    });
});

describe("isAndroidChromium", () => {
    it("matches Chrome on Android", () => {
        expect(
            isAndroidChromium(
                "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Mobile Safari/537.36",
            ),
        ).toBe(true);
    });

    it("does not match Firefox on Android or Chrome on desktop", () => {
        expect(
            isAndroidChromium("Mozilla/5.0 (Android 14; Mobile; rv:127.0) Gecko/127.0 Firefox/127.0"),
        ).toBe(false);
        expect(
            isAndroidChromium("Mozilla/5.0 (Windows NT 10.0) Chrome/126.0.0.0 Safari/537.36"),
        ).toBe(false);
    });
});

describe("extractRest / extractQuery", () => {
    it("joins Express 5 array params and normalizes slashes", () => {
        expect(extractRest({ rest: ["products", "5"] })).toBe("products/5");
        expect(extractRest({ rest: ["/products/", "5/"] })).toBe("products/5");
        expect(extractRest({})).toBe("");
    });

    it("accepts legacy string params", () => {
        expect(extractRest({ rest: "products/5" })).toBe("products/5");
    });

    it("returns the raw query without the leading ?", () => {
        expect(extractQuery("/abc/products/5?ref=x&y=1")).toBe("ref=x&y=1");
        expect(extractQuery("/abc")).toBe("");
    });
});

describe("buildAppUrl", () => {
    it("composes scheme://appPath/rest?query", () => {
        expect(buildAppUrl(cfg, "products/5", "ref=x")).toBe(
            "myapp://content/products/5?ref=x",
        );
    });

    it("omits empty parts", () => {
        expect(buildAppUrl(cfgMinimal, "", "")).toBe("myapp://");
        expect(buildAppUrl(cfg, "", "")).toBe("myapp://content");
        expect(buildAppUrl(cfgMinimal, "products/5", "")).toBe("myapp://products/5");
    });
});

describe("buildIntentUrl", () => {
    it("builds a Chrome intent with package and store fallback", () => {
        const intent = buildIntentUrl(cfg, "products/5", "ref=x", "https://example.com/web");
        expect(intent).toContain("intent://content/products/5?ref=x#Intent;");
        expect(intent).toContain("scheme=myapp;");
        expect(intent).toContain("package=com.example.app;");
        expect(intent).toContain(
            `S.browser_fallback_url=${encodeURIComponent(cfg.androidStoreUrl!)};end`,
        );
    });

    it("falls back to the web destination when no Play Store URL is set", () => {
        const intent = buildIntentUrl(cfgMinimal, "", "", "https://example.com/web");
        expect(intent).toContain("intent://#Intent;");
        expect(intent).not.toContain("package=");
        expect(intent).toContain(
            "S.browser_fallback_url=https%3A%2F%2Fexample.com%2Fweb;end",
        );
    });
});

describe("renderAppInterstitial", () => {
    it("embeds the app URL, fallback, and platform into the page script", () => {
        const html = renderAppInterstitial({
            platform: "ios",
            appUrl: "myapp://content/products/5?ref=x",
            fallbackUrl: "https://example.com/web",
            storeUrl: cfg.iosStoreUrl,
        });
        expect(html).toContain('"appUrl":"myapp://content/products/5?ref=x"');
        expect(html).toContain('"fallbackUrl":"https://example.com/web"');
        expect(html).toContain('"platform":"ios"');
        expect(html).toContain("Get the app");
    });

    it("omits the store button when no store URL is configured", () => {
        const html = renderAppInterstitial({
            platform: "android",
            appUrl: "myapp://",
            fallbackUrl: "https://example.com/web",
        });
        expect(html).not.toContain("Get the app");
        expect(html).not.toContain('id="get-app"');
    });

    it("cannot break out of the script block with a hostile app URL", () => {
        const html = renderAppInterstitial({
            platform: "ios",
            appUrl: 'myapp://x</script><script>alert(1)</script>',
            fallbackUrl: "https://example.com/web",
        });
        /* "<" inside the embedded JSON is neutralized, so the script block
           can never be closed early. */
        expect(html).not.toContain("</script><script>");
        expect(html).toContain("\\u003c/script>");
        expect(html.indexOf("</script>")).toBe(html.lastIndexOf("</script>"));
    });

    it("escapes the app name in the headline", () => {
        const html = renderAppInterstitial({
            platform: "ios",
            appUrl: "myapp://",
            fallbackUrl: "https://example.com/web",
            appName: "<img src=x onerror=alert(1)>",
        });
        expect(html).not.toContain("<img src=x");
        expect(html).toContain("&lt;img src=x onerror=alert(1)&gt;");
    });
});
