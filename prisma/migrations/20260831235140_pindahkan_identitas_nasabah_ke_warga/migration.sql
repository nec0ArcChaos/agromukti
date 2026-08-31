-- DropForeignKey
ALTER TABLE `nasabah` DROP FOREIGN KEY `Nasabah_wargaId_fkey`;

-- DropIndex
DROP INDEX `Nasabah_dusun_idx` ON `nasabah`;

-- DropIndex
DROP INDEX `Nasabah_nama_idx` ON `nasabah`;

-- AlterTable
ALTER TABLE `nasabah` DROP COLUMN `alamat`,
    DROP COLUMN `dusun`,
    DROP COLUMN `nama`,
    DROP COLUMN `noHp`,
    DROP COLUMN `rt`,
    DROP COLUMN `rw`,
    MODIFY `wargaId` VARCHAR(191) NOT NULL;

-- AddForeignKey
ALTER TABLE `Nasabah` ADD CONSTRAINT `Nasabah_wargaId_fkey` FOREIGN KEY (`wargaId`) REFERENCES `Warga`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- RedefineIndex
CREATE INDEX `Nasabah_wargaId_idx` ON `Nasabah`(`wargaId`);
-- Catatan: generator Prisma menambahkan baris
--   DROP INDEX `Nasabah_wargaId_fkey` ON `nasabah`;
-- di sini, dan baris itu sengaja dibuang. MariaDB memakai ulang indeks
-- `Nasabah_wargaId_idx` (dibuat migrasi sebelumnya lewat @@index) untuk
-- menopang foreign key ini, sehingga indeks bernama `Nasabah_wargaId_fkey`
-- tidak pernah dibuat dan perintah DROP-nya selalu gagal dengan error 1091.

