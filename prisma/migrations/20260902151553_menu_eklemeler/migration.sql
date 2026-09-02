-- Enums (idempotent)
DO $$ BEGIN CREATE TYPE "AdayDurum" AS ENUM ('basvurdu', 'gorusuldu', 'onaylandi', 'reddedildi'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE "OdemeKaynak" AS ENUM ('isci', 'personel'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE "OdemeDurum" AS ENUM ('odendi', 'bekliyor'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE "EvrakTip" AS ENUM ('firma_sozlesme', 'isci_is_sozlesme', 'kvkk_acik_riza', 'diger'); EXCEPTION WHEN duplicate_object THEN null; END $$;

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

CREATE TABLE "Ayar" (
    "id" SERIAL NOT NULL,
    "anahtar" TEXT NOT NULL,
    "deger" TEXT NOT NULL,
    "aciklama" TEXT,
    CONSTRAINT "Ayar_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Ayar_anahtar_key" ON "Ayar"("anahtar");
CREATE INDEX "Odeme_durum_idx" ON "Odeme"("durum");

-- AddForeignKey
ALTER TABLE "Aday" ADD CONSTRAINT "Aday_meslekId_fkey" FOREIGN KEY ("meslekId") REFERENCES "Meslek"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Odeme" ADD CONSTRAINT "Odeme_isciId_fkey" FOREIGN KEY ("isciId") REFERENCES "Isci"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Odeme" ADD CONSTRAINT "Odeme_personelId_fkey" FOREIGN KEY ("personelId") REFERENCES "Personel"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Evrak" ADD CONSTRAINT "Evrak_ilgiliFirmaId_fkey" FOREIGN KEY ("ilgiliFirmaId") REFERENCES "MusteriFirma"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Evrak" ADD CONSTRAINT "Evrak_ilgiliIsciId_fkey" FOREIGN KEY ("ilgiliIsciId") REFERENCES "Isci"("id") ON DELETE CASCADE ON UPDATE CASCADE;
