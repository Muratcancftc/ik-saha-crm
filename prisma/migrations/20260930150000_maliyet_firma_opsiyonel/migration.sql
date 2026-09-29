-- DropForeignKey
ALTER TABLE "MaliyetTablosu" DROP CONSTRAINT "MaliyetTablosu_firmaId_fkey";

-- AlterTable
ALTER TABLE "MaliyetTablosu" ALTER COLUMN "firmaId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "MaliyetTablosu" ADD CONSTRAINT "MaliyetTablosu_firmaId_fkey" FOREIGN KEY ("firmaId") REFERENCES "MusteriFirma"("id") ON DELETE SET NULL ON UPDATE CASCADE;

