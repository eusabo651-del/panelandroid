import { NextRequest, NextResponse } from "next/server";
import { deleteKey, getKeyById, hasAuthorizedAdminSession, updateKey } from "@/lib/rbxis-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Context = { params: Promise<{ id: string }> };
async function isAdmin(request: NextRequest) {
  return hasAuthorizedAdminSession(request);
}

export async function PATCH(request: NextRequest, context: Context) {
  if (!(await isAdmin(request))) return NextResponse.json({ message: "Sessão administrativa necessária." }, { status: 401 });
  try {
    const { id } = await context.params;
    const existing = await getKeyById(id);
    if (!existing) return NextResponse.json({ message: "Key não encontrada." }, { status: 404 });
    const body = await request.json().catch(() => ({}));
    const patch: Record<string, unknown> = {};
    if (["active", "blocked", "revoked"].includes(body?.status)) patch.status = body.status;
    if (body?.resetDevice === true) {
      patch.device = "";
      patch.used = false;
      patch.activatedAt = 0;
      patch.expiresAt = 0;
      patch.onlineAt = 0;
    }
    if (!Object.keys(patch).length) return NextResponse.json({ message: "Nenhuma alteração válida." }, { status: 400 });
    const updated = await updateKey(id, patch);
    return NextResponse.json({ key: updated });
  } catch (error) {
    console.error("Falha ao atualizar key:", error);
    return NextResponse.json({ message: "Não foi possível atualizar a key." }, { status: 502 });
  }
}

export async function DELETE(request: NextRequest, context: Context) {
  if (!(await isAdmin(request))) return NextResponse.json({ message: "Sessão administrativa necessária." }, { status: 401 });
  try {
    const { id } = await context.params;
    const existing = await getKeyById(id);
    if (!existing) return NextResponse.json({ message: "Key não encontrada." }, { status: 404 });
    await deleteKey(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Falha ao excluir key:", error);
    return NextResponse.json({ message: "Não foi possível excluir a key." }, { status: 502 });
  }
}
