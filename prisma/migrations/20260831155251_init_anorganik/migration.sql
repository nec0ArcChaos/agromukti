-- CreateTable
CREATE TABLE `User` (
    `id` VARCHAR(191) NOT NULL,
    `username` VARCHAR(191) NOT NULL,
    `passwordHash` VARCHAR(191) NOT NULL,
    `nama` VARCHAR(191) NOT NULL,
    `role` VARCHAR(191) NOT NULL DEFAULT 'OPERATOR',
    `aktif` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `User_username_key`(`username`),
    INDEX `User_aktif_idx`(`aktif`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Nasabah` (
    `id` VARCHAR(191) NOT NULL,
    `kode` VARCHAR(191) NOT NULL,
    `nama` VARCHAR(191) NOT NULL,
    `noHp` VARCHAR(191) NULL,
    `alamat` VARCHAR(191) NULL,
    `dusun` VARCHAR(191) NULL,
    `rt` VARCHAR(191) NULL,
    `rw` VARCHAR(191) NULL,
    `tanggalDaftar` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `status` VARCHAR(191) NOT NULL DEFAULT 'AKTIF',
    `saldo` INTEGER NOT NULL DEFAULT 0,
    `catatan` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Nasabah_kode_key`(`kode`),
    INDEX `Nasabah_status_idx`(`status`),
    INDEX `Nasabah_dusun_idx`(`dusun`),
    INDEX `Nasabah_nama_idx`(`nama`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `KategoriSampah` (
    `id` VARCHAR(191) NOT NULL,
    `kode` VARCHAR(191) NOT NULL,
    `nama` VARCHAR(191) NOT NULL,
    `aktif` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `KategoriSampah_kode_key`(`kode`),
    INDEX `KategoriSampah_aktif_idx`(`aktif`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Pengepul` (
    `id` VARCHAR(191) NOT NULL,
    `kode` VARCHAR(191) NOT NULL,
    `nama` VARCHAR(191) NOT NULL,
    `noHp` VARCHAR(191) NULL,
    `alamat` VARCHAR(191) NULL,
    `aktif` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Pengepul_kode_key`(`kode`),
    INDEX `Pengepul_aktif_idx`(`aktif`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Pengaturan` (
    `id` VARCHAR(191) NOT NULL DEFAULT 'SINGLETON',
    `namaBankSampah` VARCHAR(191) NOT NULL DEFAULT 'Bank Sampah Desa Argamukti',
    `alamat` TEXT NULL,
    `desa` VARCHAR(191) NOT NULL DEFAULT 'Argamukti',
    `kecamatan` VARCHAR(191) NOT NULL DEFAULT 'Argapura',
    `kabupaten` VARCHAR(191) NOT NULL DEFAULT 'Majalengka',
    `kepalaDesa` VARCHAR(191) NULL,
    `ketuaBankSampah` VARCHAR(191) NULL,
    `minimalPenarikan` INTEGER NOT NULL DEFAULT 10000,
    `saldoMinimum` INTEGER NOT NULL DEFAULT 0,
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Setoran` (
    `id` VARCHAR(191) NOT NULL,
    `nomor` VARCHAR(191) NOT NULL,
    `nasabahId` VARCHAR(191) NOT NULL,
    `kategoriSampahId` VARCHAR(191) NULL,
    `tanggal` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `beratKg` DECIMAL(10, 2) NOT NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'MENUNGGU',
    `nilaiAlokasi` INTEGER NULL,
    `alasanBatal` TEXT NULL,
    `catatan` TEXT NULL,
    `operatorId` VARCHAR(191) NOT NULL,
    `pengambilanId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Setoran_nomor_key`(`nomor`),
    INDEX `Setoran_nasabahId_tanggal_idx`(`nasabahId`, `tanggal`),
    INDEX `Setoran_status_idx`(`status`),
    INDEX `Setoran_tanggal_idx`(`tanggal`),
    INDEX `Setoran_pengambilanId_idx`(`pengambilanId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `PengambilanPengepul` (
    `id` VARCHAR(191) NOT NULL,
    `nomor` VARCHAR(191) NOT NULL,
    `pengepulId` VARCHAR(191) NOT NULL,
    `tanggal` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `totalBeratKg` DECIMAL(10, 2) NOT NULL,
    `totalNilai` INTEGER NOT NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'POSTED',
    `alasanBatal` TEXT NULL,
    `catatan` TEXT NULL,
    `operatorId` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `PengambilanPengepul_nomor_key`(`nomor`),
    INDEX `PengambilanPengepul_pengepulId_tanggal_idx`(`pengepulId`, `tanggal`),
    INDEX `PengambilanPengepul_tanggal_idx`(`tanggal`),
    INDEX `PengambilanPengepul_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `MutasiTabungan` (
    `id` VARCHAR(191) NOT NULL,
    `nasabahId` VARCHAR(191) NOT NULL,
    `tanggal` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `jenis` VARCHAR(191) NOT NULL,
    `debit` INTEGER NOT NULL DEFAULT 0,
    `kredit` INTEGER NOT NULL DEFAULT 0,
    `saldoSesudah` INTEGER NOT NULL,
    `refTipe` VARCHAR(191) NULL,
    `refId` VARCHAR(191) NULL,
    `keterangan` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `MutasiTabungan_nasabahId_tanggal_idx`(`nasabahId`, `tanggal`),
    INDEX `MutasiTabungan_refTipe_refId_idx`(`refTipe`, `refId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Penarikan` (
    `id` VARCHAR(191) NOT NULL,
    `nomor` VARCHAR(191) NOT NULL,
    `nasabahId` VARCHAR(191) NOT NULL,
    `tanggal` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `jumlah` INTEGER NOT NULL,
    `metode` VARCHAR(191) NOT NULL DEFAULT 'TUNAI',
    `status` VARCHAR(191) NOT NULL DEFAULT 'PENDING',
    `alasanTolak` TEXT NULL,
    `tanggalCair` DATETIME(3) NULL,
    `diajukanOleh` VARCHAR(191) NOT NULL,
    `disetujuiOleh` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Penarikan_nomor_key`(`nomor`),
    INDEX `Penarikan_nasabahId_tanggal_idx`(`nasabahId`, `tanggal`),
    INDEX `Penarikan_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `MutasiKas` (
    `id` VARCHAR(191) NOT NULL,
    `tanggal` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `arah` VARCHAR(191) NOT NULL,
    `kategori` VARCHAR(191) NOT NULL,
    `jumlah` INTEGER NOT NULL,
    `saldoSesudah` INTEGER NOT NULL,
    `refTipe` VARCHAR(191) NULL,
    `refId` VARCHAR(191) NULL,
    `keterangan` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `MutasiKas_tanggal_idx`(`tanggal`),
    INDEX `MutasiKas_kategori_idx`(`kategori`),
    INDEX `MutasiKas_refTipe_refId_idx`(`refTipe`, `refId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `AuditLog` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NULL,
    `aksi` VARCHAR(191) NOT NULL,
    `tabel` VARCHAR(191) NOT NULL,
    `recordId` VARCHAR(191) NULL,
    `dataLama` TEXT NULL,
    `dataBaru` TEXT NULL,
    `ip` VARCHAR(191) NULL,
    `waktu` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `AuditLog_tabel_recordId_idx`(`tabel`, `recordId`),
    INDEX `AuditLog_waktu_idx`(`waktu`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Sequence` (
    `tipe` VARCHAR(191) NOT NULL,
    `periode` VARCHAR(191) NOT NULL,
    `nomorTerakhir` INTEGER NOT NULL DEFAULT 0,

    PRIMARY KEY (`tipe`, `periode`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Setoran` ADD CONSTRAINT `Setoran_nasabahId_fkey` FOREIGN KEY (`nasabahId`) REFERENCES `Nasabah`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Setoran` ADD CONSTRAINT `Setoran_kategoriSampahId_fkey` FOREIGN KEY (`kategoriSampahId`) REFERENCES `KategoriSampah`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Setoran` ADD CONSTRAINT `Setoran_operatorId_fkey` FOREIGN KEY (`operatorId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Setoran` ADD CONSTRAINT `Setoran_pengambilanId_fkey` FOREIGN KEY (`pengambilanId`) REFERENCES `PengambilanPengepul`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PengambilanPengepul` ADD CONSTRAINT `PengambilanPengepul_pengepulId_fkey` FOREIGN KEY (`pengepulId`) REFERENCES `Pengepul`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PengambilanPengepul` ADD CONSTRAINT `PengambilanPengepul_operatorId_fkey` FOREIGN KEY (`operatorId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `MutasiTabungan` ADD CONSTRAINT `MutasiTabungan_nasabahId_fkey` FOREIGN KEY (`nasabahId`) REFERENCES `Nasabah`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Penarikan` ADD CONSTRAINT `Penarikan_nasabahId_fkey` FOREIGN KEY (`nasabahId`) REFERENCES `Nasabah`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Penarikan` ADD CONSTRAINT `Penarikan_diajukanOleh_fkey` FOREIGN KEY (`diajukanOleh`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Penarikan` ADD CONSTRAINT `Penarikan_disetujuiOleh_fkey` FOREIGN KEY (`disetujuiOleh`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AuditLog` ADD CONSTRAINT `AuditLog_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
