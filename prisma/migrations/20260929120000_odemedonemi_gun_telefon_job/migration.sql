-- OdemeDonemi.gun: ödeme anındaki puantaj gün katsayısı (kilitli dönem gün sayısı için)
ALTER TABLE "OdemeDonemi" ADD COLUMN "gun" DECIMAL(10,2) NOT NULL DEFAULT 0;

-- Mevcut dönemler için gün snapshot'ı: dönem aralığındaki puantaj fsi toplamı (Gelmedi=0 sayılmaz)
UPDATE "OdemeDonemi" d
SET "gun" = COALESCE((
    SELECT SUM(p.fsi) FROM "PuantajKayit" p
    WHERE p."isciId" = d."isciId" AND p."firmaId" = d."firmaId"
      AND p.tarih >= d.baslangic AND p.tarih < d.bitis
), 0);

-- Telefonlar tek biçime: rakam dışını sil, son 10 hane (ülke kodu/0 ön eki atılır)
UPDATE "Isci" SET telefon = RIGHT(regexp_replace(telefon, '[^0-9]', '', 'g'), 10);
UPDATE "Aday" SET telefon = RIGHT(regexp_replace(telefon, '[^0-9]', '', 'g'), 10);

-- Eski iş ilanı gecerlilik tarihleri UTC gün-sonundan İstanbul gün-sonuna (3 saat geri)
UPDATE "Job" SET "gecerlilikTarihi" = "gecerlilikTarihi" - INTERVAL '3 hours'
WHERE "gecerlilikTarihi" IS NOT NULL AND EXTRACT(HOUR FROM "gecerlilikTarihi") = 23;