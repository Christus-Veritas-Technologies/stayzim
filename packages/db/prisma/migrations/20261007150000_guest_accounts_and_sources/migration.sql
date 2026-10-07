-- Guest accounts from /create (better-auth anonymous plugin) and where each lodge came from
-- AlterTable
ALTER TABLE "lodge" ADD COLUMN     "signup_referrer" TEXT,
ADD COLUMN     "utm_campaign" TEXT,
ADD COLUMN     "utm_content" TEXT,
ADD COLUMN     "utm_medium" TEXT,
ADD COLUMN     "utm_source" TEXT;

-- AlterTable
ALTER TABLE "user" ADD COLUMN     "is_anonymous" BOOLEAN NOT NULL DEFAULT false;
