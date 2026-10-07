"use client";
/* eslint-disable @next/next/no-img-element */
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { useEffect, useState } from "react";
import TeamSpecimens from "@/components/TeamSpecimens";
import { store } from "@/lib/site";

const TABS = [["photos", "Photos"], ["sources", "Sources"], ["slides", "Presentation"], ["team", "Team"]] as const;

/* Downloaded from Wikimedia Commons into public/photos. Licences checked per file. */
const PHOTOS: { src: string; t: string; s: string; credit: string; lic: string; page: string }[] = [
  { src: "/photos/didius-top.jpg", t: "Morpho didius, upper side", s: "The structural blue. There is no blue pigment anywhere in these scales.", credit: "Didier Descouens, Muséum de Toulouse", lic: "CC BY-SA 4.0", page: "https://commons.wikimedia.org/wiki/File:Morpho_didius_Male_MHNT.jpg" },
  { src: "/photos/didius-under.jpg", t: "Morpho didius, underside", s: "The same wing from below: brown melanin and eyespots, no structural colour.", credit: "Didier Descouens, Muséum de Toulouse", lic: "CC BY-SA 4.0", page: "https://commons.wikimedia.org/wiki/File:Morpho_didius_Male_Ventre_MHNT.jpg" },
  { src: "/photos/rhetenor.jpg", t: "Morpho rhetenor", s: "More lamellae per ridge than M. didius, so a deeper, more mirror-like blue.", credit: "Didier Descouens, Muséum de Toulouse", lic: "CC BY-SA 4.0", page: "https://commons.wikimedia.org/wiki/File:Morpho_rhetenor_rhetenor_MHNT.jpg" },
  { src: "/photos/live-underside.jpg", t: "A blue morpho at rest", s: "Wings closed, only the brown underside shows. The blue flashes only in flight.", credit: "Flickr, via Wikimedia Commons", lic: "CC0", page: "https://commons.wikimedia.org/wiki/File:Blue_morpho_(underside)_(9339594247).jpg" },
  { src: "/photos/sem-series.jpg", t: "From wing to ridge", s: "A peacock butterfly (not a Morpho) from photo to light microscope to scanning electron microscope: the same zoom as our nano-dive.", credit: "SecretDisc and others, via Wikimedia Commons", lic: "CC BY-SA 3.0", page: "https://commons.wikimedia.org/wiki/File:Butterfly_magnification_series_collage.jpg" },
  { src: "/photos/sem-scale.jpg", t: "One wing scale under the SEM", s: "A single butterfly scale (species not stated), about 150 µm long, ruled with parallel ridges. Scale bar 10 µm.", credit: "Brandon Antonio Segura Torres & Priscilla Vieto Bonilla", lic: "CC BY-SA 4.0", page: "https://commons.wikimedia.org/wiki/File:Escama_de_ala_de_mariposa_SEM.jpg" },
  { src: "/photos/sem-ridges.jpg", t: "Ridges and cross-ribs", s: "Zoomed into the ridges of a butterfly scale. Scale bar 200 nm: the same size range as the Morpho's 75 nm shelves.", credit: "Brandon Antonio Segura Torres & Priscilla Vieto Bonilla", lic: "CC BY-SA 4.0", page: "https://commons.wikimedia.org/wiki/File:Detalle_a_estructuras_m%C3%A1s_peque%C3%B1as_de_las_escamas_del_ala_de_una_mariposa_SEM.jpg" },
];
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
    { url: "https://www.nature.com/articles/nphoton.2007.2", used: "Potyrailo et al. 2007: Morpho scales give a different spectral response to each vapour (capillary condensation)" },
    { url: "https://www.pnas.org/doi/10.1073/pnas.1311196110", used: "Potyrailo et al. 2013: polar ridge tops, less-polar bottoms; the source of selectivity" },
    { url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC6045417/", used: "Kittle et al. 2017 (USAFA): M. didius vs DMMP, DCP, water, methanol, ethanol; set-up; 3 PCs = 91.9%" },
    { url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC6983141/", used: "Kittle et al. 2020: DMMP 120 ppm alone / 30 ppm in mixtures, DCP 240 / 50 ppm, response visible in under a minute" },
    { url: "https://www.ncbi.nlm.nih.gov/pmc/articles/PMC4569698/", used: "Potyrailo et al. 2015: fabricated Morpho-inspired sensors, 98.1% in 3 PCs, 160 cycles" },
    { url: "https://www.researchgate.net/publication/273790857_Vapor_Sensing_of_Pristine_and_ALD_Modified_Butterfly_Wings", used: "Piszter et al.: an ALD Al₂O₃ coat removes the vapour selectivity" },
    { url: "https://www.researchgate.net/publication/290247275_Structurally_colored_fiber_MorphotexR", used: "MorphoTex: 61 layers, 70 nm" },
    { url: "https://www.snexplores.org/article/butterfly-wings-and-waterproof-coats", used: "Morpho sulkowskyi waterproof coats, 40% faster bounce" },
  ] },
  { group: "Statistical data", items: [
    { url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC7560414/", used: "UV stability, resolution, thermal stability of tags" },
    { url: "https://www.mdpi.com/2072-666X/16/7/813", used: "Production cost of biomimetic vs dye tags" },

  ] },
];

