-- Dynamic categories managed by the platform admin; sellers can have several.

-- 1. Category details
ALTER TABLE "product_categories" ADD COLUMN "description" TEXT;
ALTER TABLE "product_categories" ADD COLUMN "default_commission_rate" DECIMAL(5,2);
ALTER TABLE "product_categories" ADD COLUMN "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "product_categories" ADD COLUMN "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- Carry over the commission rates that were hard-coded before
UPDATE "product_categories"
SET "default_commission_rate" = CASE "seller_category"
    WHEN 'grocery' THEN 8 WHEN 'fashion' THEN 12 WHEN 'electronics' THEN 6 ELSE 10 END
WHERE "parent_id" IS NULL;

-- 2. Seller ↔ category links
CREATE TABLE "seller_categories" (
    "seller_id" TEXT NOT NULL,
    "category_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "seller_categories_pkey" PRIMARY KEY ("seller_id","category_id")
);
CREATE INDEX "seller_categories_category_id_idx" ON "seller_categories"("category_id");
ALTER TABLE "seller_categories" ADD CONSTRAINT "seller_categories_seller_id_fkey" FOREIGN KEY ("seller_id") REFERENCES "sellers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "seller_categories" ADD CONSTRAINT "seller_categories_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "product_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Existing sellers keep their current category
INSERT INTO "seller_categories" ("seller_id", "category_id")
SELECT s."id", pc."id"
FROM "sellers" s
JOIN "product_categories" pc ON pc."seller_category" = s."category" AND pc."parent_id" IS NULL;

-- 3. Old fixed-key columns are no longer used
ALTER TABLE "sellers" DROP COLUMN "category";
ALTER TABLE "product_categories" DROP COLUMN "seller_category";
