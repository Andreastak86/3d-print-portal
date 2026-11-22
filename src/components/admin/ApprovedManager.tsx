"use client";

import Link from "next/link";
import { useState } from "react";
import type { ApprovedPrint, TobiasView } from "@/lib/portal/types";
import { apiSend, errorMessage } from "@/lib/api";
import { useApiData } from "@/hooks/useApiData";
import { formatDateTime, formatDuration } from "@/lib/format";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import { EditIcon, StarIcon, TrashIcon } from "@/components/ui/icons";
import { Thumbnail } from "@/components/printer/Thumbnail";
import { PageHeader } from "./AdminShell";
import { ApproveDialog } from "./ApproveDialog";

export function ApprovedManager() {
  const toast = useToast();
  const approved = useApiData<{ approved: ApprovedPrint[] }>("/api/admin/approved");
  // Tobias' view gives us file status (available, thumbnail, time).
  const library = useApiData<TobiasView>("/api/tobias");
  const [editing, setEditing] = useState<ApprovedPrint | null>(null);
  const [removing, setRemoving] = useState<ApprovedPrint | null>(null);
  const [busy, setBusy] = useState(false);

  const items = approved.data?.approved ?? [];
  const info = new Map(library.data?.library.map((l) => [l.id, l]));
  const categories = [...new Set(items.map((i) => i.category))];

  const reload = () => {
    approved.reload();
    library.reload();
  };

  return (
    <>
      <PageHeader
        title="Godkjente utskrifter"
        description="Dette er det Tobias kan velge mellom på sin side."
        action={
          <Link
            href="/admin/filer"
            className="inline-flex h-10 items-center gap-2 rounded-xl bg-accent px-4 text-sm font-medium text-on-accent shadow-lg shadow-accent/20 hover:brightness-110"
          >
            <StarIcon /> Godkjenn flere
          </Link>
        }
      />

      <Card>
        {approved.loading && !approved.data && <p className="py-6 text-center text-muted">Laster…</p>}
        {approved.data && items.length === 0 && (
          <div className="py-10 text-center">
            <p className="text-lg font-medium">Ingen godkjente utskrifter ennå</p>
            <p className="mt-1 text-muted">
              Gå til <Link href="/admin/filer" className="text-accent hover:underline">Filer</Link> og trykk «Godkjenn» på det Tobias skal få printe.
            </p>
          </div>
        )}
        <ul className="divide-y divide-line">
          {items.map((item) => {
            const lib = info.get(item.id);
            return (
              <li key={item.id} className="flex flex-wrap items-center gap-3 py-3">
                <Thumbnail src={lib?.thumbnailUrl ?? null} alt={item.title} size="sm" color={lib?.filamentColor} />
                <span className="text-2xl">{item.emoji}</span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate font-medium">{item.title}</span>
                    <span className="shrink-0 rounded-full bg-surface-2 px-2 py-0.5 text-xs text-muted">{item.category}</span>
                    {lib && !lib.available && <span className="shrink-0 rounded-full bg-warn/15 px-2 py-0.5 text-xs text-warn">Filen mangler</span>}
                  </div>
                  <div className="tabular mt-0.5 flex flex-wrap gap-x-3 text-sm text-muted">
                    {lib?.estimatedTime != null && <span>{formatDuration(lib.estimatedTime)}</span>}
                    <span>Printet {item.timesStarted} {item.timesStarted === 1 ? "gang" : "ganger"}</span>
                    {item.lastStartedAt && <span>Sist {formatDateTime(item.lastStartedAt)}</span>}
                    <span className="truncate" title={item.filename}>
                      {item.filename}
                    </span>
                  </div>
                </div>
                <div className="flex gap-1.5">
                  <Button size="sm" icon={<EditIcon />} onClick={() => setEditing(item)}>
                    Rediger
                  </Button>
                  <Button size="sm" variant="ghost" icon={<TrashIcon />} aria-label="Fjern" onClick={() => setRemoving(item)} />
                </div>
              </li>
            );
          })}
        </ul>
      </Card>

      <ApproveDialog
        open={editing !== null}
        heading="Rediger"
        submitLabel="Lagre"
        categories={categories}
        initial={{ title: editing?.title ?? "", emoji: editing?.emoji ?? "🧩", category: editing?.category ?? "", note: editing?.note ?? "" }}
        onClose={() => setEditing(null)}
        onSubmit={async (values) => {
          if (!editing) return;
          try {
            await apiSend(`/api/admin/approved/${editing.id}`, values, "PATCH");
            toast("Lagret");
            setEditing(null);
            reload();
          } catch (err) {
            toast(errorMessage(err), "bad");
          }
        }}
      />
      <ConfirmDialog
        open={removing !== null}
        title="Fjerne fra Tobias sin liste?"
        message={`«${removing?.title}» forsvinner fra Tobias sin side. Selve filen blir liggende på printeren.`}
        confirmLabel="Fjern"
        danger
        loading={busy}
        onConfirm={async () => {
          if (!removing) return;
          setBusy(true);
          try {
            await apiSend(`/api/admin/approved/${removing.id}`, undefined, "DELETE");
            toast("Fjernet");
            reload();
          } catch (err) {
            toast(errorMessage(err), "bad");
          } finally {
            setBusy(false);
            setRemoving(null);
          }
        }}
        onCancel={() => setRemoving(null)}
      />
    </>
  );
}
