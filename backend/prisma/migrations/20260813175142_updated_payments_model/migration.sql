/*
  Warnings:

  - A unique constraint covering the columns `[provider,providerOrderId]` on the table `Payment` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `providerOrderId` to the `Payment` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Payment" ADD COLUMN     "providerOrderId" TEXT NOT NULL,
ADD COLUMN     "providerSignature" TEXT,
ALTER COLUMN "providerPaymentId" DROP NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Payment_provider_providerOrderId_key" ON "Payment"("provider", "providerOrderId");
