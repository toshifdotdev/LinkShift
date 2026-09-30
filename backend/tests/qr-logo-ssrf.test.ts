import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
    assertFetchableLogoUrl,
    assertInlineLogo,
    fetchLogoAsDataUri,
    qrLogoAllowedHosts,
} from "../src/utils/qrLogoFetch";

/**
 * Regression coverage for the QR logo SSRF boundary.
 *
 * `POST /api/v1/qr/:id` accepts a `logoUrl` and the server fetched it to inline
 * it into the generated image. Because the only validation was "is this an
 * http(s) URL", any authenticated Creator/Pro user could make the server
 * retrieve http://169.254.169.254/latest/meta-data/ (or an internal service)
 * and read the bytes back out of the QR image.
 *
 * A logo URL in practice only ever comes from POST /api/v1/qr/logo, which
 * uploads to Cloudinary and returns a res.cloudinary.com secure_url, so the
 * boundary is an allow-list of that delivery host.
 */
const PNG_BYTES = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x01]);

const originalAllowed = process.env.QR_LOGO_ALLOWED_HOSTS;

afterEach(() => {
    vi.restoreAllMocks();
    if (originalAllowed === undefined) delete process.env.QR_LOGO_ALLOWED_HOSTS;
    else process.env.QR_LOGO_ALLOWED_HOSTS = originalAllowed;
});

describe("assertFetchableLogoUrl", () => {
    it("accepts the Cloudinary delivery host used by the upload flow", () => {
        const url = assertFetchableLogoUrl(
            "https://res.cloudinary.com/demo/image/upload/v1/qrs/logo.png",
        );
        expect(url.protocol).toBe("https:");
        expect(url.hostname).toBe("res.cloudinary.com");
    });

    it.each([
        ["cloud instance metadata", "https://169.254.169.254/latest/meta-data/"],
        ["loopback", "https://127.0.0.1:3000/health"],
        ["loopback over TLS", "https://127.0.0.1/admin"],
        ["localhost by name", "https://localhost/admin"],
        ["private range", "https://10.0.0.5/internal"],
        ["private range 172", "https://172.16.0.9/internal"],
        ["private range 192", "https://192.168.1.1/router"],
        ["IPv6 loopback", "https://[::1]:8080/"],
        ["IPv6 unique local", "https://[fd00::1]/"],
    ])("rejects %s", (_label, url) => {
        expect(() => assertFetchableLogoUrl(url)).toThrow(/not an approved image host/i);
    });

    it.each([
        ["cloud metadata over plaintext", "http://169.254.169.254/latest/meta-data/"],
        ["loopback over plaintext", "http://127.0.0.1:3000/health"],
    ])("rejects %s before it reaches the host check", (_label, url) => {
        expect(() => assertFetchableLogoUrl(url)).toThrow(/HTTPS/i);
    });

    it("rejects plaintext http even on an allowed host", () => {
        expect(() => assertFetchableLogoUrl("http://res.cloudinary.com/x.png")).toThrow(
            /HTTPS/i,
        );
    });

    it("rejects non-http schemes", () => {
        expect(() => assertFetchableLogoUrl("file:///etc/passwd")).toThrow();
        expect(() => assertFetchableLogoUrl("gopher://127.0.0.1/")).toThrow();
        expect(() => assertFetchableLogoUrl("data:image/png;base64,AAAA")).toThrow();
    });

    it("rejects a malformed URL", () => {
        expect(() => assertFetchableLogoUrl("not a url")).toThrow(/Invalid logo URL/i);
    });

    it("rejects a look-alike host that only contains the allowed name", () => {
        expect(() =>
            assertFetchableLogoUrl("https://res.cloudinary.com.evil.test/logo.png"),
        ).toThrow(/not an approved image host/i);
    });

    it("accepts an extra host added through QR_LOGO_ALLOWED_HOSTS", () => {
        process.env.QR_LOGO_ALLOWED_HOSTS = "res.cloudinary.com,cdn.example.com";
        expect(qrLogoAllowedHosts()).toEqual(["res.cloudinary.com", "cdn.example.com"]);
        expect(() => assertFetchableLogoUrl("https://cdn.example.com/logo.png")).not.toThrow();
    });

    it("defaults to the Cloudinary delivery host when unset", () => {
        delete process.env.QR_LOGO_ALLOWED_HOSTS;
        expect(qrLogoAllowedHosts()).toEqual(["res.cloudinary.com"]);
    });
});

