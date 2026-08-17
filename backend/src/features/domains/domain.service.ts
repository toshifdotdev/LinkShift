import { prisma } from "../../config";
import { AppError } from "../../errors/AppError";
import { verifyCname } from "../../utils/dns";
import { checkDomainLimit } from "../billing/billing.service";

type DomainResponse = {
    id: string;
    host: string;
    verified: boolean;
    verifiedAt: Date | null;
    isDefault: boolean;
};


export const getDomains = async(userId : string) : Promise<DomainResponse[]> => {
    const domains : DomainResponse[] = await prisma.domain.findMany({
        where : {
            OR : [
                {
                    isDefault : true
                },
                {
                    userId
                }
            ]
        },
        orderBy : {
            isDefault : "desc"
        }
    })
    return domains;
}


export const addDomain = async(userId : string, hostName : string) => {
    await checkDomainLimit(userId);

    const domain = await prisma.domain.findUnique({
        where :{ 
            host : hostName,
        }
    })

    if(domain) {
        throw new AppError("This domain is already connected to another account.", 409)
    }

    await prisma.domain.create({
        data : 
            {
                userId,
                host : hostName,
                verified : false,
                isDefault : false
            }
    })

    return {
        instructions : {
            type: "CNAME",
            host: hostName,
            target: "go.linkshift.in"
        },
        message: "Add the following DNS record, then click Verify."
    }
}

export const verifyDomain = async(userId : string, domainId : string) => {
    const domain = await prisma.domain.findFirst({
        where : {
            id : domainId,
            userId
        }
    })
    if(!domain) {
        throw new AppError("Domain Not Found", 404);
    }

    if(domain.verified) {
        return {
            alreadyVerified : true
        };
    }
    
    await verifyCname(domain.host);

    await prisma.domain.update({
        where : {
            id : domain.id
        },
        data : {
            verified : true,
            verifiedAt : new Date()
        }
    })

    return {
        alreadyVerified : false
    };

}

export const updateDomainService = async(userId : string, domainId : string, hostName : string) => {
    const domain = await prisma.domain.findFirst({
        where : {
            id : domainId,
            userId,
            isDefault: false
        }
    })

    if(!domain) {
        throw new AppError("Domain not Found", 404);
    }

    const existsDomain  = await prisma.domain.findUnique({
        where : { 
            host : hostName,
        }
    })

    if (existsDomain && existsDomain.id !== domain.id) {
        throw new AppError("This domain is already connected to another account.", 409);
    }

    await prisma.domain.update({
        where : {
            id : domain.id,
        },
        data : {    
            host : hostName,
            verified : false,
            verifiedAt : null
        }
    })

     return {
        instructions : {
            type: "CNAME",
            host: hostName,
            target: "go.linkshift.in"
        },
        message: "Updated the following DNS record, please verify."
    }
}

export const deleteDomainService = async(userId : string,  domainId :  string) => {
    const domain = await prisma.domain.findFirst({
        where : {
            id : domainId,
            userId,
            isDefault: false
        }
    })

    if(!domain) {
        throw new AppError("Domain not Found", 404);
    }

    const linksUsingDomain = await prisma.link.findFirst({
        where : {
            domainId : domain.id
        }
    })

    if(linksUsingDomain){
        throw new AppError("This domain is currently used by existing links.", 409);
    }

    await prisma.domain.delete({
        where : {
            id : domain.id
        }
    })
    return;
}