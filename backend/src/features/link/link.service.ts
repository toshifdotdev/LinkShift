import { nanoid } from 'nanoid';
import { prisma } from '../../config';
import { Prisma } from '../../generated/prisma/client';
import { AppError } from '../../errors/AppError';
import { getLinkMapper } from './link.mapper';
import { updateData } from './link.validation';

type CreateLinkData = {
    userId : string,
    targetUrl : string,
    name ?: string
}

type UpdateLinkData =  updateData & {
    userId: string;
    linkId: string;
};

type DeleteLinkData = {
    userId: string;
    linkId: string;
}

export const createLink = async (data : CreateLinkData) => {
    const { userId, targetUrl, name} = data;
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
                    shortId
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

    return createdLink;
}

export const getLinks = async (id: string) => {
  const links = await prisma.link.findMany({
    where: { userId: id },
    include: {
      _count: {
        select: { scans : true } 
      }
    }
  });

  return links.map(getLinkMapper); 
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

    const link = await prisma.link.update({
        where : {
            id : existingLink.id,
        },
        data : {
            name : data.name ,
            targetUrl : data.targetUrl,
            isActive : data.isActive
        },
        include : {
            _count : {
                select : {scans : true}
            }
        }
    })

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

    await prisma.link.delete({
        where : {
            id : existingLink.id
        }
    })
    return ;
}