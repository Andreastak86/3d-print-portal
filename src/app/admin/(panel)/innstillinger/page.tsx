import { requireAdminPage } from "@/server/auth";
import { SettingsForm } from "@/components/admin/SettingsForm";

export default async function Page() {
  await requireAdminPage();
  return <SettingsForm />;
}
