/** Printer control for admin: start/pause/resume/cancel/emergency stop, presets, temperature, light. */
import { adminGuard } from "@/server/auth";
import { getConfig } from "@/server/config";
import { getPrinter } from "@/server/printer";
import { logActivity } from "@/server/store";
import { HttpError, apiError, gcodePath, ok, readJson } from "@/server/http";
import { PRESETS, isPreset, lightName, lightScript, temperatureScript, topLightScript } from "@/server/presets";
import { printerIsFree } from "@/lib/portal/policy";
import { displayNameFromFilename } from "@/lib/printer/files";

export async function POST(request: Request): Promise<Response> {
  const denied = await adminGuard();
  if (denied) return denied;

  try {
    const body = await readJson(request);
    const printer = getPrinter();
    const job = printer.getSnapshot().job?.displayName;

    switch (body.action) {
      case "start": {
        const path = gcodePath(body.path);
        const free = printerIsFree(printer.getSnapshot());
        if (!free.ok) throw new HttpError(409, "busy", free.reason);
        await printer.startPrint(path);
        await logActivity("admin", "Startet utskrift", displayNameFromFilename(path));
        break;
      }
      case "pause":
        await printer.pausePrint();
        await logActivity("admin", "Satte utskrift på pause", job);
        break;
      case "resume":
        await printer.resumePrint();
        await logActivity("admin", "Fortsatte utskrift", job);
        break;
      case "cancel":
        await printer.cancelPrint();
        await logActivity("admin", "Avbrøt utskrift", job);
        break;
      case "emergency_stop":
        await printer.emergencyStop();
        await logActivity("admin", "NØDSTOPP", job);
        break;
      case "preset": {
        if (!isPreset(body.preset)) throw new HttpError(400, "bad_request", "Ukjent forhåndsvalg");
        const preset = PRESETS[body.preset];
        await printer.runGcode(preset.script);
        await logActivity("admin", preset.label);
        break;
      }
      case "temperature": {
        const script = temperatureScript(body.heater, body.target);
        await printer.runGcode(script);
        await logActivity("admin", "Satte temperatur", script);
        break;
      }
      case "light":
        await printer.runGcode(
          lightName(body.which) === "top" ? topLightScript(getConfig().topLightMacro) : lightScript(getConfig().lightPin, body.on === true),
        );
        break;
      default:
        throw new HttpError(400, "bad_request", "Ukjent handling");
    }
    return ok();
  } catch (err) {
    return apiError(err);
  }
}
