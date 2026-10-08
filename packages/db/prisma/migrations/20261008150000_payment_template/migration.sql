-- The design picked with a payment (moving to a plan that doesn't include the current one),
-- the plan the lodge moved from, and the date the payment keeps the site live until
-- AlterTable
ALTER TABLE "payment" ADD COLUMN     "covers_until" TIMESTAMP(3),
ADD COLUMN     "previous_plan" "LodgePlan",
ADD COLUMN     "template" TEXT;
