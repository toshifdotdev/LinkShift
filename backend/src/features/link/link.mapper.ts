import { Prisma } from "../../generated/prisma/client"

type LinkWithScanCount = Prisma.LinkGetPayload<
        {
            include : {
                _count : {
                    select : { scans :true }
                },
                domain : {
                    select : { id : true, host : true }
                }
            }

        }>

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
    deepLink: boolean;
    appDeepLink: boolean;
    appScheme: string | null;
    androidPackage: string | null;
    appPath: string | null;
    iosStoreUrl: string | null;
    androidStoreUrl: string | null;
};

export const getLinkMapper = (link : LinkWithScanCount) : LinkResponse => {
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
        deepLink: link.deepLink,
        appDeepLink: link.appDeepLink,
        appScheme: link.appScheme,
        androidPackage: link.androidPackage,
        appPath: link.appPath,
        iosStoreUrl: link.iosStoreUrl,
        androidStoreUrl: link.androidStoreUrl
    }
}