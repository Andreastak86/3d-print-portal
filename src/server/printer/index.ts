/**
 * Entry point to the printer for the rest of the server code.
 *
 * The printer connection is a singleton stored on globalThis so that:
 * - all browsers share ONE connection to Moonraker,
 * - hot reload in development doesn't create duplicate connections.
 *
 * The connection is started lazily on first use and then stays up.
 */
import { getConfig } from "@/server/config";
import { MoonrakerPrinter } from "@/server/moonraker/client";
import { MockPrinter } from "./mock";
import type { PrinterSource } from "./source";

const globalForPrinter = globalThis as unknown as { __printer?: PrinterSource };

export function getPrinter(): PrinterSource {
  if (!globalForPrinter.__printer) {
    const config = getConfig();
    const printer = config.mock ? new MockPrinter() : new MoonrakerPrinter(config);
    printer.start();
    globalForPrinter.__printer = printer;
  }
  return globalForPrinter.__printer;
}

export type { PrinterSource } from "./source";
