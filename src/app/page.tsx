"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, KeyRound, LockKeyhole, ShieldCheck, Wifi, X } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [adminMode, setAdminMode] = useState(false);
  const [key, setKey] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(""); setPending(true);
    try {
      let deviceId = "";
      if (!adminMode) {
        deviceId = localStorage.getItem("rbxis-device-id") || crypto.randomUUID();
        localStorage.setItem("rbxis-device-id", deviceId);
      }
      const response = await fetch("/api/auth/login", { method: "POST", headers: { "content-type": "application/json" }, credentials: "same-origin", body: JSON.stringify(adminMode ? { mode: "admin", key } : { key, deviceId }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || "Não foi possível validar o acesso.");
      router.replace(adminMode ? "/admin" : "/dashboard");
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Falha de conexão. Tente novamente."); }
    finally { setPending(false); }
  }

  return (
    <main className="min-h-screen relative flex flex-col items-center justify-center overflow-hidden bg-[#05040a] px-5 py-10 text-white">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_20%_15%,rgba(147,51,234,.20),transparent_42%),radial-gradient(ellipse_at_85%_75%,rgba(88,28,135,.18),transparent_40%)]" />
      <div className="pointer-events-none absolute inset-0 opacity-[.08] [background-image:linear-gradient(rgba(255,255,255,.16)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.16)_1px,transparent_1px)] [background-size:52px_52px]" />
      <header className="relative z-10 mb-10 flex w-full max-w-5xl items-center justify-between">
        <div className="flex items-center gap-3"><div className="grid h-11 w-11 place-items-center rounded-2xl border border-fuchsia-300/30 bg-fuchsia-500/15 text-fuchsia-200"><KeyRound size={21} /></div><span className="text-xs font-black tracking-[.22em] text-white/85">PURPOU <span className="text-fuchsia-300">AUXÍLIO</span></span></div>
        <span className="hidden items-center gap-2 rounded-full border border-white/10 bg-white/[.04] px-3 py-2 text-[9px] font-bold tracking-[.18em] text-white/50 sm:flex"><ShieldCheck size={13} className="text-fuchsia-300" /> ACESSO PROTEGIDO</span>
      </header>
      <section className="relative z-10 grid w-full max-w-5xl overflow-hidden rounded-[30px] border border-white/10 bg-[#0c0a12]/90 shadow-[0_35px_120px_rgba(0,0,0,.65)] md:grid-cols-[1fr_430px]">
        <div className="relative flex min-h-[390px] flex-col justify-center p-8 sm:p-12"><div className="absolute -right-10 top-10 h-48 w-48 rounded-full border border-fuchsia-300/10" /><div className="absolute -right-1 top-[76px] h-28 w-28 rounded-full border border-fuchsia-300/15" /><span className="relative mb-5 text-[10px] font-black tracking-[.28em] text-fuchsia-300">ACESSO EXCLUSIVO</span><h1 className="relative max-w-lg text-4xl font-black leading-[.98] tracking-[-.065em] sm:text-6xl">PURPOU<br /><span className="bg-gradient-to-r from-fuchsia-200 to-purple-500 bg-clip-text text-transparent">AUXÍLIO DE MIRA</span></h1><p className="relative mt-6 max-w-md text-sm leading-7 text-white/55">Informe sua key para validar o acesso. A licença fica vinculada ao primeiro dispositivo utilizado.</p><div className="relative mt-8 flex items-center gap-2 text-[10px] font-bold tracking-[.13em] text-white/40"><span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" /> SISTEMA DE LICENÇAS ONLINE</div></div>
        <div className="border-t border-white/10 bg-black/25 p-7 sm:p-10 md:border-l md:border-t-0">
          <div className="mb-7 flex items-center gap-3"><div className="grid h-11 w-11 place-items-center rounded-xl bg-fuchsia-500/15 text-fuchsia-200"><LockKeyhole size={20} /></div><div><span className="text-[9px] font-black tracking-[.2em] text-fuchsia-300">{adminMode ? "ÁREA RESTRITA" : "LICENÇA"}</span><h2 className="mt-1 text-lg font-bold">{adminMode ? "Login administrativo" : "Validar acesso"}</h2></div></div>
          <p className="mb-6 text-xs leading-5 text-white/45">{adminMode ? "Entre com a chave administrativa configurada no servidor." : "Digite a key fornecida pelo administrador para abrir o painel de auxílio."}</p>
          <form onSubmit={submit} className="space-y-5"><label className="block"><span className="mb-2 block text-[10px] font-bold uppercase tracking-[.14em] text-white/55">{adminMode ? "Chave de administrador" : "Sua key de acesso"}</span><span className="flex h-14 items-center rounded-xl border border-white/10 bg-white/[.04] px-4 transition focus-within:border-fuchsia-400/60"><KeyRound size={17} className="mr-3 shrink-0 text-fuchsia-300/60" /><input value={key} onChange={(event) => setKey(event.target.value)} type="password" autoComplete="current-password" autoCapitalize="none" autoCorrect="off" spellCheck={false} placeholder={adminMode ? "Chave administrativa" : "Insira sua key"} required className="min-w-0 flex-1 bg-transparent text-sm text-white outline-none placeholder:text-white/20" /><button type="button" onClick={() => setKey("")} aria-label="Limpar chave" className="ml-2 text-white/25 hover:text-white/70"><X size={15} /></button></span></label>
            {error && <p role="alert" className="rounded-lg border border-red-400/20 bg-red-400/10 px-3 py-2.5 text-xs leading-5 text-red-200">{error}</p>}
            <button disabled={pending} className="flex h-14 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-fuchsia-600 to-purple-600 text-xs font-black tracking-[.16em] shadow-lg shadow-purple-950/60 transition hover:brightness-110 disabled:cursor-wait disabled:opacity-60">{pending ? "VALIDANDO..." : adminMode ? "ENTRAR NO ADMIN" : "VALIDAR KEY"}{!pending && <ArrowRight size={17} />}</button>
          </form>
          <div className="my-6 flex items-center gap-3 text-[9px] font-bold tracking-[.12em] text-white/25"><span className="h-px flex-1 bg-white/10" /><Wifi size={13} /> SESSÃO CRIPTOGRAFADA<span className="h-px flex-1 bg-white/10" /></div>
          <button type="button" onClick={() => { setAdminMode((current) => !current); setKey(""); setError(""); }} className="w-full text-center text-[11px] font-semibold text-white/45 transition hover:text-fuchsia-200">{adminMode ? "Voltar para login do usuário" : "Acesso administrativo"}</button>
        </div>
      </section>
      <footer className="relative z-10 mt-7 flex w-full max-w-5xl items-center justify-between text-[9px] font-bold tracking-[.15em] text-white/25"><span>PURPOU AUXÍLIO DE MIRA</span><span className="hidden sm:block">PWA · SESSÃO PROTEGIDA</span><span>2026</span></footer>
    </main>
  );
}
