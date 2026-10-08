-- What /create asks about the place: country, type, setting, rooms and price, and the copy variant seed
-- AlterTable
ALTER TABLE "lodge" ADD COLUMN     "copy_seed" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "country" TEXT NOT NULL DEFAULT 'Zimbabwe',
ADD COLUMN     "kind" TEXT,
ADD COLUMN     "price_hint" INTEGER,
ADD COLUMN     "rooms_hint" INTEGER,
ADD COLUMN     "setting" TEXT;
