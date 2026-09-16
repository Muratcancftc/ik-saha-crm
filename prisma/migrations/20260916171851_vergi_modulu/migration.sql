-- CreateEnum
CREATE TYPE "VergiTuru" AS ENUM ('KDV', 'MUHTASAR', 'STOPAJ', 'GECICI_VERGI', 'KURUMLAR', 'SGK', 'BAGKUR', 'DAMGA', 'DIGER');

-- CreateEnum
CREATE TYPE "VergiOdemeYontemi" AS ENUM ('BANKA', 'KREDI_KARTI', 'NAKIT');

-- AlterEnum
ALTER TYPE "Rol" ADD VALUE 'izleyici';

-- CreateTable
CREATE TABLE "VergiOdemesi" (
    "id" SERIAL NOT NULL,
    "firmaId" INTEGER NOT NULL,
    "vergiTuru" "VergiTuru" NOT NULL,
    "vergiTuruDiger" TEXT,
    "donem" TEXT NOT NULL,
    "tahakkukTutari" DECIMAL(12,2) NOT NULL,
    "sonOdemeTarihi" TIMESTAMP(3) NOT NULL,
    "odemeTarihi" TIMESTAMP(3),
    "odenenTutar" DECIMAL(12,2),
    "odemeYontemi" "VergiOdemeYontemi",
    "not" TEXT,
    "olusturanKullaniciId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "silindi" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "VergiOdemesi_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VergiDekont" (
    "id" SERIAL NOT NULL,
    "vergiOdemeId" INTEGER NOT NULL,
    "dosyaUrl" TEXT NOT NULL,
    "dosyaAdi" TEXT NOT NULL,
    "dosyaTipi" TEXT NOT NULL,
    "dosyaBoyutu" INTEGER,
    "yukleyenKullaniciId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "silindi" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "VergiDekont_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VergiSablon" (
    "id" SERIAL NOT NULL,
    "firmaId" INTEGER NOT NULL,
    "vergiTuru" "VergiTuru" NOT NULL,
    "vergiTuruDiger" TEXT,
    "tahakkukTutari" DECIMAL(12,2) NOT NULL,
    "sonOdemeGun" INTEGER NOT NULL,
    "donemEtiketi" TEXT,
    "aktif" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VergiSablon_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "VergiOdemesi_firmaId_idx" ON "VergiOdemesi"("firmaId");

-- CreateIndex
CREATE INDEX "VergiOdemesi_sonOdemeTarihi_idx" ON "VergiOdemesi"("sonOdemeTarihi");

-- CreateIndex
CREATE INDEX "VergiOdemesi_vergiTuru_idx" ON "VergiOdemesi"("vergiTuru");

-- CreateIndex
CREATE INDEX "VergiDekont_vergiOdemeId_idx" ON "VergiDekont"("vergiOdemeId");

-- CreateIndex
CREATE INDEX "VergiSablon_firmaId_idx" ON "VergiSablon"("firmaId");

-- AddForeignKey
ALTER TABLE "VergiOdemesi" ADD CONSTRAINT "VergiOdemesi_firmaId_fkey" FOREIGN KEY ("firmaId") REFERENCES "MusteriFirma"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VergiDekont" ADD CONSTRAINT "VergiDekont_vergiOdemeId_fkey" FOREIGN KEY ("vergiOdemeId") REFERENCES "VergiOdemesi"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VergiSablon" ADD CONSTRAINT "VergiSablon_firmaId_fkey" FOREIGN KEY ("firmaId") REFERENCES "MusteriFirma"("id") ON DELETE CASCADE ON UPDATE CASCADE;
