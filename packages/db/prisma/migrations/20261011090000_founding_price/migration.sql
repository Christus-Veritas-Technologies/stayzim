-- Founding prices: lodges that joined before 22 October 2026 (23:59 Harare time)
-- pay the founding price of any plan for life. Every lodge made before this
-- change joined before the deadline, so all of them are founding.
-- AlterTable
ALTER TABLE "lodge" ADD COLUMN "founding" BOOLEAN NOT NULL DEFAULT false;

UPDATE "lodge" SET "founding" = true;
