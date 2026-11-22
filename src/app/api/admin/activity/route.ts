import { adminGuard } from "@/server/auth";
import { readStore } from "@/server/store";

export const dynamic = "force-dynamic";

export async function GET(): Promise<Response> {
  const denied = await adminGuard();
  if (denied) return denied;
  const { activity } = await readStore();
  return Response.json({ activity });
}
