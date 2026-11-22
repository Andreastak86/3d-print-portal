"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";

export const EMOJI_CHOICES = ["🧩", "🚗", "🦖", "🐉", "🐱", "🚀", "⚽", "🎮", "🔑", "🏠", "📱", "🎁", "🌟", "🔧", "🪀", "🎲", "🛸", "🤖"];

export interface ApproveValues {
  title: string;
  emoji: string;
  category: string;
  note: string;
}

interface ApproveDialogProps {
  open: boolean;
  heading: string;
  initial: ApproveValues;
  categories: string[];
  submitLabel: string;
  onSubmit: (values: ApproveValues) => Promise<void>;
  onClose: () => void;
}

export function ApproveDialog(props: ApproveDialogProps) {
  return (
    <Modal open={props.open} onClose={props.onClose} title={props.heading}>
      {props.open && <ApproveForm {...props} />}
    </Modal>
  );
}

function ApproveForm({ initial, categories, submitLabel, onSubmit, onClose }: ApproveDialogProps) {
  const [values, setValues] = useState(initial);
  const [saving, setSaving] = useState(false);
  const set = <K extends keyof ApproveValues>(key: K, value: ApproveValues[K]) => setValues((v) => ({ ...v, [key]: value }));

  const input = "mt-1 h-10 w-full rounded-xl border border-line bg-surface-2 px-3 outline-none focus:border-accent";

  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
          await onSubmit(values);
        } finally {
          setSaving(false);
        }
      }}
      className="space-y-4"
    >
      <label className="block">
        <span className="text-sm text-muted">Navn Tobias ser</span>
        <input className={input} value={values.title} maxLength={80} onChange={(e) => set("title", e.target.value)} required />
      </label>

      <div>
        <span className="text-sm text-muted">Ikon</span>
        <div className="mt-1 flex flex-wrap gap-1.5">
          {EMOJI_CHOICES.map((emoji) => (
            <button
              key={emoji}
              type="button"
              onClick={() => set("emoji", emoji)}
              className={`size-10 rounded-xl text-xl transition ${values.emoji === emoji ? "bg-accent/25 ring-2 ring-accent" : "bg-surface-2 hover:bg-line"}`}
            >
              {emoji}
            </button>
          ))}
        </div>
      </div>

      <label className="block">
        <span className="text-sm text-muted">Kategori</span>
        <input className={input} value={values.category} maxLength={40} list="category-options" onChange={(e) => set("category", e.target.value)} required />
        <datalist id="category-options">
          {categories.map((c) => (
            <option key={c} value={c} />
          ))}
        </datalist>
      </label>

      <label className="block">
        <span className="text-sm text-muted">Notat til Tobias (valgfritt)</span>
        <textarea
          className="mt-1 min-h-20 w-full rounded-xl border border-line bg-surface-2 px-3 py-2 outline-none focus:border-accent"
          value={values.note}
          maxLength={300}
          placeholder="F.eks. «Husk å bruke rød filament»"
          onChange={(e) => set("note", e.target.value)}
        />
      </label>

      <div className="flex justify-end gap-2 pt-2">
        <Button variant="ghost" onClick={onClose}>
          Avbryt
        </Button>
        <Button type="submit" variant="primary" loading={saving}>
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}
