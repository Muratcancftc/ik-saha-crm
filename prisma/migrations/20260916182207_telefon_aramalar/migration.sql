-- CreateTable
CREATE TABLE "Arama" (
    "id" SERIAL NOT NULL,
    "isciId" INTEGER NOT NULL,
    "kullaniciId" INTEGER,
    "tarih" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Arama_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Arama_isciId_tarih_idx" ON "Arama"("isciId", "tarih");

-- AddForeignKey
ALTER TABLE "Arama" ADD CONSTRAINT "Arama_isciId_fkey" FOREIGN KEY ("isciId") REFERENCES "Isci"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Arama" ADD CONSTRAINT "Arama_kullaniciId_fkey" FOREIGN KEY ("kullaniciId") REFERENCES "Kullanici"("id") ON DELETE SET NULL ON UPDATE CASCADE;
