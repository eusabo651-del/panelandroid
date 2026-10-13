"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, BadgeCheck, CalendarClock, Clipboard, Crown, KeyRound, LogOut, MessagesSquare, ShieldCheck, Smartphone } from "lucide-react";
import { GlobalAnnouncement } from "@/components/GlobalAnnouncement";

type AccountData = { role: "user"; username: string; key: string; planId: string; expiresAt: number; createdAt: number; activatedAt: number; status: string; deviceId: string };
const planTitle = (plan: string) => ({ hourly: "1 hora", daily: "1 dia", weekly: "1 semana", monthly: "1 mês", perm: "Permanente", permanent: "Permanente" } as Record<string, string>)[plan] ?? plan;
const dateLabel = (value: number) => value ? new Date(value * 1000).toLocaleString("pt-BR", { dateStyle: "long", timeStyle: "short" }) : "Ainda não ativada";
function countdown(expiresAt: number, now: number) {
  if (!expiresAt) return "Sem expiração";
  const seconds = Math.max(0, Math.floor(expiresAt - now / 1000));
  if (seconds <= 0) return "Expirada";
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = seconds % 60;
  return `${days}d ${String(hours).padStart(2, "0")}h ${String(minutes).padStart(2, "0")}m ${String(remainingSeconds).padStart(2, "0")}s`;
}

