import { requireAdminPage } from "@/server/auth";
import { StatisticsPage } from "@/components/admin/StatisticsPage";

export default async function Page() {
  await requireAdminPage();
  return <StatisticsPage />;
}
