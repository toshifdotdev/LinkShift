import { config, prisma } from "../../config"
import { AppError } from "../../errors/AppError";
import { createLinkQr } from './qr.validation';
import { generateQrImage } from '../../utils/generateQr';
import { composeQrFrameInChild } from '../../utils/qrFrameCompose';
import { uploadImage } from "../../utils/uploadImage";
import { buildQrResponse } from "../../utils/buildQrResponse";
import { deleteImage } from "../../utils/deleteImage";
import { checkQrLimit, getUserPlan } from "../billing/billing.service";
import { uploadBuffer } from "../../utils/uploadBuffer";

export const qrService = async(data : createLinkQr) => {

    await checkQrLimit(data.userId);

    // Plan gate: logo branding is a Creator/Pro capability (enforced
    // server-side, mirrored by the locked control in the studio UI).
    if (data.logoUrl) {
        const plan = await getUserPlan(data.userId);
        if (plan.name !== "CREATOR" && plan.name !== "PRO") {
            throw new AppError("QR logos are available on Creator and Pro plans.", 403);
        }
    }

    const currentLink =  await prisma.link.findFirst({
        where : {
            id : data.linkId,
            userId : data.userId
        }
    })
    

    if(!currentLink) {
        throw new AppError("Link not found",404);
    }

   
    // APP_URL must be the public short domain (e.g. https://go.linkshift.in).
    const shortUrl = `${config.APP_URL}/${currentLink.shortId}`;

    const foregroundColor = data.foregroundColor ?? "#000000";
    const backgroundColor = data.backgroundColor ?? "#FFFFFF";
    const margin = data.margin ?? 2;
    const pattern = data.pattern ?? "square";
    const eyeStyle = data.eyeStyle ?? "square";
    const eyeBallStyle = data.eyeBallStyle ?? "square";
    const frame = data.frame ?? "none";
    const logoUrl = data.logoUrl;
    const logoPublicId = data.logoPublicId ?? null;

    // Frame gate: frames are a Creator/Pro capability (server-enforced).
    if (frame !== "none") {
        const plan = await getUserPlan(data.userId);
        if (plan.name !== "CREATOR" && plan.name !== "PRO") {
            throw new AppError("QR frames are available on Creator and Pro plans.", 403);
        }
    }

    const existingQr = await prisma.qr.findFirst({
        where : {
            linkId : currentLink.id,
            foregroundColor,
            backgroundColor,
            margin,
            pattern,
            eyeBallStyle,
            eyeStyle,
            frame,
            logoUrl,
            logoPublicId
        }
    })

    if(existingQr) {
        return buildQrResponse(existingQr, currentLink.shortId)
    }

    
    // The server renderer runs under JSDOM and cannot reliably fetch remote
    // images — hand it the logo as a data URL so it embeds for real.
    let renderLogoUrl = logoUrl;
    if (logoUrl) {
        const res = await fetch(logoUrl);
        if (res.ok) {
            const buf = Buffer.from(await res.arrayBuffer());
            renderLogoUrl = `data:${res.headers.get("content-type") ?? "image/png"};base64,${buf.toString("base64")}`;
        }
    }

    try {
        const qrImageData = await generateQrImage({ margin, foregroundColor, backgroundColor, userId : currentLink.userId,shortUrl, logoUrl : renderLogoUrl , pattern, eyeStyle, eyeBallStyle});

        // Frames are composed at SAVE time so the persisted Cloudinary asset
        // IS the final design — preview, library, and download all match.
        const composed = frame === "none"
            ? qrImageData.buffer
            : await composeQrFrameInChild(qrImageData.buffer, frame, foregroundColor, backgroundColor);

        const uploaded = await uploadBuffer(composed, `qrs/${currentLink.userId}/generated`)

        const qr = await prisma.qr.create({
            data: {
                imageUrl : uploaded.url,
                imagePublicId : uploaded.publicId,
                margin,
                foregroundColor,
                backgroundColor,
                pattern,
                eyeBallStyle,
                eyeStyle,
                frame,
                logoUrl,
                logoPublicId,
                linkId : currentLink.id
            }
        })

        return buildQrResponse(qr, currentLink.shortId)

    } catch(err) {
        console.error(err);

        throw new AppError(
            "Failed to generate QR",
            500
        );
        
    }
}


// Route param is the LINK id (/:linkId/download): resolve that link's most
// recently generated QR. The previous lookup compared a link id against
// Qr.id, which could never match (endpoint always 404'd).
export const qrDownloadService = async(userId : string, linkId : string) => {
    const existingQr = await prisma.qr.findFirst({
        where : {
            linkId,
            link : {
                userId
            }
        },
        include : {
            link : {
                select : { shortId : true }
            }
        },
        orderBy : {
            createdAt : "desc"
        }
    })

    if(!existingQr) {
        throw new AppError("Qr Not Found.", 404);
    }

    return {
        imageUrl : existingQr.imageUrl,
        shortId : existingQr.link.shortId,
        foregroundColor : existingQr.foregroundColor ?? "#000000",
        backgroundColor : existingQr.backgroundColor ?? "#FFFFFF",
    }
}

export const uploadQrLogoService = async(userId : string, file : Express.Multer.File) => {
    const user = await prisma.user.findUnique({
        where : {
            id : userId
        },

    })

    if(!user) {
        throw new AppError("User not found", 404);
    }

    const uploaded = await uploadImage(file, `qrs/${user.id}/logos`);

    return {
        logUrl : uploaded.url,
        logoPublicId : uploaded.publicId
    }
}

export const deleteQrService = async(userId : string, qrId : string) => {
    const qr = await prisma.qr.findFirst({
        where: {
            id: qrId,
            link: {
                userId
            }
        }
    });

    if(!qr) {
        throw new AppError("Qr not found", 404);
    }

    await deleteImage(qr.imagePublicId);

    await prisma.qr.delete({
        where : {
            id : qr.id
        }
    })
    return;
}