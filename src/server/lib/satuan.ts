import { Prisma } from "@prisma/client";
import { toDecimal, type Berat } from "./money";

/**
 * Konversi satuan ke satuan dasar.
 *
 * Skema warisan membiarkan operator memilih satuan per baris (lahan bisa
 * m² atau hektare, panen bisa kg/kuintal/ton). Itu memudahkan input, tapi
 * berbahaya untuk laporan: menjumlahkan kolom `luas` apa adanya berarti
 * menjumlahkan 5000 m² dengan 2 hektare dan mendapat "5002". Semua
 * agregasi WAJIB lewat fungsi di berkas ini.
 */

export const SATUAN_LUAS = ["M2", "HA"] as const;
export type SatuanLuas = (typeof SATUAN_LUAS)[number];

export const SATUAN_BERAT = ["KG", "KUINTAL", "TON"] as const;
export type SatuanBerat = (typeof SATUAN_BERAT)[number];

/** Semua luas dinormalkan ke hektare - satuan yang dipakai dosis pupuk. */
export function keHektare(luas: Berat, satuan: string): Prisma.Decimal {
  const n = toDecimal(luas);
  return satuan === "HA" ? n : n.div(10000);
}

/** Semua berat panen dinormalkan ke kilogram. */
export function keKilogram(jumlah: Berat, satuan: string): Prisma.Decimal {
  const n = toDecimal(jumlah);
  if (satuan === "TON") return n.mul(1000);
  if (satuan === "KUINTAL") return n.mul(100);
  return n;
}

/** "1,25 ha" / "5.000 m²" - untuk tampilan, memakai satuan aslinya. */
export function formatLuas(luas: Berat, satuan: string): string {
  const n = toDecimal(luas).toNumber();
  const angka = new Intl.NumberFormat("id-ID", { maximumFractionDigits: 2 }).format(n);
  return satuan === "HA" ? `${angka} ha` : `${angka} m²`;
}

export function formatBeratPanen(jumlah: Berat, satuan: string): string {
  const n = toDecimal(jumlah).toNumber();
  const angka = new Intl.NumberFormat("id-ID", { maximumFractionDigits: 2 }).format(n);
  const label = satuan === "TON" ? "ton" : satuan === "KUINTAL" ? "kuintal" : "kg";
  return `${angka} ${label}`;
}
