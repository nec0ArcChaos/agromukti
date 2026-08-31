"use client";

import { useRouter } from "next/navigation";
import { api } from "@/lib/api";

export default function NavKlien({ nama, role }: { nama: string; role: string }) {
  const router = useRouter();

  async function keluar() {
    await api.post("/api/auth/logout");
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="flex items-center gap-3 text-sm">
      <span className="text-neutral-600">
        {nama} <span className="pill bg-emerald-100 text-emerald-800">{role}</span>
      </span>
      <button onClick={keluar} className="btn-secondary">Keluar</button>
    </div>
  );
}
