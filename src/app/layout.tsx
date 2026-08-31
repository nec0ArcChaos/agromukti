import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Bank Sampah Organik Argamukti",
  description: "Sistem Informasi Bank Sampah Organik Desa Argamukti - uji coba back end",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id">
      <body className="min-h-screen bg-neutral-50 text-neutral-900 antialiased">{children}</body>
    </html>
  );
}
