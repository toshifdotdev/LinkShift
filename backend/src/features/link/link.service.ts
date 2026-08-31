import * as bcrypt from 'bcrypt';
import { prisma } from '../../config';
import { Prisma } from '../../generated/prisma/client';
import { AppError } from '../../errors/AppError';
import { getLinkMapper } from './link.mapper';
import { CreateLinkData, updateData } from './link.validation';
import { queryData } from './link.query.validation';
import { deleteCache, linkCacheKey } from '../../utils/cache';
import { getAvailableShortId } from '../../utils/shortId';
import { getValidatedDomain } from '../../utils/validate.domain';
import { checkCustomSlugLimit, checkDestinationLimit, checkLinkLimit, checkRedirectLimit, checkUtmAccess, checkDeepLinkAccess, checkAppDeepLinkAccess } from '../billing/billing.service';
import { buildUtmUrl } from '../utm/utm.service';

type CreateData = CreateLinkData&{
    userId : string,
}

type GetLinksData = queryData & {
    userId : string
};

type UpdateLinkData =  updateData & {
    userId: string;
    linkId: string;
};

type DeleteLinkData = {
    userId: string;
    linkId: string;
}

export const createLink = async (data : CreateData) => {
    const { 
        userId, 
        targetUrl, 
        name, 
        password, 
        domainId, 
        slug, 
        utmSource,
        utmMedium, 
        utmCampaign, 
        utmTerm, 
        utmContent,
        deepLink,
        appDeepLink,
        appScheme,
        androidPackage,
        appPath,
        iosStoreUrl,
        androidStoreUrl
    } = data;

    await checkLinkLimit(userId);

    if (slug) {
        await checkCustomSlugLimit(userId);
    }

    if (deepLink) {
        await checkDeepLinkAccess(userId);
    }

    if (appDeepLink) {
        await checkAppDeepLinkAccess(userId);
    }

    const hasAnyUtm =
        utmSource !== undefined ||
        utmMedium !== undefined ||
        utmCampaign !== undefined ||
        utmTerm !== undefined ||
        utmContent !== undefined;

    if (hasAnyUtm) {
        await checkUtmAccess(userId);
    }

    const expiryDate  = data.expiresAt ? new Date(data.expiresAt): null

    let hashedPassword = null;

    if(password) {
        hashedPassword = await bcrypt.hash(password,10);
    }

    const domain = await getValidatedDomain(domainId, userId);

    const shortId = await getAvailableShortId(slug, domain.id);

    const finalTargetUrl = buildUtmUrl(targetUrl, { utmSource, utmMedium, utmCampaign, utmTerm, utmContent});

    let createdLink = null;

    try {
        createdLink = await prisma.link.create({
            data: {
                userId,
                name,
                targetUrl : finalTargetUrl,
                shortId,
                expiresAt : expiryDate,
                passwordHash : hashedPassword,
                domainId : domain.id,
                utmSource,
                utmMedium,
                utmCampaign,
                utmTerm,
                utmContent,
                deepLink : deepLink ?? false,
                appDeepLink: appDeepLink ?? false,
                appScheme: appDeepLink ? appScheme ?? null : null,
                androidPackage: appDeepLink ? androidPackage ?? null : null,
                appPath: appDeepLink ? appPath ?? null : null,
                iosStoreUrl: appDeepLink ? iosStoreUrl ?? null : null,
                androidStoreUrl: appDeepLink ? androidStoreUrl ?? null : null
            },
            include: {
                _count: {
                    select: { scans : true }
                },
                domain: {
                    select: { id : true, host : true }
                }
            }
        });

        if (slug) {
            await prisma.linkChange.create({
                data: {
                    userId,
                    linkId: createdLink.id,
                    type: "CUSTOM_SLUG",
                },
            });
        }
    }catch(error){
        if(error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002'){
            throw new AppError("Please try again.", 409);
        }
        throw error;
    } 

    await deleteCache(`dashboard:${userId}`)

    return getLinkMapper(createdLink);
}



