import { z } from "zod";

export const skemaRentang = z.object({
  dari: z.coerce.date().optional(),
  sampai: z.coerce.date().optional(),
});

export const skemaLaporanSetoran = skemaRentang.extend({
  groupBy: z.enum(["kategori", "dusun", "nasabah"]).default("kategori"),
});
