"use client";

import { useState } from "react";
import type { LibraryItem } from "@/lib/portal/types";
import { formatDuration, formatFinishTime, formatGrams } from "@/lib/format";
import { apiSend, errorMessage } from "@/lib/api";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { CheckIcon, PlayIcon } from "@/components/ui/icons";
import { Thumbnail } from "@/components/printer/Thumbnail";

interface StartDialogProps {
  item: LibraryItem | null;
  blockedReason: string | null;
  /** Whether the checklist requires "an adult is present" */
  requireAdult: boolean;
  onClose: () => void;
  onStarted: (item: LibraryItem) => void;
}

function CheckItem({ checked, onChange, children }: { checked: boolean; onChange: (v: boolean) => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`flex w-full items-center gap-4 rounded-2xl border-2 p-4 text-left text-lg transition ${
        checked ? "border-ok bg-ok/10" : "border-line bg-surface-2/50 hover:border-muted/60"
      }`}
    >
      <span
        className={`flex size-8 shrink-0 items-center justify-center rounded-lg border-2 transition ${
          checked ? "border-ok bg-ok text-on-accent" : "border-muted"
        }`}
      >
        {checked && <CheckIcon className="size-5" strokeWidth={3} />}
      </span>
      <span className="font-medium">{children}</span>
    </button>
  );
}

export function StartDialog({ item, blockedReason, requireAdult, onClose, onStarted }: StartDialogProps) {
  return (
    <Modal open={item !== null} onClose={onClose}>
      {/* Key resets the checklist every time a new print is opened. */}
      {item && (
        <StartDialogContent key={item.id} item={item} blockedReason={blockedReason} requireAdult={requireAdult} onClose={onClose} onStarted={onStarted} />
      )}
    </Modal>
  );
}

function StartDialogContent({ item, blockedReason, requireAdult, onClose, onStarted }: StartDialogProps & { item: LibraryItem }) {
  const [plateClear, setPlateClear] = useState(false);
  const [adultPresent, setAdultPresent] = useState(false);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const ready = plateClear && (adultPresent || !requireAdult) && !blockedReason && item.available;

  const start = async () => {
    setStarting(true);
    setError(null);
    try {
      await apiSend("/api/tobias/start", { id: item.id, confirmations: { plateClear, adultPresent } });
      onStarted(item);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setStarting(false);
    }
  };

  return (
    <div>
      <div className="flex items-center gap-4">
        <Thumbnail src={item.thumbnailUrl} alt={item.title} size="lg" color={item.filamentColor} />
        <div className="min-w-0">
          <div className="text-4xl">{item.emoji}</div>
          <h2 className="mt-1 text-2xl font-bold">{item.title}</h2>
          <p className="mt-1 text-muted">
            {item.estimatedTime != null && <>Tar ca. {formatDuration(item.estimatedTime)}</>}
            {item.filamentWeight != null && <> · {formatGrams(item.filamentWeight)} plast</>}
          </p>
          {item.estimatedTime != null && !blockedReason && (
            <p className="text-sm text-muted">Blir ferdig {formatFinishTime(item.estimatedTime + 300)}</p>
          )}
        </div>
      </div>

      {item.note && <p className="mt-4 rounded-xl bg-info/10 px-4 py-3 text-sm text-info">{item.note}</p>}

      {blockedReason ? (
        <p className="mt-6 rounded-2xl border border-warn/30 bg-warn/10 p-4 text-warn">{blockedReason}</p>
      ) : !item.available ? (
        <p className="mt-6 rounded-2xl border border-warn/30 bg-warn/10 p-4 text-warn">
          Denne filen finnes ikke på printeren akkurat nå. Spør en voksen.
        </p>
      ) : (
        <>
          <h3 className="mt-6 mb-3 font-semibold">Før vi starter – sjekk dette:</h3>
          <div className="space-y-3">
            <CheckItem checked={plateClear} onChange={setPlateClear}>
              Byggeplaten er tom og ren 🧽
            </CheckItem>
            {requireAdult && (
              <CheckItem checked={adultPresent} onChange={setAdultPresent}>
                En voksen er her og vet at jeg printer 🙋
              </CheckItem>
            )}
          </div>
        </>
      )}

      {error && <p className="mt-4 rounded-xl bg-bad/10 px-4 py-3 text-bad">{error}</p>}

      <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <Button size="lg" variant="ghost" onClick={onClose}>
          Avbryt
        </Button>
        <Button size="xl" variant="success" icon={<PlayIcon />} disabled={!ready} loading={starting} onClick={start}>
          Start utskrift
        </Button>
      </div>
    </div>
  );
}
