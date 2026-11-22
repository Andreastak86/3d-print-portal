import { requireAdminPage } from "@/server/auth";
import { ApprovedManager } from "@/components/admin/ApprovedManager";

export default async function Page() {
  await requireAdminPage();
  return <ApprovedManager />;
}
