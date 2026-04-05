-- AlterTable
ALTER TABLE "payments" ADD COLUMN     "checksToAdd" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "users" ALTER COLUMN "freeChecksLeft" SET DEFAULT 50;
