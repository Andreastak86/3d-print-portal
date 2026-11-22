"use client";

import { useEffect, useState } from "react";
import type { ApiError, HistoryResponse } from "@/lib/printer/types";

export interface HistoryState {
  data: HistoryResponse | null;
  error: string | null;
  loading: boolean;
}

/**
 * Fetches print history. Refreshes whenever `refreshKey` changes
 * (e.g. when the printer reports a new/finished job, or reconnects).
 * Keeps the last data shown if a later fetch fails.
 */
export function useHistory(refreshKey: string | number, enabled: boolean, limit = 25): HistoryState {
  const [state, setState] = useState<HistoryState>({ data: null, error: null, loading: true });

  useEffect(() => {
    if (!enabled) return;
    const controller = new AbortController();

    (async () => {
      try {
        const res = await fetch(`/api/printer/history?limit=${limit}`, { signal: controller.signal });
        const body = (await res.json()) as HistoryResponse | ApiError;
        if ("error" in body) throw new Error(body.error.message);
        setState({ data: body, error: null, loading: false });
      } catch (err) {
        if (controller.signal.aborted) return;
        setState((prev) => ({
          data: prev.data,
          error: err instanceof Error ? err.message : "Kunne ikke hente historikk",
          loading: false,
        }));
      }
    })();

    return () => controller.abort();
  }, [refreshKey, enabled, limit]);

  return state;
}
