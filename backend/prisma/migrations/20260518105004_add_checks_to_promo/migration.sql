-- AlterTable
ALTER TABLE "promo_codes" ADD COLUMN "checksToAdd" INTEGER NOT NULL DEFAULT 1;

-- DataMigration: copy existing days value into checksToAdd before dropping the column
UPDATE "promo_codes" SET "checksToAdd" = "days";

-- AlterTable
ALTER TABLE "promo_codes" DROP COLUMN "days";
