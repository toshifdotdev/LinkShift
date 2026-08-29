import QRCodeCanvas from '@solana/qr-code-styling';
import sharp from 'sharp';
import { AppError } from '../errors/AppError';
import { JSDOM } from 'jsdom';
import type { CornerSquareType, DotType } from "@solana/qr-code-styling";
import { EyeBallStyle, EyeStyle, PatternStyle } from '../generated/prisma/enums';
import { uploadBuffer } from './uploadBuffer';

const fakeBrowser = new JSDOM('', { resources: "usable" });
global.window = fakeBrowser.window as any;
global.document = fakeBrowser.window.document;
global.XMLSerializer = fakeBrowser.window.XMLSerializer; 
global.Image = fakeBrowser.window.Image;
global.XMLHttpRequest = fakeBrowser.window.XMLHttpRequest
global.FileReader = fakeBrowser.window.FileReader;


const eyeStyleMap: Record<EyeStyle, CornerSquareType> = {
    square: "square",
    dot: "dot",
    extraRounded: "extra-rounded"
} as const;

const patternStyleMap: Record<PatternStyle, DotType> = {
    square: "square",
    dots: "dots",
    rounded: "rounded",
    extraRounded: "extra-rounded",
    classy: "classy",
    classyRounded: "classy-rounded"
} as const;


type qrCodeData = {
    margin: number;
    frame?: string;
    foregroundColor: string;
    backgroundColor: string;
    pattern: PatternStyle; 
    eyeStyle: EyeStyle; 
    eyeBallStyle: EyeBallStyle; 
    logoUrl?: string;
    shortUrl: string;
    userId : string;
}

export const generateQrImage = async (data: qrCodeData) => {
    const qrCode = new QRCodeCanvas({
        width: 300,
        height: 300,
        data: data.shortUrl,
        margin: data.margin,
        // High error correction when a logo covers the center — keeps the
        // code scannable despite occlusion.
        qrOptions: { errorCorrectionLevel: data.logoUrl ? "H" : "Q" },
        // NOTE: the logo is NOT passed to the library — JSDOM cannot load
        // images, so the logo silently vanished from the generated SVG.
        // It is composited with sharp below, after rasterization.
        dotsOptions: {
            color: data.foregroundColor,
            type: patternStyleMap[data.pattern]
        },
        backgroundOptions: {
            color: data.backgroundColor,
        },
        cornersSquareOptions: {
            color: data.foregroundColor,
            type: eyeStyleMap[data.eyeStyle]
        },
        cornersDotOptions: {
            color: data.foregroundColor,
            type: data.eyeBallStyle
        },
        imageOptions: {
            crossOrigin: "anonymous",
            margin: 5,
            hideBackgroundDots: true,
            imageSize: 0.3
        }
    });

    
    const blob = await qrCode.getRawData("svg");
    if (!blob) {
        throw new AppError("Failed to generate QR code SVG stream", 500);
    }
    const arrayBuffer = await blob.arrayBuffer();
    const rasterBuffer = Buffer.from(arrayBuffer);
    let pngBuffer = await sharp(rasterBuffer)
        .png()
        .toBuffer();

    // Logo composite with sharp — mirrors the studio preview (30% of the
    // code width, centered, on a clear rounded area of the background
    // color, with ECC-H already applied above for scannability).
    if (data.logoUrl) {
        try {
            const logoRes = await fetch(data.logoUrl);
            if (logoRes.ok) {
                const logoBuf = Buffer.from(await logoRes.arrayBuffer());
                const logoSize = Math.round(300 * 0.3); // 90px — mirrors imageSize 0.3
                const clearPad = Math.round(logoSize * 0.14);
                const clearSize = logoSize + clearPad * 2;
                const clearRect = Buffer.from(
                    `<svg width="${clearSize}" height="${clearSize}" xmlns="http://www.w3.org/2000/svg"><rect width="${clearSize}" height="${clearSize}" rx="${Math.round(clearSize * 0.18)}" fill="${data.backgroundColor}"/></svg>`,
                );
                const logoPng = await sharp(logoBuf)
                    .resize(logoSize, logoSize, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
                    .png()
                    .toBuffer();
                const left = Math.round(150 - clearSize / 2);
                const top = Math.round(150 - clearSize / 2);
                pngBuffer = await sharp(pngBuffer)
                    .composite([
                        { input: clearRect, top, left },
                        { input: logoPng, top: Math.round(150 - logoSize / 2), left: Math.round(150 - logoSize / 2) },
                    ])
                    .png()
                    .toBuffer();
            }
        } catch (logoError) {
            // A failed logo fetch must never break QR generation — the code
            // is still fully functional without the logo.
            console.error("[qr] logo composite failed, generating without logo:", logoError instanceof Error ? logoError.message : logoError);
        }
    }

    const uploaded = await uploadBuffer(pngBuffer,`qrs/${data.userId}/generated`)

    return {
        ...uploaded,
        buffer: pngBuffer,
    };
}