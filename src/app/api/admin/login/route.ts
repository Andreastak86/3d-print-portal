import { login } from "@/server/auth";
import { logActivity } from "@/server/store";
import { apiError, ok, readJson } from "@/server/http";

const MESSAGES = {
  not_configured: "Admin-passord er ikke satt. Legg inn ADMIN_PASSWORD i .env.local og start portalen på nytt.",
  rate_limited: "For mange forsøk. Vent ett minutt og prøv igjen.",
  wrong_password: "Feil passord.",
} as const;

export async function POST(request: Request): Promise<Response> {
  try {
    const { password } = await readJson(request);
    const result = await login(typeof password === "string" ? password : "");
    if (!result.ok) {
      if (result.reason === "wrong_password") await logActivity("system", "Mislykket admin-innlogging");
      const status = result.reason === "rate_limited" ? 429 : result.reason === "not_configured" ? 503 : 401;
      return Response.json({ error: { code: result.reason, message: MESSAGES[result.reason] } }, { status });
    }
    await logActivity("admin", "Logget inn");
    return ok();
  } catch (err) {
    return apiError(err);
  }
}
