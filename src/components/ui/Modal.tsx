"use client";

import { useEffect, useRef, type ReactNode } from "react";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  children: ReactNode;
  size?: "sm" | "md" | "lg";
}

/** Modal based on the native <dialog> (Escape, focus handling and backdrop for free). */
export function Modal({ open, onClose, title, children, size = "md" }: ModalProps) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  const width = { sm: "max-w-sm", md: "max-w-lg", lg: "max-w-2xl" }[size];

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => {
        if (e.target === ref.current) onClose();
      }}
      className={`m-auto w-[calc(100%-2rem)] ${width} rounded-2xl border border-line bg-surface p-0 text-text shadow-2xl backdrop:bg-black/50 backdrop:backdrop-blur-sm`}
    >
      {open && (
        <div className="p-6">
          {title && <h2 className="mb-4 text-xl font-semibold">{title}</h2>}
          {children}
        </div>
      )}
    </dialog>
  );
}

interface ConfirmProps {
  open: boolean;
  title: string;
  message: ReactNode;
  confirmLabel: string;
  danger?: boolean;
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({ open, title, message, confirmLabel, danger, loading, onConfirm, onCancel }: ConfirmProps) {
  return (
    <Modal open={open} onClose={onCancel} title={title} size="sm">
      <div className="text-muted">{message}</div>
      <div className="mt-6 flex justify-end gap-2">
        <button type="button" onClick={onCancel} className="h-10 rounded-xl px-4 text-sm font-medium text-muted hover:bg-surface-2 hover:text-text">
          Avbryt
        </button>
        <button
          type="button"
          onClick={onConfirm}
          disabled={loading}
          className={`h-10 rounded-xl px-4 text-sm font-semibold disabled:opacity-50 ${danger ? "bg-bad text-on-accent" : "bg-accent text-on-accent"}`}
        >
          {loading ? "Vent…" : confirmLabel}
        </button>
      </div>
    </Modal>
  );
}
