"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { CHAPTERS, LABS, REFS, TRACKED, store, type PageInfo } from "@/lib/site";

interface StepReg { titles: string[]; go: (i: number) => void }
const ShellCtx = createContext<{ setSteps: (s: StepReg | null) => void; presenting: boolean }>({ setSteps: () => {}, presenting: false });
export const useShell = () => useContext(ShellCtx);

function Logo() {
  return (
    <svg viewBox="0 0 32 32" aria-hidden="true">
      <defs>
        <linearGradient id="lg-m" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#7fd8ff" /><stop offset=".55" stopColor="#3f8cff" /><stop offset="1" stopColor="#7a5cff" />
        </linearGradient>
      </defs>
      <path fill="url(#lg-m)" d="M15.4 15C13 8.5 8.2 4.6 3.6 4.4 1.7 4.3 1.4 6.3 2.3 9c1 3 2.9 5.5 6 6.4-3.1 1-4.7 3.4-4.3 6.3.5 3.4 4.4 5.2 7.4 2.7 2.1-1.8 3.4-5 4-9.4z" />
      <path fill="url(#lg-m)" opacity=".85" d="M16.6 15C19 8.5 23.8 4.6 28.4 4.4c1.9-.1 2.2 1.9 1.3 4.6-1 3-2.9 5.5-6 6.4 3.1 1 4.7 3.4 4.3 6.3-.5 3.4-4.4 5.2-7.4 2.7-2.1-1.8-3.4-5-4-9.4z" />
      <rect x="15.3" y="9" width="1.4" height="16" rx=".7" fill="#e4ebf3" />
    </svg>
  );
}

function Menu({ label, items, open, setOpen, path }: { label: string; items: PageInfo[]; open: string; setOpen: (s: string) => void; path: string }) {
  const isOpen = open === label;
  return (
    <details open={isOpen} onToggle={(e) => { const o = (e.target as HTMLDetailsElement).open; if (o !== isOpen) setOpen(o ? label : ""); }}>
      <summary onClick={(e) => { e.preventDefault(); setOpen(isOpen ? "" : label); }}>{label}</summary>
      <div className="menu">
        {items.map((p) => (
          <Link key={p.href} href={p.href} aria-current={path === p.href.split("#")[0] ? "page" : undefined} onClick={() => setOpen("")}>
            <span className="k">{p.k}</span><b>{p.title}</b><small>{p.sub}</small>
          </Link>
        ))}
      </div>
    </details>
  );
}

