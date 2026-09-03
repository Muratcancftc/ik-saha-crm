-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "Rol" AS ENUM ('patron', 'operasyon', 'muhasebe', 'saha_sorumlusu');

-- CreateEnum
CREATE TYPE "IsciDurum" AS ENUM ('aktif', 'pasif', 'kara_liste');

-- CreateEnum
CREATE TYPE "MusaitlikDurum" AS ENUM ('aktif', 'yenilenecek');

-- CreateEnum
CREATE TYPE "Vardiya" AS ENUM ('gunduz', 'gece');

-- CreateEnum
CREATE TYPE "Aciliyet" AS ENUM ('normal', 'acil');

-- CreateEnum
CREATE TYPE "TalepDurum" AS ENUM ('acik', 'kismi', 'dolu', 'kapandi');

-- CreateEnum
CREATE TYPE "AtamaDurum" AS ENUM ('atandi', 'onaylandi', 'tamamlandi', 'iptal');

-- CreateEnum
CREATE TYPE "PuantajDurum" AS ENUM ('geldi', 'gec', 'gelmedi', 'yarim');

-- CreateEnum
CREATE TYPE "AvansDurum" AS ENUM ('verildi', 'mahsup');

-- CreateEnum
CREATE TYPE "FaturaDurum" AS ENUM ('vadede', 'odendi', 'gecikti');

-- CreateEnum
CREATE TYPE "GiderKategori" AS ENUM ('isci_yevmiye', 'personel_bordro', 'kira', 'ulasim', 'yakit', 'sarf_malzeme', 'diger');

-- CreateEnum
CREATE TYPE "OdemeTip" AS ENUM ('kdv', 'muhtasar_sgk', 'maas', 'gecici_vergi');

-- CreateEnum
CREATE TYPE "ResmiOdemeDurum" AS ENUM ('beklemede', 'odendi', 'gecikti');

-- CreateEnum
CREATE TYPE "PersonelDurum" AS ENUM ('aktif', 'pasif');

-- CreateEnum
CREATE TYPE "BildirimTur" AS ENUM ('belge', 'sgk', 'fatura', 'vergi', 'talep');

-- CreateEnum
CREATE TYPE "TekrarTip" AS ENUM ('gunluk', 'haftalik');

-- CreateEnum
CREATE TYPE "AdayDurum" AS ENUM ('basvurdu', 'gorusuldu', 'onaylandi', 'reddedildi');

-- CreateEnum
CREATE TYPE "OdemeKaynak" AS ENUM ('isci', 'personel');

-- CreateEnum
CREATE TYPE "OdemeDurum" AS ENUM ('odendi', 'bekliyor');

-- CreateEnum
CREATE TYPE "EvrakTip" AS ENUM ('firma_sozlesme', 'isci_is_sozlesme', 'kvkk_acik_riza', 'diger');

-- CreateTable
CREATE TABLE "IsciMeslek" (
    "isciId" INTEGER NOT NULL,
    "meslekId" INTEGER NOT NULL
);

