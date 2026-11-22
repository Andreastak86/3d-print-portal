"use client";

import { useState } from "react";
import { CubeIcon } from "@/components/ui/icons";

interface ThumbnailProps {
  src: string | null;
  alt: string;
  size: "sm" | "lg";
  /** Filament color as a placeholder when there's no image */
  color?: string | null;
}

export function Thumbnail({ src, alt, size, color }: ThumbnailProps) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const box = size === "lg" ? "size-32 sm:size-40 rounded-2xl" : "size-12 rounded-xl";

  if (!src || failedSrc === src) {
    return (
      <div
        className={`${box} flex shrink-0 items-center justify-center border border-line bg-surface-2 text-muted`}
        style={color ? { color } : undefined}
      >
        <CubeIcon className={size === "lg" ? "size-12" : "size-5"} />
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element -- small proxied PNGs, next/image optimisation not needed
    <img
      src={src}
      alt={alt}
      onError={() => setFailedSrc(src)}
      className={`${box} shrink-0 border border-line bg-surface-2 object-contain p-1`}
    />
  );
}
