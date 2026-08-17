-- CreateEnum
CREATE TYPE "LinkChangeType" AS ENUM ('DESTINATION', 'CUSTOM_SLUG');

-- AlterEnum
ALTER TYPE "PaymentProvider" ADD VALUE 'NONE';

-- AlterTable
ALTER TABLE "Plan" ADD COLUMN     "maxCustomSlugsPerMonth" INTEGER,
ADD COLUMN     "maxScansPerMonth" INTEGER;

-- AlterTable
ALTER TABLE "Subscription" ALTER COLUMN "provider" SET DEFAULT 'NONE';

-- CreateTable
CREATE TABLE "LinkChange" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "linkId" TEXT NOT NULL,
    "type" "LinkChangeType" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LinkChange_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "LinkChange_userId_type_createdAt_idx" ON "LinkChange"("userId", "type", "createdAt");

-- CreateIndex
CREATE INDEX "LinkChange_linkId_idx" ON "LinkChange"("linkId");

-- AddForeignKey
ALTER TABLE "LinkChange" ADD CONSTRAINT "LinkChange_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LinkChange" ADD CONSTRAINT "LinkChange_linkId_fkey" FOREIGN KEY ("linkId") REFERENCES "Link"("id") ON DELETE CASCADE ON UPDATE CASCADE;
