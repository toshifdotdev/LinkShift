import { Request } from "express";
import { prisma } from "../../config"
import * as bcrypt from 'bcrypt';
import { AppError } from "../../errors/AppError"
import { getCache, setCache, linkCacheKey } from "../../utils/cache";
import { completeTargetUrl } from "../../utils/completeRedirect";
import { isSocialPreviewRequest } from "../../utils/botDetection";
import { extractRest } from "../../utils/appDeepLink";
import { hasLinkPreview, renderLinkPreview } from "../link/linkPreview";
import { checkRedirectLimit, hasDeepLinkAccess, hasAppDeepLinkAccess } from "../billing/billing.service";
import {
    contextFromRequest,
    DestinationAccess,
    resolveFinalDestination,
    ResolvedRedirect,
} from "./redirect-resolution";

/**
 * Rebuilds the absolute URL the crawler requested, for `og:url`.
 *
 * Built from the request's own Host rather than a configured base, so it stays
 * correct on a customer custom domain and survives the primary short domain
 * changing. `shortId` is passed in because `CachedLink` is keyed on it in the
 * cache rather than carrying it as a field.
 */
const previewUrlFor = (
    req: Request,
    shortId: string
): { shortUrl: string; siteName: string } => {
    const host = req.headers.host ?? "";
    const proto = req.protocol ?? "https";
    const rest = extractRest(req.params as Record<string, unknown>);
    const suffix = rest ? `/${rest}` : "";

    return { shortUrl: `${proto}://${host}/${shortId}${suffix}`, siteName: host };
};

export type CachedLink = {
    id: string;
    userId : string
    targetUrl: string;
    isActive: boolean;
    domainId: string;
    expiresAt: Date | null;
    passwordHash: string | null;
    deepLink: boolean;
    appDeepLink: boolean;
    appScheme: string | null;
    androidPackage: string | null;
    appPath: string | null;
    iosStoreUrl: string | null;
    androidStoreUrl: string | null;
    utmSource: string | null,
    utmMedium: string | null,
    utmCampaign: string | null,
    utmTerm: string | null,
    utmContent: string | null,
    ogTitle: string | null,
    ogDescription: string | null,
    ogImageUrl: string | null
};

type RedirectResult =
    | ({
        requiresPassword: false;
    } & ResolvedRedirect)
    | {
        requiresPassword: true;
        linkId: string;
    };


const resolveDestination = async (
    link: CachedLink,
    shortId: string,
    req: Request
): Promise<ResolvedRedirect> => {
    // Records the click. Deliberately separate from destination resolution:
    // resolution below is pure, which is what lets the redirect tester reuse it
    // without writing a scan or spending quota.
    const result = await completeTargetUrl(link, req);

    // Chat and social crawlers are answered before destination resolution.
    //
    // This still records the scan above, and must keep doing so: the Privacy
    // Policy states that every request to a short link is recorded, with
    // machine requests excluded from clicks rather than from storage. Skipping
    // the write here would silently contradict a published promise and quietly
    // change what the CSV export contains.
    if (
        hasLinkPreview(link) &&
        isSocialPreviewRequest(req.headers["user-agent"])
    ) {
        const { shortUrl, siteName } = previewUrlFor(req, shortId);

        return {
            kind: "preview",
            html: renderLinkPreview({
                shortUrl,
                title: (link.ogTitle ?? link.ogDescription ?? "").trim(),
                description: link.ogDescription,
                imageUrl: link.ogImageUrl,
                siteName,
            }),
        };
    }

    // Guards keep the original short-circuit. `hasDeepLinkAccess` and
    // `hasAppDeepLinkAccess` both hit the plan cache, so calling them
    // unconditionally would add two lookups to every redirect for every user
    // on every plan, including the majority who never enable these features.
    const access: DestinationAccess = {
        deepLink: link.deepLink ? await hasDeepLinkAccess(link.userId) : false,
        appDeepLink:
            link.appDeepLink && link.appScheme
                ? await hasAppDeepLinkAccess(link.userId)
                : false,
    };

    return resolveFinalDestination(
        { ...link, targetUrl: result.targetUrl },
        contextFromRequest(req),
        access
    );
};



