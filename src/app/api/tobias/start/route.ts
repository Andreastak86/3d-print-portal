import { startForTobias } from "@/server/library";
import { apiError, ok, readJson, str } from "@/server/http";

export async function POST(request: Request): Promise<Response> {
  try {
    const body = await readJson(request);
    const confirmations = (body.confirmations ?? {}) as Record<string, unknown>;
    await startForTobias(str(body.id, "id", { max: 600 }), {
      plateClear: confirmations.plateClear === true,
      adultPresent: confirmations.adultPresent === true,
    });
    return ok();
  } catch (err) {
    return apiError(err);
  }
}
