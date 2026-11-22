"use client";

import { useCallback, useEffect, useState } from "react";
import { apiGet, errorMessage } from "@/lib/api";

export interface ApiData<T> {
  data: T | null;
  error: string | null;
  loading: boolean;
  reload: () => void;
}

/**
 * Fetches JSON from an API route. `reload()` fetches again; `refreshKey` changes do the same.
 * Optional polling with `intervalMs`. Keeps the old data shown if a refetch fails.
 */
export function useApiData<T>(url: string, { refreshKey, intervalMs }: { refreshKey?: unknown; intervalMs?: number } = {}): ApiData<T> {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [tick, setTick] = useState(0);

  const reload = useCallback(() => setTick((t) => t + 1), []);

  useEffect(() => {
    const controller = new AbortController();
    const load = async () => {
      try {
        const result = await apiGet<T>(url, controller.signal);
        setData(result);
        setError(null);
      } catch (err) {
        if (!controller.signal.aborted) setError(errorMessage(err));
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    };
    void load();
    const timer = intervalMs ? setInterval(load, intervalMs) : null;
    return () => {
      controller.abort();
      if (timer) clearInterval(timer);
    };
  }, [url, tick, refreshKey, intervalMs]);

  return { data, error, loading, reload };
}
