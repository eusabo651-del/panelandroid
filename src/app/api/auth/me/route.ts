import { NextRequest, NextResponse } from "next/server";
import { clearSessionCookie, getKeyById, isAdminIpAllowed, isExpired, sessionFromRequest, setSessionCookie } from "@/lib/rbxis-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const session = sessionFromRequest(request);
  if (!session) return NextResponse.json({ user: null }, { status: 200 });
  if (session.role === "admin") {
    try {
      if (!session.adminIp || !(await isAdminIpAllowed(session.adminIp))) return invalidate();
      return NextResponse.json({ user: { role: "admin", username: session.username ?? "Administrador" } });
    } catch (error) {
      console.error("Falha ao verificar IP administrativo:", error);
      return NextResponse.json({ message: "Não foi possível validar o acesso administrativo." }, { status: 502 });
    }
  }
  if (!session.licenseId) return invalidate();

  try {
    const license = await getKeyById(session.licenseId);
    if (!license || license.status !== "active" || isExpired(license) || (license.device && license.device !== session.deviceId)) return invalidate();
    return NextResponse.json({ user: {
      role: "user",
      username: license.username,
      key: license.key,
      planId: license.type,
      expiresAt: license.expiresAt,
      createdAt: license.createdAt,
      activatedAt: license.activatedAt,
      status: license.status,
      deviceId: license.device,
      features: {
        removerTremedeiraActive: license.removerTremedeiraActive,
        estabilizarMiraActive: license.estabilizarMiraActive,
        sensiSemCongelamentoActive: license.sensiSemCongelamentoActive,
        cleanActive: license.cleanActive,
      },
    } });
  } catch (error) {
    console.error("Falha ao consultar sessão:", error);
    return NextResponse.json({ message: "Não foi possível consultar a sessão." }, { status: 502 });
  }

  function invalidate() {
    const response = NextResponse.json({ user: null }, { status: 200 });
    clearSessionCookie(response);
    return response;
  }
}

export async function DELETE() {
  const response = NextResponse.json({ success: true });
  clearSessionCookie(response);
  return response;
}
