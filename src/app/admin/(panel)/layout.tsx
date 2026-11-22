import { AdminShell } from "@/components/admin/AdminShell";

/** Admin pages depend on login and must never be prerendered. */
export const dynamic = "force-dynamic";

export const metadata = { title: "Admin – 3D Print Portal" };

/**
 * NB: The layout doesn't check login (layouts don't re-render on navigation).
 * Each page calls requireAdminPage(), and each admin API route calls adminGuard().
 */
export default function AdminLayout({ children }: LayoutProps<"/admin">) {
  return <AdminShell>{children}</AdminShell>;
}
