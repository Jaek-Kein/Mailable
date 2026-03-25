-- AlterTable: Event 에 sheetUrl 컬럼 추가
ALTER TABLE "Event" ADD COLUMN IF NOT EXISTS "sheetUrl" TEXT;
