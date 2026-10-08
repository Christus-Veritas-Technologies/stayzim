-- An owner on a paid plan claiming the free .co.zw domain: the name they asked for,
-- and when StayZim set it up (the billing job emails them once the lodge has it)
-- CreateEnum
CREATE TYPE "DomainClaimStatus" AS ENUM ('REQUESTED', 'READY');

-- CreateTable
CREATE TABLE "domain_claim" (
    "id" TEXT NOT NULL,
    "lodge_id" TEXT NOT NULL,
    "domain" TEXT NOT NULL,
    "status" "DomainClaimStatus" NOT NULL DEFAULT 'REQUESTED',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ready_at" TIMESTAMP(3),

    CONSTRAINT "domain_claim_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "domain_claim_lodge_id_key" ON "domain_claim"("lodge_id");

-- AddForeignKey
ALTER TABLE "domain_claim" ADD CONSTRAINT "domain_claim_lodge_id_fkey" FOREIGN KEY ("lodge_id") REFERENCES "lodge"("id") ON DELETE CASCADE ON UPDATE CASCADE;
