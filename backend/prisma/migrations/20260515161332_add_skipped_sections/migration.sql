-- AlterTable
ALTER TABLE "variant_attempts" ADD COLUMN "skippedSections" "ExamSection"[] NOT NULL DEFAULT ARRAY[]::"ExamSection"[];
