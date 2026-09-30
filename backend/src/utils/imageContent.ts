import { AppError } from "../errors/AppError";

/**
 * Content verification for uploaded images.
 *
 * `upload.middleware.ts` can only see `file.mimetype`, which is supplied by
 * the client and is therefore trivially spoofable: any bytes (HTML, a script,
 * a zip bomb) could be uploaded by simply declaring `Content-Type: image/png`.
 * The MIME allow-list is still useful as a cheap first gate, but it is not a
 * security boundary on its own — this module is.
 *
 * Each declared type is checked against the actual leading bytes of the file.
 *
 * On SVG: SVGs are legitimately supported for QR logos, and both of their
 * consumption paths are safe today (a QR logo is rasterised to PNG by sharp
 * before it is ever stored, and an avatar is rendered through `<img>`, where
 * SVG is a non-scripted context per spec). So SVG is not removed here; it is
 * accepted only when it parses as SVG and carries none of the constructs that
 * turn an image into an active document.
 */
const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const JPEG_SIGNATURE = Buffer.from([0xff, 0xd8, 0xff]);

const startsWith = (buffer: Buffer, signature: Buffer): boolean =>
    buffer.length >= signature.length && buffer.subarray(0, signature.length).equals(signature);

const isJpeg = (buffer: Buffer): boolean => startsWith(buffer, JPEG_SIGNATURE);

const isPng = (buffer: Buffer): boolean => startsWith(buffer, PNG_SIGNATURE);

const isWebp = (buffer: Buffer): boolean =>
    buffer.length >= 12 &&
    buffer.subarray(0, 4).toString("latin1") === "RIFF" &&
    buffer.subarray(8, 12).toString("latin1") === "WEBP";

/**
 * Constructs that let an SVG execute or read local context. Normal exported
 * logos never contain these. A plain `<!DOCTYPE svg ...>` is allowed (design
 * tools emit it); only an internal subset carrying entity declarations is
 * refused, since that is the XXE vector.
 */
const UNSAFE_SVG_PATTERNS: { label: string; pattern: RegExp }[] = [
    { label: "script elements", pattern: /<\s*script[\s>]/i },
    { label: "inline event handlers", pattern: /\son[a-z]+\s*=/i },
    { label: "foreignObject", pattern: /<\s*foreignObject[\s>]/i },
    { label: "entity declarations", pattern: /<!\s*ENTITY/i },
    { label: "javascript: urls", pattern: /javascript\s*:/i },
];

/** A DOCTYPE without an internal subset, as emitted by design tools. */
const SAFE_DOCTYPE = /^<!\s*DOCTYPE[^>\[]*>\s*/i;

const checkSvg = (buffer: Buffer): void => {
    const text = buffer.toString("utf8");

    // Check the dangerous constructs first so the rejection names the actual
    // reason; a DOCTYPE carrying an internal subset fails the markup check
    // below only as a side effect.
    for (const { label, pattern } of UNSAFE_SVG_PATTERNS) {
        if (pattern.test(text)) {
            throw new AppError(`SVG uploads may not contain ${label}.`, 400);
        }
    }

    const head = text.replace(/^﻿/, "").trimStart();
    if (!head.startsWith("<")) {
        throw new AppError("File contents do not match the declared image type.", 400);
    }

    const afterDoctype = head.replace(SAFE_DOCTYPE, "");
    if (!/^<\?xml/i.test(afterDoctype) && !/^<svg[\s>]/i.test(afterDoctype)) {
        throw new AppError("File contents do not match the declared image type.", 400);
    }
};

/**
 * Verify that a buffer really is the image type the client declared. Throws
 * AppError(400) on mismatch so the upload is rejected before it is stored.
 */
export const assertImageMatchesDeclaredType = (
    buffer: Buffer,
    declaredMimeType: string,
): void => {
    if (!Buffer.isBuffer(buffer) || buffer.length === 0) {
        throw new AppError("Uploaded file is empty.", 400);
    }

    switch (declaredMimeType.toLowerCase()) {
        case "image/png":
            if (!isPng(buffer)) throw new AppError("File is not a valid PNG image.", 400);
            return;
        case "image/jpeg":
        case "image/jpg":
            if (!isJpeg(buffer)) throw new AppError("File is not a valid JPEG image.", 400);
            return;
        case "image/webp":
            if (!isWebp(buffer)) throw new AppError("File is not a valid WebP image.", 400);
            return;
        case "image/svg+xml":
            checkSvg(buffer);
            return;
        default:
            throw new AppError("Only image files are allowed.", 400);
    }
};