/** G-code files: list, upload, delete. */
import type { NextRequest } from "next/server";
import { adminGuard } from "@/server/auth";
import { getPrinter } from "@/server/printer";
import { logActivity, updateStore } from "@/server/store";
import { HttpError, apiError, gcodePath, ok } from "@/server/http";
import { PORTAL_FOLDER } from "@/server/library";
import { readGcodeUpload } from "@/server/uploads";
import { displayNameFromFilename } from "@/lib/printer/files";

export const dynamic = "force-dynamic";

export async function GET(): Promise<Response> {
  const denied = await adminGuard();
  if (denied) return denied;
  try {
    return Response.json({ files: await getPrinter().listFiles() });
  } catch (err) {
    return apiError(err);
  }
}

export async function POST(request: Request): Promise<Response> {
  const denied = await adminGuard();
  if (denied) return denied;
  try {
    const file = await readGcodeUpload(request);
    const path = await getPrinter().uploadFile(file, PORTAL_FOLDER);
    await logActivity("admin", "Lastet opp fil", displayNameFromFilename(path));
    return Response.json({ path });
  } catch (err) {
    return apiError(err);
  }
}

export async function DELETE(request: NextRequest): Promise<Response> {
  const denied = await adminGuard();
  if (denied) return denied;
  try {
    const path = gcodePath(request.nextUrl.searchParams.get("path"));
    const printer = getPrinter();
    const job = printer.getSnapshot().job;
    if (job && job.filename === path && (job.state === "printing" || job.state === "paused")) {
      throw new HttpError(409, "in_use", "Kan ikke slette filen som printes nå");
    }
    await printer.deleteFile(path);
    // Remove any approval pointing at the file.
    await updateStore((data) => {
      data.approvedPrints = data.approvedPrints.filter((p) => p.filename !== path);
    });
    await logActivity("admin", "Slettet fil", displayNameFromFilename(path));
    return ok();
  } catch (err) {
    return apiError(err);
  }
}
