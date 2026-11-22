import type { ReactNode } from "react";

export type BadgeTone = "ok" | "warn" | "bad" | "info" | "muted" | "accent";

const tones: Record<BadgeTone, string> = {
  ok: "bg-ok/15 text-ok",
  warn: "bg-warn/15 text-warn",
  bad: "bg-bad/15 text-bad",
  info: "bg-info/15 text-info",
  muted: "bg-surface-2 text-muted",
  accent: "bg-accent/15 text-accent",
};

export function Badge({ tone, pulse, children }: { tone: BadgeTone; pulse?: boolean; children: ReactNode }) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium whitespace-nowrap ${tones[tone]}`}>
      <span className="relative flex size-2">
        {pulse && <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-current opacity-60" />}
        <span className="relative inline-flex size-2 rounded-full bg-current" />
      </span>
      {children}
    </span>
  );
}
