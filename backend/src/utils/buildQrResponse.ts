import { Prisma } from "../generated/prisma/client";

type qrType = Prisma.QrGetPayload<{}>

export const buildQrResponse = (qr: qrType, shortId: string) => ({
    id: qr.id,
    imageUrl: qr.imageUrl,
    imagePublicId: qr.imagePublicId,
    shortId,

    foregroundColor: qr.foregroundColor,
    backgroundColor: qr.backgroundColor,
    margin: qr.margin,
    pattern: qr.pattern,
    eyeBallStyle: qr.eyeBallStyle,
    eyeStyle: qr.eyeStyle,

    logoUrl: qr.logoUrl,
    logoPublicId: qr.logoPublicId,
});