export const getLinks = async (data : GetLinksData) => {

    const where: Prisma.LinkWhereInput = {
            userId : data.userId,
    }

    if(data.status) {
        where.isActive = data.status === "active"
    }

    if(data.search) {
        where.OR = [
            {
                name : {contains : data.search , mode : 'insensitive'}
            },
            {
                targetUrl : {contains : data.search , mode : 'insensitive'}
            },
            {
                shortId : {contains : data.search , mode : 'insensitive'}
            }
                
        ]
    }


    const orderBy: Prisma.LinkOrderByWithRelationInput =
        data.sort === "clicks"
            ? {
                scans: {
                    _count: data.order
                }
            }
            : {
                [data.sort]: data.order
            };

  const skip = (data.page - 1) * data.limit 
  const take = data.limit;

  const [links, totalRecords] = await Promise.all([
    prisma.link.findMany({
        where,
        orderBy,
        skip,
        take,
        include: {
        _count: {
            select: { scans : true } 
        },
        domain: {
            select: { id : true, host : true }
        }
        },
    }),
    prisma.link.count({
        where
    })
  ])
    
const totalPages = Math.ceil(totalRecords/data.limit);

  return { 
    links : links.map(getLinkMapper),
    pagination : {
        page : data.page,
        limit : data.limit,
        totalPages,
        totalRecords,
        hasNextPage : data.page < totalPages,
        hasPreviousPage : 1 < data.page

    }
  }
};


export const getLink = async(id : string, linkId : string) => {
    const link = await prisma.link.findFirst({
        where : {
            userId : id,
            id : linkId
        },
        include : {
            _count : { 
              select : { scans : true }
            },
            domain : {
              select : { id : true, host : true }
            }
        }
    })

    if(!link) {
        throw new AppError("Link not found",404);
    }

    return getLinkMapper(link);
}


