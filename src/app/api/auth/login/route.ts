import { NextRequest, NextResponse } from "next/server";
import { createSessionToken, expiryForActivation, getClientIp, hasSessionSecret, listKeys, registerAdminLogin, safeEqual, setSessionCookie, updateKey } from "@/lib/rbxis-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const input = typeof body?.key === "string" ? body.key.trim() : "";
    if (!input) return NextResponse.json({ message: "Informe sua chave de acesso." }, { status: 400 });
    if (!hasSessionSecret()) return NextResponse.json({ message: "RBXIS_SESSION_SECRET precisa estar configurado com pelo menos 32 caracteres." }, { status: 503 });

    if (body?.mode === "admin") {
      const adminKey = process.env.RBXIS_ADMIN_KEY?.trim();
      if (!adminKey) return NextResponse.json({ message: "RBXIS_ADMIN_KEY não configurado." }, { status: 503 });
      if (!safeEqual(input, adminKey)) return NextResponse.json({ message: "Chave administrativa inválida." }, { status: 401 });
      const ip = getClientIp(request);
      if (!(await registerAdminLogin(ip))) return NextResponse.json({ message: "Este IP foi bloqueado pelo administrador." }, { status: 403 });
      const response = NextResponse.json({ success: true, role: "admin", username: "Administrador" });
      setSessionCookie(response, createSessionToken({ role: "admin", username: "Administrador", adminIp: ip }));
      return response;
    }

    const deviceId = typeof body?.deviceId === "string" ? body.deviceId.trim().slice(0, 160) : "";
    if (deviceId.length < 8) return NextResponse.json({ message: "Não foi possível identificar este dispositivo. Recarregue a página e tente novamente." }, { status: 400 });
    const key = (await listKeys()).find((candidate) => candidate.key.trim() === input);
    if (!key) return NextResponse.json({ message: "Chave de acesso inválida." }, { status: 401 });
    if (key.status !== "active") return NextResponse.json({ message: key.status === "blocked" ? "Este acesso foi bloqueado pelo administrador." : "Esta chave foi revogada." }, { status: 403 });
    const now = Math.floor(Date.now() / 1000);
    if (key.expiresAt > 0 && key.expiresAt <= now) return NextResponse.json({ message: "Esta licença expirou." }, { status: 403 });
    if (key.device && key.device !== deviceId) return NextResponse.json({ message: "Esta licença já está vinculada a outro dispositivo." }, { status: 403 });
    if (!key.id) return NextResponse.json({ message: "Registro de licença inválido na MockAPI." }, { status: 502 });

    const activatedNow = !key.activatedAt;
    const activatedAt = key.activatedAt || now;
    const expiresAt = key.expiresAt || expiryForActivation(key.type, key.expire, activatedAt);
    const updated = await updateKey(key.id, { device: deviceId, used: true, activatedAt, expiresAt, onlineAt: now });
    const response = NextResponse.json({ success: true, role: "user", username: updated.username, planId: updated.type, expiresAt: updated.expiresAt, activatedNow });
    setSessionCookie(response, createSessionToken({ role: "user", licenseId: updated.id, deviceId, username: updated.username }));
    return response;
  } catch (error) {
    console.error("Falha no login:", error);
    return NextResponse.json({ message: "Não foi possível validar agora. Verifique a conexão com a API e tente novamente." }, { status: 502 });
  }
}
