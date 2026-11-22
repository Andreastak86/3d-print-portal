"use client";

import { useEffect, useRef, useState } from "react";
import type { ConsoleLine } from "@/lib/portal/types";
import { apiSend, errorMessage } from "@/lib/api";
import { useApiData } from "@/hooks/useApiData";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { AlertIcon, TerminalIcon } from "@/components/ui/icons";
import { PageHeader } from "./AdminShell";

const QUICK = [
  { label: "Status", script: "STATUS" },
  { label: "Firmware", script: "M115" },
  { label: "Posisjon", script: "GET_POSITION" },
  { label: "Restart firmware", script: "FIRMWARE_RESTART" },
];

function time(ms: number): string {
  return new Date(ms).toLocaleTimeString("nb-NO", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

export function GcodeConsole() {
  const toast = useToast();
  const consoleData = useApiData<{ lines: ConsoleLine[] }>("/api/admin/console?count=200", { intervalMs: 2000 });
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [hideTemps, setHideTemps] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  const lines = (consoleData.data?.lines ?? []).filter((l) => !hideTemps || !/^B:[\d.]+ \/[\d.]+ T0?:/.test(l.message));

  // Auto-scroll to the bottom when new lines arrive (if the user is already at the bottom).
  const lastTime = lines.at(-1)?.time;
  useEffect(() => {
    const el = scrollRef.current;
    if (el && el.scrollHeight - el.scrollTop - el.clientHeight < 120) el.scrollTop = el.scrollHeight;
  }, [lastTime]);

  const send = async (script: string) => {
    if (!script.trim()) return;
    setSending(true);
    try {
      await apiSend("/api/admin/gcode", { script });
      setHistory((h) => [script, ...h.filter((x) => x !== script)].slice(0, 30));
      setHistoryIndex(-1);
      setInput("");
      consoleData.reload();
    } catch (err) {
      toast(errorMessage(err), "bad");
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      <PageHeader title="Konsoll" description="Send G-code direkte til Klipper og se svarene." />

      <div className="mb-4 flex items-start gap-3 rounded-xl border border-warn/30 bg-warn/5 p-4 text-sm">
        <AlertIcon className="mt-0.5 size-5 shrink-0 text-warn" />
        <p>
          Kommandoer her går rett til printeren uten sikkerhetssjekk. Portalen endrer aldri printer.cfg, men G-code som{" "}
          <code>SAVE_CONFIG</code> kan gjøre det. Bruk med omhu.
        </p>
      </div>

      <div className="overflow-hidden rounded-2xl border border-line bg-console">
        <div className="flex items-center justify-between border-b border-line px-4 py-2 text-sm">
          <span className="flex items-center gap-2 text-muted">
            <TerminalIcon /> Klipper
          </span>
          <label className="flex items-center gap-2 text-muted">
            <input type="checkbox" checked={hideTemps} onChange={(e) => setHideTemps(e.target.checked)} className="accent-[var(--color-accent)]" />
            Skjul temperaturmeldinger
          </label>
        </div>
        <div ref={scrollRef} className="h-[28rem] overflow-y-auto p-4 font-mono text-sm leading-relaxed">
          {consoleData.error && !consoleData.data && <p className="text-bad">{consoleData.error}</p>}
          {lines.map((l, i) => (
            <div key={`${l.time}-${i}`} className="flex gap-3">
              <span className="shrink-0 text-muted/60">{time(l.time)}</span>
              <span className={`break-all whitespace-pre-wrap ${l.type === "command" ? "text-accent" : l.message.startsWith("!!") ? "text-bad" : l.message.startsWith("//") ? "text-info" : "text-text/90"}`}>
                {l.type === "command" ? "> " : ""}
                {l.message}
              </span>
            </div>
          ))}
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void send(input);
          }}
          className="flex gap-2 border-t border-line p-3"
        >
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "ArrowUp" && history.length) {
                e.preventDefault();
                const i = Math.min(historyIndex + 1, history.length - 1);
                setHistoryIndex(i);
                setInput(history[i]);
              } else if (e.key === "ArrowDown") {
                e.preventDefault();
                const i = historyIndex - 1;
                setHistoryIndex(Math.max(i, -1));
                setInput(i >= 0 ? history[i] : "");
              }
            }}
            placeholder="Skriv G-code, f.eks. M115 (↑ for historikk)"
            spellCheck={false}
            autoComplete="off"
            className="h-10 flex-1 rounded-lg border border-line bg-surface px-3 font-mono text-sm outline-none focus:border-accent"
          />
          <Button type="submit" variant="primary" loading={sending} disabled={!input.trim()}>
            Send
          </Button>
        </form>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {QUICK.map((q) => (
          <Button key={q.script} size="sm" onClick={() => send(q.script)} disabled={sending}>
            {q.label}
          </Button>
        ))}
      </div>
    </>
  );
}
