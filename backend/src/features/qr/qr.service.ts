import fs from 'fs/promises';
import path from "path";
import { config, prisma } from "../../config"
import { AppError } from "../../errors/AppError";
import QRCode, { QRCodeToFileOptions } from 'qrcode'
import { PatternStyle } from "../../generated/prisma/enums";
import { createLinkQr } from './qr.validation';



export const qrService = async(data : createLinkQr) => {
    const currentLink =  await prisma.link.findFirst({
        where : {
            id : data.linkId,
            userId : data.userId
        }
    })

    if(!currentLink) {
        throw new AppError("Link not found",404);
    }

    const shortUrl = `${config.APP_URL}/r/${currentLink.shortId}`;

    const foregroundColor = data.foregroundColor ?? "#000000";

    const backgroundColor = data.backgroundColor ?? "#FFFFFF";

    const margin = data.margin ?? 2;

    const existingQr = await prisma.qr.findFirst({
        where : {
            linkId : currentLink.id,
            foregroundColor,
            backgroundColor,
            margin
        }
    })

    if(existingQr) {
        return {
            id : existingQr.id,
            imageUrl : existingQr.imageUrl,
            shortId: currentLink.shortId
            
        };
    }


    


    const options : QRCodeToFileOptions = {
    errorCorrectionLevel: "M",
    width: 300,
    margin,
    color: {
        dark: foregroundColor,
        light: backgroundColor 
    }
};


    const fileName = `${currentLink.shortId}.png`;

    const imagePath = path.join(
        process.cwd(),
        "uploads",
        "qr",
        fileName
    );

    const imageUrl = `/uploads/qr/${fileName}`;
    
    try {
        await fs.mkdir(
            path.join(process.cwd(),"uploads","qr"),
            { recursive: true }
        );


        await QRCode.toFile(imagePath,shortUrl,options);
        const qr = await prisma.qr.create({
            data: {
                linkId : currentLink.id,
                imageUrl,
                margin,
                foregroundColor,
                backgroundColor,
            }
        })

        return {
            id : qr.id,
            imageUrl : qr.imageUrl,
            shortId: currentLink.shortId
        };

    } catch(err) {
        throw new AppError("Failed to generate the Qr. Try Again!",400);
        
    }


}