import type { NextRequest } from "next/server";
import { adminGuard } from "@/server/auth";
import { getPrinter } from "@/server/printer";
import { apiError } from "@/server/http";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest): Promise<Response> {
  const denied = await adminGuard();
  if (denied) return denied;
  const count = Math.min(Math.max(Number(request.nextUrl.searchParams.get("count")) || 150, 1), 1000);
  try {
    return Response.json({ lines: await getPrinter().getConsole(count) });
  } catch (err) {
    return apiError(err);
  }
}
