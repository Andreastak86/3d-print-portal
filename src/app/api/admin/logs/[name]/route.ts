/** Download a log file from the printer (klippy.log, moonraker.log …). */
import { adminGuard } from "@/server/auth";
import { getPrinter } from "@/server/printer";
import { HttpError, apiError } from "@/server/http";

export const dynamic = "force-dynamic";

export async function GET(_request: Request, ctx: RouteContext<"/api/admin/logs/[name]">): Promise<Response> {
  const denied = await adminGuard();
  if (denied) return denied;
  try {
    const { name } = await ctx.params;
    if (!/^[\w.-]+$/.test(name) || name.includes("..")) throw new HttpError(400, "bad_request", "Ugyldig loggnavn");
    const upstream = await getPrinter().downloadLog(name);
    return new Response(upstream.body, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Content-Disposition": `attachment; filename="${name}${name.endsWith(".log") ? "" : ".txt"}"`,
      },
    });
  } catch (err) {
    return apiError(err);
  }
}
