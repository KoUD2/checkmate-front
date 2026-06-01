CREATE TYPE "CancelReason" AS ENUM ('PRICE','NO_NEED_NOW','MISSING_FEATURES','QUALITY','TECH_ISSUES','SWITCHED','OTHER');

CREATE TABLE "cancel_feedback" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "reason" "CancelReason" NOT NULL,
  "comment" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "cancel_feedback_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "cancel_feedback_userId_idx" ON "cancel_feedback"("userId");

CREATE INDEX "cancel_feedback_createdAt_idx" ON "cancel_feedback"("createdAt");

ALTER TABLE "cancel_feedback" ADD CONSTRAINT "cancel_feedback_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
