-- CreateTable
CREATE TABLE "KullaniciEtkinlik" (
    "id" SERIAL NOT NULL,
    "kullaniciId" INTEGER NOT NULL,
    "tarih" TIMESTAMP(3) NOT NULL,
    "girisSayisi" INTEGER NOT NULL DEFAULT 0,
    "aktifDakika" INTEGER NOT NULL DEFAULT 0,
    "sonAktivite" TIMESTAMP(3),

    CONSTRAINT "KullaniciEtkinlik_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EtkinlikKayit" (
    "id" SERIAL NOT NULL,
    "kullaniciId" INTEGER NOT NULL,
    "tarih" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "islem" TEXT NOT NULL,

    CONSTRAINT "EtkinlikKayit_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "KullaniciEtkinlik_tarih_idx" ON "KullaniciEtkinlik"("tarih");

-- CreateIndex
CREATE UNIQUE INDEX "KullaniciEtkinlik_kullaniciId_tarih_key" ON "KullaniciEtkinlik"("kullaniciId", "tarih");

-- CreateIndex
CREATE INDEX "EtkinlikKayit_kullaniciId_tarih_idx" ON "EtkinlikKayit"("kullaniciId", "tarih");

-- CreateIndex
CREATE INDEX "EtkinlikKayit_tarih_idx" ON "EtkinlikKayit"("tarih");

-- AddForeignKey
ALTER TABLE "KullaniciEtkinlik" ADD CONSTRAINT "KullaniciEtkinlik_kullaniciId_fkey" FOREIGN KEY ("kullaniciId") REFERENCES "Kullanici"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EtkinlikKayit" ADD CONSTRAINT "EtkinlikKayit_kullaniciId_fkey" FOREIGN KEY ("kullaniciId") REFERENCES "Kullanici"("id") ON DELETE CASCADE ON UPDATE CASCADE;
