import type { PrinterSnapshot } from "@/lib/printer/types";
import { Badge, type BadgeTone } from "@/components/ui/Badge";

export function ConnectionBadge({ snapshot, portalOnline }: { snapshot: PrinterSnapshot | null; portalOnline: boolean }) {
  let tone: BadgeTone;
  let label: string;
  let pulse = false;

  if (!portalOnline) {
    [tone, label] = ["bad", "Portalen svarer ikke"];
  } else if (!snapshot || snapshot.connection === "connecting") {
    [tone, label, pulse] = ["muted", "Kobler til…", true];
  } else if (snapshot.connection === "offline") {
    [tone, label] = ["bad", "Frakoblet"];
  } else if (snapshot.connection === "klippy_not_ready") {
    [tone, label, pulse] = ["warn", "Starter opp", true];
  } else if (snapshot.printState === "printing") {
    [tone, label, pulse] = ["accent", "Printer", true];
  } else if (snapshot.printState === "paused") {
    [tone, label] = ["warn", "Pause"];
  } else if (snapshot.printState === "error") {
    [tone, label] = ["bad", "Feil"];
  } else {
    [tone, label] = ["ok", "Tilkoblet"];
  }

  return (
    <Badge tone={tone} pulse={pulse}>
      {label}
    </Badge>
  );
}
