import { requireAdminPage } from "@/server/auth";
import { AdminOverview } from "@/components/admin/AdminOverview";

export default async function Page() {
  await requireAdminPage();
  return <AdminOverview />;
}
