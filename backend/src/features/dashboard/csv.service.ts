import { prisma } from "../../config";
import { AppError } from "../../errors/AppError";
import { createCsvRow } from "../../utils/csvHelper";
import { checkCsvExportAccess, getAnalyticsCutoff } from "../billing/billing.service"

export const CSV_HEADERS = [
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
    "IP Address",
];

type ScanRow = {
    scannedAt: Date;
    utmSource: string | null;
    utmMedium: string | null;
    utmCampaign: string | null;
    utmTerm: string | null;
    utmContent: string | null;
    browser: string | null;
    device: string | null;
    os: string | null;
    country: string | null;
    city: string | null;
    ipAddress: string | null;
};

export const formatScanRow = (scan: ScanRow): string =>
    createCsvRow([
        scan.scannedAt.toISOString(),
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
        scan.ipAddress,
    ]);








export const exportLinkAnalytics = async (
    write: (chunk: string) => void,
    userId: string,
    linkId: string,
    requestedDays?: number
) => {
    await checkCsvExportAccess(userId);

    const cutoff = await getAnalyticsCutoff(userId, requestedDays);

    const link = await prisma.link.findFirst({
        where: { id: linkId, userId },
        select: { id: true, name: true, shortId: true },
    });

    if (!link) {
        throw new AppError("Link Not Found", 404);
    }

    write(createCsvRow(CSV_HEADERS));

    const BATCH_SIZE = 1000;
    let totalRows = 0;
    
    
    let cursorScannedAt: Date | undefined;
    let cursorId: string | undefined;

    for (;;) {
        const batch = await prisma.scan.findMany({
            where: {
                linkId,
                scannedAt: { gte: cutoff },
                ...(cursorScannedAt
                    ? {
                          OR: [
                              { scannedAt: { lt: cursorScannedAt } },
                              {
                                  scannedAt: cursorScannedAt,
                                  id: { lt: cursorId! },
                              },
                          ],
                      }
                    : {}),
            },
            orderBy: [{ scannedAt: "desc" }, { id: "desc" }],
            take: BATCH_SIZE,
        });

        if (batch.length === 0) break;

        for (let i = 0; i < batch.length; i++) {
            write((totalRows === 0 ? "" : "\n") + formatScanRow(batch[i]));
            totalRows++;
        }

        const last = batch[batch.length - 1];
        cursorScannedAt = last.scannedAt;
        cursorId = last.id;
        if (batch.length < BATCH_SIZE) break;
    }

    return totalRows;
};
