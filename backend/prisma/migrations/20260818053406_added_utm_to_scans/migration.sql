-- AlterTable
ALTER TABLE "Scan" ADD COLUMN     "utmCampaign" TEXT,
ADD COLUMN     "utmContent" TEXT,
ADD COLUMN     "utmMedium" TEXT,
ADD COLUMN     "utmSource" TEXT,
ADD COLUMN     "utmTerm" TEXT;

-- CreateIndex
CREATE INDEX "Scan_linkId_scannedAt_idx" ON "Scan"("linkId", "scannedAt");