export const redirect = async(shortId : string, host : string, req : Request) : Promise<RedirectResult> => {
    const cacheKey = linkCacheKey(host, shortId);

    const cachedLink = await getCache(cacheKey);

    let targetUrl : CachedLink | null = null;

    if(cachedLink) {
        const cached = JSON.parse(cachedLink);
        targetUrl = {
        ...cached,
        deepLink: cached.deepLink ?? false,
        appDeepLink: cached.appDeepLink ?? false,
        appScheme: cached.appScheme ?? null,
        androidPackage: cached.androidPackage ?? null,
        appPath: cached.appPath ?? null,
        iosStoreUrl: cached.iosStoreUrl ?? null,
        androidStoreUrl: cached.androidStoreUrl ?? null,
        // A link cached before this feature existed has no og fields at all, so
        // default them rather than letting undefined through the type.
        ogTitle: cached.ogTitle ?? null,
        ogDescription: cached.ogDescription ?? null,
        ogImageUrl: cached.ogImageUrl ?? null,
        expiresAt: cached.expiresAt
            ? new Date(cached.expiresAt)
            : null,
        };
    }

    if (!targetUrl) {
        
        const linkWithDomain = await prisma.link.findFirst({
            where: {
                shortId,
                domain: { host },
            },
            include: { domain: true },
        });

        if (!linkWithDomain) {
            
            const domain = await prisma.domain.findUnique({ where: { host } });
            if (!domain) {
                throw new AppError("Domain Not Found", 400);
            }
            throw new AppError("This short link doesn't exist.", 404);
        }

        if (!linkWithDomain.domain.verified) {
            throw new AppError("Domain is not verified.", 403);
        }

        targetUrl = {
            id: linkWithDomain.id,
            domainId: linkWithDomain.domainId,
            userId: linkWithDomain.userId,
            targetUrl: linkWithDomain.targetUrl,
            isActive: linkWithDomain.isActive,
            expiresAt: linkWithDomain.expiresAt,
            passwordHash: linkWithDomain.passwordHash,
            deepLink: linkWithDomain.deepLink,
            appDeepLink: linkWithDomain.appDeepLink,
            appScheme: linkWithDomain.appScheme,
            androidPackage: linkWithDomain.androidPackage,
            appPath: linkWithDomain.appPath,
            iosStoreUrl: linkWithDomain.iosStoreUrl,
            androidStoreUrl: linkWithDomain.androidStoreUrl,
            utmSource: linkWithDomain.utmSource,
            utmMedium: linkWithDomain.utmMedium,
            utmCampaign: linkWithDomain.utmCampaign,
            utmTerm: linkWithDomain.utmTerm,
            utmContent: linkWithDomain.utmContent,
            ogTitle: linkWithDomain.ogTitle,
            ogDescription: linkWithDomain.ogDescription,
            ogImageUrl: linkWithDomain.ogImageUrl,
        };

        await setCache(cacheKey, targetUrl, 86400);
    }

    if (!targetUrl) {
        throw new AppError("Link not found", 404);
    }

    if (!targetUrl.isActive) {
        throw new AppError("This link has been disabled by its owner.", 403)
    }
    if (targetUrl.expiresAt && new Date(targetUrl.expiresAt) < new Date()) {
        throw new AppError("This link has expired.",410);
    }

    await checkRedirectLimit(targetUrl.userId);

    if(targetUrl.passwordHash) {
        return {
            requiresPassword:true,
            linkId : targetUrl.id
        }
    }

    const resolved = await resolveDestination(targetUrl, shortId, req);

    return {
        requiresPassword : false,
        ...resolved
    }
}



export const unlockService = async(shortId : string, password : string, host : string, req : Request) : Promise<ResolvedRedirect> => {
    const domain = await prisma.domain.findFirst({
            where : {
                host 
            }
    })

    if(!domain) {
        throw new AppError("Domain Not Found", 400);
    }

    const targetUrl = await prisma.link.findFirst({
        where : {
            shortId,
            domainId : domain.id
            
        }
    })

    if(!targetUrl) {
        throw new AppError("This short link doesn't exist.", 404);
    }

    // A password must not become a way around the owner's access rules.
    // These checks deliberately mirror the plain redirect path above and run
    // before the password comparison, so a disabled or expired link is
    // rejected identically whether or not it is password protected, and a
    // correct password for an inactive link is never revealed.
    if(!targetUrl.isActive) {
        throw new AppError("This link has been disabled by its owner.", 403);
    }
    if (targetUrl.expiresAt && new Date(targetUrl.expiresAt) < new Date()) {
        throw new AppError("This link has expired.", 410);
    }

    if(!targetUrl.passwordHash) {
        throw new AppError("This link is not password protected.",400);
    }

    // Guard the quota here too: the scan is written by resolveDestination
    // below, so without this an unlocked link would produce unlimited scans
    // regardless of the plan's redirect allowance.
    await checkRedirectLimit(targetUrl.userId);

    const comparePass = await bcrypt.compare(password, targetUrl.passwordHash);

    if(!comparePass) {
        throw new AppError("Incorrect Password", 401);
    }

    
    return resolveDestination(targetUrl, shortId, req);
}