/** All print jobs + cost settings, for the statistics page. */
import { adminGuard } from "@/server/auth";
import { getPrinter } from "@/server/printer";
import { readStore } from "@/server/store";
import { apiError } from "@/server/http";

export const dynamic = "force-dynamic";

export async function GET(): Promise<Response> {
  const denied = await adminGuard();
  if (denied) return denied;
  try {
    const [jobs, { settings }] = await Promise.all([getPrinter().getAllJobs(), readStore()]);
    return Response.json({ jobs, costs: settings.costs });
  } catch (err) {
    return apiError(err);
  }
}
