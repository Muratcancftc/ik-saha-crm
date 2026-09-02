-- CreateEnum
CREATE TYPE "TekrarTip" AS ENUM ('gunluk', 'haftalik');

-- AlterTable
ALTER TABLE "Talep" ADD COLUMN "sablon" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Talep" ADD COLUMN "tekrar" "TekrarTip";

-- AlterTable
ALTER TABLE "Bildirim" ADD COLUMN "kanal" TEXT;
ALTER TABLE "Bildirim" ADD COLUMN "hedef" TEXT;
ALTER TABLE "Bildirim" ADD COLUMN "gonderimDurum" BOOLEAN NOT NULL DEFAULT false;
