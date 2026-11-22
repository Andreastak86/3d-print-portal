import { requireAdminPage } from "@/server/auth";
import { GcodeConsole } from "@/components/admin/GcodeConsole";

export default async function Page() {
  await requireAdminPage();
  return <GcodeConsole />;
}
