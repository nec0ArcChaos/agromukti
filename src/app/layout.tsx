import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";

// Typeface yang sama dengan aplikasi PHP AgroMukti, dimuat lewat next/font
// supaya tidak ada permintaan ke Google Fonts saat sistem dijalankan di
// jaringan lokal balai desa tanpa internet.
const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
  variable: "--font-jakarta",
  display: "swap",
});

export const metadata: Metadata = {
  title: "AgroMukti — Sistem Informasi Terpadu Desa Argamukti",
  description:
    "Bank sampah, pengelolaan sampah organik dan produksi pupuk, serta pertanian dan distribusi pupuk Desa Argamukti.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id" className={jakarta.variable}>
      <body className="min-h-screen antialiased" style={{ fontFamily: "var(--font-jakarta), system-ui, sans-serif" }}>
        {children}
      </body>
    </html>
  );
}
