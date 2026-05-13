-- CreateEnum
CREATE TYPE "UserRating" AS ENUM ('LIKE', 'DISLIKE');

-- AlterTable
ALTER TABLE "tasks" ADD COLUMN "userRating" "UserRating",
                    ADD COLUMN "userComment" TEXT;
