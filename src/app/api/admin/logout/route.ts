import { logout } from "@/server/auth";
import { ok } from "@/server/http";

export async function POST(): Promise<Response> {
  await logout();
  return ok();
}
