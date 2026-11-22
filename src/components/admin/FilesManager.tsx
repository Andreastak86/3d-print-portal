"use client";

import { useRef, useState } from "react";
import type { ApprovedPrint, PrinterFile } from "@/lib/portal/types";
import { apiSend, errorMessage } from "@/lib/api";
import { useApiData } from "@/hooks/useApiData";
import { useSharedPrinter } from "@/hooks/usePrinter";
import { printerIsFree } from "@/lib/portal/policy";
import { formatDateTime, formatDuration, formatGrams } from "@/lib/format";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import { FolderIcon, PlayIcon, StarIcon, TrashIcon, UploadIcon } from "@/components/ui/icons";
import { Thumbnail } from "@/components/printer/Thumbnail";
import { PageHeader } from "./AdminShell";
import { ApproveDialog } from "./ApproveDialog";

function folderLabel(folder: string): string {
  if (folder === ".cache") return "Fra OrcaSlicer";
  if (folder === "") return "Rot";
  if (folder.startsWith("sda1")) return "USB";
  return folder;
}

function formatSize(bytes: number): string {
  if (bytes > 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1).replace(".", ",")} MB`;
  return `${Math.round(bytes / 1024)} kB`;
}

export function FilesManager() {
  const toast = useToast();
  const { snapshot } = useSharedPrinter();
  const files = useApiData<{ files: PrinterFile[] }>("/api/admin/files");
  const approved = useApiData<{ approved: ApprovedPrint[] }>("/api/admin/approved");

  const [query, setQuery] = useState("");
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [approveFile, setApproveFile] = useState<PrinterFile | null>(null);
  const [startFile, setStartFile] = useState<PrinterFile | null>(null);
  const [deleteFile, setDeleteFile] = useState<PrinterFile | null>(null);
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const approvedPaths = new Set(approved.data?.approved.map((a) => a.filename));
  const categories = [...new Set(approved.data?.approved.map((a) => a.category))];
  const free = printerIsFree(snapshot);

  const list = (files.data?.files ?? []).filter((f) => f.displayName.toLowerCase().includes(query.toLowerCase()) || f.path.toLowerCase().includes(query.toLowerCase()));

  const upload = async (fileList: FileList | null) => {
    const file = fileList?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const form = new FormData();
      form.set("file", file);
      await apiSend("/api/admin/files", form);
      toast(`«${file.name}» er lastet opp`);
      files.reload();
    } catch (err) {
      toast(errorMessage(err), "bad");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const act = async (fn: () => Promise<unknown>, success: string) => {
    setBusy(true);
    try {
      await fn();
      toast(success);
      files.reload();
      approved.reload();
    } catch (err) {
      toast(errorMessage(err), "bad");
    } finally {
      setBusy(false);
      setStartFile(null);
      setDeleteFile(null);
    }
  };

  return (
    <>
      <PageHeader
        title="Filer"
        description="G-code-filer på printeren. Godkjenn filer så Tobias kan starte dem."
        action={
          <a href="/slik-printer-du" className="text-sm text-muted hover:text-text">
            Fra MakerWorld til print – guide →
          </a>
        }
      />

      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          void upload(e.dataTransfer.files);
        }}
        className={`mb-6 flex flex-col items-center gap-3 rounded-2xl border-2 border-dashed p-6 text-center transition sm:flex-row sm:text-left ${
          dragOver ? "border-accent bg-accent/10" : "border-line"
        }`}
      >
        <UploadIcon className="size-8 text-muted" />
        <div className="flex-1">
          <p className="font-medium">Last opp G-code</p>
          <p className="text-sm text-muted">Dra en .gcode-fil hit, eller velg fil. Filen lagres i mappen «portal» på printeren.</p>
        </div>
        <input ref={inputRef} type="file" accept=".gcode,.g,.gco" className="hidden" onChange={(e) => upload(e.target.files)} />
        <Button variant="primary" icon={<UploadIcon />} loading={uploading} onClick={() => inputRef.current?.click()}>
          Velg fil
        </Button>
      </div>

      <Card
        title={`${files.data?.files.length ?? "…"} filer`}
        icon={<FolderIcon />}
        action={
          <input
            type="search"
            placeholder="Søk…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="h-9 w-40 rounded-lg border border-line bg-surface-2 px-3 text-sm outline-none focus:border-accent sm:w-56"
          />
        }
      >
        {files.error && !files.data && <p className="py-6 text-center text-bad">{files.error}</p>}
        {files.loading && !files.data && <p className="py-6 text-center text-muted">Henter filer fra printeren…</p>}
        <ul className="divide-y divide-line">
          {list.map((f) => {
            const isApproved = approvedPaths.has(f.path);
            return (
              <li key={f.path} className="flex flex-wrap items-center gap-3 py-3">
                <Thumbnail src={f.thumbnailUrl} alt={f.displayName} size="sm" color={f.filamentColor} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate font-medium" title={f.path}>
                      {f.displayName}
                    </span>
                    {isApproved && (
                      <span className="flex shrink-0 items-center gap-1 rounded-full bg-ok/15 px-2 py-0.5 text-xs font-medium text-ok">
                        <StarIcon className="size-3" /> Godkjent
                      </span>
                    )}
                  </div>
                  <div className="tabular mt-0.5 flex flex-wrap gap-x-3 text-sm text-muted">
                    <span className={f.folder === ".cache" ? "text-warn" : ""} title={f.folder === ".cache" ? "Midlertidig mappe – kan bli ryddet bort" : undefined}>
                      {folderLabel(f.folder)}
                    </span>
                    {f.estimatedTime != null && <span>{formatDuration(f.estimatedTime)}</span>}
                    {f.filamentWeight != null && <span>{formatGrams(f.filamentWeight)}</span>}
                    <span>{formatSize(f.size)}</span>
                    <span>{formatDateTime(f.modified)}</span>
                  </div>
                </div>
                <div className="flex gap-1.5">
                  {!isApproved && (
                    <Button size="sm" icon={<StarIcon />} onClick={() => setApproveFile(f)}>
                      Godkjenn
                    </Button>
                  )}
                  <Button size="sm" icon={<PlayIcon />} disabled={!free.ok} title={free.ok ? undefined : free.reason} onClick={() => setStartFile(f)}>
                    Start
                  </Button>
                  <Button size="sm" variant="ghost" icon={<TrashIcon />} aria-label="Slett" onClick={() => setDeleteFile(f)} />
                </div>
              </li>
            );
          })}
        </ul>
        {files.data && list.length === 0 && <p className="py-6 text-center text-muted">Ingen filer funnet.</p>}
      </Card>

      <ApproveDialog
        open={approveFile !== null}
        heading="Godkjenn for Tobias"
        submitLabel="Godkjenn"
        categories={categories}
        initial={{ title: approveFile?.displayName ?? "", emoji: "🧩", category: categories[0] ?? "Leker", note: "" }}
        onClose={() => setApproveFile(null)}
        onSubmit={async (values) => {
          if (!approveFile) return;
          try {
            await apiSend("/api/admin/approved", { path: approveFile.path, ...values });
            toast(`${values.emoji} ${values.title} er godkjent for Tobias`);
            setApproveFile(null);
            files.reload();
            approved.reload();
          } catch (err) {
            toast(errorMessage(err), "bad");
          }
        }}
      />
      <ConfirmDialog
        open={startFile !== null}
        title="Starte utskrift?"
        message={
          <>
            <p>
              Start «{startFile?.displayName}»{startFile?.estimatedTime ? ` (ca. ${formatDuration(startFile.estimatedTime)})` : ""}?
            </p>
            <p className="mt-2 text-sm">Sjekk at byggeplaten er tom først.</p>
          </>
        }
        confirmLabel="Start"
        loading={busy}
        onConfirm={() => startFile && act(() => apiSend("/api/admin/control", { action: "start", path: startFile.path }), "Utskriften starter")}
        onCancel={() => setStartFile(null)}
      />
      <ConfirmDialog
        open={deleteFile !== null}
        title="Slette filen?"
        message={`«${deleteFile?.displayName}» slettes permanent fra printeren${deleteFile && approvedPaths.has(deleteFile.path) ? " og fjernes fra Tobias sine godkjente utskrifter" : ""}.`}
        confirmLabel="Slett"
        danger
        loading={busy}
        onConfirm={() => deleteFile && act(() => apiSend(`/api/admin/files?path=${encodeURIComponent(deleteFile.path)}`, undefined, "DELETE"), "Filen er slettet")}
        onCancel={() => setDeleteFile(null)}
      />
    </>
  );
}
