/*
  Warnings:

  - A unique constraint covering the columns `[yookassaId]` on the table `Payment` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Payment" ADD COLUMN     "yookassaId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Payment_yookassaId_key" ON "Payment"("yookassaId");
