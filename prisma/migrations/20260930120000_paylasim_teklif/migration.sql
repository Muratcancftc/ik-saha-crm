-- CreateEnum
CREATE TYPE "PaylasimTur" AS ENUM ('SUNUM', 'MALIYET');

-- CreateEnum
CREATE TYPE "PaylasimDurum" AS ENUM ('AKTIF', 'IPTAL', 'SURESI_DOLDU');

-- CreateEnum
CREATE TYPE "MaliyetGorunum" AS ENUM ('TAM', 'KAR_GIZLI');

-- CreateEnum
CREATE TYPE "KarModu" AS ENUM ('YUZDE', 'HEDEF');

-- CreateTable
CREATE TABLE "Sunum" (
    "id" SERIAL NOT NULL,
    "baslik" TEXT NOT NULL,
    "aciklama" TEXT,
    "olusturanKullaniciId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Sunum_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SunumVersiyon" (
    "id" SERIAL NOT NULL,
    "sunumId" INTEGER NOT NULL,
    "versiyonNo" INTEGER NOT NULL,
    "versiyonNotu" TEXT,
    "pdfUrl" TEXT NOT NULL,
    "pdfAdi" TEXT NOT NULL,
    "pdfBoyut" INTEGER,
    "pptxUrl" TEXT,
    "pptxAdi" TEXT,
    "pptxBoyut" INTEGER,
    "aktif" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SunumVersiyon_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MaliyetTablosu" (
    "id" SERIAL NOT NULL,
    "ad" TEXT,
    "firmaId" INTEGER NOT NULL,
    "tarih" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "gecerlilikTarihi" TIMESTAMP(3),
    "sgkIsci" DECIMAL(6,4) NOT NULL,
    "issizlikIsci" DECIMAL(6,4) NOT NULL,
    "sgkIsveren" DECIMAL(6,4) NOT NULL,
    "issizlikIsveren" DECIMAL(6,4) NOT NULL,
    "gelirVergisi" DECIMAL(6,4) NOT NULL,
    "damgaVergisi" DECIMAL(8,5) NOT NULL,
    "olusturanKullaniciId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MaliyetTablosu_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MaliyetPozisyon" (
    "id" SERIAL NOT NULL,
    "tabloId" INTEGER NOT NULL,
    "ad" TEXT NOT NULL,
    "sira" INTEGER NOT NULL DEFAULT 0,
    "brutUcret" DECIMAL(12,2) NOT NULL,
    "gvMatrahIstisnasi" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "dvIstisnasi" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "kidem" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "ihbar" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "yillikIzin" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "yemek" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "yol" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "saglikOsgb" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "kiyafet" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "maliMesuliyet" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "karModu" "KarModu" NOT NULL DEFAULT 'YUZDE',
    "karOran" DECIMAL(8,4) NOT NULL DEFAULT 0,
    "hedefTeklif" DECIMAL(12,2),
    "sgkIsci" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "issizlikIsci" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "gvMatrahi" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "gvMatrahiIndirimli" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "gelirVergisi" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "dvMatrahi" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "dvMatrahiIndirimli" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "damgaVergisi" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "kesintilerToplami" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "netUcret" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "sgkIsveren" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "issizlikIsveren" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "yasalMaliyet" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "toplamYasalMaliyet" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "personelMaliyeti" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "karPayi" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "teklifBedeli" DECIMAL(12,2) NOT NULL DEFAULT 0,

    CONSTRAINT "MaliyetPozisyon_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaylasimLink" (
    "id" SERIAL NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "tokenSifreli" TEXT,
    "tur" "PaylasimTur" NOT NULL,
    "durum" "PaylasimDurum" NOT NULL DEFAULT 'AKTIF',
    "firmaAd" TEXT NOT NULL,
    "aliciAd" TEXT NOT NULL,
    "aliciEmail" TEXT NOT NULL,
    "olusturanKullaniciId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "gecerlilikBitis" TIMESTAMP(3) NOT NULL,
    "gorunum" "MaliyetGorunum",
    "sunumVersiyonId" INTEGER,
    "maliyetTablosuId" INTEGER,
    "snapshot" JSONB,
    "sifreHash" TEXT,
    "kilitliDeneme" INTEGER NOT NULL DEFAULT 0,
    "kilitBitis" TIMESTAMP(3),
    "ilkAcilma" TIMESTAMP(3),
    "sonAcilma" TIMESTAMP(3),
    "acilmaSayisi" INTEGER NOT NULL DEFAULT 0,
    "iptalTarihi" TIMESTAMP(3),
    "iptalEdenKullaniciId" INTEGER,

    CONSTRAINT "PaylasimLink_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaylasimErisim" (
    "id" SERIAL NOT NULL,
    "linkId" INTEGER NOT NULL,
    "tarih" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ip" TEXT,
    "userAgent" TEXT,
    "basarili" BOOLEAN NOT NULL DEFAULT true,
    "tip" TEXT NOT NULL,

    CONSTRAINT "PaylasimErisim_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SunumVersiyon_sunumId_idx" ON "SunumVersiyon"("sunumId");

-- CreateIndex
CREATE UNIQUE INDEX "SunumVersiyon_sunumId_versiyonNo_key" ON "SunumVersiyon"("sunumId", "versiyonNo");

-- CreateIndex
CREATE INDEX "MaliyetTablosu_firmaId_idx" ON "MaliyetTablosu"("firmaId");

-- CreateIndex
CREATE INDEX "MaliyetPozisyon_tabloId_idx" ON "MaliyetPozisyon"("tabloId");

-- CreateIndex
CREATE UNIQUE INDEX "MaliyetPozisyon_tabloId_ad_key" ON "MaliyetPozisyon"("tabloId", "ad");

-- CreateIndex
CREATE UNIQUE INDEX "PaylasimLink_tokenHash_key" ON "PaylasimLink"("tokenHash");

-- CreateIndex
CREATE INDEX "PaylasimLink_durum_idx" ON "PaylasimLink"("durum");

-- CreateIndex
CREATE INDEX "PaylasimLink_createdAt_idx" ON "PaylasimLink"("createdAt");

-- CreateIndex
CREATE INDEX "PaylasimErisim_linkId_tarih_idx" ON "PaylasimErisim"("linkId", "tarih");

-- CreateIndex
CREATE INDEX "PaylasimErisim_tarih_idx" ON "PaylasimErisim"("tarih");

-- AddForeignKey
ALTER TABLE "SunumVersiyon" ADD CONSTRAINT "SunumVersiyon_sunumId_fkey" FOREIGN KEY ("sunumId") REFERENCES "Sunum"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaliyetTablosu" ADD CONSTRAINT "MaliyetTablosu_firmaId_fkey" FOREIGN KEY ("firmaId") REFERENCES "MusteriFirma"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaliyetPozisyon" ADD CONSTRAINT "MaliyetPozisyon_tabloId_fkey" FOREIGN KEY ("tabloId") REFERENCES "MaliyetTablosu"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaylasimLink" ADD CONSTRAINT "PaylasimLink_sunumVersiyonId_fkey" FOREIGN KEY ("sunumVersiyonId") REFERENCES "SunumVersiyon"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaylasimLink" ADD CONSTRAINT "PaylasimLink_maliyetTablosuId_fkey" FOREIGN KEY ("maliyetTablosuId") REFERENCES "MaliyetTablosu"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaylasimErisim" ADD CONSTRAINT "PaylasimErisim_linkId_fkey" FOREIGN KEY ("linkId") REFERENCES "PaylasimLink"("id") ON DELETE CASCADE ON UPDATE CASCADE;

