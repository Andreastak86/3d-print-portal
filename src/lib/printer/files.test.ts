import { describe, expect, it } from "vitest";
import { displayNameFromFilename, isAllowedThumbnailPath, thumbnailUrlFor } from "./files";

describe("displayNameFromFilename", () => {
  it.each([
    [".cache/EN4Plus_0.4_12-in-1 Ultimate Multi Fidget Toy_Generic PLA _0.2_2h34m.gcode", "12-in-1 Ultimate Multi Fidget Toy"],
    ["sda1/3.Model/01.Buddha/EN4Plus_0.4_The Buddha_PLA0.2_38m22s.gcode", "The Buddha"],
    [".cache/EN4Plus_0.4_obj_1_scraper_Generic PLA _0.2_8m32s.gcode", "obj 1 scraper"],
    ["benchy.gcode", "benchy"],
    ["mappe/min_fine_modell.gcode", "min fine modell"],
  ])("%s → %s", (input, expected) => {
    expect(displayNameFromFilename(input)).toBe(expected);
  });
});

describe("isAllowedThumbnailPath", () => {
  it("allows thumbnails", () => {
    expect(isAllowedThumbnailPath(".cache/.thumbs/a-160x160.png")).toBe(true);
    expect(isAllowedThumbnailPath(".thumbs/a.png")).toBe(true);
  });
  it("rejects anything else", () => {
    expect(isAllowedThumbnailPath("../config/printer.cfg")).toBe(false);
    expect(isAllowedThumbnailPath(".thumbs/../../x.png")).toBe(false);
    expect(isAllowedThumbnailPath("modell.gcode")).toBe(false);
    expect(isAllowedThumbnailPath("/.thumbs/a.png")).toBe(false);
    expect(isAllowedThumbnailPath(".thumbs/a.png.gcode")).toBe(false);
  });
});

describe("thumbnailUrlFor", () => {
  it("picks the largest image and builds the path relative to the file's folder", () => {
    const url = thumbnailUrlFor(".cache/x.gcode", [
      { width: 32, relative_path: ".thumbs/x-32x32.png" },
      { width: 160, relative_path: ".thumbs/x-160x160.png" },
    ]);
    expect(url).toBe(`/api/printer/thumbnail?path=${encodeURIComponent(".cache/.thumbs/x-160x160.png")}`);
  });
  it("returns null without thumbnails", () => {
    expect(thumbnailUrlFor("x.gcode", undefined)).toBeNull();
    expect(thumbnailUrlFor("x.gcode", [])).toBeNull();
  });
});
