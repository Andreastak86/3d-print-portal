"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { apiSend } from "@/lib/api";
import { PrinterProvider, useSharedPrinter } from "@/hooks/usePrinter";
import { ConnectionBadge } from "@/components/printer/ConnectionBadge";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import {
  ChartIcon,
  CpuIcon,
  FolderIcon,
  GearIcon,
  HomeIcon,
  ListIcon,
  LogoutIcon,
  PrinterIcon,
  StarIcon,
  TerminalIcon,
} from "@/components/ui/icons";

const NAV = [
  { href: "/admin", label: "Oversikt", icon: PrinterIcon },
  { href: "/admin/filer", label: "Filer", icon: FolderIcon },
  { href: "/admin/godkjente", label: "Godkjente", icon: StarIcon },
  { href: "/admin/statistikk", label: "Statistikk", icon: ChartIcon },
  { href: "/admin/konsoll", label: "Konsoll", icon: TerminalIcon },
  { href: "/admin/system", label: "System", icon: CpuIcon },
  { href: "/admin/aktivitet", label: "Aktivitet", icon: ListIcon },
  { href: "/admin/innstillinger", label: "Innstillinger", icon: GearIcon },
];

export function AdminShell({ children }: { children: ReactNode }) {
  return (
    <PrinterProvider>
      <Shell>{children}</Shell>
    </PrinterProvider>
  );
}

function Shell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { snapshot, portalOnline } = useSharedPrinter();

  const logout = async () => {
    await apiSend("/api/admin/logout").catch(() => {});
    router.replace("/admin/login");
    router.refresh();
  };

  return (
    <div className="flex flex-1 flex-col lg:flex-row">
      <aside className="border-b border-line bg-surface/60 backdrop-blur lg:sticky lg:top-0 lg:h-screen lg:w-60 lg:shrink-0 lg:border-r lg:border-b-0">
        <div className="flex items-center justify-between gap-3 px-4 py-4 lg:px-5 lg:py-6">
          <Link href="/admin" className="flex items-center gap-2.5">
            <div className="flex size-9 items-center justify-center rounded-lg bg-accent text-sm font-bold text-on-accent">3D</div>
            <div className="leading-tight">
              <div className="font-semibold">Print Portal</div>
              <div className="text-xs text-muted">Admin</div>
            </div>
          </Link>
          <div className="flex items-center gap-2 lg:hidden">
            <ThemeToggle />
            <ConnectionBadge snapshot={snapshot} portalOnline={portalOnline} />
          </div>
        </div>
        <nav className="flex gap-1 overflow-x-auto px-3 pb-3 lg:flex-col lg:overflow-visible lg:pb-0">
          {NAV.map(({ href, label, icon: Icon }) => {
            const active = href === "/admin" ? pathname === "/admin" : pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className={`flex shrink-0 items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition ${
                  active ? "bg-accent/15 text-accent" : "text-muted hover:bg-surface-2 hover:text-text"
                }`}
              >
                <Icon className="size-4.5" />
                {label}
              </Link>
            );
          })}
        </nav>
        <div className="hidden px-3 pt-6 lg:block">
          <div className="border-t border-line pt-4">
            <Link href="/" className="flex items-center gap-3 rounded-xl px-3 py-2 text-sm text-muted hover:bg-surface-2 hover:text-text">
              <HomeIcon className="size-4.5" /> Tobias-siden
            </Link>
            <button
              type="button"
              onClick={logout}
              className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm text-muted hover:bg-surface-2 hover:text-text"
            >
              <LogoutIcon className="size-4.5" /> Logg ut
            </button>
          </div>
        </div>
      </aside>

      <main className="min-w-0 flex-1">
        <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 lg:py-8">
          <div className="mb-6 hidden items-center justify-end gap-2 lg:flex">
            <ThemeToggle withLabel />
            {snapshot?.mock && (
              <span className="rounded-full border border-info/30 px-2.5 py-1 text-xs font-medium text-info">Simulert printer</span>
            )}
            <ConnectionBadge snapshot={snapshot} portalOnline={portalOnline} />
          </div>
          {children}
          <div className="mt-10 flex justify-center gap-4 text-sm text-muted lg:hidden">
            <Link href="/">Tobias-siden</Link>
            <button type="button" onClick={logout}>
              Logg ut
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}

export function PageHeader({ title, description, action }: { title: string; description?: string; action?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-2xl font-semibold">{title}</h1>
        {description && <p className="mt-1 text-muted">{description}</p>}
      </div>
      {action}
    </div>
  );
}