-- CreateTable
CREATE TABLE "Meslek" (
    "id" SERIAL NOT NULL,
    "ad" TEXT NOT NULL,

    CONSTRAINT "Meslek_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Isci" (
    "id" SERIAL NOT NULL,
    "ad" TEXT NOT NULL,
    "telefon" TEXT NOT NULL,
    "tcKimlik" TEXT NOT NULL,
    "ilce" TEXT NOT NULL,
    "iban" TEXT NOT NULL,
    "dogumTarihi" TIMESTAMP(3) NOT NULL,
    "puan" INTEGER NOT NULL DEFAULT 50,
    "gunlukUcretBeklentisi" DECIMAL(10,2) NOT NULL,
    "durum" "IsciDurum" NOT NULL DEFAULT 'aktif',
    "tercihBolgeler" TEXT[],
    "not" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Isci_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Belge" (
    "id" SERIAL NOT NULL,
    "isciId" INTEGER NOT NULL,
    "tip" TEXT NOT NULL,
    "verilisTarihi" TIMESTAMP(3) NOT NULL,
    "bitisTarihi" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Belge_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Musaitlik" (
    "id" SERIAL NOT NULL,
    "isciId" INTEGER NOT NULL,
    "tarih" TIMESTAMP(3) NOT NULL,
    "eVadesiGun" INTEGER NOT NULL DEFAULT 30,
    "sozlesmeBaslangic" TIMESTAMP(3),
    "sozlesmeBitis" TIMESTAMP(3),
    "durum" "MusaitlikDurum" NOT NULL DEFAULT 'aktif',

    CONSTRAINT "Musaitlik_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Avans" (
    "id" SERIAL NOT NULL,
    "isciId" INTEGER NOT NULL,
    "tutar" DECIMAL(10,2) NOT NULL,
    "tarih" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "durum" "AvansDurum" NOT NULL DEFAULT 'verildi',

    CONSTRAINT "Avans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MusteriFirma" (
    "id" SERIAL NOT NULL,
    "ad" TEXT NOT NULL,
    "vergiNo" TEXT,
    "telefon" TEXT,
    "email" TEXT,
    "adres" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MusteriFirma_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Yetkili" (
    "id" SERIAL NOT NULL,
    "firmaId" INTEGER NOT NULL,
    "ad" TEXT NOT NULL,
    "unvan" TEXT,
    "telefon" TEXT,

    CONSTRAINT "Yetkili_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Lokasyon" (
    "id" SERIAL NOT NULL,
    "firmaId" INTEGER NOT NULL,
    "ad" TEXT NOT NULL,
    "adres" TEXT,

    CONSTRAINT "Lokasyon_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FirmaFiyat" (
    "id" SERIAL NOT NULL,
    "firmaId" INTEGER NOT NULL,
    "meslekId" INTEGER NOT NULL,
    "kisiGunFiyat" DECIMAL(10,2) NOT NULL,

    CONSTRAINT "FirmaFiyat_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Talep" (
    "id" SERIAL NOT NULL,
    "firmaId" INTEGER NOT NULL,
    "lokasyonId" INTEGER NOT NULL,
    "tarih" TIMESTAMP(3) NOT NULL,
    "vardiya" "Vardiya" NOT NULL DEFAULT 'gunduz',
    "aciliyet" "Aciliyet" NOT NULL DEFAULT 'normal',
    "durum" "TalepDurum" NOT NULL DEFAULT 'acik',
    "not" TEXT,
    "sablon" BOOLEAN NOT NULL DEFAULT false,
    "tekrar" "TekrarTip",
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Talep_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TalepKalemi" (
    "id" SERIAL NOT NULL,
    "talepId" INTEGER NOT NULL,
    "meslekId" INTEGER NOT NULL,
    "adet" INTEGER NOT NULL,

    CONSTRAINT "TalepKalemi_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Atama" (
    "id" SERIAL NOT NULL,
    "talepId" INTEGER NOT NULL,
    "isciId" INTEGER NOT NULL,
    "meslekId" INTEGER,
    "tarih" TIMESTAMP(3) NOT NULL,
    "durum" "AtamaDurum" NOT NULL DEFAULT 'atandi',
    "sgkBildirildi" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Atama_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Puantaj" (
    "id" SERIAL NOT NULL,
    "atamaId" INTEGER NOT NULL,
    "girisSaat" TIMESTAMP(3),
    "cikisSaat" TIMESTAMP(3),
    "calisilanSaat" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "mesaiSaat" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "durum" "PuantajDurum" NOT NULL DEFAULT 'geldi',

    CONSTRAINT "Puantaj_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Hakedis" (
    "id" SERIAL NOT NULL,
    "isciId" INTEGER NOT NULL,
    "firmaId" INTEGER NOT NULL,
    "atamaId" INTEGER,
    "donemKey" TEXT NOT NULL,
    "donemBas" TIMESTAMP(3) NOT NULL,
    "donemBitis" TIMESTAMP(3) NOT NULL,
    "gun" INTEGER NOT NULL,
    "yevmiye" DECIMAL(10,2) NOT NULL,
    "avansToplam" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "kesinti" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "isciNet" DECIMAL(10,2) NOT NULL,
    "musteriTutar" DECIMAL(10,2) NOT NULL,
    "marj" DECIMAL(10,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Hakedis_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Fatura" (
    "id" SERIAL NOT NULL,
    "firmaId" INTEGER NOT NULL,
    "no" TEXT NOT NULL,
    "donem" TEXT NOT NULL,
    "araToplam" DECIMAL(10,2) NOT NULL,
    "kdvOran" DECIMAL(4,2) NOT NULL DEFAULT 0.20,
    "kdvTutar" DECIMAL(10,2) NOT NULL,
    "genelToplam" DECIMAL(10,2) NOT NULL,
    "vadeTarihi" TIMESTAMP(3) NOT NULL,
    "durum" "FaturaDurum" NOT NULL DEFAULT 'vadede',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Fatura_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Tahsilat" (
    "id" SERIAL NOT NULL,
    "faturaId" INTEGER NOT NULL,
    "tarih" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "tutar" DECIMAL(10,2) NOT NULL,

    CONSTRAINT "Tahsilat_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Gider" (
    "id" SERIAL NOT NULL,
    "kategori" "GiderKategori" NOT NULL DEFAULT 'diger',
    "aciklama" TEXT,
    "tutar" DECIMAL(10,2) NOT NULL,
    "tarih" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Gider_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ResmiOdeme" (
    "id" SERIAL NOT NULL,
    "tip" "OdemeTip" NOT NULL,
    "tutar" DECIMAL(10,2) NOT NULL,
    "sonOdemeTarihi" TIMESTAMP(3) NOT NULL,
    "odemeTarihi" TIMESTAMP(3),
    "durum" "ResmiOdemeDurum" NOT NULL DEFAULT 'beklemede',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ResmiOdeme_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Personel" (
    "id" SERIAL NOT NULL,
    "ad" TEXT NOT NULL,
    "departman" TEXT NOT NULL,
    "rol" TEXT NOT NULL,
    "iseGiris" TIMESTAMP(3) NOT NULL,
    "maas" DECIMAL(10,2) NOT NULL,
    "iban" TEXT NOT NULL,
    "sgkDurum" TEXT NOT NULL,
    "izinBakiyesi" INTEGER NOT NULL DEFAULT 0,
    "durum" "PersonelDurum" NOT NULL DEFAULT 'aktif',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Personel_pkey" PRIMARY KEY ("id")
);

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

-- CreateTable
CREATE TABLE "Kullanici" (
    "id" SERIAL NOT NULL,
    "ad" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "sifreHash" TEXT NOT NULL,
    "rol" "Rol" NOT NULL DEFAULT 'operasyon',
    "lokasyonId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Kullanici_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Bildirim" (
    "id" SERIAL NOT NULL,
    "kullaniciId" INTEGER,
    "tur" "BildirimTur" NOT NULL,
    "mesaj" TEXT NOT NULL,
    "ilgiliId" INTEGER,
    "kanal" TEXT,
    "hedef" TEXT,
    "gonderimDurum" BOOLEAN NOT NULL DEFAULT false,
    "tarih" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "okundu" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Bildirim_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Aday" (
    "id" SERIAL NOT NULL,
    "ad" TEXT NOT NULL,
    "telefon" TEXT NOT NULL,
    "email" TEXT,
    "meslekId" INTEGER,
    "durum" "AdayDurum" NOT NULL DEFAULT 'basvurdu',
    "puan" INTEGER NOT NULL DEFAULT 50,
    "not" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Aday_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Odeme" (
    "id" SERIAL NOT NULL,
    "tip" "OdemeKaynak" NOT NULL,
    "isciId" INTEGER,
    "personelId" INTEGER,
    "tutar" DECIMAL(10,2) NOT NULL,
    "donem" TEXT NOT NULL,
    "durum" "OdemeDurum" NOT NULL DEFAULT 'bekliyor',
    "odemeTarihi" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Odeme_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Evrak" (
    "id" SERIAL NOT NULL,
    "tip" "EvrakTip" NOT NULL,
    "baslik" TEXT NOT NULL,
    "dosyaAdi" TEXT NOT NULL,
    "dosyaYol" TEXT NOT NULL,
    "ilgiliFirmaId" INTEGER,
    "ilgiliIsciId" INTEGER,
    "yuklemeTarihi" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Evrak_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Ayar" (
    "id" SERIAL NOT NULL,
    "anahtar" TEXT NOT NULL,
    "deger" TEXT NOT NULL,
    "aciklama" TEXT,

    CONSTRAINT "Ayar_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "IsciMeslek_isciId_meslekId_key" ON "IsciMeslek"("isciId", "meslekId");

-- CreateIndex
CREATE UNIQUE INDEX "Meslek_ad_key" ON "Meslek"("ad");

-- CreateIndex
CREATE INDEX "Belge_isciId_bitisTarihi_idx" ON "Belge"("isciId", "bitisTarihi");

-- CreateIndex
CREATE INDEX "Musaitlik_isciId_idx" ON "Musaitlik"("isciId");

-- CreateIndex
CREATE INDEX "Avans_isciId_durum_idx" ON "Avans"("isciId", "durum");

-- CreateIndex
CREATE UNIQUE INDEX "FirmaFiyat_firmaId_meslekId_key" ON "FirmaFiyat"("firmaId", "meslekId");

-- CreateIndex
CREATE INDEX "Talep_tarih_idx" ON "Talep"("tarih");

-- CreateIndex
CREATE INDEX "Atama_tarih_durum_idx" ON "Atama"("tarih", "durum");

-- CreateIndex
CREATE UNIQUE INDEX "Atama_isciId_tarih_key" ON "Atama"("isciId", "tarih");

-- CreateIndex
CREATE UNIQUE INDEX "Puantaj_atamaId_key" ON "Puantaj"("atamaId");

-- CreateIndex
CREATE INDEX "Hakedis_isciId_idx" ON "Hakedis"("isciId");

-- CreateIndex
CREATE INDEX "Hakedis_firmaId_idx" ON "Hakedis"("firmaId");

-- CreateIndex
CREATE UNIQUE INDEX "Hakedis_isciId_firmaId_donemKey_key" ON "Hakedis"("isciId", "firmaId", "donemKey");

-- CreateIndex
CREATE UNIQUE INDEX "Fatura_no_key" ON "Fatura"("no");

-- CreateIndex
CREATE INDEX "Gider_kategori_tarih_idx" ON "Gider"("kategori", "tarih");

-- CreateIndex
CREATE INDEX "ResmiOdeme_tip_sonOdemeTarihi_idx" ON "ResmiOdeme"("tip", "sonOdemeTarihi");

-- CreateIndex
CREATE INDEX "Izin_personelId_idx" ON "Izin"("personelId");

-- CreateIndex
CREATE INDEX "PersonelGecmisi_personelId_idx" ON "PersonelGecmisi"("personelId");

-- CreateIndex
CREATE UNIQUE INDEX "Kullanici_email_key" ON "Kullanici"("email");

-- CreateIndex
CREATE INDEX "Bildirim_kullaniciId_okundu_idx" ON "Bildirim"("kullaniciId", "okundu");

-- CreateIndex
CREATE INDEX "Odeme_durum_idx" ON "Odeme"("durum");

-- CreateIndex
CREATE UNIQUE INDEX "Ayar_anahtar_key" ON "Ayar"("anahtar");

-- AddForeignKey
ALTER TABLE "IsciMeslek" ADD CONSTRAINT "IsciMeslek_isciId_fkey" FOREIGN KEY ("isciId") REFERENCES "Isci"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IsciMeslek" ADD CONSTRAINT "IsciMeslek_meslekId_fkey" FOREIGN KEY ("meslekId") REFERENCES "Meslek"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Belge" ADD CONSTRAINT "Belge_isciId_fkey" FOREIGN KEY ("isciId") REFERENCES "Isci"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Musaitlik" ADD CONSTRAINT "Musaitlik_isciId_fkey" FOREIGN KEY ("isciId") REFERENCES "Isci"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Avans" ADD CONSTRAINT "Avans_isciId_fkey" FOREIGN KEY ("isciId") REFERENCES "Isci"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Yetkili" ADD CONSTRAINT "Yetkili_firmaId_fkey" FOREIGN KEY ("firmaId") REFERENCES "MusteriFirma"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lokasyon" ADD CONSTRAINT "Lokasyon_firmaId_fkey" FOREIGN KEY ("firmaId") REFERENCES "MusteriFirma"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FirmaFiyat" ADD CONSTRAINT "FirmaFiyat_firmaId_fkey" FOREIGN KEY ("firmaId") REFERENCES "MusteriFirma"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FirmaFiyat" ADD CONSTRAINT "FirmaFiyat_meslekId_fkey" FOREIGN KEY ("meslekId") REFERENCES "Meslek"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Talep" ADD CONSTRAINT "Talep_firmaId_fkey" FOREIGN KEY ("firmaId") REFERENCES "MusteriFirma"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Talep" ADD CONSTRAINT "Talep_lokasyonId_fkey" FOREIGN KEY ("lokasyonId") REFERENCES "Lokasyon"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TalepKalemi" ADD CONSTRAINT "TalepKalemi_talepId_fkey" FOREIGN KEY ("talepId") REFERENCES "Talep"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TalepKalemi" ADD CONSTRAINT "TalepKalemi_meslekId_fkey" FOREIGN KEY ("meslekId") REFERENCES "Meslek"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Atama" ADD CONSTRAINT "Atama_talepId_fkey" FOREIGN KEY ("talepId") REFERENCES "Talep"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Atama" ADD CONSTRAINT "Atama_isciId_fkey" FOREIGN KEY ("isciId") REFERENCES "Isci"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Atama" ADD CONSTRAINT "Atama_meslekId_fkey" FOREIGN KEY ("meslekId") REFERENCES "Meslek"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Puantaj" ADD CONSTRAINT "Puantaj_atamaId_fkey" FOREIGN KEY ("atamaId") REFERENCES "Atama"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Hakedis" ADD CONSTRAINT "Hakedis_isciId_fkey" FOREIGN KEY ("isciId") REFERENCES "Isci"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Hakedis" ADD CONSTRAINT "Hakedis_firmaId_fkey" FOREIGN KEY ("firmaId") REFERENCES "MusteriFirma"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Fatura" ADD CONSTRAINT "Fatura_firmaId_fkey" FOREIGN KEY ("firmaId") REFERENCES "MusteriFirma"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Tahsilat" ADD CONSTRAINT "Tahsilat_faturaId_fkey" FOREIGN KEY ("faturaId") REFERENCES "Fatura"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Izin" ADD CONSTRAINT "Izin_personelId_fkey" FOREIGN KEY ("personelId") REFERENCES "Personel"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PersonelGecmisi" ADD CONSTRAINT "PersonelGecmisi_personelId_fkey" FOREIGN KEY ("personelId") REFERENCES "Personel"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Kullanici" ADD CONSTRAINT "Kullanici_lokasyonId_fkey" FOREIGN KEY ("lokasyonId") REFERENCES "Lokasyon"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Bildirim" ADD CONSTRAINT "Bildirim_kullaniciId_fkey" FOREIGN KEY ("kullaniciId") REFERENCES "Kullanici"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Aday" ADD CONSTRAINT "Aday_meslekId_fkey" FOREIGN KEY ("meslekId") REFERENCES "Meslek"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Odeme" ADD CONSTRAINT "Odeme_isciId_fkey" FOREIGN KEY ("isciId") REFERENCES "Isci"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Odeme" ADD CONSTRAINT "Odeme_personelId_fkey" FOREIGN KEY ("personelId") REFERENCES "Personel"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Evrak" ADD CONSTRAINT "Evrak_ilgiliFirmaId_fkey" FOREIGN KEY ("ilgiliFirmaId") REFERENCES "MusteriFirma"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Evrak" ADD CONSTRAINT "Evrak_ilgiliIsciId_fkey" FOREIGN KEY ("ilgiliIsciId") REFERENCES "Isci"("id") ON DELETE CASCADE ON UPDATE CASCADE;

