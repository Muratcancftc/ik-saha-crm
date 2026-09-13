-- AlterEnum
ALTER TYPE "BildirimTur" ADD VALUE 'website';

-- AlterTable
ALTER TABLE "Talep" ADD COLUMN "kaynak" TEXT,
ADD COLUMN "landingPage" TEXT,
ADD COLUMN "referrer" TEXT,
ADD COLUMN "utmSource" TEXT,
ADD COLUMN "utmMedium" TEXT,
ADD COLUMN "utmCampaign" TEXT,
ADD COLUMN "utmContent" TEXT,
ADD COLUMN "utmTerm" TEXT,
ADD COLUMN "webRequestId" TEXT;

-- AlterTable
ALTER TABLE "Aday" ADD COLUMN "kaynak" TEXT,
ADD COLUMN "cvYolu" TEXT,
ADD COLUMN "cvDosyaAdi" TEXT,
ADD COLUMN "ilanId" INTEGER,
ADD COLUMN "webRequestId" TEXT;

-- CreateTable
CREATE TABLE "Job" (
    "id" SERIAL NOT NULL,
    "slug" TEXT NOT NULL,
    "baslik" TEXT NOT NULL,
    "lokasyon" TEXT,
    "calismaTipi" TEXT,
    "aciklama" TEXT,
    "gereksinimler" TEXT[],
    "yayinlandi" BOOLEAN NOT NULL DEFAULT false,
    "yayinTarihi" TIMESTAMP(3),
    "gecerlilikTarihi" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Job_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Job_slug_key" ON "Job"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Talep_webRequestId_key" ON "Talep"("webRequestId");

-- CreateIndex
CREATE INDEX "Aday_telefon_idx" ON "Aday"("telefon");

-- CreateIndex
CREATE INDEX "Aday_email_idx" ON "Aday"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Aday_webRequestId_key" ON "Aday"("webRequestId");

-- AddForeignKey
ALTER TABLE "Aday" ADD CONSTRAINT "Aday_ilanId_fkey" FOREIGN KEY ("ilanId") REFERENCES "Job"("id") ON DELETE SET NULL ON UPDATE CASCADE;