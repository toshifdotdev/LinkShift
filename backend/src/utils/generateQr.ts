import QRCodeCanvas from '@solana/qr-code-styling';
import sharp from 'sharp';
import { AppError } from '../errors/AppError';
import { JSDOM } from 'jsdom';
import type { CornerSquareType } from "@solana/qr-code-styling";
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


type qrCodeData = {
    margin: number;
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
        image: data.logoUrl, 
        dotsOptions: {
            color: data.foregroundColor,
            type: data.pattern 
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
    const nodeBuffer = Buffer.from(arrayBuffer);

    const pngBuffer = await sharp(Buffer.from(nodeBuffer))
        .png()
        .toBuffer();

    const uploaded = await uploadBuffer(pngBuffer,`qrs/${data.userId}/generated`)

    return {
        ...uploaded
    };
}