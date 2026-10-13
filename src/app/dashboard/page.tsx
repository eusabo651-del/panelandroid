"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Activity, ArrowLeft, BadgeCheck, Crosshair, Gamepad2, KeyRound, LogOut, ShieldCheck, Sparkles, Target, Zap } from "lucide-react";

type UserSession = { role: "user"; username: string; planId: string; expiresAt: number; deviceId: string };
const modules = [
  { id: "steady", title: "Estabilizar mira", description: "Ajuste visual para uma mira mais consistente.", icon: Crosshair },
  { id: "shake", title: "Reduzir tremedeira", description: "Sugestões para suavizar pequenos movimentos.", icon: Target },
  { id: "response", title: "Resposta rápida", description: "Atalhos para revisar as configurações do aparelho.", icon: Zap },
  { id: "focus", title: "Modo foco", description: "Organize a sessão para manter o foco no jogo.", icon: Activity },
];
function planName(planId: string) { return ({ hourly: "1 hora", daily: "1 dia", weekly: "1 semana", monthly: "1 mês", perm: "Permanente", permanent: "Permanente" } as Record<string, string>)[planId] ?? planId; }
function expiryLabel(value: number) { return value ? new Date(value * 1000).toLocaleString("pt-BR", { dateStyle: "medium", timeStyle: "short" }) : "Sem expiração"; }

export default function DashboardPage() {
  const router = useRouter();
  const [session, setSession] = useState<UserSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [enabled, setEnabled] = useState<Record<string, boolean>>({});
  const [working, setWorking] = useState(false);
  const loadSession = useCallback(async () => {
    const response = await fetch("/api/auth/me", { cache: "no-store", credentials: "same-origin" });
    const data = await response.json();
    if (!data.user) { router.replace("/"); return; }
    if (data.user.role === "admin") { router.replace("/admin"); return; }
    setSession(data.user as UserSession); setLoading(false);
  }, [router]);
  useEffect(() => { loadSession().catch(() => router.replace("/")); }, [loadSession, router]);
  async function logout() { setWorking(true); await fetch("/api/auth/me", { method: "DELETE" }); router.replace("/"); }
  if (loading || !session) return <main className="grid min-h-screen place-items-center bg-[#07060b] text-sm font-semibold tracking-[.2em] text-fuchsia-200">VALIDANDO SESSÃO...</main>;
  const activeCount = Object.values(enabled).filter(Boolean).length;
  return (
    <main className="min-h-screen bg-[#07060b] text-white">
      <header className="sticky top-0 z-20 border-b border-white/10 bg-[#09070df0] backdrop-blur-xl"><div className="mx-auto flex h-[72px] max-w-6xl items-center justify-between px-5 sm:px-8"><div className="flex items-center gap-3"><div className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-fuchsia-500 to-purple-700"><Crosshair size={21} /></div><div><span className="block text-[9px] font-black tracking-[.2em] text-fuchsia-300">PURPOU</span><b className="text-xs tracking-[.08em]">AUXÍLIO DE MIRA</b></div></div><div className="flex items-center gap-3"><span className="hidden rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-2 text-[9px] font-bold tracking-[.12em] text-emerald-200 sm:inline-flex"><BadgeCheck size={13} className="mr-1.5" /> ACESSO ATIVO</span><button onClick={logout} disabled={working} aria-label="Sair" className="grid h-10 w-10 place-items-center rounded-xl border border-white/10 text-white/60 hover:border-red-400/30 hover:text-red-200"><LogOut size={17} /></button></div></div></header>
      <section className="mx-auto max-w-6xl px-5 pb-16 pt-9 sm:px-8 sm:pt-12">
        <div className="mb-8 grid gap-6 rounded-[26px] border border-fuchsia-300/15 bg-[radial-gradient(ellipse_at_80%_15%,rgba(168,85,247,.2),transparent_40%),linear-gradient(135deg,#171020,#0d0b12_60%)] p-6 sm:grid-cols-[1fr_auto] sm:items-center sm:p-9"><div><span className="inline-flex items-center gap-2 text-[9px] font-black tracking-[.2em] text-fuchsia-300"><Sparkles size={13} /> PAINEL DO USUÁRIO</span><h1 className="mt-3 text-3xl font-black tracking-[-.055em] sm:text-4xl">Olá, {session.username}</h1><p className="mt-2 max-w-xl text-sm leading-6 text-white/50">Sua key foi validada. Este é o espaço de acesso do auxílio, com informações da licença e opções de configuração visual.</p></div><div className="rounded-2xl border border-white/10 bg-black/20 px-5 py-4 sm:min-w-[190px]"><span className="flex items-center gap-2 text-[9px] font-bold tracking-[.14em] text-white/40"><ShieldCheck size={14} className="text-fuchsia-300" /> PLANO</span><b className="mt-2 block text-lg">{planName(session.planId)}</b><span className="mt-1 block text-[10px] text-white/40">Validade: {expiryLabel(session.expiresAt)}</span></div></div>
        <div className="mb-5 flex flex-wrap items-end justify-between gap-4"><div><span className="text-[9px] font-black tracking-[.2em] text-white/35">ÁREA DO USUÁRIO</span><h2 className="mt-2 text-xl font-bold">Central de auxílio</h2></div><span className="rounded-full border border-white/10 bg-white/[.03] px-3 py-2 text-[9px] font-bold text-white/45">{activeCount} OPÇÃO(ÕES) SELECIONADA(S)</span></div>
        <div className="grid gap-3 sm:grid-cols-2">{modules.map(({ id, title, description, icon: Icon }) => { const active = Boolean(enabled[id]); return <button key={id} onClick={() => setEnabled((current) => ({ ...current, [id]: !current[id] }))} aria-pressed={active} className={`flex min-h-[132px] items-start gap-4 rounded-2xl border p-5 text-left transition ${active ? "border-fuchsia-400/40 bg-fuchsia-500/[.09]" : "border-white/10 bg-white/[.025] hover:border-white/20 hover:bg-white/[.045]"}`}><span className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl ${active ? "bg-fuchsia-400/15 text-fuchsia-200" : "bg-white/[.05] text-white/45"}`}><Icon size={20} /></span><span className="flex-1"><b className="block text-sm">{title}</b><span className="mt-2 block text-xs leading-5 text-white/45">{description}</span><span className={`mt-3 inline-flex items-center gap-1.5 text-[9px] font-black tracking-[.14em] ${active ? "text-fuchsia-200" : "text-white/30"}`}><span className={`h-1.5 w-1.5 rounded-full ${active ? "bg-fuchsia-300" : "bg-white/20"}`} />{active ? "SELECIONADO" : "DISPONÍVEL"}</span></span></button>; })}</div>
        <div className="mt-5 flex items-start gap-3 rounded-xl border border-white/[.07] bg-white/[.02] p-4 text-xs leading-5 text-white/40"><Gamepad2 size={17} className="mt-0.5 shrink-0 text-fuchsia-300/70" /><p>As opções desta tela são controles informativos do painel. Não modificam arquivos nem automatizam ações dentro do jogo. O vínculo da licença é mantido pelo servidor e pela key configurada no MockAPI.</p></div>
        <div className="mt-8 flex flex-wrap items-center justify-between gap-4 border-t border-white/[.08] pt-5 text-[10px] text-white/30"><span className="inline-flex items-center gap-2"><KeyRound size={13} /> LICENÇA VINCULADA AO DISPOSITIVO</span><button className="inline-flex items-center gap-1 hover:text-white/70" onClick={() => router.push("/")}><ArrowLeft size={13} /> VOLTAR</button></div>
      </section>
    </main>
  );
}
