-- AlterTable
ALTER TABLE "roles" ADD COLUMN     "seller_id" TEXT;

-- CreateIndex
CREATE INDEX "roles_seller_id_idx" ON "roles"("seller_id");

-- AddForeignKey
ALTER TABLE "roles" ADD CONSTRAINT "roles_seller_id_fkey" FOREIGN KEY ("seller_id") REFERENCES "sellers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
