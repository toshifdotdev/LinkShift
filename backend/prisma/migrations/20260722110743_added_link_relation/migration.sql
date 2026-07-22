/*
  Warnings:

  - You are about to drop the column `qrId` on the `Scan` table. All the data in the column will be lost.
  - You are about to drop the `QrCode` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `linkId` to the `Scan` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "QrCode" DROP CONSTRAINT "QrCode_userId_fkey";

-- DropForeignKey
ALTER TABLE "Scan" DROP CONSTRAINT "Scan_qrId_fkey";

-- DropIndex
DROP INDEX "Scan_qrId_idx";

-- AlterTable
ALTER TABLE "Scan" DROP COLUMN "qrId",
ADD COLUMN     "linkId" TEXT NOT NULL,
ALTER COLUMN "device" DROP NOT NULL,
ALTER COLUMN "browser" DROP NOT NULL,
ALTER COLUMN "os" DROP NOT NULL;

-- DropTable
DROP TABLE "QrCode";

-- CreateTable
CREATE TABLE "Link" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT,
    "targetUrl" TEXT NOT NULL,
    "shortId" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Link_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Qr" (
    "id" TEXT NOT NULL,
    "linkId" TEXT NOT NULL,
    "foregroundColor" TEXT DEFAULT '#000000',
    "backgroundColor" TEXT DEFAULT '#FFFFFF',
    "logoUrl" TEXT,
    "pattern" TEXT DEFAULT 'square',
    "eyeStyle" TEXT DEFAULT 'square',
    "eyeBallStyle" TEXT DEFAULT 'square',
    "margin" INTEGER DEFAULT 2,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Qr_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Link_shortId_key" ON "Link"("shortId");

-- CreateIndex
CREATE INDEX "Link_userId_idx" ON "Link"("userId");

-- CreateIndex
CREATE INDEX "Qr_linkId_idx" ON "Qr"("linkId");

-- CreateIndex
CREATE INDEX "Scan_linkId_idx" ON "Scan"("linkId");

-- AddForeignKey
ALTER TABLE "Link" ADD CONSTRAINT "Link_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Qr" ADD CONSTRAINT "Qr_linkId_fkey" FOREIGN KEY ("linkId") REFERENCES "Link"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Scan" ADD CONSTRAINT "Scan_linkId_fkey" FOREIGN KEY ("linkId") REFERENCES "Link"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
