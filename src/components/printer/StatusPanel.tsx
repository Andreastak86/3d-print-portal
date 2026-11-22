import type { PrinterSnapshot } from "@/lib/printer/types";
import { PlugIcon, PrinterIcon } from "@/components/ui/icons";

/** Large, friendly message when we don't have live contact with the printer. */
export function StatusPanel({ snapshot, portalOnline }: { snapshot: PrinterSnapshot | null; portalOnline: boolean }) {
  let title: string;
  let body: string;
  let tips: string[] = [];
  let tone: "bad" | "warn" | "muted" = "muted";

  if (!portalOnline) {
    tone = "bad";
    title = "Mistet kontakten med portalen";
    body = "Datamaskinen som kjører portalen svarer ikke. Den kan være slått av, sove eller ha mistet nettet.";
    tips = ["Sjekk at PC-en med portalen er på", "Siden kobler seg til igjen av seg selv"];
  } else if (!snapshot || snapshot.connection === "connecting") {
    title = "Kobler til printeren…";
    body = "Et lite øyeblikk.";
  } else if (snapshot.connection === "offline") {
    tone = "bad";
    title = "Printeren er ikke tilkoblet";
    body = "Vi får ikke kontakt med printeren akkurat nå.";
    tips = ["Er printeren slått på?", "Har den kontakt med Wi-Fi/nettverket?", "Vi prøver igjen automatisk"];
  } else {
    tone = "warn";
    const state = snapshot.klippyState;
    if (state === "startup" || state === null) {
      title = "Printeren starter opp…";
      body = "Dette tar vanligvis under ett minutt.";
    } else if (state === "shutdown") {
      title = "Printeren har stoppet";
      body = snapshot.klippyMessage ?? "Klipper har slått seg av. En voksen må sjekke printeren og starte den på nytt.";
    } else {
      title = "Printeren er ikke klar";
      body = snapshot.klippyMessage ?? `Klipper rapporterer status «${state}». En voksen bør sjekke printeren.`;
    }
  }

  const ring = { bad: "bg-bad/10 text-bad", warn: "bg-warn/10 text-warn", muted: "bg-surface-2 text-muted" }[tone];

  return (
    <section className="rounded-2xl border border-line bg-surface/80 p-8 text-center shadow-lg shadow-black/20">
      <div className={`mx-auto flex size-16 items-center justify-center rounded-2xl ${ring}`}>
        {tone === "bad" ? <PlugIcon className="size-8" /> : <PrinterIcon className={`size-8 ${tone === "muted" ? "animate-pulse" : ""}`} />}
      </div>
      <h2 className="mt-4 text-2xl font-semibold">{title}</h2>
      <p className="mx-auto mt-2 max-w-lg whitespace-pre-line text-muted">{body}</p>
      {tips.length > 0 && (
        <ul className="mx-auto mt-5 flex max-w-lg flex-wrap justify-center gap-2 text-sm">
          {tips.map((tip) => (
            <li key={tip} className="rounded-full bg-surface-2 px-3 py-1.5 text-muted">
              {tip}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
