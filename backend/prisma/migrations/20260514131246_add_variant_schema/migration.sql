-- CreateEnum
CREATE TYPE "TaskFormat" AS ENUM ('MCQ', 'MATCHING', 'TRUE_FALSE', 'OPEN_CLOZE', 'WORD_FORMATION', 'AI_CHECK');

-- CreateEnum
CREATE TYPE "AttemptStatus" AS ENUM ('IN_PROGRESS', 'SUBMITTED', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "ExamSection" AS ENUM ('LISTENING', 'READING', 'GRAMMAR', 'WRITING', 'SPEAKING');

-- CreateTable
CREATE TABLE "exam_tasks" (
    "id" TEXT NOT NULL,
    "format" "TaskFormat" NOT NULL,
    "section" "ExamSection" NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT,
    "audioUrl" TEXT,
    "correctAnswer" TEXT,
    "source" TEXT,
    "explanation" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "exam_tasks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "exam_task_options" (
    "id" TEXT NOT NULL,
    "examTaskId" TEXT NOT NULL,
    "optionText" TEXT NOT NULL,
    "matchText" TEXT,
    "isCorrect" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "exam_task_options_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "variants" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "published" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "variants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "variant_tasks" (
    "id" TEXT NOT NULL,
    "variantId" TEXT NOT NULL,
    "examTaskId" TEXT NOT NULL,
    "position" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "variant_tasks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "variant_attempts" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "variantId" TEXT NOT NULL,
    "status" "AttemptStatus" NOT NULL DEFAULT 'IN_PROGRESS',
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "variant_attempts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "attempt_answers" (
    "id" TEXT NOT NULL,
    "variantAttemptId" TEXT NOT NULL,
    "examTaskId" TEXT NOT NULL,
    "content" JSONB,
    "playCount" INTEGER NOT NULL DEFAULT 0,
    "aiScore" INTEGER,
    "aiFeedback" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "attempt_answers_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "attempt_answers_variantAttemptId_examTaskId_key" ON "attempt_answers"("variantAttemptId", "examTaskId");

-- AddForeignKey
ALTER TABLE "exam_task_options" ADD CONSTRAINT "exam_task_options_examTaskId_fkey" FOREIGN KEY ("examTaskId") REFERENCES "exam_tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "variant_tasks" ADD CONSTRAINT "variant_tasks_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "variants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "variant_tasks" ADD CONSTRAINT "variant_tasks_examTaskId_fkey" FOREIGN KEY ("examTaskId") REFERENCES "exam_tasks"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "variant_attempts" ADD CONSTRAINT "variant_attempts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "variant_attempts" ADD CONSTRAINT "variant_attempts_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "variants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attempt_answers" ADD CONSTRAINT "attempt_answers_variantAttemptId_fkey" FOREIGN KEY ("variantAttemptId") REFERENCES "variant_attempts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
