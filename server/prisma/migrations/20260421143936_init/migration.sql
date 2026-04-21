-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "age_band" AS ENUM ('AGE_6_8', 'AGE_9_12');

-- CreateEnum
CREATE TYPE "biome" AS ENUM ('FARM', 'FOREST', 'SAVANNA', 'SEA', 'JUNGLE', 'ARCTIC');

-- CreateEnum
CREATE TYPE "content_license" AS ENUM ('CC0', 'CC_BY', 'CC_BY_SA', 'PROPRIETARY');

-- CreateEnum
CREATE TYPE "attempt_kind" AS ENUM ('LETTER', 'WORD');

-- CreateEnum
CREATE TYPE "chat_role" AS ENUM ('USER', 'ASSISTANT', 'SYSTEM');

-- CreateTable
CREATE TABLE "children" (
    "id" UUID NOT NULL,
    "deviceIdHash" TEXT NOT NULL,
    "ageBand" "age_band" NOT NULL DEFAULT 'AGE_6_8',
    "prefs" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "children_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "content_animals" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "biome" "biome" NOT NULL,
    "emoji" TEXT NOT NULL,
    "color" TEXT NOT NULL,
    "glbUrl" TEXT,
    "thumbnailUrl" TEXT,
    "systemPrompt" TEXT NOT NULL,
    "scriptedReplies" JSONB NOT NULL DEFAULT '[]',
    "license" "content_license" NOT NULL DEFAULT 'CC0',
    "attribution" TEXT,
    "minAge" INTEGER NOT NULL DEFAULT 6,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "content_animals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "content_words" (
    "id" TEXT NOT NULL,
    "word" TEXT NOT NULL,
    "letters" TEXT[],
    "animalId" TEXT NOT NULL,
    "letterHints" JSONB NOT NULL DEFAULT '{}',
    "minAge" INTEGER NOT NULL DEFAULT 6,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "content_words_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sessions" (
    "id" UUID NOT NULL,
    "childId" UUID NOT NULL,
    "gameId" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" TIMESTAMP(3),
    "fsmSnapshot" JSONB,
    "summaryStats" JSONB NOT NULL DEFAULT '{}',

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "attempts" (
    "id" UUID NOT NULL,
    "sessionId" UUID NOT NULL,
    "wordId" TEXT,
    "kind" "attempt_kind" NOT NULL,
    "expected" TEXT NOT NULL,
    "heard" TEXT NOT NULL,
    "correct" BOOLEAN NOT NULL,
    "latencyMs" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "attempts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "unlocked_animals" (
    "childId" UUID NOT NULL,
    "animalId" TEXT NOT NULL,
    "unlockedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "visits" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "unlocked_animals_pkey" PRIMARY KEY ("childId","animalId")
);

-- CreateTable
CREATE TABLE "chat_messages" (
    "id" UUID NOT NULL,
    "sessionId" UUID NOT NULL,
    "animalId" TEXT NOT NULL,
    "role" "chat_role" NOT NULL,
    "content" TEXT NOT NULL,
    "moderationFlags" JSONB NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "chat_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tech_logs" (
    "id" BIGSERIAL NOT NULL,
    "level" TEXT NOT NULL,
    "context" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tech_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "children_deviceIdHash_key" ON "children"("deviceIdHash");

-- CreateIndex
CREATE INDEX "content_words_animalId_idx" ON "content_words"("animalId");

-- CreateIndex
CREATE INDEX "sessions_childId_startedAt_idx" ON "sessions"("childId", "startedAt" DESC);

-- CreateIndex
CREATE INDEX "attempts_sessionId_idx" ON "attempts"("sessionId");

-- CreateIndex
CREATE INDEX "attempts_wordId_idx" ON "attempts"("wordId");

-- CreateIndex
CREATE INDEX "unlocked_animals_childId_unlockedAt_idx" ON "unlocked_animals"("childId", "unlockedAt" DESC);

-- CreateIndex
CREATE INDEX "chat_messages_sessionId_createdAt_idx" ON "chat_messages"("sessionId", "createdAt");

-- CreateIndex
CREATE INDEX "tech_logs_createdAt_idx" ON "tech_logs"("createdAt" DESC);

-- CreateIndex
CREATE INDEX "tech_logs_context_createdAt_idx" ON "tech_logs"("context", "createdAt" DESC);

-- AddForeignKey
ALTER TABLE "content_words" ADD CONSTRAINT "content_words_animalId_fkey" FOREIGN KEY ("animalId") REFERENCES "content_animals"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_childId_fkey" FOREIGN KEY ("childId") REFERENCES "children"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attempts" ADD CONSTRAINT "attempts_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attempts" ADD CONSTRAINT "attempts_wordId_fkey" FOREIGN KEY ("wordId") REFERENCES "content_words"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "unlocked_animals" ADD CONSTRAINT "unlocked_animals_childId_fkey" FOREIGN KEY ("childId") REFERENCES "children"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "unlocked_animals" ADD CONSTRAINT "unlocked_animals_animalId_fkey" FOREIGN KEY ("animalId") REFERENCES "content_animals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

