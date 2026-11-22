"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { apiSend, errorMessage } from "@/lib/api";
import { Button } from "@/components/ui/Button";
import { UploadIcon } from "@/components/ui/icons";

/**
 * Big, friendly upload box for Tobias. Drag a .gcode file here or choose one.
 * Calls onUploaded with the file's path on the printer.
 */
export function UploadBox({ onUploaded }: { onUploaded: (path: string) => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const upload = async (files: FileList | null) => {
    const file = files?.[0];
    if (!file) return;
    setError(null);
    setUploading(file.name);
    try {
      const form = new FormData();
      form.set("file", file);
      const { path } = await apiSend<{ path: string }>("/api/tobias/upload", form);
      onUploaded(path);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setUploading(null);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
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
      className={`rounded-3xl border-2 border-dashed p-5 transition ${dragOver ? "border-accent bg-accent/10" : "border-line bg-surface/50"}`}
    >
      <div className="flex flex-col items-center gap-4 text-center sm:flex-row sm:text-left">
        <div className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-accent/15 text-accent">
          <UploadIcon className="size-7" />
        </div>
        <div className="flex-1">
          <p className="text-lg font-semibold">{uploading ? `Laster opp ${uploading}…` : "Har du laget en fil i OrcaSlicer?"}</p>
          <p className="text-muted">
            Dra <strong>.gcode</strong>-filen hit, eller trykk på knappen.{" "}
            <Link href="/slik-printer-du" className="text-accent hover:underline">
              Hvordan lager jeg en?
            </Link>
          </p>
        </div>
        <input ref={inputRef} type="file" accept=".gcode,.g,.gco" className="hidden" onChange={(e) => upload(e.target.files)} />
        <Button size="lg" variant="primary" icon={<UploadIcon />} loading={uploading !== null} onClick={() => inputRef.current?.click()}>
          Last opp fil
        </Button>
      </div>
      {error && <p className="mt-4 rounded-xl bg-bad/10 px-4 py-3 text-bad">{error}</p>}
    </div>
  );
}
