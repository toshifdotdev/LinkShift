/*
  Warnings:

  - Added the required column `billingCycle` to the `Subscription` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Plan" ADD COLUMN     "razorpayMonthlyPlanId" TEXT,
ADD COLUMN     "razorpayYearlyPlanId" TEXT;

-- AlterTable
ALTER TABLE "Subscription" ADD COLUMN     "billingCycle" "BillingCycle" NOT NULL;
