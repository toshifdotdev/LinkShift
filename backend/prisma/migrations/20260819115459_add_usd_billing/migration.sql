/*
  Warnings:

  - The `currency` column on the `Payment` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- CreateEnum
CREATE TYPE "Currency" AS ENUM ('INR', 'USD');

-- AlterTable
ALTER TABLE "Payment" DROP COLUMN "currency",
ADD COLUMN     "currency" "Currency" NOT NULL DEFAULT 'INR';

-- AlterTable
ALTER TABLE "Plan" ADD COLUMN     "razorpayUsdMonthlyPlanId" TEXT,
ADD COLUMN     "razorpayUsdYearlyPlanId" TEXT,
ADD COLUMN     "usdMonthlyPrice" INTEGER,
ADD COLUMN     "usdYearlyPrice" INTEGER;
