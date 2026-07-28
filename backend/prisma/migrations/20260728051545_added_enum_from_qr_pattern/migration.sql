/*
  Warnings:

  - The `pattern` column on the `Qr` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- CreateEnum
CREATE TYPE "PatternStyle" AS ENUM ('square', 'dots', 'rounded');

-- AlterTable
ALTER TABLE "Qr" DROP COLUMN "pattern",
ADD COLUMN     "pattern" "PatternStyle" NOT NULL DEFAULT 'square';
