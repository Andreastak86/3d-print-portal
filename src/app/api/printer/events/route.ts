/**
 * Server-Sent Events: live printer status to the browser.
 * Sends a "snapshot" right away and on every change, plus "history" when the history changes.
 */
import { getPrinter } from "@/server/printer";
import type { PrinterSnapshot } from "@/lib/printer/types";

export const dynamic = "force-dynamic";

const KEEPALIVE_MS = 15_000;

export function GET(request: Request): Response {
  const printer = getPrinter();
  const encoder = new TextEncoder();
  let cleanup: (() => void) | null = null;

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      let closed = false;
      const write = (chunk: string) => {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(chunk));
        } catch {
          stop();
        }
      };
      const send = (event: string, data: unknown) => write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);

      const offSnapshot = printer.onSnapshot((s: PrinterSnapshot) => send("snapshot", s));
      const offHistory = printer.onHistoryChanged(() => send("history", {}));
      // Comment line keeps the connection alive through proxies/sleeping network cards.
      const keepalive = setInterval(() => write(": keepalive\n\n"), KEEPALIVE_MS);

      const stop = () => {
        if (closed) return;
        closed = true;
        offSnapshot();
        offHistory();
        clearInterval(keepalive);
        try {
          controller.close();
        } catch {
          // already closed
        }
      };
      cleanup = stop;
      request.signal.addEventListener("abort", stop);

      write("retry: 3000\n\n");
      send("snapshot", printer.getSnapshot());
    },
    cancel() {
      cleanup?.();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
