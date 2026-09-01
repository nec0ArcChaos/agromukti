-- AlterTable
ALTER TABLE `distribusipupuk` ADD COLUMN `metodeBayar` VARCHAR(191) NOT NULL DEFAULT 'SUBSIDI',
    ADD COLUMN `nasabahId` VARCHAR(191) NULL,
    ADD COLUMN `totalNilai` INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE `distribusipupukdetail` ADD COLUMN `hargaSatuan` INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN `subtotal` INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE `pengaturan` ADD COLUMN `hasilPocLiterPerKg` DECIMAL(6, 4) NOT NULL DEFAULT 0.05,
    ADD COLUMN `rendemenKomposPersen` DECIMAL(5, 2) NOT NULL DEFAULT 30;

-- AlterTable
ALTER TABLE `permintaanpupukdetail` ADD COLUMN `hargaSatuan` INTEGER NULL,
    ADD COLUMN `subtotal` INTEGER NULL;

-- AddForeignKey
ALTER TABLE `DistribusiPupuk` ADD CONSTRAINT `DistribusiPupuk_nasabahId_fkey` FOREIGN KEY (`nasabahId`) REFERENCES `Nasabah`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
