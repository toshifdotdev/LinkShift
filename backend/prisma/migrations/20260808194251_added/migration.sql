/*
  Warnings:

  - Added the required column `imagePublicId` to the `Qr` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Qr" ADD COLUMN     "imagePublicId" TEXT NOT NULL,
ADD COLUMN     "logoPublicId" TEXT;
