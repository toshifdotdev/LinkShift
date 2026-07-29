import QRCodeCanvas from '@solana/qr-code-styling';
import sharp from 'sharp';
import fs from 'fs/promises';
import path from 'path';
import { AppError } from '../errors/AppError';
import { JSDOM } from 'jsdom';
import type { CornerSquareType } from "@solana/qr-code-styling";
import { EyeBallStyle, EyeStyle, PatternStyle } from '../generated/prisma/enums';

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
    qrId: string;
    shortUrl: string;
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

   
    const fileName = `${data.qrId}.png`;
    const folderPath = path.join(process.cwd(), "uploads", "qr");
    const imagePath = path.join(folderPath, fileName);
    const imageUrl = `/uploads/qr/${fileName}`;

    await fs.mkdir(folderPath, { recursive: true });

    await sharp(Buffer.from(nodeBuffer))
        .png()
        .toFile(imagePath);

    return imageUrl;
}