-- CreateEnum
CREATE TYPE "Bolge" AS ENUM ('kocaeli', 'balikesir');

-- AlterTable
ALTER TABLE "Isci" ADD COLUMN     "bolge" "Bolge" NOT NULL DEFAULT 'kocaeli';

-- AlterTable
ALTER TABLE "MusteriFirma" ADD COLUMN     "bolge" "Bolge" NOT NULL DEFAULT 'kocaeli';

-- AlterTable
ALTER TABLE "Personel" ADD COLUMN     "bolge" "Bolge" NOT NULL DEFAULT 'kocaeli';
