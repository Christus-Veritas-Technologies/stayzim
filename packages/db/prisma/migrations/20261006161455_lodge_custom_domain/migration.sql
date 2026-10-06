-- AlterTable
ALTER TABLE "lodge" ADD COLUMN     "custom_domain" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "lodge_custom_domain_key" ON "lodge"("custom_domain");
