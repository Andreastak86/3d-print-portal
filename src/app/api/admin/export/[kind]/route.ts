/**
 * CSV export for Excel.
 *   /api/admin/export/utskrifter?period=30d   – one row per print
 *   /api/admin/export/maneder?period=year     – summary per month
 *   /api/admin/export/aktivitet               – activity log
 */
import type { NextRequest } from "next/server";
import type { ActivityEntry } from "@/lib/portal/types";
import type { HistoryJob } from "@/lib/printer/types";
import { adminGuard } from "@/server/auth";
import { getPrinter } from "@/server/printer";
import { readStore } from "@/server/store";
import { HttpError, apiError } from "@/server/http";
import { csvDateTime, toCsv } from "@/lib/csv";
import { filamentGrams } from "@/lib/format";
import { filterByPeriod, isPeriodKey, jobCost, monthlySummary, type PeriodKey } from "@/lib/stats";

export const dynamic = "force-dynamic";

const STATUS: Record<string, string> = { completed: "Fullført", cancelled: "Avbrutt", error: "Feil", in_progress: "Pågår" };
const ACTOR: Record<ActivityEntry["actor"], string> = { tobias: "Tobias", admin: "Admin", system: "System" };

function csvResponse(body: string, name: string): Response {
  const date = csvDateTime(Date.now()).slice(0, 10);
  return new Response(body, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="3d-print-${name}-${date}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}

export async function GET(request: NextRequest, ctx: RouteContext<"/api/admin/export/[kind]">): Promise<Response> {
  const denied = await adminGuard();
  if (denied) return denied;

  try {
    const { kind } = await ctx.params;
    const periodParam = request.nextUrl.searchParams.get("period") ?? "all";
    const period: PeriodKey = isPeriodKey(periodParam) ? periodParam : "all";
    const { settings, activity } = await readStore();
    const costs = settings.costs;

    if (kind === "aktivitet") {
      return csvResponse(
        toCsv(activity, [
          { header: "Tidspunkt", value: (a) => csvDateTime(a.at) },
          { header: "Hvem", value: (a) => ACTOR[a.actor] },
          { header: "Handling", value: (a) => a.action },
          { header: "Detaljer", value: (a) => a.detail ?? "" },
        ]),
        "aktivitet",
      );
    }

    const jobs = filterByPeriod(await getPrinter().getAllJobs(), period);

    if (kind === "utskrifter") {
      const rows = [...jobs].sort((a, b) => a.startTime - b.startTime);
      return csvResponse(
        toCsv<HistoryJob>(rows, [
          { header: "Jobb-ID", value: (j) => j.id },
          { header: "Start", value: (j) => csvDateTime(j.startTime) },
          { header: "Slutt", value: (j) => csvDateTime(j.endTime) },
          { header: "Navn", value: (j) => j.displayName },
          { header: "Fil", value: (j) => j.filename },
          { header: "Status", value: (j) => STATUS[j.status] ?? j.status },
          { header: "Printetid (min)", value: (j) => j.printDuration / 60, decimals: 1 },
          { header: "Total tid (min)", value: (j) => j.totalDuration / 60, decimals: 1 },
          { header: "Filament (m)", value: (j) => j.filamentUsed / 1000, decimals: 2 },
          { header: "Filament (g, ca.)", value: (j) => filamentGrams(j.filamentUsed), decimals: 1 },
          { header: "Filamenttype", value: (j) => j.filamentType ?? "" },
          { header: "Farge", value: (j) => j.filamentColor ?? "" },
          { header: "Kostnad filament (kr)", value: (j) => jobCost(j, costs).filament, decimals: 2 },
          { header: "Kostnad strøm (kr)", value: (j) => jobCost(j, costs).power, decimals: 2 },
          { header: "Kostnad totalt (kr)", value: (j) => jobCost(j, costs).total, decimals: 2 },
        ]),
        `utskrifter-${period}`,
      );
    }

    if (kind === "maneder") {
      return csvResponse(
        toCsv(monthlySummary(jobs, costs), [
          { header: "Måned", value: (m) => m.month },
          { header: "Utskrifter", value: (m) => m.jobs },
          { header: "Fullført", value: (m) => m.completed },
          { header: "Mislykket/avbrutt", value: (m) => m.failed },
          { header: "Fullføringsrate (%)", value: (m) => (m.successRate == null ? null : m.successRate * 100), decimals: 0 },
          { header: "Printetid (timer)", value: (m) => m.printTime / 3600, decimals: 1 },
          { header: "Filament (g, ca.)", value: (m) => m.grams, decimals: 0 },
          { header: "Bortkastet filament (g)", value: (m) => m.wastedGrams, decimals: 0 },
          { header: "Kostnad filament (kr)", value: (m) => m.cost.filament, decimals: 2 },
          { header: "Kostnad strøm (kr)", value: (m) => m.cost.power, decimals: 2 },
          { header: "Kostnad totalt (kr)", value: (m) => m.cost.total, decimals: 2 },
        ]),
        `maneder-${period}`,
      );
    }

    throw new HttpError(404, "not_found", "Ukjent eksport");
  } catch (err) {
    return apiError(err);
  }
}
