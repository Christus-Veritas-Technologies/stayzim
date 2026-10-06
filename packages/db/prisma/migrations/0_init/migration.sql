-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('OWNER', 'ADMIN');

-- CreateEnum
CREATE TYPE "LandingEventType" AS ENUM ('PAGE_VIEW', 'CTA_CLICK');

-- CreateEnum
CREATE TYPE "LodgePlan" AS ENUM ('STARTER', 'GROWTH', 'PRO');

-- CreateEnum
CREATE TYPE "LodgeStatus" AS ENUM ('TRIAL', 'ACTIVE', 'OVERDUE', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "ChangeRequestTopic" AS ENUM ('TEXT', 'PHOTOS', 'ROOMS', 'DESIGN', 'OTHER');

-- CreateEnum
CREATE TYPE "ChangeRequestStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'DONE', 'DECLINED');

-- CreateEnum
CREATE TYPE "OutreachStatus" AS ENUM ('PENDING', 'REACHED', 'REPLIED', 'NOT_ON_WHATSAPP', 'FAILED', 'DO_NOT_CONTACT');

-- CreateEnum
CREATE TYPE "OutreachMessageStatus" AS ENUM ('SENT', 'NOT_ON_WHATSAPP', 'FAILED');

-- CreateEnum
CREATE TYPE "SiteEventType" AS ENUM ('PAGE_VIEW', 'BOOKING_CHAT');

-- CreateEnum
CREATE TYPE "Device" AS ENUM ('PHONE', 'TABLET', 'COMPUTER');

-- CreateTable
CREATE TABLE "user" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "email_verified" BOOLEAN NOT NULL DEFAULT false,
    "image" TEXT,
    "role" "UserRole" NOT NULL DEFAULT 'OWNER',
    "must_change_password" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "session" (
    "id" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "token" TEXT NOT NULL,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "user_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "account" (
    "id" TEXT NOT NULL,
    "issuer" TEXT NOT NULL,
    "account_id" TEXT NOT NULL,
    "provider_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "access_token" TEXT,
    "refresh_token" TEXT,
    "id_token" TEXT,
    "access_token_expires_at" TIMESTAMP(3),
    "refresh_token_expires_at" TIMESTAMP(3),
    "scope" TEXT,
    "password" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "verification" (
    "id" TEXT NOT NULL,
    "identifier" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "verification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "landing_event" (
    "id" TEXT NOT NULL,
    "type" "LandingEventType" NOT NULL,
    "cta" TEXT,
    "section" TEXT,
    "plan" TEXT,
    "visitor_id" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "referrer" TEXT,
    "utm_source" TEXT,
    "utm_medium" TEXT,
    "utm_campaign" TEXT,
    "user_agent" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "landing_event_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lodge" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "town" TEXT,
    "region" TEXT,
    "whatsapp" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "maps_url" TEXT,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "template" TEXT,
    "hero_headline" TEXT,
    "hero_subline" TEXT,
    "theme_color" TEXT NOT NULL DEFAULT '#1E4A3B',
    "logo_key" TEXT,
    "hero_photo_id" TEXT,
    "plan" "LodgePlan" NOT NULL DEFAULT 'GROWTH',
    "status" "LodgeStatus" NOT NULL DEFAULT 'TRIAL',
    "trial_ends_at" TIMESTAMP(3),
    "paid_until" TIMESTAMP(3),
    "link_shared_at" TIMESTAMP(3),
    "owner_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "lodge_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "room" (
    "id" TEXT NOT NULL,
    "lodge_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "price" INTEGER NOT NULL,
    "sleeps" INTEGER NOT NULL DEFAULT 2,
    "amenities" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "position" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "room_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "photo" (
    "id" TEXT NOT NULL,
    "lodge_id" TEXT NOT NULL,
    "room_id" TEXT,
    "key" TEXT NOT NULL,
    "medium_key" TEXT,
    "small_key" TEXT,
    "width" INTEGER NOT NULL,
    "height" INTEGER NOT NULL,
    "size" INTEGER NOT NULL,
    "caption" TEXT NOT NULL DEFAULT '',
    "position" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "photo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "change_request" (
    "id" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "lodge_id" TEXT NOT NULL,
    "topic" "ChangeRequestTopic" NOT NULL,
    "message" TEXT NOT NULL,
    "status" "ChangeRequestStatus" NOT NULL DEFAULT 'OPEN',
    "reply" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "resolved_at" TIMESTAMP(3),

    CONSTRAINT "change_request_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "whatsapp_session" (
    "session" TEXT NOT NULL,
    "data" BYTEA NOT NULL,
    "size_bytes" INTEGER NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "whatsapp_session_pkey" PRIMARY KEY ("session")
);

-- CreateTable
CREATE TABLE "contact" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "status" "OutreachStatus" NOT NULL DEFAULT 'PENDING',
    "reached_via" TEXT,
    "last_contacted_at" TIMESTAMP(3),
    "last_replied_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "contact_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "outreach_message" (
    "id" TEXT NOT NULL,
    "contact_id" TEXT,
    "phone" TEXT NOT NULL,
    "account" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "status" "OutreachMessageStatus" NOT NULL,
    "whatsapp_message_id" TEXT,
    "error" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "outreach_message_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inbound_message" (
    "id" TEXT NOT NULL,
    "contact_id" TEXT,
    "phone" TEXT,
    "chat_id" TEXT NOT NULL,
    "account" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "whatsapp_message_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "inbound_message_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "site_event" (
    "id" TEXT NOT NULL,
    "lodge_id" TEXT NOT NULL,
    "type" "SiteEventType" NOT NULL,
    "visitor_id" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "room_id" TEXT,
    "country" TEXT,
    "device" "Device" NOT NULL,
    "browser" TEXT,
    "ip" TEXT,
    "referrer" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "site_event_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "user_email_key" ON "user"("email");

-- CreateIndex
CREATE UNIQUE INDEX "session_token_key" ON "session"("token");

-- CreateIndex
CREATE INDEX "session_user_id_idx" ON "session"("user_id");

-- CreateIndex
CREATE INDEX "account_user_id_idx" ON "account"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "account_issuer_account_id_key" ON "account"("issuer", "account_id");

-- CreateIndex
CREATE INDEX "verification_identifier_idx" ON "verification"("identifier");

-- CreateIndex
CREATE INDEX "landing_event_type_created_at_idx" ON "landing_event"("type", "created_at");

-- CreateIndex
CREATE INDEX "landing_event_cta_idx" ON "landing_event"("cta");

-- CreateIndex
CREATE INDEX "landing_event_visitor_id_idx" ON "landing_event"("visitor_id");

-- CreateIndex
CREATE UNIQUE INDEX "lodge_slug_key" ON "lodge"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "lodge_hero_photo_id_key" ON "lodge"("hero_photo_id");

-- CreateIndex
CREATE UNIQUE INDEX "lodge_owner_id_key" ON "lodge"("owner_id");

-- CreateIndex
CREATE INDEX "room_lodge_id_position_idx" ON "room"("lodge_id", "position");

-- CreateIndex
CREATE UNIQUE INDEX "photo_key_key" ON "photo"("key");

-- CreateIndex
CREATE INDEX "photo_lodge_id_room_id_position_idx" ON "photo"("lodge_id", "room_id", "position");

-- CreateIndex
CREATE UNIQUE INDEX "change_request_reference_key" ON "change_request"("reference");

-- CreateIndex
CREATE INDEX "change_request_lodge_id_created_at_idx" ON "change_request"("lodge_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "contact_phone_key" ON "contact"("phone");

-- CreateIndex
CREATE INDEX "contact_status_idx" ON "contact"("status");

-- CreateIndex
CREATE INDEX "contact_city_idx" ON "contact"("city");

-- CreateIndex
CREATE INDEX "outreach_message_contact_id_idx" ON "outreach_message"("contact_id");

-- CreateIndex
CREATE INDEX "outreach_message_phone_idx" ON "outreach_message"("phone");

-- CreateIndex
CREATE INDEX "outreach_message_account_status_created_at_idx" ON "outreach_message"("account", "status", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "inbound_message_whatsapp_message_id_key" ON "inbound_message"("whatsapp_message_id");

-- CreateIndex
CREATE INDEX "inbound_message_contact_id_idx" ON "inbound_message"("contact_id");

-- CreateIndex
CREATE INDEX "inbound_message_created_at_idx" ON "inbound_message"("created_at");

-- CreateIndex
CREATE INDEX "site_event_lodge_id_created_at_idx" ON "site_event"("lodge_id", "created_at");

-- CreateIndex
CREATE INDEX "site_event_lodge_id_type_created_at_idx" ON "site_event"("lodge_id", "type", "created_at");

-- AddForeignKey
ALTER TABLE "session" ADD CONSTRAINT "session_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "account" ADD CONSTRAINT "account_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lodge" ADD CONSTRAINT "lodge_hero_photo_id_fkey" FOREIGN KEY ("hero_photo_id") REFERENCES "photo"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lodge" ADD CONSTRAINT "lodge_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "room" ADD CONSTRAINT "room_lodge_id_fkey" FOREIGN KEY ("lodge_id") REFERENCES "lodge"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "photo" ADD CONSTRAINT "photo_lodge_id_fkey" FOREIGN KEY ("lodge_id") REFERENCES "lodge"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "photo" ADD CONSTRAINT "photo_room_id_fkey" FOREIGN KEY ("room_id") REFERENCES "room"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "change_request" ADD CONSTRAINT "change_request_lodge_id_fkey" FOREIGN KEY ("lodge_id") REFERENCES "lodge"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "outreach_message" ADD CONSTRAINT "outreach_message_contact_id_fkey" FOREIGN KEY ("contact_id") REFERENCES "contact"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inbound_message" ADD CONSTRAINT "inbound_message_contact_id_fkey" FOREIGN KEY ("contact_id") REFERENCES "contact"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "site_event" ADD CONSTRAINT "site_event_lodge_id_fkey" FOREIGN KEY ("lodge_id") REFERENCES "lodge"("id") ON DELETE CASCADE ON UPDATE CASCADE;
