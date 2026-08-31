import { Request } from "express";
import { prisma } from "../../config"
import * as bcrypt from 'bcrypt';
import { AppError } from "../../errors/AppError"
import { getCache, setCache, linkCacheKey } from "../../utils/cache";
import { completeTargetUrl, applyDeepLink } from "../../utils/completeRedirect";
import { checkRedirectLimit, hasDeepLinkAccess, hasAppDeepLinkAccess } from "../billing/billing.service";
import {
    AppDeepLinkConfig,
    buildAppUrl,
    buildIntentUrl,
    detectMobilePlatform,
    extractQuery,
    extractRest,
    isAndroidChromium,
    renderAppInterstitial,
} from "../../utils/appDeepLink";

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

type ResolvedRedirect =
    | {
        kind: "redirect";
        targetUrl: string;
    }
    | {
        kind: "interstitial";
        html: string;
    };

type RedirectResult =
    | ({
        requiresPassword: false;
    } & ResolvedRedirect)
    | {
        requiresPassword: true;
        linkId: string;
    };

/**
 * Shared tail of every successful resolution (plain redirect AND password
 * unlock): record the scan, append UTM (inside completeTargetUrl), apply
 * Pro-gated path forwarding, then Pro-gated platform-aware app deep linking.
 * Keeping both flows on one pipeline is what guarantees an unlocked link
 * behaves exactly like its unprotected equivalent.
 */
const resolveDestination = async (link: CachedLink, req: Request): Promise<ResolvedRedirect> => {
    const result = await completeTargetUrl(link, req);

    let finalUrl = result.targetUrl;
    if (link.deepLink && (await hasDeepLinkAccess(link.userId))) {
        finalUrl = applyDeepLink(finalUrl, req);
    }

    if (
        link.appDeepLink &&
        link.appScheme &&
        (await hasAppDeepLinkAccess(link.userId))
    ) {
        const userAgent = req.headers["user-agent"] ?? "";
        const platform = detectMobilePlatform(userAgent);

        if (platform) {
            const cfg: AppDeepLinkConfig = {
                appScheme: link.appScheme,
                androidPackage: link.androidPackage,
                appPath: link.appPath,
                iosStoreUrl: link.iosStoreUrl,
                androidStoreUrl: link.androidStoreUrl,
            };
            const rest = extractRest(req.params as Record<string, unknown>);
            const query = extractQuery(req.url ?? "");

            /* Chromium-based Android browsers resolve intent:// natively:
               they open the app when installed, otherwise they follow the
               embedded browser_fallback_url without a round trip. */
            if (platform === "android" && isAndroidChromium(userAgent) && cfg.androidPackage) {
                return {
                    kind: "redirect",
                    targetUrl: buildIntentUrl(cfg, rest, query, finalUrl),
                };
            }

            return {
                kind: "interstitial",
                html: renderAppInterstitial({
                    platform,
                    appUrl: buildAppUrl(cfg, rest, query),
                    fallbackUrl: finalUrl,
                    storeUrl: platform === "ios" ? cfg.iosStoreUrl : cfg.androidStoreUrl,
                }),
            };
        }
    }

    return {
        kind: "redirect",
        targetUrl: finalUrl,
    };
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
        /* Hot path: one Prisma call resolves the link AND its domain row
           (include), so the common cache-miss case no longer does a domain
           lookup + a link lookup back-to-back. */
        const linkWithDomain = await prisma.link.findFirst({
            where: {
                shortId,
                domain: { host },
            },
            include: { domain: true },
        });

        if (!linkWithDomain) {
            /* Slow path (no link). Disambiguate "no such domain" vs "no
               such link" with a single follow-up so the right branded
               page is shown. */
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


    if (!targetUrl.passwordHash) {
        throw new AppError("This link is not password protected.",400);
    }

    const comparePass = await bcrypt.compare(password, targetUrl.passwordHash);

    if(!comparePass) {
        throw new AppError("Incorrect Password", 401);
    }

    /* The unlock route carries the visitor's original wildcard tail
       (POST /:shortId/unlock/*rest plus the original query string), so the
       shared pipeline forwards path/query and applies the Pro-gated features
       exactly like the unprotected redirect path. */
    return resolveDestination(targetUrl, req);
}