"use client";

import { useEffect, useState } from "react";
import { Megaphone } from "lucide-react";

export function GlobalAnnouncement() {
  const [notice, setNotice] = useState("");
  useEffect(() => {
    let mounted = true;
    const load = () => fetch("/api/public/notice", { cache: "no-store" }).then((response) => response.json()).then((data) => { if (mounted) setNotice(typeof data.notice === "string" ? data.notice : ""); }).catch(() => undefined);
    void load();
    const timer = window.setInterval(load, 30_000);
    return () => { mounted = false; window.clearInterval(timer); };
  }, []);
  if (!notice) return null;
  return <aside aria-label="Aviso global" className="relative z-20 flex w-full items-start gap-3 border-b border-amber-300/20 bg-amber-300/[.09] px-5 py-3 text-amber-100 sm:px-8"><Megaphone size={17} className="mt-0.5 shrink-0 text-amber-300" /><p className="whitespace-pre-wrap text-xs leading-5">{notice}</p></aside>;
}