export default function Shell({ children }: { children: React.ReactNode }) {
  const path = usePathname() || "/";
  const router = useRouter();
  const [open, setOpen] = useState("");
  const [presenting, setPresenting] = useState(false);
  const [explored, setExplored] = useState(0);
  const [pal, setPal] = useState(false);
  const [q, setQ] = useState("");
  const [sel, setSel] = useState(0);
  const [steps, setSteps] = useState<StepReg | null>(null);
  const barRef = useRef<HTMLElement>(null);
  const qRef = useRef<HTMLInputElement>(null);

  useEffect(() => { setPresenting(!!store<boolean>("present")); }, []);
  useEffect(() => { document.body.classList.toggle("presenting", presenting); store("present", presenting); }, [presenting]);
  useEffect(() => {
    const page = TRACKED.find((p) => p.href === path);
    const visited = store<string[]>("visited") || [];
    if (page && !visited.includes(page.id)) { visited.push(page.id); store("visited", visited); }
    setExplored(visited.filter((v) => TRACKED.some((p) => p.id === v)).length);
    setOpen("");
  }, [path]);
  useEffect(() => {
    const close = (e: MouseEvent) => { if (barRef.current && !barRef.current.contains(e.target as Node)) setOpen(""); };
    document.addEventListener("click", close);
    return () => document.removeEventListener("click", close);
  }, []);

  const toggleFull = useCallback(() => {
    try { if (document.fullscreenElement) document.exitFullscreen(); else document.documentElement.requestFullscreen().catch(() => {}); } catch { /* not supported */ }
  }, []);

  type Entry = { t: string; s: string; href?: string; step?: number; action?: () => void };
  const entries = useMemo<Entry[]>(() => {
    const e: Entry[] = [{ t: "Home", s: "start", href: "/" }];
    CHAPTERS.forEach((p) => e.push({ t: p.title, s: "chapter " + p.k, href: p.href }));
    LABS.forEach((p) => e.push({ t: p.title, s: "playground", href: p.href }));
    REFS.forEach((p) => e.push({ t: p.title, s: "reference", href: p.href }));
    steps?.titles.forEach((t, i) => e.push({ t, s: "this page · step " + (i + 1), step: i }));
    e.push({ t: "Toggle presenter mode", s: "P", action: () => setPresenting((p) => !p) });
    e.push({ t: "Full screen", s: "F", action: toggleFull });
    return e;
  }, [steps, toggleFull]);
  const results = entries.filter((e) => !q || (e.t + " " + e.s).toLowerCase().includes(q.toLowerCase()));
  const pick = (e?: Entry) => {
    if (!e) return;
    setPal(false);
    if (e.action) e.action();
    else if (e.step != null) steps?.go(e.step);
    else if (e.href) router.push(e.href);
  };
  useEffect(() => { if (pal) { setQ(""); setSel(0); setTimeout(() => qRef.current?.focus(), 0); } }, [pal]);

  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") { e.preventDefault(); setPal((p) => !p); return; }
      const typing = /input|textarea|select/i.test(t.tagName) && (t as HTMLInputElement).type !== "range";
      if (typing || e.ctrlKey || e.metaKey || e.altKey) return;
      if (e.key === "p" || e.key === "P") setPresenting((p) => !p);
      else if (e.key === "f" || e.key === "F") toggleFull();
      else if (e.key === "Escape") { setPal(false); setOpen(""); }
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [toggleFull]);

  const ctx = useMemo(() => ({ setSteps, presenting }), [presenting]);

  return (
    <ShellCtx.Provider value={ctx}>
      <header className="topbar" ref={barRef}>
        <div className="wrap">
          <Link className="brand" href="/"><Logo /><span>Morpho Lab</span></Link>
          <nav className="nav" aria-label="Site">
            <Menu label="Chapters" items={CHAPTERS} open={open} setOpen={setOpen} path={path} />
            <Menu label="Playgrounds" items={LABS} open={open} setOpen={setOpen} path={path} />
            <Menu label="Reference" items={REFS} open={open} setOpen={setOpen} path={path} />
          </nav>
          <div className="tools">
            <span className="pathmeter hide-sm" title="Chapters and playgrounds you have opened in this browser">
              Path {explored}/{TRACKED.length}<i><b style={{ width: (explored / TRACKED.length) * 100 + "%" }} /></i>
            </span>
            <button className="btn sm ghost" aria-pressed={presenting} title="Presenter mode (P)" onClick={() => setPresenting((p) => !p)}>Present</button>
            <button className="btn sm ghost" title="Jump anywhere" onClick={() => setPal(true)}>Jump <span className="kbd">Ctrl K</span></button>
          </div>
        </div>
      </header>

      {children}

      <footer className="foot">
        <div className="wrap">
          <span>Morpho Lab &middot; Bio-inspired security &amp; anti-counterfeiting &middot; C106 C122 C123 C129</span>
          <span>Every structural colour here is computed live from thin-film optics. Keys: &larr; &rarr; steps &middot; P presenter &middot; F full screen &middot; Ctrl K jump</span>
        </div>
      </footer>

      <div className="palette" hidden={!pal} onClick={(e) => { if (e.target === e.currentTarget) setPal(false); }}>
        <div className="box" role="dialog" aria-label="Jump to">
          <input
            ref={qRef} id="palQ" type="text" placeholder={"Jump to a chapter, step or playground…"} autoComplete="off" value={q}
            onChange={(e) => { setQ(e.target.value); setSel(0); }}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") { setSel((s) => Math.min(results.length - 1, s + 1)); e.preventDefault(); }
              else if (e.key === "ArrowUp") { setSel((s) => Math.max(0, s - 1)); e.preventDefault(); }
              else if (e.key === "Enter") { pick(results[sel]); e.preventDefault(); }
              else if (e.key === "Escape") setPal(false);
            }}
          />
          <ul>
            {results.map((e, i) => (
              <li key={e.t + e.s} className={i === sel ? "sel" : ""}>
                <a href={e.href || "#"} onClick={(ev) => { ev.preventDefault(); pick(e); }}>{e.t}<small>{e.s}</small></a>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </ShellCtx.Provider>
  );
}
