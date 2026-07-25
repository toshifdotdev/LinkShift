import { nanoid } from 'nanoid';
import { prisma } from '../../config';
import { Prisma } from '../../generated/prisma/client';
import { AppError } from '../../errors/AppError';

type CreateLinkData = {
    userId : string,
    targetUrl : string,
    name ?: string
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
