import { Request } from "express";
import { prisma } from "../config";
import { AppError } from "../errors/AppError";
import { CachedLink } from "../features/redirect/redirect.service";
import { extractVisitorInfo } from "../features/redirect/visitor.service";
import { getLocation } from "./geoIp";
import { storageIp } from "./ipPrivacy";
import { classifyRequest } from "./botDetection";
/**
 * Applies path and query forwarding to a destination URL.
 *
 * Split out from `applyDeepLink` so the forwarding rules can be evaluated
 * without an Express request. The redirect path still goes through
 * `applyDeepLink`; the redirect tester drives this function directly with
 * user-supplied input, which guarantees both run identical rules instead of a
 * preview implementation that can drift from real behaviour.
 */
export const applyDeepLinkTo = (targetUrl: string, rest: string, rawQuery: string): string => {
    try {
        const url = new URL(targetUrl);

        const cleanRest = rest.replace(/^\/+/, "").replace(/\/+$/, "");
        if (cleanRest) {
            const base = url.pathname.replace(/\/+$/, "");
            url.pathname = `${base}/${cleanRest}`;
        }

        if (rawQuery) {
            const forwarded = new URLSearchParams(rawQuery);
            for (const [key, value] of forwarded.entries()) {
                url.searchParams.append(key, value);
            }
        }

        return url.toString();
    } catch {
        return targetUrl;
    }
};

export const applyDeepLink = (targetUrl: string, req: Request): string => {
    const rawRest = (req.params as Record<string, string | string[] | undefined>).rest;
    const rest = (Array.isArray(rawRest) ? rawRest.join("/") : rawRest ?? "");
    const url = req.url ?? "";
    const rawQuery = url.includes("?") ? url.split("?")[1] : "";

    return applyDeepLinkTo(targetUrl, rest, rawQuery);
};

export const completeTargetUrl = async(targetUrl : CachedLink, req : Request) => {
    if(!targetUrl.isActive) {
            throw new AppError("This link has been disabled by its owner.", 403)
    }
    if (targetUrl.expiresAt && new Date(targetUrl.expiresAt) < new Date()) {
        throw new AppError("This link has expired.",410);
    }

    const { device, browser, os, ipAddress, referrer } = extractVisitorInfo(req);

    
    
    const verdict = classifyRequest({
        userAgent: req.headers["user-agent"],
        ip: ipAddress,
    });

    
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
                isBot : verdict.isBot,
                botReason : verdict.reason,
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
