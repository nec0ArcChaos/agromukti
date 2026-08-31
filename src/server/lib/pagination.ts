import { z } from "zod";
import type { MetaPaginasi } from "./response";

export const skemaPaginasi = z.object({
  page: z.coerce.number().int().min(1).default(1),
  perPage: z.coerce.number().int().min(1).max(100).default(20),
  /** Kata kunci pencarian bebas. */
  q: z.string().trim().optional(),
  sort: z.string().optional(),
  /** asc | desc */
  order: z.enum(["asc", "desc"]).default("desc"),
});

export type Paginasi = z.infer<typeof skemaPaginasi>;

/** Ubah query string menjadi objek biasa untuk diumpankan ke Zod. */
export function bacaQuery(url: string): Record<string, string> {
  return Object.fromEntries(new URL(url).searchParams.entries());
}

export function lewati(p: Paginasi): number {
  return (p.page - 1) * p.perPage;
}

export function metaDari(p: Paginasi, total: number): MetaPaginasi {
  return {
    page: p.page,
    perPage: p.perPage,
    total,
    totalPage: Math.max(1, Math.ceil(total / p.perPage)),
  };
}
