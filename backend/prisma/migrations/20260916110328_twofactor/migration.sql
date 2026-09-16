-- CreateTable
CREATE TABLE "TwoFactorOtp" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "otp_hash" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "verifiedAt" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TwoFactorOtp_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TwoFactorOtp_user_id_idx" ON "TwoFactorOtp"("user_id");

-- CreateIndex
CREATE INDEX "TwoFactorOtp_expires_at_idx" ON "TwoFactorOtp"("expires_at");

-- AddForeignKey
ALTER TABLE "TwoFactorOtp" ADD CONSTRAINT "TwoFactorOtp_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
