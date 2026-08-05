/*
  Warnings:

  - A unique constraint covering the columns `[domainId,shortId]` on the table `Link` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `domainId` to the `Link` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "Link_shortId_key";

-- DropIndex
DROP INDEX "User_refreshTokenHash_key";

-- AlterTable
ALTER TABLE "Link" ADD COLUMN     "domainId" TEXT NOT NULL;

-- CreateTable
CREATE TABLE "Domain" (
    "id" TEXT NOT NULL,
    "host" TEXT NOT NULL,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "userId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Domain_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Domain_host_key" ON "Domain"("host");

-- CreateIndex
CREATE UNIQUE INDEX "Link_domainId_shortId_key" ON "Link"("domainId", "shortId");

-- AddForeignKey
ALTER TABLE "Domain" ADD CONSTRAINT "Domain_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Link" ADD CONSTRAINT "Link_domainId_fkey" FOREIGN KEY ("domainId") REFERENCES "Domain"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
