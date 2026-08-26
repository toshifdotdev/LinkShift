-- DropIndex
DROP INDEX "ReconciliationRun_status_idx";

-- AlterTable
ALTER TABLE "Qr" ADD COLUMN     "frame" TEXT NOT NULL DEFAULT 'none';

-- AlterTable
ALTER TABLE "ReconciliationRun" ALTER COLUMN "status" DROP DEFAULT;
