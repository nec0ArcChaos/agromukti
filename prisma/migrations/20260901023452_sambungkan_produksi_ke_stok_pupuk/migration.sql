-- AlterTable
ALTER TABLE `produksipupuk` ADD COLUMN `produkCairId` VARCHAR(191) NULL,
    ADD COLUMN `produkPadatId` VARCHAR(191) NULL;

-- AddForeignKey
ALTER TABLE `ProduksiPupuk` ADD CONSTRAINT `ProduksiPupuk_produkPadatId_fkey` FOREIGN KEY (`produkPadatId`) REFERENCES `ProdukPupuk`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ProduksiPupuk` ADD CONSTRAINT `ProduksiPupuk_produkCairId_fkey` FOREIGN KEY (`produkCairId`) REFERENCES `ProdukPupuk`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
