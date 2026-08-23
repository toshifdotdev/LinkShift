-- Wave M3: referrer attribution for scans.
-- Additive only.

ALTER TABLE "Scan" ADD COLUMN "referrer" TEXT;
