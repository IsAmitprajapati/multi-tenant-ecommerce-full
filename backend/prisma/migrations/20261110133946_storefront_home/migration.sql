-- CreateEnum
CREATE TYPE "BannerDisplayMode" AS ENUM ('CAROUSEL', 'SINGLE');

-- CreateEnum
CREATE TYPE "HomeSectionType" AS ENUM ('SHOP_BY_CATEGORY', 'PRODUCTS');

-- CreateEnum
CREATE TYPE "HomeProductSource" AS ENUM ('DEALS', 'LATEST', 'TRENDING', 'CATEGORY', 'MANUAL');

-- CreateTable
CREATE TABLE "storefront_settings" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "banner_mode" "BannerDisplayMode" NOT NULL DEFAULT 'CAROUSEL',
    "autoplay_seconds" INTEGER NOT NULL DEFAULT 5,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "storefront_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "home_banners" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "subtitle" TEXT,
    "cta_label" TEXT,
    "link_url" TEXT,
    "image_file_id" TEXT NOT NULL,
    "image_url" TEXT NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "starts_at" TIMESTAMP(3),
    "ends_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "home_banners_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "home_sections" (
    "id" TEXT NOT NULL,
    "type" "HomeSectionType" NOT NULL,
    "title" TEXT NOT NULL,
    "subtitle" TEXT,
    "source" "HomeProductSource",
    "category_id" TEXT,
    "category_ids" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "product_limit" INTEGER NOT NULL DEFAULT 12,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "home_sections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "home_section_products" (
    "section_id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "home_section_products_pkey" PRIMARY KEY ("section_id","product_id")
);

-- CreateIndex
CREATE INDEX "home_banners_is_active_sort_order_idx" ON "home_banners"("is_active", "sort_order");

-- CreateIndex
CREATE INDEX "home_sections_is_active_sort_order_idx" ON "home_sections"("is_active", "sort_order");

-- CreateIndex
CREATE INDEX "home_section_products_product_id_idx" ON "home_section_products"("product_id");

-- AddForeignKey
ALTER TABLE "home_sections" ADD CONSTRAINT "home_sections_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "product_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "home_section_products" ADD CONSTRAINT "home_section_products_section_id_fkey" FOREIGN KEY ("section_id") REFERENCES "home_sections"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "home_section_products" ADD CONSTRAINT "home_section_products_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;
