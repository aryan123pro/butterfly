"use client";
/* eslint-disable @next/next/no-img-element */
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { useEffect, useState } from "react";
import { TIMELINE } from "@/components/ch3/Future";

const TABS = [["timeline", "Timeline"], ["sources", "Sources"], ["slides", "Presentation"], ["team", "Team"]] as const;
type Tab = (typeof TABS)[number][0];

const SOURCES: { group: string; items: { url: string; used: string }[] }[] = [
  { group: "Scale of the problem", items: [
    { url: "https://oceantomo.com/insights/the-impact-of-counterfeit-goods-in-global-commerce/", used: "$470B counterfeit trade, 2.3% of imports (OECD & EUIPO)" },
    { url: "https://www.who.int/news-room/fact-sheets/detail/substandard-and-falsified-medical-products", used: "1 in 10 medical products in LMICs substandard or falsified" },
  ] },
  { group: "Biological phenomenon", items: [
    { url: "https://www.smartmaterialsolutions.com/blog/2021/11/1/structural-color-how-peacocks-butterflies-and-invisibility-cloaks-get-their-colors-klspg", used: "Structural colour and iridescence" },
    { url: "https://www.sciencedirect.com/science/article/pii/S2590049824000614", used: "Multilayer lamellae and photonic structures" },
  ] },
  { group: "Applications", items: [
    { url: "https://asknature.org/innovation/anti-counterfeiting-technology-inspired-by-the-morpho-butterfly/", used: "KolourOptik and LumaChrome" },
    { url: "https://metamaterial.com/banknote/products/kolouroptik-stripe-banknote-security/", used: "KolourOptik stripe for banknotes" },
    { url: "https://doi.org/10.1021/acsami.8b14146", used: "Biomimetic security nanostructures" },
    { url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC8288439", used: "Bio-inspired photonics" },
    { url: "https://www.sciencedirect.com/science/article/abs/pii/S014486172400821X", used: "Vapour sensing with photonic structures" },
    { url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC6045417/", used: "Morpho didius scales as a CWA-simulant sensor (USAFA)" },
    { url: "https://pubs.acs.org/doi/10.1021/acsomega.7b01680", used: "Six-stage vapour sensor set-up and PCA" },
    { url: "https://www.researchgate.net/publication/290247275_Structurally_colored_fiber_MorphotexR", used: "MorphoTex: 61 layers, 70 nm" },
    { url: "https://www.snexplores.org/article/butterfly-wings-and-waterproof-coats", used: "Morpho sulkowskyi waterproof coats, 40% faster bounce" },
  ] },
  { group: "Statistical data", items: [
    { url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC7560414/", used: "UV stability, resolution, thermal stability of tags" },
    { url: "https://www.mdpi.com/2072-666X/16/7/813", used: "Production cost of biomimetic vs dye tags" },
    { url: "https://www.nature.com/articles/ncomms8959", used: "Sensor statistics" },
    { url: "https://www.mdpi.com/1424-8220/20/1/157", used: "Conventional sensor arrays, LOD and recovery" },
    { url: "https://link.springer.com/article/10.1007/s00604-024-06258-8", used: "Metal-oxide sensor operating temperatures" },
  ] },
];

const TEAM = [["C106", "Sarthak Agarwal"], ["C122", "Saharsh B"], ["C123", "Sanidhya Bakliwal"], ["C129", "Bhavishya Bhaloria"]];
const N_SLIDES = 38;

export default function References() {
  const [tab, setTab] = useState<Tab>("timeline");
  const [lb, setLb] = useState<number | null>(null);
  useEffect(() => {
    // Next's Link updates the hash with pushState, which fires no hashchange event, so poll lightly
    const read = () => { const h = location.hash.replace("#", "") as Tab; if (TABS.some(([k]) => k === h)) setTab(h); };
    read();
    const id = setInterval(read, 300);
    return () => clearInterval(id);
  }, []);
  useEffect(() => {
    if (lb === null) return;
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") setLb(null);
      if (e.key === "ArrowRight") { e.stopPropagation(); setLb((i) => (i === null ? null : Math.min(N_SLIDES, i + 1))); }
      if (e.key === "ArrowLeft") { e.stopPropagation(); setLb((i) => (i === null ? null : Math.max(1, i - 1))); }
    };
    window.addEventListener("keydown", key, true);
    return () => window.removeEventListener("keydown", key, true);
  }, [lb]);
  const go = (k: Tab) => { setTab(k); try { history.replaceState(null, "", "#" + k); } catch { /* ignore */ } };

  return (
    <main className="wrap" style={{ paddingBottom: 30 }}>
      <div className="reftabs seg" role="tablist">
        {TABS.map(([k, l]) => <button key={k} role="tab" aria-pressed={tab === k} onClick={() => go(k)}>{l}</button>)}
      </div>

      {tab === "timeline" && (
        <div className="stack" style={{ gap: 12 }}>
          {TIMELINE.map((e) => (
            <div key={e.y} className="src" style={{ gridTemplateColumns: "90px minmax(0,1fr)" }}>
              <b style={{ fontSize: "1.3rem", fontFamily: "var(--f-display)", color: "var(--morpho)", letterSpacing: 0 }}>{e.y}</b>
              <div><h4 style={{ marginBottom: 4 }}>{e.t}</h4><p>{e.s}</p></div>
            </div>
          ))}
        </div>
      )}

      {tab === "sources" && (
        <div className="stack" style={{ gap: 22 }}>
          {SOURCES.map((g) => (
            <section key={g.group} className="stack" style={{ gap: 10 }}>
              <p className="eyebrow">{g.group}</p>
              <div className="srcs">{g.items.map((s) => <div key={s.url} className="src"><b>{new URL(s.url).hostname.replace("www.", "")}</b><div><a href={s.url} target="_blank" rel="noreferrer">{s.url}</a><p>{s.used}</p></div></div>)}</div>
            </section>
          ))}
          <p className="faint" style={{ fontSize: "var(--t-xs)" }}>Simulation note: all colours are computed with the transfer-matrix method and CIE 1931 colour matching. The vapour-sensor and thermal-imager models are teaching models tuned to reproduce the reported behaviour.</p>
        </div>
      )}

      {tab === "slides" && (
        <div className="slides">
          {Array.from({ length: N_SLIDES }, (_, i) => i + 1).map((n) => (
            <button key={n} onClick={() => setLb(n)} aria-label={"Open slide " + n}>
              <img src={`/slides/slide-${String(n).padStart(2, "0")}.jpg`} alt={"Slide " + n} loading="lazy" />
              <span>{n}</span>
            </button>
          ))}
        </div>
      )}

      {tab === "team" && (
        <div className="stack" style={{ gap: 16 }}>
          <div className="team">{TEAM.map(([r, n]) => <div key={r} className="member"><span className="roll">{r}</span><b>{n}</b></div>)}</div>
          <p className="muted">Bio-inspired Security &amp; Anti-counterfeiting Technology. Built as an interactive companion to the presentation.</p>
        </div>
      )}

      {lb !== null && (
        <div className="lightbox" onClick={() => setLb(null)} role="dialog" aria-label={"Slide " + lb}>
          <img src={`/slides/slide-${String(lb).padStart(2, "0")}.jpg`} alt={"Slide " + lb} onClick={(e) => e.stopPropagation()} />
          <div className="lb-bar" onClick={(e) => e.stopPropagation()}>
            <button className="btn sm" disabled={lb <= 1} onClick={() => setLb(lb - 1)}><ChevronLeft size={15} /></button>
            <span className="chip">{lb} / {N_SLIDES}</span>
            <button className="btn sm" disabled={lb >= N_SLIDES} onClick={() => setLb(lb + 1)}><ChevronRight size={15} /></button>
            <button className="btn sm" onClick={() => setLb(null)}><X size={15} /></button>
          </div>
        </div>
      )}
    </main>
  );
}
