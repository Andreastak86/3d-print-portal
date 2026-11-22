/** Small fetch helper for the browser. Throws Error with the server's Norwegian message. */

export class ApiRequestError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code: string,
  ) {
    super(message);
  }
}

async function handle<T>(res: Response): Promise<T> {
  let body: unknown = null;
  try {
    body = await res.json();
  } catch {
    // not JSON
  }
  if (!res.ok) {
    const err = (body as { error?: { message?: string; code?: string } } | null)?.error;
    if (res.status === 401 && typeof window !== "undefined" && window.location.pathname.startsWith("/admin") && window.location.pathname !== "/admin/login") {
      // Intentional full reload: the session has expired and all admin state should be reset.
      // eslint-disable-next-line @next/next/no-location-assign-relative-destination
      window.location.href = "/admin/login";
    }
    throw new ApiRequestError(err?.message ?? `Noe gikk galt (${res.status})`, res.status, err?.code ?? "unknown");
  }
  return body as T;
}

export async function apiGet<T>(url: string, signal?: AbortSignal): Promise<T> {
  let res: Response;
  try {
    res = await fetch(url, { signal, cache: "no-store" });
  } catch (err) {
    if (signal?.aborted) throw err;
    throw new ApiRequestError("Fikk ikke kontakt med portalen", 0, "network");
  }
  return handle<T>(res);
}

export async function apiSend<T = { ok: true }>(url: string, body?: unknown, method = "POST"): Promise<T> {
  let res: Response;
  try {
    res = await fetch(url, {
      method,
      headers: body instanceof FormData ? undefined : { "Content-Type": "application/json" },
      body: body instanceof FormData ? body : body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiRequestError("Fikk ikke kontakt med portalen", 0, "network");
  }
  return handle<T>(res);
}

export function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : "Noe gikk galt";
}
