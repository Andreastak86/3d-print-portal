"use client";

import Link from "next/link";
import { useState } from "react";
import type { LibraryItem } from "@/lib/portal/types";
import { formatDuration, formatGrams } from "@/lib/format";
import { Thumbnail } from "@/components/printer/Thumbnail";

interface LibraryGridProps {
  items: LibraryItem[];
  onSelect: (item: LibraryItem) => void;
}

export function LibraryGrid({ items, onSelect }: LibraryGridProps) {
  const [category, setCategory] = useState<string | null>(null);
  const categories = [...new Set(items.map((i) => i.category))].sort((a, b) => a.localeCompare(b, "nb"));
  const visible = category ? items.filter((i) => i.category === category) : items;

  if (items.length === 0) {
    return (
      <div className="rounded-3xl border border-dashed border-line p-10 text-center">
        <div className="text-5xl">📦</div>
        <h3 className="mt-3 text-xl font-semibold">Ingen utskrifter er klare ennå</h3>
        <p className="mt-1 text-muted">Be en voksen om å godkjenne noe du kan printe i admin-panelet.</p>
        <Link href="/slik-printer-du" className="mt-4 inline-block font-medium text-accent hover:underline">
          Se hvordan du finner og printer noe nytt →
        </Link>
      </div>
    );
  }

  return (
    <div>
      {categories.length > 1 && (
        <div className="mb-4 flex flex-wrap gap-2">
          {[null, ...categories].map((c) => (
            <button
              key={c ?? "alle"}
              type="button"
              onClick={() => setCategory(c)}
              className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                category === c ? "bg-accent text-on-accent" : "bg-surface-2 text-muted hover:text-text"
              }`}
            >
              {c ?? "Alle"}
            </button>
          ))}
        </div>
      )}

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {visible.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => onSelect(item)}
            className={`group relative flex flex-col items-center rounded-3xl border border-line bg-surface/80 p-4 text-center transition hover:-translate-y-1 hover:border-accent/50 hover:shadow-xl hover:shadow-accent/10 ${
              item.available ? "" : "opacity-50"
            }`}
          >
            <span className="absolute top-3 left-3 text-2xl">{item.emoji}</span>
            {item.isNew ? (
              <span className="absolute top-3 right-3 rounded-full bg-accent px-2 py-0.5 text-xs font-semibold text-on-accent">Ny!</span>
            ) : item.timesStarted > 0 && (
              <span className="absolute top-3 right-3 rounded-full bg-surface-2 px-2 py-0.5 text-xs text-muted" title="Antall ganger printet">
                ×{item.timesStarted}
              </span>
            )}
            <div className="mt-4 transition group-hover:scale-105">
              <Thumbnail src={item.thumbnailUrl} alt={item.title} size="lg" color={item.filamentColor} />
            </div>
            <h3 className="mt-3 line-clamp-2 text-lg font-semibold leading-tight">{item.title}</h3>
            <p className="tabular mt-1 text-sm text-muted">
              {item.estimatedTime != null ? `⏱ ${formatDuration(item.estimatedTime)}` : ""}
              {item.filamentWeight != null ? ` · ${formatGrams(item.filamentWeight)}` : ""}
            </p>
            {!item.available && <p className="mt-1 text-xs text-warn">Filen mangler</p>}
          </button>
        ))}
      </div>
    </div>
  );
}
