/*
  Warnings:

  - You are about to drop the `TwoFactorOtp` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "TwoFactorOtp" DROP CONSTRAINT "TwoFactorOtp_user_id_fkey";

-- DropTable
DROP TABLE "TwoFactorOtp";

-- CreateTable
CREATE TABLE "two_factor_otp" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "otp_hash" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "verifiedAt" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "two_factor_otp_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "two_factor_otp_user_id_idx" ON "two_factor_otp"("user_id");

-- CreateIndex
CREATE INDEX "two_factor_otp_expires_at_idx" ON "two_factor_otp"("expires_at");

-- AddForeignKey
ALTER TABLE "two_factor_otp" ADD CONSTRAINT "two_factor_otp_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
