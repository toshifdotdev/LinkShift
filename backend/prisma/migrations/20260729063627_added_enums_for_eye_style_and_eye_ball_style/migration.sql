/*
  Warnings:

  - The `eyeStyle` column on the `Qr` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `eyeBallStyle` column on the `Qr` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- CreateEnum
CREATE TYPE "EyeStyle" AS ENUM ('square', 'dot', 'extraRounded');

-- CreateEnum
CREATE TYPE "EyeBallStyle" AS ENUM ('square', 'dot');

-- AlterTable
ALTER TABLE "Qr" DROP COLUMN "eyeStyle",
ADD COLUMN     "eyeStyle" "EyeStyle" NOT NULL DEFAULT 'square',
DROP COLUMN "eyeBallStyle",
ADD COLUMN     "eyeBallStyle" "EyeBallStyle" NOT NULL DEFAULT 'square';
