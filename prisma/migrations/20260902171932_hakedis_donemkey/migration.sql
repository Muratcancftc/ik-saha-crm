-- AlterTable
ALTER TABLE "Hakedis" ADD COLUMN "donemKey" TEXT;

-- DropIndex
DROP INDEX IF EXISTS "Hakedis_atamaId_key";

-- CreateIndex
CREATE UNIQUE INDEX "Hakedis_isciId_firmaId_donemKey_key" ON "Hakedis"("isciId", "firmaId", "donemKey");
