-- The WhatsApp sales agent: its stage with each lead, the photos people send, and a log of what it decided
-- CreateEnum
CREATE TYPE "AgentStage" AS ENUM ('NEW', 'DETAILS', 'BUILDING', 'OFFER', 'CHOSEN', 'PAYING', 'PAID', 'HANDOVER', 'DISQUALIFIED');

-- AlterTable
ALTER TABLE "contact" ADD COLUMN     "agent_account" TEXT,
ADD COLUMN     "agent_chat_id" TEXT,
ADD COLUMN     "agent_paused" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "agent_stage" "AgentStage" NOT NULL DEFAULT 'NEW',
ADD COLUMN     "chosen_site_id" TEXT,
ADD COLUMN     "disqualified_reason" TEXT,
ADD COLUMN     "follow_ups" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "next_follow_up_at" TIMESTAMP(3),
ADD COLUMN     "qualification" JSONB;

-- CreateTable
CREATE TABLE "inbound_media" (
    "id" TEXT NOT NULL,
    "inbound_message_id" TEXT NOT NULL,
    "mime_type" TEXT NOT NULL,
    "data" BYTEA NOT NULL,
    "size_bytes" INTEGER NOT NULL,
    "used_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "inbound_media_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "agent_event" (
    "id" TEXT NOT NULL,
    "contact_id" TEXT,
    "chat_id" TEXT NOT NULL,
    "account" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "data" JSONB NOT NULL,
    "cost_usd" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "agent_event_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "inbound_media_inbound_message_id_key" ON "inbound_media"("inbound_message_id");

-- CreateIndex
CREATE INDEX "inbound_media_created_at_idx" ON "inbound_media"("created_at");

-- CreateIndex
CREATE INDEX "agent_event_contact_id_created_at_idx" ON "agent_event"("contact_id", "created_at");

-- CreateIndex
CREATE INDEX "agent_event_created_at_idx" ON "agent_event"("created_at");

-- CreateIndex
CREATE INDEX "contact_agent_stage_idx" ON "contact"("agent_stage");

-- CreateIndex
CREATE INDEX "contact_next_follow_up_at_idx" ON "contact"("next_follow_up_at");

-- AddForeignKey
ALTER TABLE "inbound_media" ADD CONSTRAINT "inbound_media_inbound_message_id_fkey" FOREIGN KEY ("inbound_message_id") REFERENCES "inbound_message"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agent_event" ADD CONSTRAINT "agent_event_contact_id_fkey" FOREIGN KEY ("contact_id") REFERENCES "contact"("id") ON DELETE SET NULL ON UPDATE CASCADE;