export const updateLink = async(data : UpdateLinkData) => {
    const existingLink  = await prisma.link.findFirst({
        where : {
            id : data.linkId,
            userId : data.userId
        }
    })

    if(!existingLink) {
        throw new AppError("Link Not Found", 404);
    }

    const utmChanged =
        data.utmSource !== undefined ||
        data.utmMedium !== undefined ||
        data.utmCampaign !== undefined ||
        data.utmTerm !== undefined ||
        data.utmContent !== undefined;

    const finalUtmSource =
        data.utmSource !== undefined
            ? data.utmSource
            : existingLink.utmSource;

    const finalUtmMedium =
        data.utmMedium !== undefined
            ? data.utmMedium
            : existingLink.utmMedium;

    const finalUtmCampaign =
        data.utmCampaign !== undefined
            ? data.utmCampaign
            : existingLink.utmCampaign;

    const finalUtmTerm =
        data.utmTerm !== undefined
            ? data.utmTerm
            : existingLink.utmTerm;

    const finalUtmContent =
        data.utmContent !== undefined
            ? data.utmContent
            : existingLink.utmContent;

    if (utmChanged) {
        await checkUtmAccess(data.userId);
    }

    if (data.deepLink === true) {
        await checkDeepLinkAccess(data.userId);
    }

    if (data.appDeepLink === true) {
        await checkAppDeepLinkAccess(data.userId);
    }

    const finalAppDeepLink = data.appDeepLink ?? existingLink.appDeepLink;
    const finalAppScheme = data.appScheme !== undefined ? data.appScheme : existingLink.appScheme;
    const finalAndroidPackage = data.androidPackage !== undefined ? data.androidPackage : existingLink.androidPackage;
    const finalAppPath = data.appPath !== undefined ? data.appPath : existingLink.appPath;
    const finalIosStoreUrl = data.iosStoreUrl !== undefined ? data.iosStoreUrl : existingLink.iosStoreUrl;
    const finalAndroidStoreUrl = data.androidStoreUrl !== undefined ? data.androidStoreUrl : existingLink.androidStoreUrl;

    if (finalAppDeepLink && !finalAppScheme) {
        throw new AppError("A URI scheme is required to enable mobile app deep linking", 400);
    }

    const baseTargetUrl =
        data.targetUrl !== undefined
            ? data.targetUrl
            : existingLink.targetUrl;
            

    const finalTargetUrl = buildUtmUrl(
        baseTargetUrl,
        {
            utmSource: finalUtmSource ?? undefined,
            utmMedium: finalUtmMedium ?? undefined,
            utmCampaign: finalUtmCampaign ?? undefined,
            utmTerm: finalUtmTerm ?? undefined,
            utmContent: finalUtmContent ?? undefined,
        }
    );


    const destinationChanged =
        data.targetUrl !== undefined &&
        data.targetUrl !== existingLink.targetUrl;

    const slugChanged =
        data.slug !== undefined &&
        data.slug !== existingLink.shortId;
    
    if (destinationChanged) {
        await checkDestinationLimit(data.userId);
    }

    if (slugChanged) {
        await checkCustomSlugLimit(data.userId);
    }

    
    const expiryDate  = data.expiresAt
    ? new Date(data.expiresAt)
    : null;

    let passwordHash : string | null | undefined = data.password;

    if (data.password !== undefined) {
        if (data.password === null) {
             passwordHash = null;
        } else {
            passwordHash = await bcrypt.hash(data.password,10);
        }
    }

    const domainId = data.domainId ?? existingLink.domainId;

    const domain = await getValidatedDomain(domainId, data.userId)

    
    const domainChanged =
        domainId !== existingLink.domainId;

    let shortId = existingLink.shortId;

    if (slugChanged || domainChanged) {
        const requestedSlug = data.slug ?? existingLink.shortId;
        shortId = await getAvailableShortId(requestedSlug, domain.id);
    }

    const link = await prisma.link.update({
        where : {
            id : existingLink.id,
        },
        data : {
            name : data.name ,
            targetUrl : finalTargetUrl,
            isActive : data.isActive,
            expiresAt : expiryDate,
            domainId : domain.id,
            shortId,
            passwordHash,
            utmSource: finalUtmSource,
            utmMedium: finalUtmMedium,
            utmCampaign: finalUtmCampaign,
            utmTerm: finalUtmTerm,
            utmContent: finalUtmContent,
            deepLink: data.deepLink ?? existingLink.deepLink,
            appDeepLink: finalAppDeepLink,
            appScheme: finalAppScheme ?? null,
            androidPackage: finalAndroidPackage ?? null,
            appPath: finalAppPath ?? null,
            iosStoreUrl: finalIosStoreUrl ?? null,
            androidStoreUrl: finalAndroidStoreUrl ?? null,
        },
        include : {
            _count : {
                select : {scans : true}
            },
            domain : {
                select : { id : true, host : true }
            }
        }
    })

    // Invalidate every cache key this link could be served under: the redirect
    // hot path caches per (host, shortId), and BOTH may change in one update
    // (slug edit and/or domain switch). Resolve hosts for old + new domains.
    const domainsForInvalidation = await prisma.domain.findMany({
        where: { id: { in: [existingLink.domainId, domain.id] } },
        select: { id: true, host: true },
    });
    const invalidationHosts = [...new Set(domainsForInvalidation.map(d => d.host))];
    const invalidationSlugs = [...new Set([existingLink.shortId, shortId])];

    await Promise.all(
        invalidationHosts.flatMap(host =>
            invalidationSlugs.map(slug => deleteCache(linkCacheKey(host, slug)))
        )
    );

    if (destinationChanged || slugChanged) {
        await prisma.linkChange.createMany({
            data: [
                ...(destinationChanged
                    ? [{
                        userId: data.userId,
                        linkId: existingLink.id,
                        type: "DESTINATION" as const,
                    }]
                    : []),

                ...(slugChanged
                    ? [{
                        userId: data.userId,
                        linkId: existingLink.id,
                        type: "CUSTOM_SLUG" as const,
                    }]
                    : []),
            ],
        });
    }

    await deleteCache(linkCacheKey(domain.host, link.shortId));
    await deleteCache(`dashboard:${link.userId}`);

    return getLinkMapper(link);
}

export const deleteLink = async(data : DeleteLinkData) => {
    const existingLink = await prisma.link.findFirst({
        where : {
            id : data.linkId,
            userId : data.userId
        }
    })

    if(!existingLink) {
        throw new AppError("Link Not Found", 404);
    }

    // Invalidate every host this link could be cached under before removal.
    const owningDomains = await prisma.domain.findMany({
        where: { id: existingLink.domainId },
        select: { host: true },
    });

    await Promise.all(
        owningDomains.map(d => deleteCache(linkCacheKey(d.host, existingLink.shortId)))
    );

    await prisma.link.delete({
        where : {
            id : existingLink.id
        }
    })
    return ;
}