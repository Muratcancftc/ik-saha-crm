-- DropIndex
DROP INDEX "Atama_isciId_tarih_key";

-- AlterTable
ALTER TABLE "Atama" ADD COLUMN     "yevmiye" DECIMAL(10,2) NOT NULL DEFAULT 0;

-- CreateIndex
CREATE INDEX "Atama_isciId_tarih_idx" ON "Atama"("isciId", "tarih");

-- Mevcut Atama satırlarına atama anındaki yevmiye snapshot'ı (işçinin günlük beklentisi)
UPDATE "Atama" a
SET "yevmiye" = i."gunlukUcretBeklentisi"
FROM "Isci" i
WHERE i.id = a."isciId";

-- O9: Eski/hatalı fatura durumu tek seferlik düzeltme —
-- durum tahsilat toplamına göre yeniden hesaplanır (odendi/kismi/vadede/gecikti)
UPDATE "Fatura" f
SET "durum" = CASE
    WHEN COALESCE(t.toplam, 0) >= f."genelToplam" THEN 'odendi'::"FaturaDurum"
    WHEN COALESCE(t.toplam, 0) > 0 THEN 'kismi'::"FaturaDurum"
    WHEN f."vadeTarihi" < CURRENT_DATE THEN 'gecikti'::"FaturaDurum"
    ELSE 'vadede'::"FaturaDurum"
  END
FROM (SELECT "faturaId", SUM(tutar) AS toplam FROM "Tahsilat" GROUP BY "faturaId") t
WHERE t."faturaId" = f.id;

-- Tahsilatı olmayan faturalar da güncellensin
UPDATE "Fatura" f
SET "durum" = CASE WHEN f."vadeTarihi" < CURRENT_DATE THEN 'gecikti'::"FaturaDurum" ELSE 'vadede'::"FaturaDurum" END
WHERE NOT EXISTS (SELECT 1 FROM "Tahsilat" t WHERE t."faturaId" = f.id)
  AND f."durum" IN ('odendi', 'kismi');
