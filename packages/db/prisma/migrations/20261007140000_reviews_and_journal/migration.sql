-- AlterTable
ALTER TABLE "lodge" ADD COLUMN     "review_count" INTEGER,
ADD COLUMN     "review_score" DOUBLE PRECISION,
ADD COLUMN     "review_source" TEXT,
ADD COLUMN     "review_url" TEXT;

-- CreateTable
CREATE TABLE "review" (
    "id" TEXT NOT NULL,
    "lodge_id" TEXT NOT NULL,
    "quote" TEXT NOT NULL,
    "author" TEXT NOT NULL,
    "origin" TEXT,
    "stayed" TEXT,
    "score" DOUBLE PRECISION,
    "position" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "review_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "post" (
    "id" TEXT NOT NULL,
    "lodge_id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "excerpt" TEXT,
    "body" TEXT NOT NULL,
    "cover_id" TEXT,
    "published_on" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "post_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "review_lodge_id_position_idx" ON "review"("lodge_id", "position");

-- CreateIndex
CREATE INDEX "post_lodge_id_published_on_idx" ON "post"("lodge_id", "published_on");

-- CreateIndex
CREATE UNIQUE INDEX "post_lodge_id_slug_key" ON "post"("lodge_id", "slug");

-- AddForeignKey
ALTER TABLE "review" ADD CONSTRAINT "review_lodge_id_fkey" FOREIGN KEY ("lodge_id") REFERENCES "lodge"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "post" ADD CONSTRAINT "post_lodge_id_fkey" FOREIGN KEY ("lodge_id") REFERENCES "lodge"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "post" ADD CONSTRAINT "post_cover_id_fkey" FOREIGN KEY ("cover_id") REFERENCES "photo"("id") ON DELETE SET NULL ON UPDATE CASCADE;
