-- AlterTable
ALTER TABLE "room" ADD COLUMN     "beds" TEXT,
ADD COLUMN     "description" TEXT,
ADD COLUMN     "size" INTEGER,
ADD COLUMN     "units" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "visible" BOOLEAN NOT NULL DEFAULT true;
