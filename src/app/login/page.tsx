"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api, ApiError } from "@/lib/api";

export default function HalamanLogin() {
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
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <p className="text-sm font-medium text-emerald-700">Bank Sampah Organik</p>
          <h1 className="text-xl font-semibold text-neutral-900">Desa Argamukti</h1>
        </div>

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

          {galat && <p className="text-sm text-red-600">{galat}</p>}

          <button type="submit" className="btn w-full" disabled={memuat}>
            {memuat ? "Memproses..." : "Masuk"}
          </button>
        </form>

        <p className="mt-4 text-center text-xs text-neutral-400">
          Akun awal: admin / admin123 (dari .env, ubah setelah login pertama)
        </p>
      </div>
    </div>
  );
}
