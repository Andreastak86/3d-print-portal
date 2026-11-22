import { requireAdminPage } from "@/server/auth";
import { FilesManager } from "@/components/admin/FilesManager";

export default async function Page() {
  await requireAdminPage();
  return <FilesManager />;
}
