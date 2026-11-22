"use client";

import { MoonIcon, SunIcon } from "./icons";

/**
 * Switches between light and dark mode. The icon is chosen with CSS (`dark:`),
 * so the server and browser render the same thing (no hydration differences).
 */
export function ThemeToggle({ withLabel = false }: { withLabel?: boolean }) {
  const toggle = () => {
    const root = document.documentElement;
    const next = root.dataset.theme === "dark" ? "light" : "dark";
    root.dataset.theme = next;
    try {
      localStorage.setItem("theme", next);
    } catch {
      // private mode – the choice just won't be remembered
    }
  };

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label="Bytt mellom lys og mørk modus"
      title="Bytt mellom lys og mørk modus"
      className="flex h-10 shrink-0 items-center gap-2 rounded-full bg-surface-2 px-3 text-sm font-medium text-muted transition hover:text-text"
    >
      <MoonIcon className="size-5 dark:hidden" />
      <SunIcon className="hidden size-5 dark:block" />
      {withLabel && (
        <>
          <span className="dark:hidden">Mørk modus</span>
          <span className="hidden dark:inline">Lys modus</span>
        </>
      )}
    </button>
  );
}
