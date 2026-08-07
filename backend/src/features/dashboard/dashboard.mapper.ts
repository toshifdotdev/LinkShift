import { Prisma } from "../../generated/prisma/client";

type ScanWithActivity =
    Prisma.ScanGetPayload<{
        include: {
        link: {
            select: {
                name: true;
                shortId: true;
            };
        };
    };
    }>;

type activityResponse = {
    linkName: string;
    shortId: string;
    device : string;
    browser: string;
    country: string;
    scannedAt: Date;
}

export const analyticsMapper = (scan : ScanWithActivity) : activityResponse => {
         return {  
            linkName: scan.link.name ?? "Untitled Link", 
            shortId: scan.link.shortId,
            device: scan.device ?? "Unknown",
            browser: scan.browser ?? "Unknown",
            country: scan.country ?? "Unknown",
            scannedAt: scan.scannedAt
         }
}