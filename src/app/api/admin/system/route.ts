import { adminGuard } from "@/server/auth";
import { getPrinter } from "@/server/printer";
import { apiError } from "@/server/http";

export const dynamic = "force-dynamic";

export async function GET(): Promise<Response> {
  const denied = await adminGuard();
  if (denied) return denied;
  try {
    const printer = getPrinter();
    const [info, logs] = await Promise.all([printer.getSystemInfo(), printer.listLogs().catch(() => [])]);
    return Response.json({ info, logs });
  } catch (err) {
    return apiError(err);
  }
}