const N_SLIDES = 38;

export default function References() {
  const [tab, setTab] = useState<Tab>("photos");
  const [ph, setPh] = useState<number | null>(null);
  const [lb, setLb] = useState<number | null>(null);
  useEffect(() => {
    // Next's Link updates the hash with pushState, which fires no hashchange event, so poll lightly
    const read = () => { const h = location.hash.replace("#", "") as Tab; if (TABS.some(([k]) => k === h)) setTab(h); };
    read();
    // the story ends here: open on the team, unless a tab was asked for
    if (!location.hash && store<boolean>("story")) setTab("team");
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
  useEffect(() => {
    if (ph === null) return;
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") setPh(null);
      if (e.key === "ArrowRight") { e.stopPropagation(); setPh((i) => (i === null ? null : Math.min(PHOTOS.length - 1, i + 1))); }
      if (e.key === "ArrowLeft") { e.stopPropagation(); setPh((i) => (i === null ? null : Math.max(0, i - 1))); }
    };
    window.addEventListener("keydown", key, true);
    return () => window.removeEventListener("keydown", key, true);
  }, [ph]);
  const go = (k: Tab) => { setTab(k); try { history.replaceState(null, "", "#" + k); } catch { /* ignore */ } };

  return (
    <main className="wrap" style={{ paddingBottom: 30 }}>
      <div className="reftabs seg" role="tablist">
        {TABS.map(([k, l]) => <button key={k} role="tab" aria-pressed={tab === k} onClick={() => go(k)}>{l}</button>)}
      </div>

      {tab === "photos" && (
        <div className="photos">
          {PHOTOS.map((x, i) => (
            <figure key={x.src} className="photo">
              <button onClick={() => setPh(i)} aria-label={"Enlarge: " + x.t}><img src={x.src} alt={x.t} loading="lazy" /></button>
              <figcaption><b>{x.t}</b><span>{x.s}</span><small><a href={x.page} target="_blank" rel="noreferrer">{x.credit} &middot; {x.lic}</a></small></figcaption>
            </figure>
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
          <p className="faint" style={{ fontSize: "var(--t-xs)" }}>Simulation note: all colours are computed with the transfer-matrix method and CIE 1931 colour matching. The Vapour Lab is a teaching model: its vapours, concentrations, vapour pressures, refractive indices and mechanism come from the papers above; its uptake constants are tuned.</p>
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
        <TeamSpecimens />
      )}

      {ph !== null && (
        <div className="lightbox" onClick={() => setPh(null)} role="dialog" aria-label={PHOTOS[ph].t}>
          <img src={PHOTOS[ph].src} alt={PHOTOS[ph].t} onClick={(e) => e.stopPropagation()} />
          <figcaption>{PHOTOS[ph].t}</figcaption>
          <div className="lb-bar" onClick={(e) => e.stopPropagation()}>
            <button className="btn sm" disabled={ph <= 0} onClick={() => setPh(ph - 1)}><ChevronLeft size={15} /></button>
            <span className="chip">{ph + 1} / {PHOTOS.length}</span>
            <button className="btn sm" disabled={ph >= PHOTOS.length - 1} onClick={() => setPh(ph + 1)}><ChevronRight size={15} /></button>
            <button className="btn sm" onClick={() => setPh(null)}><X size={15} /></button>
          </div>
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
