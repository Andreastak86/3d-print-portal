/**
 * Tobias uploads his own G-code file. Only allowed when "start any file" is on
 * (otherwise he couldn't start it anyway). The file goes into the "tobias" folder on the printer.
 */
import { getPrinter } from "@/server/printer";
import { logActivity, readStore } from "@/server/store";
import { HttpError, apiError } from "@/server/http";
import { readGcodeUpload } from "@/server/uploads";
import { displayNameFromFilename } from "@/lib/printer/files";

const TOBIAS_FOLDER = "tobias";

export async function POST(request: Request): Promise<Response> {
  try {
    const { settings } = await readStore();
    if (!settings.tobias.canStartAnyFile) {
      throw new HttpError(403, "not_allowed", "Opplasting er ikke skrudd på. Spør en voksen.");
    }
    const file = await readGcodeUpload(request);
    const path = await getPrinter().uploadFile(file, TOBIAS_FOLDER);
    await logActivity("tobias", "Lastet opp fil", displayNameFromFilename(path));
    return Response.json({ path });
  } catch (err) {
    return apiError(err);
  }
}
