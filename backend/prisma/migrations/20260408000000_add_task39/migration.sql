-- AlterEnum
ALTER TYPE "TaskType" ADD VALUE 'TASK39';

-- AlterTable
ALTER TABLE "tasks" ADD COLUMN "audioBase64" TEXT;
ALTER TABLE "tasks" ADD COLUMN "transcription" TEXT;
