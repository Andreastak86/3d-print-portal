"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { apiSend, errorMessage } from "@/lib/api";
import { Button } from "@/components/ui/Button";
import { ShieldIcon } from "@/components/ui/icons";
import { ThemeToggle } from "@/components/ui/ThemeToggle";

export function LoginForm({ configured }: { configured: boolean }) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await apiSend("/api/admin/login", { password });
      router.replace("/admin");
      router.refresh();
    } catch (err) {
      setError(errorMessage(err));
      setLoading(false);
    }
  };

  return (
    <div className="relative flex flex-1 items-center justify-center px-4 py-12">
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>
      <div className="w-full max-w-sm rounded-2xl border border-line bg-surface/80 p-8 shadow-2xl">
        <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-accent/15 text-accent">
          <ShieldIcon className="size-7" />
        </div>
        <h1 className="mt-4 text-center text-2xl font-semibold">Admin</h1>
        <p className="mt-1 text-center text-sm text-muted">3D Print Portal</p>

        {configured ? (
          <form onSubmit={submit} className="mt-6 space-y-4">
            <label className="block">
              <span className="text-sm text-muted">Passord</span>
              <input
                type="password"
                autoFocus
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1 h-11 w-full rounded-xl border border-line bg-surface-2 px-3 outline-none focus:border-accent"
              />
            </label>
            {error && <p className="rounded-lg bg-bad/10 px-3 py-2 text-sm text-bad">{error}</p>}
            <Button type="submit" variant="primary" size="lg" className="w-full" loading={loading} disabled={!password}>
              Logg inn
            </Button>
          </form>
        ) : (
          <div className="mt-6 rounded-xl border border-warn/30 bg-warn/10 p-4 text-sm">
            <p className="font-medium text-warn">Admin-passord er ikke satt</p>
            <p className="mt-2 text-muted">
              Åpne <code className="text-text">.env.local</code> i prosjektmappen, legg til en linje som{" "}
              <code className="text-text">ADMIN_PASSWORD=ditt-passord</code> og start portalen på nytt.
            </p>
          </div>
        )}

        <Link href="/" className="mt-6 block text-center text-sm text-muted hover:text-text">
          ← Tilbake til printeren
        </Link>
      </div>
    </div>
  );
}
