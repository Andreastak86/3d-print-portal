"use client";

import { createContext, createElement, useContext, useEffect, useState, type ReactNode } from "react";
import type { PrinterSnapshot } from "@/lib/printer/types";

const RECONNECT_MS = 3000;

export interface PrinterLive {
  /** null until the first snapshot has arrived */
  snapshot: PrinterSnapshot | null;
  /** false when the browser has lost contact with the portal server itself */
  portalOnline: boolean;
  /** Increments every time the printer reports the history has changed */
  historyVersion: number;
}

/**
 * Live printer status via Server-Sent Events from /api/printer/events.
 * EventSource reconnects automatically on drops; if it gives up
 * (e.g. the server returned an error), we create a new one.
 */
export function usePrinter(): PrinterLive {
  const [snapshot, setSnapshot] = useState<PrinterSnapshot | null>(null);
  const [portalOnline, setPortalOnline] = useState(true);
  const [historyVersion, setHistoryVersion] = useState(0);

  useEffect(() => {
    let source: EventSource | null = null;
    let retryTimer: ReturnType<typeof setTimeout> | null = null;
    let disposed = false;

    const open = () => {
      source = new EventSource("/api/printer/events");
      source.addEventListener("snapshot", (e) => {
        setSnapshot(JSON.parse((e as MessageEvent<string>).data) as PrinterSnapshot);
        setPortalOnline(true);
      });
      source.addEventListener("history", () => setHistoryVersion((v) => v + 1));
      source.onerror = () => {
        setPortalOnline(false);
        if (source?.readyState === EventSource.CLOSED && !disposed) {
          source.close();
          retryTimer = setTimeout(open, RECONNECT_MS);
        }
      };
    };

    open();
    return () => {
      disposed = true;
      if (retryTimer) clearTimeout(retryTimer);
      source?.close();
    };
  }, []);

  return { snapshot, portalOnline, historyVersion };
}

const PrinterContext = createContext<PrinterLive | null>(null);

/** Shares ONE SSE connection between all components below (e.g. the admin panel). */
export function PrinterProvider({ children }: { children: ReactNode }) {
  const live = usePrinter();
  return createElement(PrinterContext.Provider, { value: live }, children);
}

/** Reads from PrinterProvider. */
export function useSharedPrinter(): PrinterLive {
  const live = useContext(PrinterContext);
  if (!live) throw new Error("useSharedPrinter må brukes inne i <PrinterProvider>");
  return live;
}