export default function AccountPage() {
  const router = useRouter();
  const [account, setAccount] = useState<AccountData | null>(null);
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState(Date.now());
  const [showKey, setShowKey] = useState(false);
  const [message, setMessage] = useState("");
  const load = useCallback(async () => {
    const response = await fetch("/api/auth/me", { cache: "no-store" });
    const data = await response.json();
    if (!data.user || data.user.role !== "user") { router.replace(data.user?.role === "admin" ? "/admin" : "/"); return; }
    setAccount(data.user as AccountData); setLoading(false);
  }, [router]);
  useEffect(() => { load().catch(() => router.replace("/")); const timer = window.setInterval(() => setNow(Date.now()), 1000); return () => window.clearInterval(timer); }, [load, router]);
  async function copy(value: string, label: string) { try { await navigator.clipboard.writeText(value); setMessage(`${label} copiado.`); window.setTimeout(() => setMessage(""), 1800); } catch { setMessage("Não foi possível copiar neste navegador."); } }
  async function logout() { await fetch("/api/auth/me", { method: "DELETE" }); router.replace("/"); }

  if (loading || !account) return <main className="grid min-h-screen place-items-center bg-[#07060b] text-sm font-semibold tracking-[.2em] text-fuchsia-200">CARREGANDO CONTA...</main>;
  const remaining = countdown(account.expiresAt, now);
  const expired = remaining === "Expirada";
  return <main className="min-h-screen bg-[#07060b] text-white"><GlobalAnnouncement /><header className="sticky top-0 z-20 border-b border-white/10 bg-[#09070df0] backdrop-blur-xl"><div className="mx-auto flex h-[72px] max-w-4xl items-center justify-between px-5 sm:px-8"><button onClick={() => router.push("/dashboard")} className="inline-flex items-center gap-2 text-xs font-bold text-white/60 hover:text-white"><ArrowLeft size={15} /> Painel</button><div className="flex items-center gap-2"><button onClick={logout} aria-label="Sair" className="grid h-10 w-10 place-items-center rounded-xl border border-white/10 text-white/60 hover:text-white"><LogOut size={16} /></button></div></div></header>
    <section className="mx-auto max-w-4xl px-5 py-8 sm:px-8 sm:py-12"><div className="mb-7 flex items-center gap-3"><div className="grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-fuchsia-500 to-purple-700"><Crown size={22} /></div><div><span className="text-[9px] font-black tracking-[.2em] text-fuchsia-300">PURPOU AUXÍLIO DE MIRA</span><h1 className="mt-1 text-3xl font-black tracking-[-.05em]">Conta</h1></div></div>
      <div className="rounded-[26px] border border-fuchsia-300/15 bg-[radial-gradient(ellipse_at_85%_0%,rgba(168,85,247,.2),transparent_42%),linear-gradient(135deg,#171020,#0d0b12_65%)] p-6 sm:p-8"><div className="flex flex-wrap items-start justify-between gap-4"><div><span className="inline-flex items-center gap-2 text-[9px] font-black tracking-[.17em] text-emerald-200"><BadgeCheck size={14} /> LICENÇA {account.status.toUpperCase()}</span><h2 className="mt-3 text-2xl font-black">{account.username}</h2><p className="mt-1 text-xs text-white/45">Plano {planTitle(account.planId)}</p></div><span className="rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-xs font-bold text-white/70">{planTitle(account.planId)}</span></div>
        <div className={`mt-6 rounded-2xl border p-5 ${expired ? "border-red-300/20 bg-red-400/[.08]" : "border-fuchsia-300/15 bg-black/20"}`}><span className="inline-flex items-center gap-2 text-[9px] font-black tracking-[.16em] text-white/45"><CalendarClock size={14} /> TEMPO RESTANTE</span><b aria-live="off" className={`mt-2 block font-mono text-2xl font-black tracking-tight sm:text-3xl ${expired ? "text-red-200" : "text-fuchsia-100"}`}>{remaining}</b><span className="mt-2 block text-[10px] text-white/45">Expira em: {account.expiresAt ? dateLabel(account.expiresAt) : "Acesso permanente"}</span></div>
      </div>
      <div className="mt-5 grid gap-3 sm:grid-cols-2"><div className="rounded-2xl border border-white/10 bg-white/[.025] p-5"><span className="flex items-center gap-2 text-[9px] font-black tracking-[.14em] text-white/40"><KeyRound size={14} className="text-fuchsia-300" /> SUA KEY</span><div className="mt-3 flex items-center gap-2"><code className="min-w-0 flex-1 break-all rounded-lg bg-black/20 p-3 font-mono text-xs text-white/80">{showKey ? account.key : "•".repeat(Math.min(account.key.length, 26))}</code><button onClick={() => setShowKey((shown) => !shown)} className="shrink-0 rounded-lg border border-white/10 px-3 py-2 text-[10px] text-white/60">{showKey ? "Ocultar" : "Mostrar"}</button><button onClick={() => copy(account.key, "Key")} aria-label="Copiar key" className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-white/10 text-white/60 hover:text-white"><Clipboard size={14} /></button></div></div>
        <div className="rounded-2xl border border-white/10 bg-white/[.025] p-5"><span className="flex items-center gap-2 text-[9px] font-black tracking-[.14em] text-white/40"><Smartphone size={14} className="text-fuchsia-300" /> HWID LOCAL / DISPOSITIVO VINCULADO</span><div className="mt-3 flex items-center gap-2"><code className="min-w-0 flex-1 break-all rounded-lg bg-black/20 p-3 font-mono text-[10px] text-white/75">{account.deviceId || "Ainda não vinculado"}</code>{account.deviceId && <button onClick={() => copy(account.deviceId, "HWID")} aria-label="Copiar HWID" className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-white/10 text-white/60 hover:text-white"><Clipboard size={14} /></button>}</div><p className="mt-2 text-[9px] leading-4 text-white/35">ID gerado pelo PWA para este navegador/dispositivo; não é uma leitura do identificador físico do aparelho.</p></div>
        <div className="rounded-2xl border border-white/10 bg-white/[.025] p-5"><span className="flex items-center gap-2 text-[9px] font-black tracking-[.14em] text-white/40"><ShieldCheck size={14} className="text-fuchsia-300" /> CRIADA EM</span><p className="mt-3 text-sm font-semibold text-white/75">{dateLabel(account.createdAt)}</p></div><div className="rounded-2xl border border-white/10 bg-white/[.025] p-5"><span className="flex items-center gap-2 text-[9px] font-black tracking-[.14em] text-white/40"><BadgeCheck size={14} className="text-fuchsia-300" /> PRIMEIRO ACESSO</span><p className="mt-3 text-sm font-semibold text-white/75">{dateLabel(account.activatedAt)}</p></div></div>
      <a href="https://discord.gg/EVu34caJSg" target="_blank" rel="noreferrer" className="mt-5 flex h-14 items-center justify-center gap-2 rounded-xl border border-indigo-300/20 bg-indigo-500/10 text-xs font-black tracking-[.12em] text-indigo-100 transition hover:bg-indigo-500/15"><MessagesSquare size={17} /> ENTRAR NO DISCORD</a>{message && <p role="status" className="mt-3 text-center text-xs text-emerald-200">{message}</p>}
    </section></main>;
}
