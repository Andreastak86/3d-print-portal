import { redirect } from "next/navigation";
import { adminPasswordConfigured, isAdmin } from "@/server/auth";
import { LoginForm } from "@/components/admin/LoginForm";

export const dynamic = "force-dynamic";

export const metadata = { title: "Admin – 3D Print Portal" };

export default async function LoginPage() {
  if (await isAdmin()) redirect("/admin");
  return <LoginForm configured={adminPasswordConfigured()} />;
}
