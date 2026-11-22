import { requireAdminPage } from "@/server/auth";
import { ActivityLog } from "@/components/admin/ActivityLog";

export default async function Page() {
  await requireAdminPage();
  return <ActivityLog />;
}
