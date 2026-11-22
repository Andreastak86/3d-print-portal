import { adminGuard } from "@/server/auth";
import { removeApproved, updateApproved } from "@/server/library";
import { apiError, ok, readJson, str } from "@/server/http";

export async function PATCH(request: Request, ctx: RouteContext<"/api/admin/approved/[id]">): Promise<Response> {
  const denied = await adminGuard();
  if (denied) return denied;
  try {
    const { id } = await ctx.params;
    const body = await readJson(request);
    const patch: Record<string, string> = {};
    if (body.title !== undefined) patch.title = str(body.title, "tittel", { max: 80 });
    if (body.emoji !== undefined) patch.emoji = str(body.emoji, "emoji", { max: 16 });
    if (body.category !== undefined) patch.category = str(body.category, "kategori", { max: 40 });
    if (body.note !== undefined) patch.note = str(body.note, "notat", { max: 300, allowEmpty: true });
    return Response.json({ approved: await updateApproved(id, patch) });
  } catch (err) {
    return apiError(err);
  }
}

export async function DELETE(_request: Request, ctx: RouteContext<"/api/admin/approved/[id]">): Promise<Response> {
  const denied = await adminGuard();
  if (denied) return denied;
  try {
    await removeApproved((await ctx.params).id);
    return ok();
  } catch (err) {
    return apiError(err);
  }
}
