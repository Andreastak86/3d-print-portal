/**
 * Helpers for G-code filenames and thumbnails. Pure functions, safe on both server and client.
 */

/**
 * Turns an OrcaSlicer filename into a readable name.
 *   ".cache/EN4Plus_0.4_12-in-1 Ultimate Multi Fidget Toy_Generic PLA _0.2_2h34m.gcode"
 *   → "12-in-1 Ultimate Multi Fidget Toy"
 * Falls back to the bare filename if the pattern doesn't match.
 */
export function displayNameFromFilename(filename: string): string {
  const base = filename.split("/").pop() ?? filename;
  const withoutExt = base.replace(/\.gcode$/i, "");

  const cleaned = withoutExt
    // Printer + nozzle prefix: "EN4Plus_0.4_"
    .replace(/^[A-Za-z0-9-]+_\d+(?:\.\d+)?_/, "")
    // Suffix filament_layer_time: "_Generic PLA _0.2_2h34m" or "_PLA0.2_38m22s"
    .replace(/_[^_]*_?\d+\.\d+_(?:\d+d)?(?:\d+h)?(?:\d+m)?(?:\d+s)?$/, "")
    .replace(/_/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  return cleaned || withoutExt;
}

/** Only thumbnails (.thumbs/*.png) may be fetched through the portal. */
export function isAllowedThumbnailPath(path: string): boolean {
  if (path.includes("..") || path.includes("\\") || path.startsWith("/")) return false;
  return /(^|\/)\.thumbs\/[^/]+\.png$/i.test(path);
}

interface ThumbnailMeta {
  width: number;
  relative_path: string;
}

/**
 * Picks the largest thumbnail and returns the portal URL for it.
 * Moonraker's relative_path is relative to the G-code file's folder.
 */
export function thumbnailUrlFor(gcodeFilename: string, thumbnails: ThumbnailMeta[] | undefined): string | null {
  if (!thumbnails?.length) return null;
  const best = thumbnails.reduce((a, b) => (b.width > a.width ? b : a));
  const dir = gcodeFilename.includes("/") ? gcodeFilename.slice(0, gcodeFilename.lastIndexOf("/") + 1) : "";
  const path = dir + best.relative_path;
  if (!isAllowedThumbnailPath(path)) return null;
  return `/api/printer/thumbnail?path=${encodeURIComponent(path)}`;
}
