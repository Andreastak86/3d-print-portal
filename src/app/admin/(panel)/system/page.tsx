import { requireAdminPage } from "@/server/auth";
import { SystemInfoView } from "@/components/admin/SystemInfoView";

export default async function Page() {
  await requireAdminPage();
  return <SystemInfoView />;
}
