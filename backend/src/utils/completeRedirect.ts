import { Request } from "express";
import { prisma } from "../config";
import { AppError } from "../errors/AppError";
import { CachedLink } from "../features/redirect/redirect.service";
import { extractVisitorInfo } from "../features/redirect/visitor.service";
import { getLocation } from "./geoIp";
import { storageIp } from "./ipPrivacy";

export const completeTargetUrl = async(targetUrl : CachedLink, req : Request) => {
    if(!targetUrl.isActive) {
            throw new AppError("This link has been disabled by its owner.", 403)
    }
    if (targetUrl.expiresAt && new Date(targetUrl.expiresAt) < new Date()) {
        throw new AppError("This link has expired.",410);
    }

    const { device, browser, os, ipAddress, referrer } = extractVisitorInfo(req);

    // GeoIP enrichment uses the full transient IP; only STORAGE is truncated
    // (see utils/ipPrivacy.ts).
    let location = ipAddress
    ? await getLocation(ipAddress)
    : undefined;

    try {
        await prisma.scan.create({
            data : {
                device,
                browser,
                os,
                city : location?.city ?? null,
                country : location?.country ?? null,
                ipAddress : storageIp(ipAddress),
                referrer : referrer ?? null,
                linkId : targetUrl.id,
                utmSource: targetUrl.utmSource,
                utmMedium: targetUrl.utmMedium,
                utmCampaign: targetUrl.utmCampaign,
                utmTerm: targetUrl.utmTerm,
                utmContent: targetUrl.utmContent

            }
        })
    }catch(err) {
        console.error("Failed to save analytics:", err);
    }

    return {
        requiredPassword : false,
        targetUrl : targetUrl.targetUrl
    }

}
