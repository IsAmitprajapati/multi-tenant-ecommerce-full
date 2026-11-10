-- AlterEnum
ALTER TYPE "HomeSectionType" ADD VALUE 'PROMO_CARDS';

-- AlterTable
ALTER TABLE "home_sections" ADD COLUMN     "cards" JSONB NOT NULL DEFAULT '[]';
