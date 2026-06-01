-- CreateEnum
CREATE TYPE "Segment" AS ENUM ('TUTOR', 'STUDENT', 'PARENT');

-- AlterTable
ALTER TABLE "users" ADD COLUMN "segment" "Segment";
