-- CreateEnum
CREATE TYPE "SellerStatus" AS ENUM ('PENDING', 'ACTIVE', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "KycStatus" AS ENUM ('PENDING', 'UNDER_REVIEW', 'VERIFIED', 'REJECTED');

-- CreateEnum
CREATE TYPE "SellerCreatedVia" AS ENUM ('SELF_SERVICE', 'ADMIN_INITIATED');

-- CreateEnum
CREATE TYPE "BusinessType" AS ENUM ('SOLE_PROPRIETORSHIP', 'PARTNERSHIP', 'LLP', 'PRIVATE_LIMITED', 'PUBLIC_LIMITED', 'HUF', 'OTHER');

-- CreateEnum
CREATE TYPE "KycDocumentType" AS ENUM ('AADHAAR', 'PAN', 'BUSINESS_REGISTRATION_CERTIFICATE', 'FSSAI', 'OTHER');

-- CreateEnum
CREATE TYPE "KycDocumentStatus" AS ENUM ('PENDING', 'VERIFIED', 'REJECTED');

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "seller_id" TEXT;

-- CreateTable
CREATE TABLE "sellers" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "logo_url" TEXT,
    "logo_file_id" TEXT,
    "brand_color" TEXT NOT NULL,
    "status" "SellerStatus" NOT NULL DEFAULT 'PENDING',
    "kyc_status" "KycStatus" NOT NULL DEFAULT 'PENDING',
    "kyc_offline_reference" TEXT,
    "commission_rate" DECIMAL(5,2) NOT NULL,
    "created_via" "SellerCreatedVia" NOT NULL,
    "owner_id" TEXT NOT NULL,
    "created_by_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sellers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "seller_business_details" (
    "id" TEXT NOT NULL,
    "seller_id" TEXT NOT NULL,
    "legal_business_name" TEXT NOT NULL,
    "business_type" "BusinessType" NOT NULL,
    "registered_address" TEXT NOT NULL,
    "gst_number" TEXT,
    "pan_number" TEXT,
    "contact_person_name" TEXT NOT NULL,
    "contact_person_mobile" TEXT NOT NULL,
    "contact_email" TEXT NOT NULL,

    CONSTRAINT "seller_business_details_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "seller_kyc_documents" (
    "id" TEXT NOT NULL,
    "seller_id" TEXT NOT NULL,
    "document_type" "KycDocumentType" NOT NULL,
    "file_id" TEXT NOT NULL,
    "file_path" TEXT NOT NULL,
    "file_name" TEXT NOT NULL,
    "mime_type" TEXT NOT NULL,
    "status" "KycDocumentStatus" NOT NULL DEFAULT 'PENDING',
    "reviewed_by_id" TEXT,
    "reviewed_at" TIMESTAMP(3),
    "uploaded_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "seller_kyc_documents_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "sellers_slug_key" ON "sellers"("slug");

-- CreateIndex
CREATE INDEX "sellers_status_idx" ON "sellers"("status");

-- CreateIndex
CREATE INDEX "sellers_owner_id_idx" ON "sellers"("owner_id");

-- CreateIndex
CREATE UNIQUE INDEX "seller_business_details_seller_id_key" ON "seller_business_details"("seller_id");

-- CreateIndex
CREATE INDEX "seller_kyc_documents_seller_id_idx" ON "seller_kyc_documents"("seller_id");

-- CreateIndex
CREATE INDEX "users_seller_id_idx" ON "users"("seller_id");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_seller_id_fkey" FOREIGN KEY ("seller_id") REFERENCES "sellers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sellers" ADD CONSTRAINT "sellers_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sellers" ADD CONSTRAINT "sellers_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "seller_business_details" ADD CONSTRAINT "seller_business_details_seller_id_fkey" FOREIGN KEY ("seller_id") REFERENCES "sellers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "seller_kyc_documents" ADD CONSTRAINT "seller_kyc_documents_seller_id_fkey" FOREIGN KEY ("seller_id") REFERENCES "sellers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "seller_kyc_documents" ADD CONSTRAINT "seller_kyc_documents_reviewed_by_id_fkey" FOREIGN KEY ("reviewed_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Rename permission module keys: STORES -> SELLERS, STORE_* -> SELLER_*
UPDATE "role_permissions" SET "module" = 'SELLERS' WHERE "module" = 'STORES';
UPDATE "role_permissions" SET "module" = 'SELLER_' || substring("module" from 7) WHERE "module" LIKE 'STORE\_%';
