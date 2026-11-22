import { getConfig } from "@/server/config";
import { getPrinter } from "@/server/printer";
import { readStore } from "@/server/store";
import { HttpError, apiError, ok, readJson } from "@/server/http";
import { lightName, lightScript, topLightScript } from "@/server/presets";

/**
 * Turn the lights on/off. Fixed commands only – Tobias can't send his own G-code.
 * Body: { which: "head" | "top", on?: boolean }  (the top light just toggles)
 */
export async function POST(request: Request): Promise<Response> {
  try {
    const body = await readJson(request);
    const { settings } = await readStore();
    if (!settings.tobias.canToggleLight) throw new HttpError(403, "not_allowed", "Lysbryteren er skrudd av.");

    const printer = getPrinter();
    const snapshot = printer.getSnapshot();
    const config = getConfig();

    if (lightName(body.which) === "top") {
      if (!snapshot.topLight) throw new HttpError(409, "no_light", "Printeren har ikke topplys vi kan styre.");
      await printer.runGcode(topLightScript(config.topLightMacro));
    } else {
      if (snapshot.light === null) throw new HttpError(409, "no_light", "Printeren har ikke lys vi kan styre.");
      await printer.runGcode(lightScript(config.lightPin, body.on === true));
    }
    return ok();
  } catch (err) {
    return apiError(err);
  }
}
