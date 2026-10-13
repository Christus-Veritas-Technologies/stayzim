-- Leads in the admin app: where each came from, their lodge's name, an email and the team's notes;
-- sites made for a lead (lodge.lead_id), and the one-time claim link that hands one over
-- AlterTable
ALTER TABLE "contact" ADD COLUMN     "email" TEXT,
ADD COLUMN     "lodge_name" TEXT,
ADD COLUMN     "notes" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "source" TEXT;

-- AlterTable
ALTER TABLE "lodge" ADD COLUMN     "claim_token_expires_at" TIMESTAMP(3),
ADD COLUMN     "claim_token_hash" TEXT,
ADD COLUMN     "lead_id" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "lodge_claim_token_hash_key" ON "lodge"("claim_token_hash");

-- CreateIndex
CREATE INDEX "lodge_lead_id_idx" ON "lodge"("lead_id");

-- AddForeignKey
ALTER TABLE "lodge" ADD CONSTRAINT "lodge_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "contact"("id") ON DELETE SET NULL ON UPDATE CASCADE;
