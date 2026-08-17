/*
  Warnings:

  - You are about to drop the column `maxScansPerMonth` on the `Plan` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Plan" DROP COLUMN "maxScansPerMonth",
ADD COLUMN     "maxDestinationChangesPerMonth" INTEGER;
