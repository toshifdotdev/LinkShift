import { describe, expect, it } from "vitest";
import { assertImageMatchesDeclaredType } from "../src/utils/imageContent";

/**
 * Regression coverage for upload content verification.
 *
 * `upload.middleware.ts` gated uploads on `file.mimetype` alone, which the
 * client fully controls: any bytes (HTML, a script, an archive) could be
 * stored by simply declaring `Content-Type: image/png`, making the MIME
 * allow-list a usability check rather than a security boundary.
 *
 * The declared type is now confirmed against the real leading bytes of the
 * file. SVG stays supported for QR logos — both of its consumers are safe
 * (a QR logo is rasterised to PNG by sharp; an avatar renders through <img>,
 * where SVG is a non-scripted context) — but an SVG carrying script, event
 * handlers, foreignObject, entity declarations or javascript: urls is refused.
 */
const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d]);
const JPEG = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46]);
const WEBP = Buffer.concat([
    Buffer.from("RIFF", "latin1"),
    Buffer.from([0x1a, 0x00, 0x00, 0x00]),
    Buffer.from("WEBP", "latin1"),
    Buffer.from("VP8 ", "latin1"),
]);
const CLEAN_SVG = Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M0 0h24v24H0z" fill="#e8590c"/></svg>`,
);

describe("raster types", () => {
    it("accepts a real PNG declared as image/png", () => {
        expect(() => assertImageMatchesDeclaredType(PNG, "image/png")).not.toThrow();
    });

    it("accepts a real JPEG declared as image/jpeg", () => {
        expect(() => assertImageMatchesDeclaredType(JPEG, "image/jpeg")).not.toThrow();
    });

    it("accepts the image/jpg spelling some Windows clients send", () => {
        expect(() => assertImageMatchesDeclaredType(JPEG, "image/jpg")).not.toThrow();
    });

    it("accepts a real WebP declared as image/webp", () => {
        expect(() => assertImageMatchesDeclaredType(WEBP, "image/webp")).not.toThrow();
    });

    it("rejects HTML masquerading as a PNG", () => {
        const html = Buffer.from("<!doctype html><script>alert(1)</script>", "utf8");
        expect(() => assertImageMatchesDeclaredType(html, "image/png")).toThrow(/not a valid PNG/i);
    });

    it("rejects a JavaScript file declared as a PNG", () => {
        const js = Buffer.from("alert(document.cookie)", "utf8");
        expect(() => assertImageMatchesDeclaredType(js, "image/png")).toThrow(/not a valid PNG/i);
    });

    it("rejects a PNG declared as a JPEG", () => {
        expect(() => assertImageMatchesDeclaredType(PNG, "image/jpeg")).toThrow(
            /not a valid JPEG/i,
        );
    });

    it("rejects a JPEG declared as a WebP", () => {
        expect(() => assertImageMatchesDeclaredType(JPEG, "image/webp")).toThrow(
            /not a valid WebP/i,
        );
    });

    it("rejects an SVG declared as a PNG", () => {
        expect(() => assertImageMatchesDeclaredType(CLEAN_SVG, "image/png")).toThrow(
            /not a valid PNG/i,
        );
    });

    it("rejects an empty upload", () => {
        expect(() => assertImageMatchesDeclaredType(Buffer.alloc(0), "image/png")).toThrow(
            /empty/i,
        );
    });

    it("rejects a type outside the allow-list", () => {
        expect(() => assertImageMatchesDeclaredType(PNG, "application/pdf")).toThrow(
            /Only image files/i,
        );
    });
});

describe("SVG", () => {
    it("accepts an ordinary exported logo", () => {
        expect(() => assertImageMatchesDeclaredType(CLEAN_SVG, "image/svg+xml")).not.toThrow();
    });

    it("accepts an SVG that opens with an XML declaration", () => {
        const withDecl = Buffer.from(
            `<?xml version="1.0" encoding="UTF-8"?>\n${CLEAN_SVG.toString("utf8")}`,
            "utf8",
        );
        expect(() => assertImageMatchesDeclaredType(withDecl, "image/svg+xml")).not.toThrow();
    });

    it("rejects an SVG carrying a script element", () => {
        const evil = Buffer.from(
            `<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>`,
            "utf8",
        );
        expect(() => assertImageMatchesDeclaredType(evil, "image/svg+xml")).toThrow(/script/i);
    });

    it("rejects an SVG carrying an inline event handler", () => {
        const evil = Buffer.from(
            `<svg xmlns="http://www.w3.org/2000/svg"><rect onload="alert(1)"/></svg>`,
            "utf8",
        );
        expect(() => assertImageMatchesDeclaredType(evil, "image/svg+xml")).toThrow(
            /event handlers/i,
        );
    });

    it("rejects an SVG carrying foreignObject", () => {
        const evil = Buffer.from(
            `<svg xmlns="http://www.w3.org/2000/svg"><foreignObject><body/></foreignObject></svg>`,
            "utf8",
        );
        expect(() => assertImageMatchesDeclaredType(evil, "image/svg+xml")).toThrow(
            /foreignObject/i,
        );
    });

    it("accepts an SVG that opens with the DOCTYPE design tools emit", () => {
        const fromIllustrator = Buffer.from(
            `<!DOCTYPE svg PUBLIC "-//W3C//DTD SVG 1.1//EN" "http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd">\n<svg xmlns="http://www.w3.org/2000/svg"><rect width="4" height="4"/></svg>`,
            "utf8",
        );
        expect(() =>
            assertImageMatchesDeclaredType(fromIllustrator, "image/svg+xml"),
        ).not.toThrow();
    });

    it("rejects an SVG with an entity declaration", () => {
        const evil = Buffer.from(
            `<!DOCTYPE svg [<!ENTITY x SYSTEM "file:///etc/passwd">]><svg xmlns="http://www.w3.org/2000/svg"/>`,
            "utf8",
        );
        expect(() => assertImageMatchesDeclaredType(evil, "image/svg+xml")).toThrow(/entity/i);
    });

    it("rejects an SVG containing a javascript: url", () => {
        const evil = Buffer.from(
            `<svg xmlns="http://www.w3.org/2000/svg"><a href="javascript:alert(1)">x</a></svg>`,
            "utf8",
        );
        expect(() => assertImageMatchesDeclaredType(evil, "image/svg+xml")).toThrow(
            /javascript/i,
        );
    });

    it("rejects an SVG that is not actually markup", () => {
        const notSvg = Buffer.from("just some text", "utf8");
        expect(() => assertImageMatchesDeclaredType(notSvg, "image/svg+xml")).toThrow(
            /do not match the declared image type/i,
        );
    });
});