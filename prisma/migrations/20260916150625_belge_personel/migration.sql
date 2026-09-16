-- AlterTable
ALTER TABLE "Belge" ADD COLUMN     "personelId" INTEGER,
ALTER COLUMN "isciId" DROP NOT NULL;

-- CreateIndex
CREATE INDEX "Belge_personelId_bitisTarihi_idx" ON "Belge"("personelId", "bitisTarihi");

-- AddForeignKey
ALTER TABLE "Belge" ADD CONSTRAINT "Belge_personelId_fkey" FOREIGN KEY ("personelId") REFERENCES "Personel"("id") ON DELETE CASCADE ON UPDATE CASCADE;
