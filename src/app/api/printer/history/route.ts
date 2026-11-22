import type { NextRequest } from "next/server";
import { getPrinter } from "@/server/printer";
import { apiError } from "@/server/http";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest): Promise<Response> {
  const requested = Number(request.nextUrl.searchParams.get("limit") ?? 25);
  const limit = Number.isFinite(requested) ? Math.min(Math.max(Math.round(requested), 1), 100) : 25;

  try {
    return Response.json(await getPrinter().getHistory(limit));
  } catch (err) {
    return apiError(err);
  }
}
