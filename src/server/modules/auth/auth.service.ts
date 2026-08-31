import { prisma } from "@/server/lib/db";
import { AppError } from "@/server/lib/errors";
import { buatSesi, cocokPassword, hapusSesi, hashPassword, peranValid, type Sesi } from "@/server/lib/auth";
import { catatAudit } from "@/server/lib/audit";
import type { InputLogin, InputBuatUser } from "./auth.schema";

export async function login(input: InputLogin, ip?: string): Promise<Sesi> {
  const user = await prisma.user.findUnique({ where: { username: input.username } });

  // Pesan yang sama untuk username tidak ada maupun password salah -
  // jangan beri tahu penyerang username mana saja yang valid.
  if (!user || !user.aktif) {
    throw new AppError("LOGIN_GAGAL", "Username atau kata sandi salah.", 401);
  }

  const cocok = await cocokPassword(input.password, user.passwordHash);
  if (!cocok) {
    throw new AppError("LOGIN_GAGAL", "Username atau kata sandi salah.", 401);
  }

  // Peran yang tidak dikenal ditolak di sini juga, bukan hanya saat sesi
  // diverifikasi - supaya akun rusak tidak pernah sempat membuat token.
  // Diperiksa SETELAH kata sandi cocok: kalau diperiksa lebih dulu, orang
  // yang belum tentu pemilik akun bisa membedakan "akun ada tapi perannya
  // rusak" dari "kata sandi salah".
  if (!peranValid(user.role)) {
    throw new AppError(
      "PERAN_TIDAK_VALID",
      "Peran akun Anda tidak dikenali sistem. Hubungi administrator.",
      403,
    );
  }

  const sesi: Sesi = {
    userId: user.id,
    username: user.username,
    nama: user.nama,
    role: user.role,
  };
  await buatSesi(sesi);
  await catatAudit({ userId: user.id, aksi: "LOGIN", tabel: "User", recordId: user.id, ip });
  return sesi;
}

export async function logout(userId?: string, ip?: string): Promise<void> {
  await hapusSesi();
  if (userId) {
    await catatAudit({ userId, aksi: "LOGOUT", tabel: "User", recordId: userId, ip });
  }
}

export async function daftarUser() {
  return prisma.user.findMany({
    select: { id: true, username: true, nama: true, role: true, aktif: true, createdAt: true },
    orderBy: { nama: "asc" },
  });
}

export async function buatUser(input: InputBuatUser, dibuatOleh: string) {
  const ada = await prisma.user.findUnique({ where: { username: input.username } });
  if (ada) {
    throw new AppError(
      "USERNAME_DIPAKAI",
      `Username "${input.username}" sudah digunakan.`,
      409,
      { username: "Sudah digunakan" },
    );
  }

  const user = await prisma.user.create({
    data: {
      username: input.username,
      nama: input.nama,
      role: input.role,
      passwordHash: await hashPassword(input.password),
    },
  });

  await catatAudit({
    userId: dibuatOleh,
    aksi: "CREATE",
    tabel: "User",
    recordId: user.id,
    dataBaru: { username: user.username, nama: user.nama, role: user.role },
  });

  return { id: user.id, username: user.username, nama: user.nama, role: user.role };
}

export async function nonaktifkanUser(id: string, olehUserId: string) {
  if (id === olehUserId) {
    throw new AppError("TIDAK_BISA_NONAKTIF_DIRI", "Anda tidak bisa menonaktifkan akun sendiri.", 400);
  }
  const user = await prisma.user.update({ where: { id }, data: { aktif: false } });
  await catatAudit({ userId: olehUserId, aksi: "UPDATE", tabel: "User", recordId: id, dataBaru: { aktif: false } });
  return user;
}
