import { canTobiasPause, canTobiasResume } from "@/lib/portal/policy";
import { getPrinter } from "@/server/printer";
import { logActivity, readStore } from "@/server/store";
import { HttpError, apiError, ok, readJson } from "@/server/http";

/** Tobias may pause/resume (if allowed in settings). He can never cancel. */
export async function POST(request: Request): Promise<Response> {
  try {
    const { action } = await readJson(request);
    const { settings } = await readStore();
    const printer = getPrinter();
    const snapshot = printer.getSnapshot();

    if (action === "pause") {
      const policy = canTobiasPause(settings.tobias, snapshot);
      if (!policy.ok) throw new HttpError(409, "not_allowed", policy.reason);
      await printer.pausePrint();
      await logActivity("tobias", "Satte utskrift på pause", snapshot.job?.displayName);
    } else if (action === "resume") {
      const policy = canTobiasResume(settings.tobias, snapshot);
      if (!policy.ok) throw new HttpError(409, "not_allowed", policy.reason);
      await printer.resumePrint();
      await logActivity("tobias", "Fortsatte utskrift", snapshot.job?.displayName);
    } else {
      throw new HttpError(400, "bad_request", "Ukjent handling");
    }
    return ok();
  } catch (err) {
    return apiError(err);
  }
}
