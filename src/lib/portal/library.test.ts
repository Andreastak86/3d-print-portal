import { describe, expect, it } from "vitest";
import type { ApprovedPrint, PrinterFile } from "./types";
import { buildLibrary, OTHER_FILES_CATEGORY } from "./library";

const now = 1_000_000_000_000;
const hour = 3600_000;

function file(path: string, ageHours: number): PrinterFile {
  return {
    path,
    displayName: path.replace(/\.gcode$/, ""),
    folder: "",
    size: 1,
    modified: now - ageHours * hour,
    estimatedTime: 600,
    filamentWeight: 5,
    filamentTotal: 1000,
    filamentType: "PLA",
    filamentColor: null,
    layerHeight: 0.2,
    objectHeight: 10,
    slicer: "OrcaSlicer",
    thumbnailUrl: null,
  };
}

const approved: ApprovedPrint[] = [
  { id: "a1", filename: "drage.gcode", title: "Drage", emoji: "🐉", category: "Dyr", note: "", createdAt: 0, timesStarted: 3, lastStartedAt: null },
];

describe("buildLibrary", () => {
  const files = [file("drage.gcode", 100), file("gammel.gcode", 72), file("ny.gcode", 1)];

  it("shows only approved prints when 'start any file' is off", () => {
    const lib = buildLibrary(approved, files, false, now);
    expect(lib.map((i) => i.id)).toEqual(["a1"]);
    expect(lib[0]).toMatchObject({ source: "approved", title: "Drage", available: true, isNew: false });
  });

  it("includes all files when it is on, with new files first and no duplicates", () => {
    const lib = buildLibrary(approved, files, true, now);
    expect(lib.map((i) => i.id)).toEqual(["file:ny.gcode", "a1", "file:gammel.gcode"]);
    expect(lib[0]).toMatchObject({ source: "file", isNew: true, category: OTHER_FILES_CATEGORY });
  });

  it("puts the newest upload at the very top, even before a new approved print", () => {
    const lib = buildLibrary(approved, [file("drage.gcode", 5), file("helt-ny.gcode", 0.1)], true, now);
    expect(lib.map((i) => i.id)).toEqual(["file:helt-ny.gcode", "a1"]);
  });

  it("marks approved prints as unavailable when the printer is offline", () => {
    const lib = buildLibrary(approved, null, true, now);
    expect(lib).toHaveLength(1);
    expect(lib[0].available).toBe(false);
  });

  it("marks approved prints whose file is gone as unavailable", () => {
    const lib = buildLibrary(approved, [file("annen.gcode", 5)], false, now);
    expect(lib[0].available).toBe(false);
  });
});