describe("fetchLogoAsDataUri", () => {
    it("returns a data URI for an allowed host", async () => {
        vi.spyOn(globalThis, "fetch").mockResolvedValue(
            new Response(PNG_BYTES, {
                status: 200,
                headers: { "content-type": "image/png" },
            }),
        );

        const dataUri = await fetchLogoAsDataUri("https://res.cloudinary.com/demo/logo.png");

        expect(dataUri).toBe(`data:image/png;base64,${PNG_BYTES.toString("base64")}`);
    });

    it("never issues a request for a disallowed host", async () => {
        const fetchSpy = vi.spyOn(globalThis, "fetch");

        await expect(
            fetchLogoAsDataUri("https://169.254.169.254/latest/meta-data/"),
        ).rejects.toThrow(/not an approved image host/i);

        expect(fetchSpy).not.toHaveBeenCalled();
    });

    it("never issues a request for a plaintext internal address", async () => {
        const fetchSpy = vi.spyOn(globalThis, "fetch");

        await expect(
            fetchLogoAsDataUri("http://127.0.0.1:3000/health"),
        ).rejects.toThrow(/HTTPS/i);

        expect(fetchSpy).not.toHaveBeenCalled();
    });

    it("rejects a redirect that leaves the allow-list", async () => {
        vi.spyOn(globalThis, "fetch").mockResolvedValue(
            new Response(null, {
                status: 302,
                headers: { location: "https://169.254.169.254/latest/meta-data/" },
            }),
        );

        await expect(
            fetchLogoAsDataUri("https://res.cloudinary.com/demo/logo.png"),
        ).rejects.toThrow(/not an approved image host/i);
    });

    it("follows a redirect that stays inside the allow-list", async () => {
        const fetchSpy = vi
            .spyOn(globalThis, "fetch")
            .mockResolvedValueOnce(
                new Response(null, {
                    status: 301,
                    headers: { location: "https://res.cloudinary.com/demo/final.png" },
                }),
            )
            .mockResolvedValueOnce(
                new Response(PNG_BYTES, { status: 200, headers: { "content-type": "image/png" } }),
            );

        const dataUri = await fetchLogoAsDataUri("https://res.cloudinary.com/demo/logo.png");

        expect(dataUri).toContain("data:image/png;base64,");
        expect(fetchSpy).toHaveBeenCalledTimes(2);
    });

    it("gives up after too many redirects", async () => {
        vi.spyOn(globalThis, "fetch").mockResolvedValue(
            new Response(null, {
                status: 302,
                headers: { location: "https://res.cloudinary.com/demo/loop.png" },
            }),
        );

        await expect(
            fetchLogoAsDataUri("https://res.cloudinary.com/demo/logo.png"),
        ).rejects.toThrow(/redirected too many times/i);
    });

    it("rejects a response larger than the cap", async () => {
        const oversized = Buffer.alloc(3 * 1024 * 1024, 1);
        vi.spyOn(globalThis, "fetch").mockResolvedValue(
            new Response(oversized, {
                status: 200,
                headers: { "content-type": "image/png" },
            }),
        );

        await expect(
            fetchLogoAsDataUri("https://res.cloudinary.com/demo/logo.png"),
        ).rejects.toThrow(/too large/i);
    });

    it("rejects a non-ok response", async () => {
        vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(null, { status: 404 }));

        await expect(
            fetchLogoAsDataUri("https://res.cloudinary.com/demo/logo.png"),
        ).rejects.toThrow(/could not be retrieved/i);
    });
});

describe("assertInlineLogo (renderer-side guard)", () => {
    it("accepts an inlined image", () => {
        expect(assertInlineLogo("data:image/png;base64,AAAA")).toBe("data:image/png;base64,AAAA");
    });

    it("rejects a raw URL so the renderer cannot become a second fetch sink", () => {
        expect(() => assertInlineLogo("http://169.254.169.254/latest/meta-data/")).toThrow(
            /inlined image/i,
        );
        expect(() => assertInlineLogo("https://res.cloudinary.com/demo/logo.png")).toThrow(
            /inlined image/i,
        );
    });
});