-- Payment links: stayzim.co.zw/pay/<token>, for a lodge to pay a fixed amount without signing in,
-- and the link each payment came through
-- AlterTable
ALTER TABLE "payment" ADD COLUMN     "payment_link_id" TEXT;

-- CreateTable
CREATE TABLE "payment_link" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "lodge_id" TEXT NOT NULL,
    "plan" "LodgePlan" NOT NULL,
    "months" INTEGER NOT NULL,
    "amount_cents" INTEGER NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "paid_at" TIMESTAMP(3),
    "created_by_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payment_link_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "payment_link_token_key" ON "payment_link"("token");

-- CreateIndex
CREATE INDEX "payment_link_lodge_id_created_at_idx" ON "payment_link"("lodge_id", "created_at");

-- AddForeignKey
ALTER TABLE "payment" ADD CONSTRAINT "payment_payment_link_id_fkey" FOREIGN KEY ("payment_link_id") REFERENCES "payment_link"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_link" ADD CONSTRAINT "payment_link_lodge_id_fkey" FOREIGN KEY ("lodge_id") REFERENCES "lodge"("id") ON DELETE CASCADE ON UPDATE CASCADE;
