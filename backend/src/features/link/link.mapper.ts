import { Prisma } from "../../generated/prisma/client"

/**
 * A link as returned to the client.
 *
 * `tags` is optional on the *input* side only. Some call sites fetch a single
 * link with no use for its tags, so requiring them in the include would force
 * a pointless join everywhere; the mapper normalises the absence to an empty
 * list so consumers never branch on it.
 */
type LinkWithScanCount = Prisma.LinkGetPayload<
        {
            include : {
                _count : {
                    select : { scans :true }
                },
                domain : {
                    select : { id : true, host : true }
                },
                tags ? : {
                    include : { tag : { select : { id : true, name : true } } }
                }
            }

        }>;

/**
 * The same payload with tags deliberately omitted.
 *
 * Prisma cannot express "this include is optional" in a GetPayload type, so
 * call sites that fetch a single link map through this shape instead of having
 * to fake an empty join they never asked for.
 */
type LinkWithoutTags = Prisma.LinkGetPayload<
        {
            include : {
                _count : {
                    select : { scans :true }
                },
                domain : {
                    select : { id : true, host : true }
                }
            }
        }>;

type LinkResponse = {
    id: string;
    name: string | null;
    targetUrl: string;
    shortId: string;
    isActive: boolean;
    expiresAt : Date | null;
    createdAt: Date;
    updatedAt: Date;
    clicks: number;
    domainId: string;
    domainHost: string;
    utmSource: string | null;
    utmMedium: string | null;
    utmCampaign: string | null;
    utmTerm: string | null;
    utmContent: string | null;
    deepLink: boolean;
    appDeepLink: boolean;
    appScheme: string | null;
    androidPackage: string | null;
    appPath: string | null;
    iosStoreUrl: string | null;
    androidStoreUrl: string | null;
};

export const getLinkMapper = (link : LinkWithScanCount | LinkWithoutTags) : LinkResponse => {
    return {
        id: link.id,
        name: link.name,
        targetUrl: link.targetUrl,
        shortId: link.shortId,
        isActive: link.isActive,
        expiresAt : link.expiresAt ,
        createdAt: link.createdAt,
        updatedAt: link.updatedAt,
        clicks: link._count.scans,
        domainId: link.domainId,
        domainHost: link.domain.host,
        utmSource: link.utmSource,
        utmMedium: link.utmMedium,
        utmCampaign: link.utmCampaign,
        utmTerm: link.utmTerm,
        utmContent: link.utmContent,
        deepLink: link.deepLink,
        appDeepLink: link.appDeepLink,
        appScheme: link.appScheme,
        androidPackage: link.androidPackage,
        appPath: link.appPath,
        iosStoreUrl: link.iosStoreUrl,
        androidStoreUrl: link.androidStoreUrl
    }
}