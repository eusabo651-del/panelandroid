"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Activity, ArrowLeft, BadgeCheck, Crosshair, Gamepad2, KeyRound, LogOut, Rocket, ShieldCheck, Sparkles, Target, Trash2, Zap, CircleUserRound, X } from "lucide-react";
import { GlobalAnnouncement } from "@/components/GlobalAnnouncement";

type Feature = "removerTremedeiraActive" | "estabilizarMiraActive" | "sensiSemCongelamentoActive" | "cleanActive";
type Features = Record<Feature, boolean>;
type UserSession = { role: "user"; username: string; planId: string; expiresAt: number; deviceId: string; features: Features };
type GameVersion = "normal" | "max";
const featureKeys: Feature[] = ["removerTremedeiraActive", "estabilizarMiraActive", "sensiSemCongelamentoActive", "cleanActive"];
const emptyFeatures: Features = { removerTremedeiraActive: false, estabilizarMiraActive: false, sensiSemCongelamentoActive: false, cleanActive: false };
const modules: { id: Feature; title: string; description: string; icon: typeof Target }[] = [
  { id: "removerTremedeiraActive", title: "Remover Tremedeira", description: "Estado do módulo vinculado à sua licença.", icon: Target },
  { id: "estabilizarMiraActive", title: "Estabilizar Mira", description: "Estado do módulo vinculado à sua licença.", icon: Zap },
  { id: "sensiSemCongelamentoActive", title: "Sensi Sem Congelamento", description: "Estado do módulo vinculado à sua licença.", icon: Rocket },
  { id: "cleanActive", title: "Clean", description: "Estado do módulo vinculado à sua licença.", icon: Trash2 },
];
function planName(planId: string) { return ({ hourly: "1 hora", daily: "1 dia", weekly: "1 semana", monthly: "1 mês", perm: "Permanente", permanent: "Permanente" } as Record<string, string>)[planId] ?? planId; }
function expiryLabel(value: number) { return value ? new Date(value * 1000).toLocaleString("pt-BR", { dateStyle: "medium", timeStyle: "short" }) : "Sem expiração"; }

