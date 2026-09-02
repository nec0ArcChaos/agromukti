import type { Metadata } from "next";

/**
 * Pintu petugas dipisahkan dari situs publik, termasuk di mata mesin
 * pencari: halaman ini tidak diindeks dan tidak muncul di hasil pencarian
 * bersama halaman layanan warga.
 *
 * Sekali lagi - ini soal pemisahan tampilan dan penampakan, BUKAN
 * pengamanan. Yang menjaga sistem tetap autentikasinya.
 */
export const metadata: Metadata = {
  title: "Area Petugas — AgroMukti",
  description: "Halaman masuk untuk perangkat desa dan pengurus AgroMukti.",
  robots: { index: false, follow: false },
};

export default function PetugasLayout({ children }: { children: React.ReactNode }) {
  return children;
}
