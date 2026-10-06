-- The 14-day trial is gone: self-signed-up lodges start as a 2-day DEMO.
-- Renamed in place, so existing rows keep their dates.
ALTER TYPE "LodgeStatus" RENAME VALUE 'TRIAL' TO 'DEMO';
ALTER TABLE "lodge" ALTER COLUMN "status" SET DEFAULT 'DEMO';
ALTER TABLE "lodge" RENAME COLUMN "trial_ends_at" TO "demo_ends_at";
