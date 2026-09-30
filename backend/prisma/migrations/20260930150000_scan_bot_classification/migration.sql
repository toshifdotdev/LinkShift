ALTER TABLE "Scan" ADD COLUMN     "isBot" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Scan" ADD COLUMN     "botReason" TEXT;

CREATE INDEX "Scan_linkId_isBot_scannedAt_idx" ON "Scan"("linkId", "isBot", "scannedAt");
