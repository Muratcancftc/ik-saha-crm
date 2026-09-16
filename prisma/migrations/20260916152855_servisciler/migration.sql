-- CreateEnum
CREATE TYPE "ServisciDurum" AS ENUM ('aktif', 'pasif');

-- CreateTable
CREATE TABLE "Servisci" (
    "id" SERIAL NOT NULL,
    "ad" TEXT NOT NULL,
    "telefon" TEXT NOT NULL,
    "bolge" "Bolge" NOT NULL DEFAULT 'kocaeli',
    "durum" "ServisciDurum" NOT NULL DEFAULT 'aktif',
    "not" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Servisci_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Servis" (
    "id" SERIAL NOT NULL,
    "servisciId" INTEGER NOT NULL,
    "tarih" TIMESTAMP(3) NOT NULL,
    "guzergah" TEXT,
    "tutar" DECIMAL(10,2) NOT NULL,
    "not" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Servis_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Servisci_bolge_idx" ON "Servisci"("bolge");

-- CreateIndex
CREATE INDEX "Servis_servisciId_idx" ON "Servis"("servisciId");

-- AddForeignKey
ALTER TABLE "Servis" ADD CONSTRAINT "Servis_servisciId_fkey" FOREIGN KEY ("servisciId") REFERENCES "Servisci"("id") ON DELETE CASCADE ON UPDATE CASCADE;
