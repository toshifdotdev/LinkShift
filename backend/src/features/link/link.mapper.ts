import { Prisma } from "../../generated/prisma/client"

type LinkWithScanCount = Prisma.LinkGetPayload<
        {
            include : {
                _count : {
                    select : { scans :true }
                }
            }

        }>

type LinkResponse = {
    id: string;
    name: string | null;
    targetUrl: string;
    shortId: string;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
    clicks: number;
};

export const getLinkMapper = (link : LinkWithScanCount) : LinkResponse => {
    return {
        id: link.id,
        name: link.name,
        targetUrl: link.targetUrl,
        shortId: link.shortId,
        isActive: link.isActive,
        createdAt: link.createdAt,
        updatedAt: link.updatedAt,
        clicks: link._count.scans
    }
}