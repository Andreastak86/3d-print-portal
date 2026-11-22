/** Shared validation for G-code uploads (admin and Tobias). */
import { HttpError } from "@/server/http";

export const MAX_UPLOAD_BYTES = 500 * 1024 * 1024;

/** Reads the "file" field from a multipart request and checks it is a valid G-code file. */
export async function readGcodeUpload(request: Request): Promise<File> {
  const form = await request.formData().catch(() => {
    throw new HttpError(400, "bad_request", "Ugyldig opplasting");
  });
  const file = form.get("file");
  if (!(file instanceof File)) throw new HttpError(400, "bad_request", "Ingen fil valgt");
  if (/[\\/]|\.\./.test(file.name)) throw new HttpError(400, "bad_request", "Ugyldig filnavn");
  if (!/\.(gcode|g|gco)$/i.test(file.name)) {
    const hint = /\.(3mf|stl|obj|step)$/i.test(file.name)
      ? " Dette er en 3D-modell. Åpne den i OrcaSlicer og eksporter G-code først."
      : "";
    throw new HttpError(400, "bad_request", `Bare G-code-filer (.gcode) kan lastes opp.${hint}`);
  }
  if (file.size === 0) throw new HttpError(400, "bad_request", "Filen er tom");
  if (file.size > MAX_UPLOAD_BYTES) throw new HttpError(413, "too_large", "Filen er for stor");
  return file;
}
