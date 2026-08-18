import { prisma } from "../../config";
import { AppError } from "../../errors/AppError";
import { createCsvRow } from "../../utils/csvHelper";
import { checkCsvExportAccess, getAnalyticsCutoff } from "../billing/billing.service"

export const exportLinkAnalytics = async(userId : string, linkId : string, requestedDays ?: number) => {
    await checkCsvExportAccess(userId);

    const cutoff = await getAnalyticsCutoff(userId, requestedDays);

    const link = await prisma.link.findFirst({
        where : {
            id : linkId,
            userId
        },
        select : {
            id : true,
            name : true,
            shortId : true
        }
    })

    if (!link) {
        throw new AppError("Link Not Found", 404);
    }

    const scans = await prisma.scan.findMany({
        where : {
            linkId,
            scannedAt : {
                gte : cutoff
            },
        },
        orderBy : {
            scannedAt : "desc"
        }
    });


    const headers = [
        "Scanned At",
        "Link Name",
        "Short ID",
        "UTM Source",
        "UTM Medium",
        "UTM Campaign",
        "UTM Term",
        "UTM Content",
        "Browser",
        "Device",
        "OS",
        "Country",
        "City",
        "IP Address"
    ];


    const rows = scans.map(scan =>
        createCsvRow([
            scan.scannedAt.toISOString(),
            link.name,
            link.shortId,
            scan.utmSource,
            scan.utmMedium,
            scan.utmCampaign,
            scan.utmTerm,
            scan.utmContent,
            scan.browser,
            scan.device,
            scan.os,
            scan.country,
            scan.city,
            scan.ipAddress
        ])
    );

    const csv = [
        createCsvRow(headers),
        ...rows
    ].join("\n");

    return csv;

}