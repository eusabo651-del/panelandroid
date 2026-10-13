import { NextRequest, NextResponse } from "next/server";
import { getGlobalNotice, hasAuthorizedAdminSession, listAdminIpLogins, setAdminIpBlocked, setGlobalNotice } from "@/lib/rbxis-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  if (!(await hasAuthorizedAdminSession(request))) return NextResponse.json({ message: "Sessão administrativa necessária." }, { status: 401 });
  try {
    const [ips, notice] = await Promise.all([listAdminIpLogins(), getGlobalNotice()]);
    return NextResponse.json({ ips, notice });
  } catch (error) {
    console.error("Falha ao carregar configurações administrativas:", error);
    return NextResponse.json({ message: "Não foi possível carregar as configurações." }, { status: 502 });
  }
}

export async function PATCH(request: NextRequest) {
  if (!(await hasAuthorizedAdminSession(request))) return NextResponse.json({ message: "Sessão administrativa necessária." }, { status: 401 });
  try {
    const body = await request.json().catch(() => ({}));
    if (typeof body?.notice === "string") {
      const notice = await setGlobalNotice(body.notice);
      return NextResponse.json({ success: true, notice });
    }
    const ip = typeof body?.ip === "string" ? body.ip.trim().slice(0, 100) : "";
    if (!ip || typeof body?.blocked !== "boolean") return NextResponse.json({ message: "Informe um IP e o estado de bloqueio." }, { status: 400 });
    const entry = await setAdminIpBlocked(ip, body.blocked);
    return NextResponse.json({ success: true, ip: entry });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Não foi possível salvar as configurações.";
    const status = message.includes("um IP liberado") ? 409 : 502;
    console.error("Falha ao salvar configurações administrativas:", error);
    return NextResponse.json({ message }, { status });
  }
}
