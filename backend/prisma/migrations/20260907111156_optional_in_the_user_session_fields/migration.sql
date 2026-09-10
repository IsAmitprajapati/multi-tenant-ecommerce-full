-- AlterTable
ALTER TABLE "user_sessions" ALTER COLUMN "ip_address" DROP NOT NULL,
ALTER COLUMN "revoked_at" DROP NOT NULL;
