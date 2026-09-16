-- CreateEnum
CREATE TYPE "OdemePeriyot" AS ENUM ('GUN_ARALIGI', 'HAFTALIK', 'AYLIK', 'SERBEST');

-- AlterTable
ALTER TABLE "Isci" ADD COLUMN     "gunAraligi" INTEGER,
ADD COLUMN     "odemePeriyot" "OdemePeriyot";

-- AlterTable
ALTER TABLE "MusteriFirma" ADD COLUMN     "gunAraligi" INTEGER NOT NULL DEFAULT 30,
ADD COLUMN     "odemePeriyot" "OdemePeriyot" NOT NULL DEFAULT 'AYLIK';
