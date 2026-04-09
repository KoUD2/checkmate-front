-- Add missing columns to users table (IF NOT EXISTS for safety)
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "vkId" TEXT;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "telegramId" TEXT;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "yandexId" TEXT;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "socialBonusGranted" BOOLEAN NOT NULL DEFAULT false;

-- Create unique indexes for social IDs (IF NOT EXISTS for safety)
CREATE UNIQUE INDEX IF NOT EXISTS "users_vkId_key" ON "users"("vkId");
CREATE UNIQUE INDEX IF NOT EXISTS "users_telegramId_key" ON "users"("telegramId");
CREATE UNIQUE INDEX IF NOT EXISTS "users_yandexId_key" ON "users"("yandexId");

-- Create oauth_states table (IF NOT EXISTS for safety)
CREATE TABLE IF NOT EXISTS "oauth_states" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "codeVerifier" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "oauth_states_pkey" PRIMARY KEY ("id")
);
