-- AlterTable
ALTER TABLE "Atama" ADD COLUMN "meslekId" INTEGER;

-- AlterTable
ALTER TABLE "Hakedis" ADD COLUMN "atamaId" INTEGER;

-- CreateIndex
CREATE UNIQUE INDEX "Hakedis_atamaId_key" ON "Hakedis"("atamaId");

-- AddForeignKey
ALTER TABLE "Atama" ADD CONSTRAINT "Atama_meslekId_fkey" FOREIGN KEY ("meslekId") REFERENCES "Meslek"("id") ON DELETE SET NULL ON UPDATE CASCADE;