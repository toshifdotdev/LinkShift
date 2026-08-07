import { AppError } from "../errors/AppError"
import  { prisma } from "../config"

export const getValidatedDomain = async(domainId : string, userId : string) => {

        const domain = await prisma.domain.findUnique({
            where : {
                id : domainId,
            }
        })

        if(!domain) {
            throw new AppError("Domain Not Found", 404)
        }

        if(domain.isDefault) {
            return domain;
        }

        if(domain.userId != userId) {
            throw new AppError("Forbidden", 403);
        }
        return domain;
}