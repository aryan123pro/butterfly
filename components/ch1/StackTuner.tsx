"use client";
import { useMemo, useState } from "react";
import * as O from "@/lib/optics";
import { Plot, Range, Readouts, Seg, Swatch, useCanvas } from "../ui";

type Fill = "air" | "water" | "ethanol" | "ipa";
interface P { dc: number; da: number; N: number; fill: Fill; th: number }

const PRESETS: { name: string; note: string; p: P }[] = [
  { name: "Morpho didius", note: "the classic: 8 shelves, ~455 nm", p: { dc: 75, da: 110, N: 8, fill: "air", th: 0 } },
  { name: "Morpho rhetenor", note: "more shelves, deeper and brighter", p: { dc: 70, da: 105, N: 11, fill: "air", th: 0 } },
  { name: "Wider gaps", note: "what if evolution chose 150 nm?", p: { dc: 75, da: 150, N: 8, fill: "air", th: 0 } },
  { name: "Soaked in alcohol", note: "isopropanol fills every gap", p: { dc: 75, da: 110, N: 8, fill: "ipa", th: 0 } },
  { name: "Two shelves only", note: "a thin film, like a soap bubble", p: { dc: 75, da: 110, N: 2, fill: "air", th: 0 } },
];

export default function StackTuner() {
  const [p, setP] = useState<P>(PRESETS[0].p);
  const set = (k: keyof P) => (v: number | Fill) => setP((x) => ({ ...x, [k]: v }));
  const nf = O.MEDIA[p.fill].n;
  const R = useMemo(() => O.spectrum(O.morphoStack({ dc: p.dc, da: p.da, N: p.N, nf }), p.th), [p, nf]);
  const col = O.color(R);
  const pk = O.peak(R, 380, 780);
  const bragg = O.braggPeak(1.56, p.dc, nf, p.da, p.th);
  const contrast = 1.56 - nf;

  const ref = useCanvas((cv) => {
    const { ctx: g, w: W, h: H } = O.setupCanvas(cv);
    g.clearRect(0, 0, W, H);
    const total = p.N * p.dc + (p.N - 1) * p.da;
    const sc = (H - 30) / Math.max(total, 1200);
    let y = 14;
    const fillCol = p.fill === "air" ? "rgba(0,0,0,0)" : "rgba(120,190,255,.22)";
    for (let i = 0; i < p.N; i++) {
      g.fillStyle = "#c9a96d"; g.fillRect(20, y, W - 40, Math.max(1, p.dc * sc)); y += p.dc * sc;
      if (i < p.N - 1) { g.fillStyle = fillCol; g.fillRect(20, y, W - 40, p.da * sc); y += p.da * sc; }
    }
    g.fillStyle = "#2a1a0d"; g.fillRect(20, y, W - 40, 10);
    g.fillStyle = "#8796aa"; g.font = '10px "IBM Plex Mono", monospace';
    g.fillText("drawn to scale · " + Math.round(total) + " nm tall", 20, H - 4);
  }, [p]);

  return (
    <div className="stack" style={{ gap: 18 }}>
      <div className="row">
        {PRESETS.map((x) => (
          <button key={x.name} className="btn sm" aria-pressed={JSON.stringify(x.p) === JSON.stringify(p)} onClick={() => setP(x.p)} title={x.note}>{x.name}</button>
        ))}
      </div>
      <div className="split" style={{ gridTemplateColumns: "minmax(0,1.4fr) minmax(0,1fr)" }}>
        <div className="panel stack">
          <Plot label="Reflectance spectrum of the stack" height={280} opts={{
            spectral: true, xlabel: "wavelength (nm)", ylabel: "reflectance",
            series: [{ data: R, color: "#e4ebf3", fill: "spectral", fillAlpha: 0.55 }],
            markers: [{ x: pk.lambda, label: "peak " + pk.lambda + " nm", color: col.css }, { x: Math.round(bragg), label: "Bragg estimate " + Math.round(bragg), color: "#56637a", row: 1 }],
          }} />
          <Readouts items={[
            ["Peak (full calculation)", pk.lambda, "nm"],
            ["Bragg estimate", Math.round(bragg), "nm"],
            ["Peak reflectance", Math.round(pk.R * 100), "%"],
            ["Index contrast", contrast.toFixed(2), "Δn"],
          ]} />
        </div>
        <div className="stack">
          <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) minmax(0,1fr)", gap: 14, alignItems: "stretch" }}>
            <div className="stack" style={{ gap: 6 }}>
              <Swatch color={col.css} label={"Perceived colour " + col.hex} />
              <span className="mono faint" style={{ fontSize: 11 }}>what your eye sees &middot; {col.hex}</span>
            </div>
            <div className="panel flush"><canvas ref={ref} className="cv" style={{ height: "100%", minHeight: 150 }} aria-label="Stack cross-section to scale" /></div>
          </div>
          <Range label="Chitin shelf thickness" value={p.dc} min={30} max={160} onChange={set("dc")} fmt={(v) => v + " nm"} />
          <Range label="Gap thickness" value={p.da} min={40} max={260} onChange={set("da")} fmt={(v) => v + " nm"} />
          <Range label="Number of shelves" value={p.N} min={1} max={14} onChange={set("N")} />
          <Range label="Viewing angle" value={p.th} min={0} max={70} onChange={set("th")} fmt={(v) => v + "°"} />
          <div className="ctrl"><span className="lbl"><span>What fills the gaps</span><span className="val">n = {nf.toFixed(3)}</span></span>
            <Seg label="Gap fill" value={p.fill} onChange={set("fill") as (v: Fill) => void} options={[["air", "Air"], ["water", "Water"], ["ethanol", "Ethanol"], ["ipa", "Isopropanol"]]} />
          </div>
        </div>
      </div>
    </div>
  );
}
