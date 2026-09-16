-- CreateEnum
CREATE TYPE "CalismaTipi" AS ENUM ('GUNLUK', 'SAATLIK');

-- CreateEnum
CREATE TYPE "OdemeYontemi" AS ENUM ('ELDEN', 'IBAN');

-- CreateEnum
CREATE TYPE "OdemeDonemiDurum" AS ENUM ('BEKLIYOR', 'KISMI_ODENDI', 'ODENDI');

-- CreateEnum
CREATE TYPE "KesintiTuru" AS ENUM ('sgk', 'avans_mahsup', 'ceza', 'diger');

-- AlterEnum
ALTER TYPE "Rol" ADD VALUE 'ik';

-- AlterTable
ALTER TABLE "Isci" ADD COLUMN     "calismaTipi" "CalismaTipi" NOT NULL DEFAULT 'GUNLUK',
ADD COLUMN     "firmaId" INTEGER,
ADD COLUMN     "varsayilanOdemeYontemi" "OdemeYontemi" NOT NULL DEFAULT 'ELDEN';

-- CreateTable
CREATE TABLE "PersonelUcret" (
    "id" SERIAL NOT NULL,
    "isciId" INTEGER NOT NULL,
    "gunlukUcret" DECIMAL(12,2) NOT NULL,
    "saatlikUcret" DECIMAL(12,2) NOT NULL,
    "gecerlilikBaslangic" TIMESTAMP(3) NOT NULL,
    "gecerlilikBitis" TIMESTAMP(3),
    "olusturanKullaniciId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PersonelUcret_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FirmaUcret" (
    "id" SERIAL NOT NULL,
    "firmaId" INTEGER NOT NULL,
    "gunlukUcret" DECIMAL(12,2) NOT NULL,
    "saatlikUcret" DECIMAL(12,2) NOT NULL,
    "gecerlilikBaslangic" TIMESTAMP(3) NOT NULL,
    "gecerlilikBitis" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FirmaUcret_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PuantajKayit" (
    "id" SERIAL NOT NULL,
    "isciId" INTEGER NOT NULL,
    "firmaId" INTEGER NOT NULL,
    "tarih" TIMESTAMP(3) NOT NULL,
    "fsi" DECIMAL(3,2) NOT NULL DEFAULT 1,
    "calismaTipi" "CalismaTipi" NOT NULL DEFAULT 'GUNLUK',
    "calisilanSaat" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "mesaiSaat" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "uygulananGunlukUcret" DECIMAL(12,2) NOT NULL,
    "uygulananSaatlikUcret" DECIMAL(12,2) NOT NULL,
    "hesaplananTutar" DECIMAL(12,2) NOT NULL,
    "ucretManuelMi" BOOLEAN NOT NULL DEFAULT false,
    "aciklama" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PuantajKayit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Kesinti" (
    "id" SERIAL NOT NULL,
    "isciId" INTEGER NOT NULL,
    "tarih" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "tutar" DECIMAL(12,2) NOT NULL,
    "tur" "KesintiTuru" NOT NULL DEFAULT 'diger',
    "aciklama" TEXT,

    CONSTRAINT "Kesinti_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OdemeDonemi" (
    "id" SERIAL NOT NULL,
    "isciId" INTEGER NOT NULL,
    "firmaId" INTEGER NOT NULL,
    "baslangic" TIMESTAMP(3) NOT NULL,
    "bitis" TIMESTAMP(3) NOT NULL,
    "brutHakedis" DECIMAL(12,2) NOT NULL,
    "toplamAvans" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "toplamKesinti" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "netOdenecek" DECIMAL(12,2) NOT NULL,
    "durum" "OdemeDonemiDurum" NOT NULL DEFAULT 'BEKLIYOR',
    "kilitli" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OdemeDonemi_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OdemeKayit" (
    "id" SERIAL NOT NULL,
    "donemId" INTEGER NOT NULL,
    "tarih" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "tutar" DECIMAL(12,2) NOT NULL,
    "yontem" "OdemeYontemi" NOT NULL,
    "ibanSnapshot" TEXT,
    "hesapSahibi" TEXT,
    "yakininaOdeme" BOOLEAN NOT NULL DEFAULT false,
    "yakinlikNotu" TEXT,
    "zarfNo" TEXT,
    "teslimAlan" TEXT,
    "teslimEdenKullaniciId" INTEGER,
    "dekontUrl" TEXT,
    "not" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OdemeKayit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UcretLog" (
    "id" SERIAL NOT NULL,
    "kayitTipi" TEXT NOT NULL,
    "ilgiliId" INTEGER,
    "alan" TEXT NOT NULL,
    "eskiDeger" TEXT,
    "yeniDeger" TEXT,
    "kullaniciId" INTEGER,
    "tarih" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UcretLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PersonelUcret_isciId_idx" ON "PersonelUcret"("isciId");

-- CreateIndex
CREATE INDEX "FirmaUcret_firmaId_idx" ON "FirmaUcret"("firmaId");

-- CreateIndex
CREATE UNIQUE INDEX "FirmaUcret_firmaId_gecerlilikBaslangic_key" ON "FirmaUcret"("firmaId", "gecerlilikBaslangic");

-- CreateIndex
CREATE INDEX "PuantajKayit_isciId_tarih_idx" ON "PuantajKayit"("isciId", "tarih");

-- CreateIndex
CREATE UNIQUE INDEX "PuantajKayit_isciId_tarih_key" ON "PuantajKayit"("isciId", "tarih");

-- CreateIndex
CREATE INDEX "Kesinti_isciId_idx" ON "Kesinti"("isciId");

-- CreateIndex
CREATE INDEX "OdemeDonemi_isciId_idx" ON "OdemeDonemi"("isciId");

-- CreateIndex
CREATE UNIQUE INDEX "OdemeDonemi_isciId_firmaId_baslangic_bitis_key" ON "OdemeDonemi"("isciId", "firmaId", "baslangic", "bitis");

-- CreateIndex
CREATE INDEX "OdemeKayit_donemId_idx" ON "OdemeKayit"("donemId");

-- CreateIndex
CREATE INDEX "UcretLog_kayitTipi_ilgiliId_idx" ON "UcretLog"("kayitTipi", "ilgiliId");

-- AddForeignKey
ALTER TABLE "Isci" ADD CONSTRAINT "Isci_firmaId_fkey" FOREIGN KEY ("firmaId") REFERENCES "MusteriFirma"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PersonelUcret" ADD CONSTRAINT "PersonelUcret_isciId_fkey" FOREIGN KEY ("isciId") REFERENCES "Isci"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FirmaUcret" ADD CONSTRAINT "FirmaUcret_firmaId_fkey" FOREIGN KEY ("firmaId") REFERENCES "MusteriFirma"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PuantajKayit" ADD CONSTRAINT "PuantajKayit_isciId_fkey" FOREIGN KEY ("isciId") REFERENCES "Isci"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PuantajKayit" ADD CONSTRAINT "PuantajKayit_firmaId_fkey" FOREIGN KEY ("firmaId") REFERENCES "MusteriFirma"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Kesinti" ADD CONSTRAINT "Kesinti_isciId_fkey" FOREIGN KEY ("isciId") REFERENCES "Isci"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OdemeDonemi" ADD CONSTRAINT "OdemeDonemi_isciId_fkey" FOREIGN KEY ("isciId") REFERENCES "Isci"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OdemeDonemi" ADD CONSTRAINT "OdemeDonemi_firmaId_fkey" FOREIGN KEY ("firmaId") REFERENCES "MusteriFirma"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OdemeKayit" ADD CONSTRAINT "OdemeKayit_donemId_fkey" FOREIGN KEY ("donemId") REFERENCES "OdemeDonemi"("id") ON DELETE CASCADE ON UPDATE CASCADE;
