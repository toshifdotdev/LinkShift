import * as bcrypt from 'bcrypt';
import { prisma } from '../../config';
import { Prisma } from '../../generated/prisma/client';
import { AppError } from '../../errors/AppError';
import { getLinkMapper } from './link.mapper';
import { CreateLinkData, updateData } from './link.validation';
import { queryData } from './link.query.validation';
import { deleteCache } from '../../utils/cache';
import { getAvailableShortId } from '../../utils/shortId';
import { getValidatedDomain } from '../../utils/validate.domain';
import { checkCustomSlugLimit, checkDestinationLimit, checkLinkLimit, checkRedirectLimit, checkUtmAccess } from '../billing/billing.service';
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
        utmContent  
    } = data;

    await checkLinkLimit(userId);

    if (slug) {
        await checkCustomSlugLimit(userId);
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
                utmContent
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

    return createdLink;
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
        },
        include : {
            _count : {
                select : {scans : true}
            }
        }
    })

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

    await deleteCache(`link:${link.shortId}`);
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

    await deleteCache(`link:${existingLink.shortId}`);
    await deleteCache(`dashboard:${existingLink.userId}`);


    await prisma.link.delete({
        where : {
            id : existingLink.id
        }
    })
    return ;
}