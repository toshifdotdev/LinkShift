import { Request } from "express";
import { prisma } from "../../config"
import * as bcrypt from 'bcrypt';
import { AppError } from "../../errors/AppError"
import { getCache, setCache, linkCacheKey } from "../../utils/cache";
import { completeTargetUrl } from "../../utils/completeRedirect";
import { checkRedirectLimit, hasDeepLinkAccess, hasAppDeepLinkAccess } from "../billing/billing.service";
import {
    contextFromRequest,
    DestinationAccess,
    resolveFinalDestination,
    ResolvedRedirect,
} from "./redirect-resolution";

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
    utmContent: string | null
};

type RedirectResult =
    | ({
        requiresPassword: false;
    } & ResolvedRedirect)
    | {
        requiresPassword: true;
        linkId: string;
    };


const resolveDestination = async (link: CachedLink, req: Request): Promise<ResolvedRedirect> => {
    // Records the click. Deliberately separate from destination resolution:
    // resolution below is pure, which is what lets the redirect tester reuse it
    // without writing a scan or spending quota.
    const result = await completeTargetUrl(link, req);

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

    const resolved = await resolveDestination(targetUrl, req);

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

    
    return resolveDestination(targetUrl, req);
}