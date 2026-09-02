-- AlterTable
ALTER TABLE "Isci" ADD COLUMN "not" TEXT;

-- CreateTable
CREATE TABLE "Izin" (
    "id" SERIAL NOT NULL,
    "personelId" INTEGER NOT NULL,
    "tarih" TIMESTAMP(3) NOT NULL,
    "gun" INTEGER NOT NULL,
    "tip" TEXT NOT NULL,
    "not" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Izin_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PersonelGecmisi" (
    "id" SERIAL NOT NULL,
    "personelId" INTEGER NOT NULL,
    "tarih" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "alan" TEXT NOT NULL,
    "eskiDeger" TEXT NOT NULL,
    "yeniDeger" TEXT NOT NULL,

    CONSTRAINT "PersonelGecmisi_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Izin_personelId_idx" ON "Izin"("personelId");

-- CreateIndex
CREATE INDEX "PersonelGecmisi_personelId_idx" ON "PersonelGecmisi"("personelId");

-- AddForeignKey
ALTER TABLE "Izin" ADD CONSTRAINT "Izin_personelId_fkey" FOREIGN KEY ("personelId") REFERENCES "Personel"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PersonelGecmisi" ADD CONSTRAINT "PersonelGecmisi_personelId_fkey" FOREIGN KEY ("personelId") REFERENCES "Personel"("id") ON DELETE CASCADE ON UPDATE CASCADE;
