/** Admin console: send raw G-code. */
import { adminGuard } from "@/server/auth";
import { getPrinter } from "@/server/printer";
import { logActivity } from "@/server/store";
import { apiError, ok, readJson, str } from "@/server/http";

export async function POST(request: Request): Promise<Response> {
  const denied = await adminGuard();
  if (denied) return denied;
  try {
    const script = str((await readJson(request)).script, "kommando", { max: 2000 });
    await getPrinter().runGcode(script);
    await logActivity("admin", "Sendte G-code", script.length > 80 ? `${script.slice(0, 80)}…` : script);
    return ok();
  } catch (err) {
    return apiError(err);
  }
}
