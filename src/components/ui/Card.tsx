import type { ReactNode } from "react";

interface CardProps {
  title?: ReactNode;
  icon?: ReactNode;
  action?: ReactNode;
  className?: string;
  children: ReactNode;
}

export function Card({ title, icon, action, className = "", children }: CardProps) {
  return (
    <section className={`rounded-2xl border border-line bg-surface/80 p-5 shadow-lg shadow-black/20 backdrop-blur ${className}`}>
      {(title || action) && (
        <header className="mb-4 flex items-center justify-between gap-3">
          <h2 className="flex items-center gap-2 text-sm font-medium uppercase tracking-wider text-muted">
            {icon}
            {title}
          </h2>
          {action}
        </header>
      )}
      {children}
    </section>
  );
}
