-- AlterTable
ALTER TABLE `nasabah` ADD COLUMN `wargaId` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `user` MODIFY `role` VARCHAR(191) NOT NULL DEFAULT 'OPERATOR_SAMPAH';

-- CreateTable
CREATE TABLE `Warga` (
    `id` VARCHAR(191) NOT NULL,
    `nik` VARCHAR(191) NULL,
    `nama` VARCHAR(191) NOT NULL,
    `alamat` TEXT NULL,
    `dusun` VARCHAR(191) NULL,
    `rt` VARCHAR(191) NULL,
    `rw` VARCHAR(191) NULL,
    `noHp` VARCHAR(191) NULL,
    `aktif` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Warga_nik_key`(`nik`),
    INDEX `Warga_nama_idx`(`nama`),
    INDEX `Warga_dusun_idx`(`dusun`),
    INDEX `Warga_aktif_idx`(`aktif`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Petani` (
    `id` VARCHAR(191) NOT NULL,
    `wargaId` VARCHAR(191) NOT NULL,
    `kode` VARCHAR(191) NOT NULL,
    `kelompokTani` VARCHAR(191) NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'AKTIF',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Petani_kode_key`(`kode`),
    INDEX `Petani_wargaId_idx`(`wargaId`),
    INDEX `Petani_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Komoditas` (
    `id` VARCHAR(191) NOT NULL,
    `kode` VARCHAR(191) NOT NULL,
    `nama` VARCHAR(191) NOT NULL,
    `deskripsi` TEXT NULL,
    `dosisPupukPerHa` DECIMAL(10, 2) NOT NULL DEFAULT 5,
    `aktif` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Komoditas_kode_key`(`kode`),
    INDEX `Komoditas_aktif_idx`(`aktif`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Lahan` (
    `id` VARCHAR(191) NOT NULL,
    `petaniId` VARCHAR(191) NOT NULL,
    `komoditasId` VARCHAR(191) NOT NULL,
    `luas` DECIMAL(12, 2) NOT NULL,
    `satuan` VARCHAR(191) NOT NULL DEFAULT 'M2',
    `lokasi` TEXT NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'AKTIF',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `Lahan_petaniId_idx`(`petaniId`),
    INDEX `Lahan_komoditasId_idx`(`komoditasId`),
    INDEX `Lahan_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Panen` (
    `id` VARCHAR(191) NOT NULL,
    `petaniId` VARCHAR(191) NOT NULL,
    `komoditasId` VARCHAR(191) NOT NULL,
    `jumlahPanen` DECIMAL(12, 2) NOT NULL,
    `satuan` VARCHAR(191) NOT NULL DEFAULT 'KG',
    `tanggalPanen` DATETIME(3) NOT NULL,
    `keterangan` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `Panen_petaniId_tanggalPanen_idx`(`petaniId`, `tanggalPanen`),
    INDEX `Panen_komoditasId_idx`(`komoditasId`),
    INDEX `Panen_tanggalPanen_idx`(`tanggalPanen`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ProdukPupuk` (
    `id` VARCHAR(191) NOT NULL,
    `kode` VARCHAR(191) NOT NULL,
    `nama` VARCHAR(191) NOT NULL,
    `jenis` VARCHAR(191) NOT NULL DEFAULT 'KOMPOS_PADAT',
    `deskripsi` TEXT NULL,
    `harga` INTEGER NOT NULL DEFAULT 0,
    `satuan` VARCHAR(191) NOT NULL DEFAULT 'KG',
    `stok` DECIMAL(12, 2) NOT NULL DEFAULT 0,
    `aktif` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `ProdukPupuk_kode_key`(`kode`),
    INDEX `ProdukPupuk_aktif_idx`(`aktif`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `MutasiStokPupuk` (
    `id` VARCHAR(191) NOT NULL,
    `produkPupukId` VARCHAR(191) NOT NULL,
    `tanggal` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `arah` VARCHAR(191) NOT NULL,
    `jumlah` DECIMAL(12, 2) NOT NULL,
    `refTipe` VARCHAR(191) NULL,
    `refId` VARCHAR(191) NULL,
    `sumber` VARCHAR(191) NULL,
    `keterangan` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `MutasiStokPupuk_produkPupukId_tanggal_idx`(`produkPupukId`, `tanggal`),
    INDEX `MutasiStokPupuk_refTipe_refId_idx`(`refTipe`, `refId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `PermintaanPupuk` (
    `id` VARCHAR(191) NOT NULL,
    `nomor` VARCHAR(191) NOT NULL,
    `petaniId` VARCHAR(191) NOT NULL,
    `tanggal` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `status` VARCHAR(191) NOT NULL DEFAULT 'DIAJUKAN',
    `alasanTolak` TEXT NULL,
    `keterangan` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `PermintaanPupuk_nomor_key`(`nomor`),
    INDEX `PermintaanPupuk_petaniId_tanggal_idx`(`petaniId`, `tanggal`),
    INDEX `PermintaanPupuk_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `PermintaanPupukDetail` (
    `id` VARCHAR(191) NOT NULL,
    `permintaanId` VARCHAR(191) NOT NULL,
    `produkPupukId` VARCHAR(191) NOT NULL,
    `jumlah` DECIMAL(12, 2) NOT NULL,
    `satuan` VARCHAR(191) NOT NULL DEFAULT 'KG',

    INDEX `PermintaanPupukDetail_permintaanId_idx`(`permintaanId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `DistribusiPupuk` (
    `id` VARCHAR(191) NOT NULL,
    `nomor` VARCHAR(191) NOT NULL,
    `permintaanId` VARCHAR(191) NOT NULL,
    `tanggalDistribusi` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `status` VARCHAR(191) NOT NULL DEFAULT 'DIPROSES',
    `keterangan` TEXT NULL,
    `operatorId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `DistribusiPupuk_nomor_key`(`nomor`),
    INDEX `DistribusiPupuk_permintaanId_idx`(`permintaanId`),
    INDEX `DistribusiPupuk_status_idx`(`status`),
    INDEX `DistribusiPupuk_tanggalDistribusi_idx`(`tanggalDistribusi`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `DistribusiPupukDetail` (
    `id` VARCHAR(191) NOT NULL,
    `distribusiId` VARCHAR(191) NOT NULL,
    `produkPupukId` VARCHAR(191) NOT NULL,
    `jumlah` DECIMAL(12, 2) NOT NULL,
    `satuan` VARCHAR(191) NOT NULL DEFAULT 'KG',

    INDEX `DistribusiPupukDetail_distribusiId_idx`(`distribusiId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Artikel` (
    `id` VARCHAR(191) NOT NULL,
    `judul` VARCHAR(191) NOT NULL,
    `konten` TEXT NOT NULL,
    `gambar` VARCHAR(191) NULL,
    `kategori` VARCHAR(191) NULL,
    `tanggalPublikasi` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `terbit` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `Artikel_terbit_tanggalPublikasi_idx`(`terbit`, `tanggalPublikasi`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `MutasiSampahOrganik` (
    `id` VARCHAR(191) NOT NULL,
    `tanggal` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `arah` VARCHAR(191) NOT NULL,
    `beratKg` DECIMAL(12, 2) NOT NULL,
    `wargaId` VARCHAR(191) NULL,
    `refTipe` VARCHAR(191) NULL,
    `refId` VARCHAR(191) NULL,
    `sumber` VARCHAR(191) NULL,
    `keterangan` TEXT NULL,
    `operatorId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `MutasiSampahOrganik_tanggal_idx`(`tanggal`),
    INDEX `MutasiSampahOrganik_arah_idx`(`arah`),
    INDEX `MutasiSampahOrganik_refTipe_refId_idx`(`refTipe`, `refId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ProduksiPupuk` (
    `id` VARCHAR(191) NOT NULL,
    `kode` VARCHAR(191) NOT NULL,
    `tanggalMulai` DATETIME(3) NOT NULL,
    `estimasiSelesai` DATETIME(3) NULL,
    `tanggalSelesai` DATETIME(3) NULL,
    `beratSampahOrganik` DECIMAL(12, 2) NOT NULL,
    `estimasiPupukCair` DECIMAL(12, 2) NOT NULL DEFAULT 0,
    `estimasiPupukKasar` DECIMAL(12, 2) NOT NULL DEFAULT 0,
    `pupukCairAktual` DECIMAL(12, 2) NULL,
    `pupukKasarAktual` DECIMAL(12, 2) NULL,
    `rendemenPersen` DECIMAL(5, 2) NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'PROSES',
    `keterangan` TEXT NULL,
    `operatorId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `ProduksiPupuk_kode_key`(`kode`),
    INDEX `ProduksiPupuk_status_idx`(`status`),
    INDEX `ProduksiPupuk_tanggalMulai_idx`(`tanggalMulai`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ProdukUmkm` (
    `id` VARCHAR(191) NOT NULL,
    `kode` VARCHAR(191) NOT NULL,
    `nama` VARCHAR(191) NOT NULL,
    `kategori` VARCHAR(191) NULL,
    `deskripsi` TEXT NULL,
    `harga` INTEGER NOT NULL DEFAULT 0,
    `stok` DECIMAL(12, 2) NOT NULL DEFAULT 0,
    `satuan` VARCHAR(191) NOT NULL DEFAULT 'PCS',
    `foto` VARCHAR(191) NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'TERSEDIA',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `ProdukUmkm_kode_key`(`kode`),
    INDEX `ProdukUmkm_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Nasabah` ADD CONSTRAINT `Nasabah_wargaId_fkey` FOREIGN KEY (`wargaId`) REFERENCES `Warga`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Petani` ADD CONSTRAINT `Petani_wargaId_fkey` FOREIGN KEY (`wargaId`) REFERENCES `Warga`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Lahan` ADD CONSTRAINT `Lahan_petaniId_fkey` FOREIGN KEY (`petaniId`) REFERENCES `Petani`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Lahan` ADD CONSTRAINT `Lahan_komoditasId_fkey` FOREIGN KEY (`komoditasId`) REFERENCES `Komoditas`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Panen` ADD CONSTRAINT `Panen_petaniId_fkey` FOREIGN KEY (`petaniId`) REFERENCES `Petani`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Panen` ADD CONSTRAINT `Panen_komoditasId_fkey` FOREIGN KEY (`komoditasId`) REFERENCES `Komoditas`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `MutasiStokPupuk` ADD CONSTRAINT `MutasiStokPupuk_produkPupukId_fkey` FOREIGN KEY (`produkPupukId`) REFERENCES `ProdukPupuk`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PermintaanPupuk` ADD CONSTRAINT `PermintaanPupuk_petaniId_fkey` FOREIGN KEY (`petaniId`) REFERENCES `Petani`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PermintaanPupukDetail` ADD CONSTRAINT `PermintaanPupukDetail_permintaanId_fkey` FOREIGN KEY (`permintaanId`) REFERENCES `PermintaanPupuk`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PermintaanPupukDetail` ADD CONSTRAINT `PermintaanPupukDetail_produkPupukId_fkey` FOREIGN KEY (`produkPupukId`) REFERENCES `ProdukPupuk`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `DistribusiPupuk` ADD CONSTRAINT `DistribusiPupuk_permintaanId_fkey` FOREIGN KEY (`permintaanId`) REFERENCES `PermintaanPupuk`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `DistribusiPupukDetail` ADD CONSTRAINT `DistribusiPupukDetail_distribusiId_fkey` FOREIGN KEY (`distribusiId`) REFERENCES `DistribusiPupuk`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `DistribusiPupukDetail` ADD CONSTRAINT `DistribusiPupukDetail_produkPupukId_fkey` FOREIGN KEY (`produkPupukId`) REFERENCES `ProdukPupuk`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
