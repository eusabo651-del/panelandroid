"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Ban, Check, Clipboard, KeyRound, LoaderCircle, LogOut, Plus, RefreshCw, RotateCcw, ShieldCheck, Trash2, Users, X } from "lucide-react";

type License = { id: string; key: string; username: string; used: boolean; device: string; expire: number; type: string; createdAt: number; activatedAt: number; expiresAt: number; status: "active" | "blocked" | "revoked"; planName: string };
const planOptions = [{ id: "hourly", label: "1 hora" }, { id: "daily", label: "Dias" }, { id: "weekly", label: "Semanas" }, { id: "monthly", label: "1 mês" }, { id: "perm", label: "Permanente" }];
const dateLabel = (seconds: number) => seconds ? new Date(seconds * 1000).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" }) : "—";

export default function AdminPage() {
  const router = useRouter();
  const [keys, setKeys] = useState<License[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [query, setQuery] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [username, setUsername] = useState("");
  const [planId, setPlanId] = useState("daily");
  const [durationValue, setDurationValue] = useState(1);
  const filtered = useMemo(() => keys.filter((item) => `${item.username} ${item.key}`.toLowerCase().includes(query.toLowerCase())), [keys, query]);

  const refresh = useCallback(async () => {
    setError("");
    const auth = await fetch("/api/auth/me", { cache: "no-store" }).then((response) => response.json());
    if (!auth.user || auth.user.role !== "admin") { router.replace("/"); return; }
    const response = await fetch("/api/admin/keys", { cache: "no-store" });
    const result = await response.json();
    if (!response.ok) throw new Error(result.message || "Falha ao listar licenças.");
    setKeys(result.keys ?? []); setLoading(false);
  }, [router]);
  useEffect(() => { refresh().catch((reason) => { setError(reason instanceof Error ? reason.message : "Erro ao carregar painel."); setLoading(false); }); }, [refresh]);

  async function request(url: string, method: string, body?: object) {
    const response = await fetch(url, { method, headers: body ? { "content-type": "application/json" } : undefined, body: body ? JSON.stringify(body) : undefined });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(result.message || "Não foi possível concluir a operação.");
    return result;
  }
  async function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy("create"); setError(""); setNotice("");
    try {
      const result = await request("/api/admin/keys", "POST", { username, planId, durationValue });
      await refresh(); setFormOpen(false); setUsername(""); setNotice(`Key criada: ${result.key.key}`);
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Falha ao criar key."); }
    finally { setBusy(""); }
  }
  async function update(item: License, action: "block" | "activate" | "reset" | "delete") {
    const labels = { block: "bloquear", activate: "reativar", reset: "desvincular o dispositivo e reiniciar a licença", delete: "excluir permanentemente" };
    if (action === "delete" && !window.confirm(`Deseja ${labels[action]} de ${item.username}?`)) return;
    setBusy(item.id); setError(""); setNotice("");
    try {
      if (action === "delete") await request(`/api/admin/keys/${encodeURIComponent(item.id)}`, "DELETE");
      else if (action === "reset") await request(`/api/admin/keys/${encodeURIComponent(item.id)}`, "PATCH", { resetDevice: true });
      else await request(`/api/admin/keys/${encodeURIComponent(item.id)}`, "PATCH", { status: action === "block" ? "blocked" : "active" });
      await refresh(); setNotice(`Ação concluída: ${labels[action]}.`);
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Falha ao atualizar key."); }
    finally { setBusy(""); }
  }
  async function copy(value: string) { try { await navigator.clipboard.writeText(value); setNotice("Key copiada."); } catch { setError("Não foi possível copiar a key neste navegador."); } }
  async function logout() { await fetch("/api/auth/me", { method: "DELETE" }); router.replace("/"); }

  if (loading) return <main className="grid min-h-screen place-items-center bg-[#07060b] text-fuchsia-200"><LoaderCircle className="animate-spin" /></main>;
  const activeCount = keys.filter((item) => item.status === "active").length;
  return (
    <main className="min-h-screen bg-[#07060b] text-white">
      <header className="border-b border-white/10 bg-[#0b0911]"><div className="mx-auto flex h-[72px] max-w-7xl items-center justify-between px-4 sm:px-8"><div className="flex items-center gap-3"><div className="grid h-10 w-10 place-items-center rounded-xl bg-fuchsia-500/15 text-fuchsia-200"><ShieldCheck size={20} /></div><div><b className="block text-xs tracking-[.1em]">PURPOU AUXÍLIO DE MIRA</b><span className="mt-1 block text-[9px] font-bold tracking-[.15em] text-fuchsia-300/70">PAINEL ADMINISTRATIVO</span></div></div><button onClick={logout} className="inline-flex items-center gap-2 rounded-xl border border-white/10 px-3 py-2 text-xs text-white/60 hover:text-white"><LogOut size={15} /> Sair</button></div></header>
      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-8 sm:py-11">
        <div className="mb-7 flex flex-wrap items-end justify-between gap-4"><div><span className="text-[9px] font-black tracking-[.2em] text-fuchsia-300">CONTROLE DE ACESSOS</span><h1 className="mt-2 text-3xl font-black tracking-[-.05em]">Keys e licenças</h1><p className="mt-2 text-sm text-white/45">Gerencie os acessos armazenados no endpoint MockAPI androidkeys.</p></div><button onClick={() => { setFormOpen(true); setError(""); }} className="inline-flex h-11 items-center gap-2 rounded-xl bg-gradient-to-r from-fuchsia-600 to-purple-600 px-4 text-xs font-black"><Plus size={16} /> Criar key</button></div>
        <div className="mb-6 grid gap-3 sm:grid-cols-3"><div className="rounded-2xl border border-white/10 bg-white/[.025] p-4"><span className="flex items-center gap-2 text-[10px] font-bold tracking-[.1em] text-white/40"><Users size={14} /> TOTAL DE KEYS</span><b className="mt-3 block text-2xl">{keys.length}</b></div><div className="rounded-2xl border border-white/10 bg-white/[.025] p-4"><span className="flex items-center gap-2 text-[10px] font-bold tracking-[.1em] text-white/40"><Check size={14} /> ATIVAS</span><b className="mt-3 block text-2xl text-emerald-200">{activeCount}</b></div><div className="rounded-2xl border border-white/10 bg-white/[.025] p-4"><span className="flex items-center gap-2 text-[10px] font-bold tracking-[.1em] text-white/40"><KeyRound size={14} /> DISPOSITIVOS VINCULADOS</span><b className="mt-3 block text-2xl">{keys.filter((item) => item.device).length}</b></div></div>
        {error && <div role="alert" className="mb-4 rounded-xl border border-red-400/20 bg-red-400/10 px-4 py-3 text-xs text-red-200">{error}</div>}{notice && <div role="status" className="mb-4 flex items-center justify-between gap-3 rounded-xl border border-emerald-400/20 bg-emerald-400/10 px-4 py-3 text-xs text-emerald-100"><span>{notice}</span><button onClick={() => setNotice("")} aria-label="Fechar aviso"><X size={14} /></button></div>}
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3"><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar usuário ou key..." className="h-11 min-w-[230px] flex-1 rounded-xl border border-white/10 bg-white/[.03] px-4 text-xs outline-none focus:border-fuchsia-400/50" /><button onClick={() => refresh().catch((reason) => setError(String(reason)))} className="inline-flex h-11 items-center gap-2 rounded-xl border border-white/10 px-3 text-xs text-white/65 hover:text-white"><RefreshCw size={14} /> Atualizar</button><span className="text-[10px] text-white/35">{filtered.length} registro(s)</span></div>
        <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#0c0a11]"><div className="hidden grid-cols-[1.4fr_1.3fr_.8fr_1fr_.8fr_1.1fr] gap-3 border-b border-white/10 px-5 py-3 text-[9px] font-black tracking-[.13em] text-white/35 lg:grid"><span>USUÁRIO / KEY</span><span>DISPOSITIVO</span><span>PLANO</span><span>ATIVAÇÃO / VALIDADE</span><span>STATUS</span><span>AÇÕES</span></div>
          {filtered.length === 0 ? <div className="grid min-h-40 place-items-center px-5 text-center text-xs text-white/40">{keys.length ? "Nenhuma key corresponde à busca." : "Ainda não há keys nesta coleção MockAPI."}</div> : filtered.map((item) => <div key={item.id} className="grid gap-3 border-b border-white/[.07] px-4 py-4 last:border-0 lg:grid-cols-[1.4fr_1.3fr_.8fr_1fr_.8fr_1.1fr] lg:items-center lg:px-5"><div className="min-w-0"><b className="block truncate text-xs">{item.username}</b><span className="mt-1 block break-all font-mono text-[10px] text-white/40">{item.key}</span><button onClick={() => copy(item.key)} className="mt-2 inline-flex items-center gap-1 text-[9px] text-fuchsia-200/70 hover:text-fuchsia-100"><Clipboard size={12} /> Copiar key</button></div><div className="text-[10px] text-white/50">{item.device ? <><span className="text-emerald-200">Vinculado</span><span className="mt-1 block break-all font-mono text-[9px] text-white/30">{item.device}</span></> : "Aguardando primeiro acesso"}</div><div className="text-[10px] text-white/60">{item.planName}<span className="mt-1 block text-[9px] text-white/30">{item.type === "perm" ? "sem expiração" : `${item.expire} ${item.type === "hourly" ? "hora(s)" : "dia(s)"}`}</span></div><div className="text-[10px] text-white/50">{item.activatedAt ? <>Ativada: {dateLabel(item.activatedAt)}<span className="mt-1 block">Expira: {dateLabel(item.expiresAt)}</span></> : <>Criada: {dateLabel(item.createdAt)}<span className="mt-1 block text-white/30">contagem no primeiro login</span></>}</div><span className={`w-fit rounded-full border px-2.5 py-1 text-[9px] font-black uppercase tracking-[.1em] ${item.status === "active" ? "border-emerald-300/20 bg-emerald-400/10 text-emerald-200" : item.status === "blocked" ? "border-amber-300/20 bg-amber-400/10 text-amber-200" : "border-red-300/20 bg-red-400/10 text-red-200"}`}>{item.status}</span><div className="flex flex-wrap gap-1.5"><button disabled={busy === item.id} title={item.status === "blocked" ? "Reativar" : "Bloquear"} onClick={() => update(item, item.status === "blocked" ? "activate" : "block")} className="grid h-8 w-8 place-items-center rounded-lg border border-white/10 text-white/50 hover:text-white disabled:opacity-40">{item.status === "blocked" ? <Check size={14} /> : <Ban size={14} />}</button><button disabled={busy === item.id} title="Resetar vínculo e ativação" onClick={() => update(item, "reset")} className="grid h-8 w-8 place-items-center rounded-lg border border-white/10 text-white/50 hover:text-white disabled:opacity-40"><RotateCcw size={14} /></button><button disabled={busy === item.id} title="Excluir da MockAPI" onClick={() => update(item, "delete")} className="grid h-8 w-8 place-items-center rounded-lg border border-red-400/15 text-red-200/70 hover:bg-red-400/10 disabled:opacity-40"><Trash2 size={14} /></button></div></div>)}
        </div>
      </section>
      {formOpen && <div className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-black/75 p-4 backdrop-blur-sm"><form onSubmit={create} className="w-full max-w-md rounded-2xl border border-white/10 bg-[#100d17] p-6 shadow-2xl"><div className="flex items-start justify-between"><div><span className="text-[9px] font-black tracking-[.2em] text-fuchsia-300">NOVA LICENÇA</span><h2 className="mt-2 text-xl font-bold">Criar key de acesso</h2></div><button type="button" onClick={() => setFormOpen(false)} aria-label="Fechar" className="text-white/40 hover:text-white"><X size={18} /></button></div><label className="mt-6 block text-[10px] font-bold uppercase tracking-[.12em] text-white/55">Nome do usuário<input value={username} onChange={(event) => setUsername(event.target.value)} required minLength={2} maxLength={60} placeholder="ex: jogador_01" className="mt-2 h-11 w-full rounded-lg border border-white/10 bg-white/[.04] px-3 text-sm normal-case tracking-normal text-white outline-none focus:border-fuchsia-400/50" /></label><label className="mt-4 block text-[10px] font-bold uppercase tracking-[.12em] text-white/55">Plano<select value={planId} onChange={(event) => setPlanId(event.target.value)} className="mt-2 h-11 w-full rounded-lg border border-white/10 bg-[#17131d] px-3 text-sm normal-case tracking-normal text-white outline-none">{planOptions.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}</select></label>{!["hourly", "monthly", "perm"].includes(planId) && <label className="mt-4 block text-[10px] font-bold uppercase tracking-[.12em] text-white/55">Duração ({planId === "weekly" ? "semanas" : "dias"})<input type="number" min={1} max={3650} value={durationValue} onChange={(event) => setDurationValue(Number(event.target.value))} required className="mt-2 h-11 w-full rounded-lg border border-white/10 bg-white/[.04] px-3 text-sm normal-case tracking-normal text-white outline-none focus:border-fuchsia-400/50" /></label>}<p className="mt-4 rounded-lg border border-white/[.06] bg-white/[.025] p-3 text-[10px] leading-5 text-white/40">A key aleatória será criada no servidor e salva na coleção androidkeys. O prazo começa no primeiro acesso do usuário.</p>{error && <p role="alert" className="mt-3 text-xs text-red-200">{error}</p>}<div className="mt-5 flex justify-end gap-2"><button type="button" onClick={() => setFormOpen(false)} className="rounded-lg border border-white/10 px-4 py-2.5 text-xs text-white/60">Cancelar</button><button disabled={busy === "create"} className="inline-flex items-center gap-2 rounded-lg bg-fuchsia-600 px-4 py-2.5 text-xs font-bold disabled:opacity-50">{busy === "create" ? <LoaderCircle size={14} className="animate-spin" /> : <Plus size={14} />} Criar key</button></div></form></div>}
    </main>
  );
}
