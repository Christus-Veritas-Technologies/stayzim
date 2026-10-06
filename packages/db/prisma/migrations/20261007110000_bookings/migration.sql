-- CreateEnum
CREATE TYPE "BookingKind" AS ENUM ('STAY', 'BLOCK');

-- CreateEnum
CREATE TYPE "BookingStatus" AS ENUM ('REQUESTED', 'CONFIRMED', 'DECLINED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "BookingSource" AS ENUM ('SITE', 'OWNER');

-- AlterEnum
ALTER TYPE "SiteEventType" ADD VALUE 'BOOKING_REQUEST';

-- CreateTable
CREATE TABLE "booking" (
    "id" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "lodge_id" TEXT NOT NULL,
    "room_id" TEXT NOT NULL,
    "kind" "BookingKind" NOT NULL,
    "status" "BookingStatus" NOT NULL,
    "source" "BookingSource" NOT NULL,
    "check_in" DATE NOT NULL,
    "check_out" DATE NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "guests" INTEGER,
    "guest_name" TEXT,
    "guest_phone" TEXT,
    "guest_email" TEXT,
    "message" TEXT,
    "notes" TEXT,
    "room_name" TEXT NOT NULL,
    "nightly_price" INTEGER NOT NULL,
    "decided_at" TIMESTAMP(3),
    "cancelled_at" TIMESTAMP(3),
    "cancel_reason" TEXT,
    "anonymised_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "booking_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "booking_reference_key" ON "booking"("reference");

-- CreateIndex
CREATE INDEX "booking_lodge_id_check_in_idx" ON "booking"("lodge_id", "check_in");

-- CreateIndex
CREATE INDEX "booking_room_id_check_in_check_out_idx" ON "booking"("room_id", "check_in", "check_out");

-- AddForeignKey
ALTER TABLE "booking" ADD CONSTRAINT "booking_lodge_id_fkey" FOREIGN KEY ("lodge_id") REFERENCES "lodge"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "booking" ADD CONSTRAINT "booking_room_id_fkey" FOREIGN KEY ("room_id") REFERENCES "room"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
