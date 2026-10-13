import { NextRequest, NextResponse } from "next/server";
import { createKey, planTitle, sessionFromRequest, listKeys } from "@/lib/rbxis-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function isAdmin(request: NextRequest) {
  return sessionFromRequest(request)?.role === "admin";
}

export async function GET(request: NextRequest) {
  if (!isAdmin(request)) return NextResponse.json({ message: "Sessão administrativa necessária." }, { status: 401 });
  try {
    const keys = await listKeys();
    const sorted = keys.sort((a, b) => b.createdAt - a.createdAt);
    return NextResponse.json({ keys: sorted.map((key) => ({ ...key, planName: planTitle(key.type) })) });
  } catch (error) {
    console.error("Falha ao listar licenças:", error);
    return NextResponse.json({ message: "Não foi possível carregar as keys da MockAPI." }, { status: 502 });
  }
}

export async function POST(request: NextRequest) {
  if (!isAdmin(request)) return NextResponse.json({ message: "Sessão administrativa necessária." }, { status: 401 });
  try {
    const body = await request.json().catch(() => ({}));
    const username = typeof body?.username === "string" ? body.username.trim().slice(0, 60) : "";
    const planId = String(body?.planId ?? "daily");
    const durationValue = Number(body?.durationValue ?? 1);
    if (username.length < 2 || !Number.isInteger(durationValue) || durationValue < 1 || durationValue > 3650) {
      return NextResponse.json({ message: "Informe nome de usuário e uma duração válida." }, { status: 400 });
    }
    const plans: Record<string, number> = {
      hourly: 1,
      daily: durationValue,
      weekly: durationValue * 7,
      monthly: 30,
      perm: 0,
    };
    if (!(planId in plans)) return NextResponse.json({ message: "Plano inválido." }, { status: 400 });
    const key = await createKey({ username, type: planId, expire: plans[planId] });
    return NextResponse.json({ key: { ...key, planName: planTitle(key.type) } }, { status: 201 });
  } catch (error) {
    console.error("Falha ao criar licença:", error);
    return NextResponse.json({ message: "Não foi possível criar a key na MockAPI." }, { status: 502 });
  }
}
