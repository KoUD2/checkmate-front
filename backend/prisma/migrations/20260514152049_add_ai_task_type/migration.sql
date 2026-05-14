-- CreateEnum
CREATE TYPE "AiTaskType" AS ENUM ('TASK37', 'TASK38', 'TASK39', 'TASK40', 'TASK41', 'TASK42');

-- AlterTable
ALTER TABLE "exam_tasks" ADD COLUMN "aiTaskType" "AiTaskType";
