/** Snapshot of the printer status (for scripts/debugging – the UI uses /events). */
import { getPrinter } from "@/server/printer";

export const dynamic = "force-dynamic";

export function GET(): Response {
  return Response.json(getPrinter().getSnapshot());
}
