import { adminGuard } from "@/server/auth";
import { approveFile } from "@/server/library";
import { readStore } from "@/server/store";
import { apiError, gcodePath, readJson, str } from "@/server/http";

export const dynamic = "force-dynamic";

export async function GET(): Promise<Response> {
  const denied = await adminGuard();
  if (denied) return denied;
  const { approvedPrints } = await readStore();
  return Response.json({ approved: approvedPrints });
}

export async function POST(request: Request): Promise<Response> {
  const denied = await adminGuard();
  if (denied) return denied;
  try {
    const body = await readJson(request);
    const opt = (v: unknown, field: string, max = 80) => (v == null ? undefined : str(v, field, { max, allowEmpty: true }));
    const print = await approveFile({
      path: gcodePath(body.path),
      title: opt(body.title, "tittel"),
      emoji: opt(body.emoji, "emoji", 16),
      category: opt(body.category, "kategori", 40),
      note: opt(body.note, "notat", 300),
    });
    return Response.json({ approved: print });
  } catch (err) {
    return apiError(err);
  }
}
