import { Prisma } from "@prisma/client";

export type Berat = Prisma.Decimal | number | string;

/** Ubah berbagai bentuk berat menjadi Decimal, agar aritmatika tidak lewat float. */
export function toDecimal(nilai: Berat): Prisma.Decimal {
  return nilai instanceof Prisma.Decimal ? nilai : new Prisma.Decimal(nilai);
}

/**
 * Subtotal satu baris: jumlah x harga satuan, dibulatkan ke rupiah utuh.
 *
 * Nominal uang di sistem ini SELALU integer rupiah - tidak ada sen dalam
 * praktik desa. Perkalian jumlah (2 desimal) dengan harga satuan karena itu
 * wajib dibulatkan, dan pembulatannya dilakukan di satu tempat ini saja
 * supaya total dokumen tidak pernah berselisih dengan jumlah barisnya.
 *
 * Pembulatan setengah ke atas: 2,35 kg x Rp 1.500 = Rp 3.525.
 */
export function hitungSubtotal(jumlah: Berat, hargaSatuan: number): number {
  return toDecimal(jumlah)
    .mul(hargaSatuan)
    .toDecimalPlaces(0, Prisma.Decimal.ROUND_HALF_UP)
    .toNumber();
}

/** Jumlahkan berat sederet baris tanpa kehilangan presisi. */
export function totalBerat(list: Berat[]): Prisma.Decimal {
  return list.reduce<Prisma.Decimal>(
    (acc, b) => acc.add(toDecimal(b)),
    new Prisma.Decimal(0),
  );
}

/** "Rp 12.500" — untuk pesan galat dan dokumen cetak. */
export function formatRupiah(nilai: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(nilai);
}

/**
 * Membagi satu jumlah rupiah bulat ke beberapa penerima secara proporsional
 * menurut bobot (mis. berat kg), dengan jaminan jumlah seluruh hasil bagi
 * SELALU TEPAT SAMA dengan `totalRupiah` - tidak pernah meleset karena
 * pembulatan, sekecil apa pun.
 *
 * Metode: tiap bagian dibulatkan ke bawah dahulu, sisa rupiah dari
 * pembulatan (selalu bilangan bulat non-negatif, kurang dari jumlah
 * penerima) dibagikan satu-satu ke penerima dengan sisa desimal terbesar
 * ("largest remainder method"). Dipakai saat pengepul membayar satu total
 * untuk borongan dari banyak nasabah sekaligus - jumlah yang dikreditkan
 * ke seluruh nasabah harus persis sama dengan yang diterima dari pengepul.
 */
export function bagiProporsional(totalRupiah: number, bobot: Berat[]): number[] {
  const bobotDecimal = bobot.map(toDecimal);
  const totalBobot = totalBerat(bobotDecimal);
  if (totalBobot.lessThanOrEqualTo(0)) {
    throw new Error("Total bobot harus lebih dari 0 untuk dapat dibagi proporsional.");
  }

  const eksak = bobotDecimal.map((b) => new Prisma.Decimal(totalRupiah).mul(b).div(totalBobot));
  const bagianBawah = eksak.map((e) => e.floor().toNumber());
  const jumlahBawah = bagianBawah.reduce((acc, n) => acc + n, 0);
  const sisa = totalRupiah - jumlahBawah;

  const urutanSisa = eksak
    .map((e, i) => ({ i, sisaDesimal: e.sub(bagianBawah[i]) }))
    .sort((a, b) => b.sisaDesimal.comparedTo(a.sisaDesimal));

  const hasil = [...bagianBawah];
  for (let k = 0; k < sisa; k++) {
    hasil[urutanSisa[k].i] += 1;
  }
  return hasil;
}

/** "12,50 kg" */
export function formatKg(nilai: Berat): string {
  const n = toDecimal(nilai).toNumber();
  return `${new Intl.NumberFormat("id-ID", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n)} kg`;
}
