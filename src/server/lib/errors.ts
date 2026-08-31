/**
 * Galat aplikasi.
 *
 * Aturan pesan: `message` ditulis dalam bahasa Indonesia dan LANGSUNG
 * ditampilkan ke operator. Calon operator berliterasi digital terbatas —
 * "Validation failed" tidak menolong siapa pun. Sebutkan angka dan nama
 * yang bersangkutan bila memungkinkan.
 *
 *   Buruk : "Saldo tidak mencukupi"
 *   Baik  : "Saldo Ibu Siti Rp 12.000, penarikan yang diminta Rp 50.000."
 */
export class AppError extends Error {
  constructor(
    /** Kode stabil untuk front end, mis. SALDO_TIDAK_CUKUP. */
    readonly kode: string,
    message: string,
    readonly status: number = 400,
    /** Galat per field untuk ditempelkan ke form. */
    readonly fields?: Record<string, string>,
  ) {
    super(message);
    this.name = "AppError";
  }
}

export class ValidationError extends AppError {
  constructor(message: string, fields?: Record<string, string>) {
    super("VALIDASI_GAGAL", message, 422, fields);
    this.name = "ValidationError";
  }
}

export class NotFoundError extends AppError {
  constructor(entitas: string) {
    super("TIDAK_DITEMUKAN", `${entitas} tidak ditemukan.`, 404);
    this.name = "NotFoundError";
  }
}

export class AuthError extends AppError {
  constructor(message = "Sesi Anda sudah tidak berlaku. Silakan masuk kembali.") {
    super("BELUM_MASUK", message, 401);
    this.name = "AuthError";
  }
}

export class ForbiddenError extends AppError {
  constructor(message = "Akun Anda tidak berwenang melakukan tindakan ini.") {
    super("TIDAK_BERWENANG", message, 403);
    this.name = "ForbiddenError";
  }
}

export class ConflictError extends AppError {
  constructor(kode: string, message: string) {
    super(kode, message, 409);
    this.name = "ConflictError";
  }
}

/** Saldo tabungan nasabah tidak mencukupi untuk penarikan. */
export class SaldoTidakCukupError extends AppError {
  constructor(namaNasabah: string, saldo: string, diminta: string) {
    super(
      "SALDO_TIDAK_CUKUP",
      `Saldo ${namaNasabah} ${saldo}, penarikan yang diminta ${diminta}.`,
      409,
    );
    this.name = "SaldoTidakCukupError";
  }
}
