/*
  Warnings:

  - Added the required column `imageUrl` to the `Qr` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Qr" ADD COLUMN     "imageUrl" TEXT NOT NULL;
