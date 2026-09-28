-- AlterEnum
ALTER TYPE "FaturaDurum" ADD VALUE 'kismi';

-- AlterTable
ALTER TABLE "Fatura" ADD COLUMN     "kesimTarihi" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "silindi" BOOLEAN NOT NULL DEFAULT false;
