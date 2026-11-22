interface ToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  description?: string;
  disabled?: boolean;
}

export function Toggle({ checked, onChange, label, description, disabled }: ToggleProps) {
  return (
    <label className={`flex cursor-pointer items-start justify-between gap-4 py-3 ${disabled ? "opacity-50" : ""}`}>
      <span>
        <span className="block font-medium">{label}</span>
        {description && <span className="mt-0.5 block text-sm text-muted">{description}</span>}
      </span>
      <span className="relative mt-0.5 inline-flex shrink-0">
        <input
          type="checkbox"
          className="peer sr-only"
          checked={checked}
          disabled={disabled}
          onChange={(e) => onChange(e.target.checked)}
        />
        <span className="h-6 w-11 rounded-full bg-surface-2 ring-1 ring-line transition peer-checked:bg-ok peer-focus-visible:ring-2 peer-focus-visible:ring-accent" />
        <span className="absolute top-0.5 left-0.5 size-5 rounded-full bg-text shadow transition peer-checked:translate-x-5" />
      </span>
    </label>
  );
}
