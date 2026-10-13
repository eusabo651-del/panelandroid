import { NextRequest, NextResponse } from "next/server";
import { getKeyById, isExpired, sessionFromRequest, updateKey } from "@/lib/rbxis-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const allowedFeatures = ["removerTremedeiraActive", "estabilizarMiraActive", "sensiSemCongelamentoActive", "cleanActive"] as const;
type Feature = (typeof allowedFeatures)[number];

export async function PATCH(request: NextRequest) {
  const session = sessionFromRequest(request);
  if (!session || session.role !== "user" || !session.licenseId) return NextResponse.json({ message: "Sessão de usuário necessária." }, { status: 401 });
  try {
    const license = await getKeyById(session.licenseId);
    if (!license || license.status !== "active" || isExpired(license) || (license.device && license.device !== session.deviceId)) {
      return NextResponse.json({ message: "Licença inválida, expirada ou desvinculada." }, { status: 403 });
    }
    const body = await request.json().catch(() => ({}));
    const patch: Partial<Record<Feature, boolean>> = {};
    if (body?.reset === true) {
      for (const feature of allowedFeatures) patch[feature] = false;
    } else if (allowedFeatures.includes(body?.feature) && typeof body?.enabled === "boolean") {
      patch[body.feature as Feature] = body.enabled;
    } else {
      return NextResponse.json({ message: "Configuração de módulo inválida." }, { status: 400 });
    }
    const updated = await updateKey(license.id, patch);
    return NextResponse.json({ features: Object.fromEntries(allowedFeatures.map((feature) => [feature, updated[feature]])) });
  } catch (error) {
    console.error("Falha ao salvar configurações:", error);
    return NextResponse.json({ message: "Não foi possível salvar as configurações." }, { status: 502 });
  }
}
