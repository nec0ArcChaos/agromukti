import { z } from "zod";
import { route } from "@/server/lib/handler";
import { bacaQuery } from "@/server/lib/pagination";
import { sukses } from "@/server/lib/response";
import { wajibPeran } from "@/server/lib/auth";
import { prisma } from "@/server/lib/db";

const skema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  perPage: z.coerce.number().int().min(1).max(100).default(50),
  tabel: z.string().optional(),
});

export const GET = route(async (req) => {
  await wajibPeran("ADMIN");
  const f = skema.parse(bacaQuery(req.url));
  const where = f.tabel ? { tabel: f.tabel } : {};

  const [rows, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      include: { user: { select: { nama: true, username: true } } },
      orderBy: { waktu: "desc" },
      skip: (f.page - 1) * f.perPage,
      take: f.perPage,
    }),
    prisma.auditLog.count({ where }),
  ]);

  return sukses(rows, { page: f.page, perPage: f.perPage, total, totalPage: Math.max(1, Math.ceil(total / f.perPage)) });
});
