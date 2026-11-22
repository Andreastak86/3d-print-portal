/**
 * Proxies G-code thumbnails from the printer. The browser never talks to the
 * printer directly, and only .thumbs/*.png paths are allowed.
 */
import type { NextRequest } from "next/server";
import { isAllowedThumbnailPath } from "@/lib/printer/files";
import { fetchGcodeFile } from "@/server/moonraker/rest";
import { apiError } from "@/server/http";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest): Promise<Response> {
  const path = request.nextUrl.searchParams.get("path") ?? "";
  if (!isAllowedThumbnailPath(path)) {
    return Response.json({ error: { code: "invalid_path", message: "Ugyldig bildesti" } }, { status: 400 });
  }

  try {
    const upstream = await fetchGcodeFile(path);
    return new Response(upstream.body, {
      headers: {
        "Content-Type": "image/png",
        // Thumbnails for a given file never change.
        "Cache-Control": "private, max-age=86400",
      },
    });
  } catch (err) {
    return apiError(err);
  }
}
