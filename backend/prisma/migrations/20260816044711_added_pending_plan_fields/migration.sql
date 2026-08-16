-- AlterTable
ALTER TABLE "Subscription" ADD COLUMN     "changeScheduledAt" TIMESTAMP(3),
ADD COLUMN     "pendingPlanId" TEXT;

-- AddForeignKey
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_pendingPlanId_fkey" FOREIGN KEY ("pendingPlanId") REFERENCES "Plan"("id") ON DELETE SET NULL ON UPDATE CASCADE;
