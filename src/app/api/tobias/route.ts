/** Public data for Tobias' page: settings (what he may do) + approved prints. */
import { readStore } from "@/server/store";
import { getLibrary } from "@/server/library";
import { apiError } from "@/server/http";
import type { TobiasView } from "@/lib/portal/types";

export const dynamic = "force-dynamic";

export async function GET(): Promise<Response> {
  try {
    const { settings } = await readStore();
    const library = await getLibrary(settings.tobias.canStartAnyFile);
    return Response.json({ settings: settings.tobias, library } satisfies TobiasView);
  } catch (err) {
    return apiError(err);
  }
}
