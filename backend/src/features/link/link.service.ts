import { nanoid } from 'nanoid';
import * as bcrypt from 'bcrypt';
import { prisma } from '../../config';
import { Prisma } from '../../generated/prisma/client';
import { AppError } from '../../errors/AppError';
import { getLinkMapper } from './link.mapper';
import { CreateLinkData, updateData } from './link.validation';
import { queryData } from './link.query.validation';
import { deleteCache } from '../../utils/cache';

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
    const { userId, targetUrl, name, password  } = data;
    const expiryDate  = data.expiresAt ? new Date(data.expiresAt): null

    let hashedPassword = null;
    if(password) {
        hashedPassword = await bcrypt.hash(password,10);
    }

    let createdLink = null;
    let isUnique = false;
    let attempts = 0;
    const MAX_ATTEMPTS = 5;

    while (!isUnique && attempts < MAX_ATTEMPTS) {
        const shortId = nanoid(7); 
        attempts++;

        try {
            createdLink = await prisma.link.create({
                data: {
                    userId,
                    name,
                    targetUrl,
                    shortId,
                    expiresAt : expiryDate,
                    passwordHash : hashedPassword
                }
            });

            isUnique = true; 

        } catch (error) {
            if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
                console.warn(`Collision detected for shortId. Retrying... (Attempt ${attempts})`);
                continue; 
            }
            
            throw new AppError("Database operation failed while creating link", 500);
        }
    }

    if (!createdLink) {
        throw new AppError("Failed to generate a unique short link. Please try again.", 409);
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

    const link = await prisma.link.update({
        where : {
            id : existingLink.id,
        },
        data : {
            name : data.name ,
            targetUrl : data.targetUrl,
            isActive : data.isActive,
            expiresAt : expiryDate,
            passwordHash
        },
        include : {
            _count : {
                select : {scans : true}
            }
        }
    })

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