import type { ApiError } from "@/lib/printer/types";
import { PrinterCommandError, PrinterUnavailableError } from "@/server/moonraker/rest";

/** Error with HTTP status and a Norwegian message for the user. */
export class HttpError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
  ) {
    super(message);
  }
}

function body(code: string, message: string): ApiError {
  return { error: { code, message } };
}

/** Uniform error response for API routes. */
export function apiError(err: unknown): Response {
  if (err instanceof HttpError) {
    return Response.json(body(err.code, err.message), { status: err.status });
  }
  if (err instanceof PrinterUnavailableError) {
    return Response.json(body("printer_unavailable", err.message), { status: 502 });
  }
  if (err instanceof PrinterCommandError) {
    return Response.json(body("printer_refused", `Printeren avviste kommandoen: ${err.message}`), { status: err.status === 404 ? 404 : 409 });
  }
  console.error("[api] Uventet feil:", err);
  return Response.json(body("internal", "Noe gikk galt på serveren"), { status: 500 });
}

/** Reads a JSON body as an object, or throws a 400. */
export async function readJson(request: Request): Promise<Record<string, unknown>> {
  try {
    const data: unknown = await request.json();
    if (data && typeof data === "object" && !Array.isArray(data)) return data as Record<string, unknown>;
  } catch {
    // fall through
  }
  throw new HttpError(400, "bad_request", "Ugyldig forespørsel");
}

export function str(value: unknown, field: string, { max = 200, allowEmpty = false } = {}): string {
  if (typeof value !== "string") throw new HttpError(400, "bad_request", `Mangler ${field}`);
  const v = value.trim();
  if (!allowEmpty && !v) throw new HttpError(400, "bad_request", `${field} kan ikke være tom`);
  if (v.length > max) throw new HttpError(400, "bad_request", `${field} er for lang`);
  return v;
}

/** Validates a G-code path relative to the gcodes root. */
export function gcodePath(value: unknown): string {
  const path = str(value, "filsti", { max: 500 });
  if (path.includes("..") || path.includes("\\") || path.startsWith("/") || !/\.(gcode|g|gco)$/i.test(path)) {
    throw new HttpError(400, "invalid_path", "Ugyldig filsti");
  }
  return path;
}

export function ok(data: unknown = { ok: true }): Response {
  return Response.json(data);
}
