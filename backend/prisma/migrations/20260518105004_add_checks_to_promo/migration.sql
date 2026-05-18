-- AlterTable
ALTER TABLE "promo_codes" ADD COLUMN "checksToAdd" INTEGER NOT NULL DEFAULT 1;

-- AlterTable
ALTER TABLE "promo_codes" DROP COLUMN "days";
