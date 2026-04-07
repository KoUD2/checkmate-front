-- AlterTable
ALTER TABLE "tasks" ADD COLUMN     "solutionImageBase64" TEXT;

-- AlterTable
ALTER TABLE "users" ALTER COLUMN "freeChecksLeft" SET DEFAULT 2;
