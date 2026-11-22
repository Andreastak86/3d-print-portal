/**
 * Approved prints: the list of G-code files Tobias may start.
 */
import { randomUUID } from "node:crypto";
import type { ApprovedPrint, LibraryItem, PrinterFile } from "@/lib/portal/types";
import { FILE_ID_PREFIX, buildLibrary } from "@/lib/portal/library";
import { displayNameFromFilename } from "@/lib/printer/files";
import { canTobiasStart } from "@/lib/portal/policy";
import { getPrinter } from "@/server/printer";
import { logActivity, readStore, updateStore } from "@/server/store";
import { HttpError, gcodePath } from "@/server/http";

/** Folder where the portal stores its own copies and uploads. */
export const PORTAL_FOLDER = "portal";

export async function getLibrary(canStartAnyFile: boolean): Promise<LibraryItem[]> {
  const { approvedPrints } = await readStore();
  if (approvedPrints.length === 0 && !canStartAnyFile) return [];
  let files: PrinterFile[] | null = null;
  try {
    files = await getPrinter().listFiles();
  } catch {
    // Printer offline: approved prints are shown as unavailable.
  }
  return buildLibrary(approvedPrints, files, canStartAnyFile);
}

export interface ApproveInput {
  path: string;
  title?: string;
  emoji?: string;
  category?: string;
  note?: string;
}

/**
 * Approves a file for Tobias. Files in .cache (from OrcaSlicer) can be cleaned up
 * at any time, so they are first copied to the portal folder.
 */
export async function approveFile(input: ApproveInput): Promise<ApprovedPrint> {
  const printer = getPrinter();
  const file = await printer.getFile(input.path);
  if (!file) throw new HttpError(404, "not_found", "Fant ikke filen på printeren");

  let filename = file.path;
  if (filename.startsWith(".cache/")) {
    const dest = `${PORTAL_FOLDER}/${filename.slice(filename.lastIndexOf("/") + 1)}`;
    await printer.copyFile(filename, dest);
    filename = dest;
  }

  const print: ApprovedPrint = {
    id: randomUUID(),
    filename,
    title: input.title?.trim() || displayNameFromFilename(filename),
    emoji: input.emoji?.trim() || "🧩",
    category: input.category?.trim() || "Annet",
    note: input.note?.trim() ?? "",
    createdAt: Date.now(),
    timesStarted: 0,
    lastStartedAt: null,
  };

  await updateStore((data) => {
    data.approvedPrints = data.approvedPrints.filter((p) => p.filename !== filename);
    data.approvedPrints.push(print);
  });
  await logActivity("admin", "Godkjente utskrift", print.title);
  return print;
}

export async function updateApproved(
  id: string,
  patch: Partial<Pick<ApprovedPrint, "title" | "emoji" | "category" | "note">>,
): Promise<ApprovedPrint> {
  return updateStore((data) => {
    const print = data.approvedPrints.find((p) => p.id === id);
    if (!print) throw new HttpError(404, "not_found", "Fant ikke utskriften");
    Object.assign(print, patch);
    return { ...print };
  });
}

export async function removeApproved(id: string): Promise<void> {
  const removed = await updateStore((data) => {
    const print = data.approvedPrints.find((p) => p.id === id);
    data.approvedPrints = data.approvedPrints.filter((p) => p.id !== id);
    return print;
  });
  if (!removed) throw new HttpError(404, "not_found", "Fant ikke utskriften");
  await logActivity("admin", "Fjernet godkjent utskrift", removed.title);
}

/**
 * Tobias starts a print: an approved print (id) or, if allowed, any file ("file:<path>").
 * Every rule is checked here on the server.
 */
export async function startForTobias(id: string, confirmations: { plateClear: boolean; adultPresent: boolean }) {
  const { settings, approvedPrints } = await readStore();
  const rules = settings.tobias;

  if (!confirmations.plateClear || (rules.requireAdult && !confirmations.adultPresent)) {
    throw new HttpError(400, "checklist", "Du må krysse av for alle punktene på sjekklisten først.");
  }

  let filename: string;
  let title: string;
  let approvedId: string | null = null;

  if (id.startsWith(FILE_ID_PREFIX)) {
    if (!rules.canStartAnyFile) throw new HttpError(403, "not_allowed", "Du kan bare starte godkjente utskrifter.");
    filename = gcodePath(id.slice(FILE_ID_PREFIX.length));
    title = displayNameFromFilename(filename);
  } else {
    const print = approvedPrints.find((p) => p.id === id);
    if (!print) throw new HttpError(404, "not_found", "Denne utskriften er ikke godkjent lenger.");
    filename = print.filename;
    title = print.title;
    approvedId = print.id;
  }

  const printer = getPrinter();
  const policy = canTobiasStart(rules, printer.getSnapshot(), new Date());
  if (!policy.ok) throw new HttpError(409, "not_allowed", policy.reason);

  const file = await printer.getFile(filename);
  if (!file) throw new HttpError(404, "file_missing", "Filen finnes ikke på printeren lenger.");

  await printer.startPrint(filename);

  if (approvedId) {
    await updateStore((data) => {
      const p = data.approvedPrints.find((x) => x.id === approvedId);
      if (p) {
        p.timesStarted += 1;
        p.lastStartedAt = Date.now();
      }
    });
  }
  await logActivity("tobias", "Startet utskrift", title);
}
