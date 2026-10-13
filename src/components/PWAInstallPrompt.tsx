"use client";
import { useEffect, useState } from "react";
import { Download, PlusSquare, Share, Smartphone, X } from "lucide-react";

type InstallPromptEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: "accepted" | "dismissed" }> };
export function PWAInstallPrompt() {
  const [installEvent, setInstallEvent] = useState<InstallPromptEvent | null>(null);
  const [show, setShow] = useState(false);
  const [ios, setIos] = useState(false);
  const [authenticated, setAuthenticated] = useState(false);
  useEffect(() => {
    let mounted = true;
    fetch("/api/auth/me", { cache: "no-store" }).then((response) => response.json()).then((result) => { if (mounted) setAuthenticated(Boolean(result.user)); }).catch(() => undefined);
    const isStandalone = window.matchMedia("(display-mode: standalone)").matches || Boolean((navigator as Navigator & { standalone?: boolean }).standalone);
    setIos(/iphone|ipad|ipod/i.test(navigator.userAgent));
    const onPrompt = (event: Event) => { event.preventDefault(); setInstallEvent(event as InstallPromptEvent); };
    window.addEventListener("beforeinstallprompt", onPrompt);
    const timer = window.setTimeout(() => { if (!isStandalone && !sessionStorage.getItem("purpou-pwa-dismissed")) setShow(true); }, 2400);
    return () => { mounted = false; window.clearTimeout(timer); window.removeEventListener("beforeinstallprompt", onPrompt); };
  }, []);
  async function install() {
    if (installEvent) { await installEvent.prompt(); setShow(false); setInstallEvent(null); }
  }
  if (!authenticated || !show) return null;
  const dismiss = () => { sessionStorage.setItem("purpou-pwa-dismissed", "1"); setShow(false); };
  return <div className="fixed bottom-4 left-1/2 z-[100] flex w-[min(410px,calc(100%-24px))] -translate-x-1/2 items-center gap-3 rounded-2xl border border-fuchsia-300/20 bg-[#17111f]/95 p-3 text-white shadow-2xl backdrop-blur-xl"><div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-fuchsia-500/15 text-fuchsia-200"><Smartphone size={19} /></div><div className="min-w-0 flex-1"><b className="block text-[11px]">Instale PURPOU AUXÍLIO</b><span className="mt-1 block text-[9px] text-white/45">{ios ? "Use Compartilhar e Adicionar à Tela de Início." : "Adicione à tela inicial para abrir como aplicativo."}</span>{ios && <span className="mt-1 inline-flex items-center gap-1 text-[9px] text-fuchsia-200"><Share size={11} /> <PlusSquare size={11} /> Compartilhar → Tela de Início</span>}</div>{installEvent && <button onClick={install} aria-label="Instalar" className="grid h-9 w-9 place-items-center rounded-lg bg-fuchsia-600"><Download size={15} /></button>}<button onClick={dismiss} aria-label="Fechar" className="grid h-8 w-8 place-items-center text-white/40 hover:text-white"><X size={15} /></button></div>;
}
