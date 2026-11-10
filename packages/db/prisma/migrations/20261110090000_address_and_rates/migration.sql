-- The street address shown on the site, a second WhatsApp number, and rates priced by something other than a night
ALTER TABLE "lodge" ADD COLUMN "address" TEXT;
ALTER TABLE "lodge" ADD COLUMN "whatsapp_2" TEXT;
ALTER TABLE "room" ADD COLUMN "price_label" TEXT;
