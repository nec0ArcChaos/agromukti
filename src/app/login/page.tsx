import { redirect } from "next/navigation";

/**
 * Pintu petugas pindah ke /petugas supaya terasa terpisah dari situs
 * publik. Alamat lama dipertahankan sebagai pengalihan agar penanda buku
 * dan pintasan yang sudah dipakai pengurus tidak mendadak mati.
 */
export default function LoginLama() {
  redirect("/petugas");
}
