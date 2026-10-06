-- AlterTable
ALTER TABLE "lodge" ADD COLUMN     "cancellation_policy" TEXT,
ADD COLUMN     "check_in_from" TEXT,
ADD COLUMN     "check_out_by" TEXT,
ADD COLUMN     "faq" JSONB NOT NULL DEFAULT '[]',
ADD COLUMN     "house_rules" JSONB NOT NULL DEFAULT '[]',
ADD COLUMN     "social_links" JSONB NOT NULL DEFAULT '{}';
