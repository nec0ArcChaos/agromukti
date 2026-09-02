"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Leaf, Recycle, Tractor } from "lucide-react";
import { api, ApiError } from "@/lib/api";

const PILAR = [
  { ikon: Recycle, label: "Bank Sampah", ket: "Setoran anorganik & tabungan warga" },
  { ikon: Leaf, label: "Sampah Organik", ket: "Produksi pupuk kompos & UMKM" },
  { ikon: Tractor, label: "Pertanian", ket: "Petani, panen & distribusi pupuk" },
];

export default function HalamanPetugas() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [galat, setGalat] = useState<string | null>(null);
  const [memuat, setMemuat] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setGalat(null);
    setMemuat(true);
    try {
      await api.post("/api/auth/login", { username, password });
      router.push("/dashboard");
      router.refresh();
    } catch (err) {
      setGalat(err instanceof ApiError ? err.message : "Gagal masuk. Coba lagi.");
    } finally {
      setMemuat(false);
    }
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      {/* Panel kiri: identitas tiga pilar. Disembunyikan di layar kecil
          supaya formulir tetap jadi hal pertama yang terlihat. */}
      <div className="hidden flex-col justify-between bg-sidebar p-10 lg:flex">
        <div>
          <p className="text-2xl font-extrabold tracking-tight text-white">
            Agro<span className="text-sidebar-active-foreground">Mukti</span>
          </p>
          <p className="mt-1 text-sm text-sidebar-foreground">
            Sistem Informasi Terpadu Desa Argamukti
          </p>
        </div>

        <div className="space-y-5">
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-600">
            Tiga pilar dalam satu sistem
          </p>
          {PILAR.map((p) => {
            const Ikon = p.ikon;
            return (
              <div key={p.label} className="flex items-start gap-4">
                <div className="grid size-10 shrink-0 place-items-center rounded-lg bg-[var(--sidebar-active)] text-sidebar-active-foreground">
                  <Ikon className="size-5" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">{p.label}</p>
                  <p className="text-xs text-sidebar-foreground">{p.ket}</p>
                </div>
              </div>
            );
          })}
        </div>

        <p className="text-[11px] leading-relaxed text-slate-600">
          KKM Kelompok 45 · Universitas Muhammadiyah Cirebon 2026
          <br />
          Desa Argamukti, Kecamatan Argapura, Kabupaten Majalengka
        </p>
      </div>

      {/* Panel kanan: formulir masuk. */}
      <div className="flex items-center justify-center px-4 py-10">
        <div className="w-full max-w-sm">
          <div className="mb-6 lg:hidden">
            <p className="text-2xl font-extrabold tracking-tight text-foreground">
              Agro<span className="text-primary">Mukti</span>
            </p>
            <p className="text-sm text-muted-foreground">Sistem Informasi Terpadu Desa Argamukti</p>
          </div>

          <h1 className="text-xl font-bold text-foreground">Area Petugas Desa</h1>
          <p className="mb-6 text-sm text-muted-foreground">
            Halaman ini khusus perangkat desa dan pengurus. Gunakan akun yang diberikan pengelola sistem.
          </p>

          <form onSubmit={submit} className="card space-y-4">
            <div>
              <label className="label" htmlFor="username">Username</label>
              <input
                id="username"
                className="field"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoFocus
                required
              />
            </div>
            <div>
              <label className="label" htmlFor="password">Kata sandi</label>
              <input
                id="password"
                type="password"
                className="field"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            {galat && (
              <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{galat}</p>
            )}

            <button type="submit" className="btn w-full" disabled={memuat}>
              {memuat ? "Memproses..." : "Masuk"}
            </button>
          </form>

          {/*
            Kredensial bawaan sengaja TIDAK ditampilkan di sini. Sebelumnya
            halaman ini memampangkan "admin / admin123", yang meniadakan
            gunanya punya halaman masuk sama sekali. Akun awal disampaikan
            langsung ke pengelola saat serah terima.
          */}
          <p className="mt-4 text-center text-xs text-muted-foreground">
            Lupa kata sandi atau belum punya akun? Hubungi pengelola sistem desa.
          </p>
        </div>
      </div>
    </div>
  );
}