export default function DashboardPage() {
  const router = useRouter();
  const [session, setSession] = useState<UserSession | null>(null);
  const [enabled, setEnabled] = useState<Features>(emptyFeatures);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<Feature | "logout" | "">("");
  const [error, setError] = useState("");
  const [gamePicker, setGamePicker] = useState(false);
  const loadSession = useCallback(async () => {
    const response = await fetch("/api/auth/me", { cache: "no-store", credentials: "same-origin" });
    const data = await response.json();
    if (!data.user) { router.replace("/"); return; }
    if (data.user.role === "admin") { router.replace("/admin"); return; }
    const features = { ...emptyFeatures, ...(data.user.features ?? {}) };
    setSession({ ...data.user, features } as UserSession);
    setEnabled(features);
    setLoading(false);
  }, [router]);
  useEffect(() => { loadSession().catch(() => router.replace("/")); }, [loadSession, router]);

  async function toggle(feature: Feature) {
    setSaving(feature); setError("");
    try {
      const response = await fetch("/api/auth/settings", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ feature, enabled: !enabled[feature] }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || "Não foi possível salvar o módulo.");
      setEnabled({ ...emptyFeatures, ...result.features });
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Falha ao salvar configuração."); }
    finally { setSaving(""); }
  }

  async function logout() {
    setSaving("logout"); setError("");
    try { await fetch("/api/auth/settings", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ reset: true }) }); } catch { /* encerra a sessão mesmo se a limpeza não responder */ }
    await fetch("/api/auth/me", { method: "DELETE" });
    router.replace("/");
  }

  function launchGame(version: GameVersion) {
    setGamePicker(false);
    const isMax = version === "max";
    const scheme = isMax ? "freefiremax" : "freefire";
    const packageName = isMax ? "com.dts.freefiremax" : "com.dts.freefireth";
    const playStore = `https://play.google.com/store/apps/details?id=${packageName}`;
    if (/android/i.test(navigator.userAgent)) {
      window.location.href = `${scheme}://`;
      window.setTimeout(() => { if (!document.hidden) window.location.href = playStore; }, 1800);
      return;
    }
    if (/iphone|ipad|ipod/i.test(navigator.userAgent)) {
      window.location.href = `${scheme}://`;
      const appStore = isMax ? "https://apps.apple.com/search?term=free%20fire%20max" : "https://apps.apple.com/app/id1209268363";
      window.setTimeout(() => { if (!document.hidden) window.location.href = appStore; }, 1800);
      return;
    }
    window.open("https://ff.garena.com/pt/", "_blank", "noopener,noreferrer");
  }

  if (loading || !session) return <main className="grid min-h-screen place-items-center bg-[#07060b] text-sm font-semibold tracking-[.2em] text-fuchsia-200">VALIDANDO SESSÃO...</main>;
  const activeCount = featureKeys.filter((feature) => enabled[feature]).length;
  const running = activeCount > 0;
  return (
    <main className="min-h-screen bg-[#07060b] text-white">
      <GlobalAnnouncement />
      <header className="sticky top-0 z-20 border-b border-white/10 bg-[#09070df0] backdrop-blur-xl"><div className="mx-auto flex h-[72px] max-w-6xl items-center justify-between px-5 sm:px-8"><div className="flex items-center gap-3"><div className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-fuchsia-500 to-purple-700"><Crosshair size={21} /></div><div><span className="block text-[9px] font-black tracking-[.2em] text-fuchsia-300">PURPOU</span><b className="text-xs tracking-[.08em]">AUXÍLIO DE MIRA</b></div></div><div className="flex items-center gap-2 sm:gap-3"><button onClick={() => router.push("/conta")} className="inline-flex h-10 items-center gap-2 rounded-xl border border-white/10 px-3 text-[10px] font-bold text-white/70 transition hover:border-fuchsia-300/30 hover:text-white"><CircleUserRound size={15} /> Conta</button><span className="hidden rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-2 text-[9px] font-bold tracking-[.12em] text-emerald-200 sm:inline-flex"><BadgeCheck size={13} className="mr-1.5" /> ACESSO ATIVO</span><button onClick={logout} disabled={saving !== ""} aria-label="Sair" className="grid h-10 w-10 place-items-center rounded-xl border border-white/10 text-white/60 hover:border-red-400/30 hover:text-red-200"><LogOut size={17} /></button></div></div></header>
      <section className="mx-auto max-w-6xl px-5 pb-16 pt-9 sm:px-8 sm:pt-12">
        <div className="mb-8 grid gap-6 rounded-[26px] border border-fuchsia-300/15 bg-[radial-gradient(ellipse_at_80%_15%,rgba(168,85,247,.2),transparent_40%),linear-gradient(135deg,#171020,#0d0b12_60%)] p-6 sm:grid-cols-[1fr_auto] sm:items-center sm:p-9"><div><span className="inline-flex items-center gap-2 text-[9px] font-black tracking-[.2em] text-fuchsia-300"><Sparkles size={13} /> PAINEL DO USUÁRIO</span><h1 className="mt-3 text-3xl font-black tracking-[-.055em] sm:text-4xl">Olá, {session.username}</h1><p className="mt-2 max-w-xl text-sm leading-6 text-white/50">Sua key foi validada. Os estados dos módulos ficam sincronizados com o registro da licença.</p></div><div className="rounded-2xl border border-white/10 bg-black/20 px-5 py-4 sm:min-w-[190px]"><span className="flex items-center gap-2 text-[9px] font-bold tracking-[.14em] text-white/40"><ShieldCheck size={14} className="text-fuchsia-300" /> PLANO</span><b className="mt-2 block text-lg">{planName(session.planId)}</b><span className="mt-1 block text-[10px] text-white/40">Validade: {expiryLabel(session.expiresAt)}</span></div></div>
        <div className="mb-5 grid gap-4 rounded-2xl border border-white/10 bg-white/[.025] p-5 sm:grid-cols-[1fr_auto] sm:items-center"><div className="flex items-center gap-3"><div className={`grid h-11 w-11 place-items-center rounded-xl ${running ? "bg-fuchsia-400/15 text-fuchsia-200" : "bg-white/[.05] text-white/40"}`}><Activity size={20} /></div><div><span className="block text-[9px] font-black tracking-[.16em] text-white/40">STATUS DO PAINEL</span><b className={`mt-1 block text-sm ${running ? "text-fuchsia-200" : "text-white/60"}`}>{running ? "Módulos selecionados" : "Aguardando seleção"}</b></div></div><span className="rounded-full border border-white/10 px-3 py-2 text-[9px] font-bold text-white/45">{activeCount} / {modules.length} ATIVOS</span></div>
        <div className="mb-4 flex flex-wrap items-end justify-between gap-4"><div><span className="text-[9px] font-black tracking-[.2em] text-white/35">ÁREA DO USUÁRIO</span><h2 className="mt-2 text-xl font-bold">Módulos do auxílio</h2></div></div>
        <div className="grid gap-3 sm:grid-cols-2">{modules.map(({ id, title, description, icon: Icon }) => { const active = Boolean(enabled[id]); return <button key={id} onClick={() => toggle(id)} disabled={saving !== ""} aria-pressed={active} className={`flex min-h-[132px] items-start gap-4 rounded-2xl border p-5 text-left transition disabled:opacity-60 ${active ? "border-fuchsia-400/40 bg-fuchsia-500/[.09]" : "border-white/10 bg-white/[.025] hover:border-white/20 hover:bg-white/[.045]"}`}><span className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl ${active ? "bg-fuchsia-400/15 text-fuchsia-200" : "bg-white/[.05] text-white/45"}`}><Icon size={20} /></span><span className="flex-1"><b className="block text-sm">{title}</b><span className="mt-2 block text-xs leading-5 text-white/45">{description}</span><span className={`mt-3 inline-flex items-center gap-1.5 text-[9px] font-black tracking-[.14em] ${active ? "text-fuchsia-200" : "text-white/30"}`}><span className={`h-1.5 w-1.5 rounded-full ${active ? "bg-fuchsia-300" : "bg-white/20"}`} />{saving === id ? "SALVANDO..." : active ? "ATIVO" : "INATIVO"}</span></span></button>; })}</div>
        {error && <div role="alert" className="mt-4 rounded-xl border border-red-400/20 bg-red-400/10 px-4 py-3 text-xs text-red-200">{error}</div>}
        <button onClick={() => setGamePicker(true)} className="mt-6 flex h-16 w-full items-center justify-center gap-3 rounded-2xl border border-fuchsia-300/20 bg-gradient-to-r from-[#1a1024] to-[#50207a] text-sm font-black tracking-[.15em] text-white shadow-lg shadow-purple-950/40 transition hover:brightness-110"><Gamepad2 size={22} /> ABRIR FREE FIRE</button>
        <div className="mt-8 flex flex-wrap items-center justify-between gap-4 border-t border-white/[.08] pt-5 text-[10px] text-white/30"><span className="inline-flex items-center gap-2"><KeyRound size={13} /> LICENÇA VINCULADA AO DISPOSITIVO</span><a href="https://discord.gg/EVu34caJSg" target="_blank" rel="noreferrer" className="text-fuchsia-200/70 hover:text-fuchsia-100">Discord</a><button className="inline-flex items-center gap-1 hover:text-white/70" onClick={() => router.push("/")}><ArrowLeft size={13} /> VOLTAR</button></div>
      </section>
      {gamePicker && <div className="fixed inset-0 z-50 grid place-items-center bg-black/75 p-4 backdrop-blur-sm" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setGamePicker(false); }}><section role="dialog" aria-modal="true" aria-labelledby="game-title" className="w-full max-w-sm rounded-2xl border border-white/10 bg-[#100d17] p-6 shadow-2xl"><div className="flex items-start justify-between"><div><span className="text-[9px] font-black tracking-[.18em] text-fuchsia-300">ABRIR JOGO</span><h2 id="game-title" className="mt-2 text-xl font-bold">Escolha a versão</h2></div><button onClick={() => setGamePicker(false)} aria-label="Fechar" className="text-white/45 hover:text-white"><X size={18} /></button></div><p className="mt-2 text-xs text-white/45">Selecione qual aplicativo deseja abrir.</p><div className="mt-5 grid gap-3"><button onClick={() => launchGame("normal")} className="flex h-14 items-center justify-between rounded-xl border border-fuchsia-300/20 bg-fuchsia-500/10 px-4 text-left text-sm font-bold hover:bg-fuchsia-500/20"><span>Free Fire Normal</span><Gamepad2 size={18} className="text-fuchsia-200" /></button><button onClick={() => launchGame("max")} className="flex h-14 items-center justify-between rounded-xl border border-purple-300/20 bg-purple-500/10 px-4 text-left text-sm font-bold hover:bg-purple-500/20"><span>Free Fire MAX</span><Gamepad2 size={18} className="text-purple-200" /></button></div></section></div>}
    </main>
  );
}
