import { NextResponse } from "next/server";
import { getGlobalNotice } from "@/lib/rbxis-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    return NextResponse.json({ notice: await getGlobalNotice() }, { headers: { "cache-control": "no-store, max-age=0" } });
  } catch (error) {
    console.error("Falha ao consultar aviso global:", error);
    return NextResponse.json({ notice: "" }, { status: 200, headers: { "cache-control": "no-store, max-age=0" } });
  }
}
