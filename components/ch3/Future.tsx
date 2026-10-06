"use client";
import { motion } from "motion/react";
import { RotateCcw, Wind } from "lucide-react";
import { useMemo, useRef, useState } from "react";
import * as O from "@/lib/optics";
import { Range, useCanvas, useRaf } from "../ui";

export const TIMELINE = [
  { y: 1665, t: "Hooke's Micrographia", s: "Robert Hooke describes the colours of peacock feathers and suspects they come from structure, not pigment." },
  { y: 1942, t: "First nanoscale images of a Morpho wing", s: "The electron microscope reveals the ridges and shelves behind the blue for the first time." },
  { y: 1988, t: "First polymer banknote", s: "The Reserve Bank of Australia and CSIRO issue the world's first polymer note, carrying an optically variable device (OVD)." },
  { y: 2011, t: "Mirasol e-readers", s: "The first commercial e-readers with Qualcomm's Mirasol interferometric displays reach shops." },
  { y: 2012, t: "Biomimetic security pattern", s: "An iridescent blue geometric pattern built from biomimetic photonic nanostructures is shown for high-security anti-counterfeiting." },
  { y: 2013, t: "KolourOptik", s: "Nanotech Security Corp (later Meta Materials) launches KolourOptik for banknotes and government documents." },
];

function Timeline() {
  const [i, setI] = useState(5);
  return (
    <div className="stack" style={{ gap: 14 }}>
      <div className="tl" role="tablist" aria-label="Research timeline">
        <div className="tl-line" />
        {TIMELINE.map((e, k) => (
          <button key={e.y} role="tab" aria-selected={k === i} className={"tl-pt" + (k === i ? " on" : "")} onClick={() => setI(k)} style={{ left: `${4 + (k / (TIMELINE.length - 1)) * 92}%` }}>
            <i /><b>{e.y}</b>
          </button>
        ))}
      </div>
      <motion.div key={i} className="panel" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
        <p className="eyebrow">{TIMELINE[i].y}</p>
        <h3 style={{ margin: "6px 0 8px" }}>{TIMELINE[i].t}</h3>
        <p className="muted">{TIMELINE[i].s}</p>
      </motion.div>
    </div>
  );
}

// a QR-like pattern with three finder squares, deterministic
function code(n = 25) {
  const m: number[][] = [];
  let seed = 7;
  const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  for (let y = 0; y < n; y++) { m.push([]); for (let x = 0; x < n; x++) m[y].push(rnd() > 0.52 ? 1 : 0); }
  const finder = (ox: number, oy: number) => { for (let y = 0; y < 7; y++) for (let x = 0; x < 7; x++) { const e = x === 0 || y === 0 || x === 6 || y === 6 || (x >= 2 && x <= 4 && y >= 2 && y <= 4); m[oy + y][ox + x] = e ? 1 : 0; } };
  finder(0, 0); finder(n - 7, 0); finder(0, n - 7);
  return m;
}

function Reveal() {
  const [f, setF] = useState(0);
  const [phase, setPhase] = useState<"idle" | "in" | "out">("idle");
  const fRef = useRef(0);
  useRaf((_t, dt) => {
    let n = fRef.current;
    if (phase === "in") { n = Math.min(1, n + dt / 0.6); if (n >= 1) setPhase("out"); }
    else if (phase === "out") { n = Math.max(0, n - dt / 5); if (n <= 0) setPhase("idle"); }
    fRef.current = n; setF(n);
  }, phase !== "idle");
  const M = useMemo(() => code(), []);
  const sealed = useMemo(() => O.color(O.spectrum(O.morphoStack(), 8)).css, []);
  const pitCol = O.color(O.spectrum(O.morphoStack({ nf: 1 + 0.333 * f }), 8)).css;
  const ref = useCanvas((cv) => {
    const { ctx: g, w, h } = O.setupCanvas(cv);
    const n = M.length, s = Math.min(w, h) / (n + 2), ox = (w - s * n) / 2, oy = (h - s * n) / 2;
    g.fillStyle = "#06080c"; g.fillRect(0, 0, w, h);
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) { g.fillStyle = M[y][x] ? pitCol : sealed; g.fillRect(ox + x * s, oy + y * s, s + 0.5, s + 0.5); }
    if (f > 0.02) { const fog = g.createRadialGradient(w / 2, h / 2, 10, w / 2, h / 2, w * 0.7); fog.addColorStop(0, `rgba(220,240,255,${0.18 * f})`); fog.addColorStop(1, "rgba(220,240,255,0)"); g.fillStyle = fog; g.fillRect(0, 0, w, h); }
  }, [f, pitCol, sealed, M]);
  return (
    <div className="panel stack" style={{ gap: 12 }}>
      <h4>Solvent-triggered reveal</h4>
      <p className="muted" style={{ fontSize: "var(--t-sm)" }}>Half the cells are open micro-pits, half are sealed. Dry, they are the same blue. Breathe on the tag and vapour fills only the open pits: a machine-readable code appears, then fades as it dries.</p>
      <canvas ref={ref} className="cv" style={{ height: 240 }} role="img" aria-label="Tag that reveals a hidden code when breathed on" />
      <button className="btn primary" disabled={phase !== "idle"} onClick={() => setPhase("in")}><Wind size={15} /> Breathe on the tag</button>
    </div>
  );
}

function Seal() {
  const [strain, setStrain] = useState(0);
  const [maxStrain, setMax] = useState(0);
  const YIELD = 0.15;
  const set = (v: number) => { setStrain(v); setMax((m) => Math.max(m, v)); };
  const permanent = Math.max(0, maxStrain - YIELD) * 0.7;
  const eff = Math.max(strain, permanent);
  const k = 1 / Math.sqrt(1 + eff); // film thins as it stretches (incompressible)
  const now = O.color(O.spectrum(O.morphoStack({ dc: 120 * k, da: 170 * k, N: 7 }), 0), 1.15);
  const orig = O.color(O.spectrum(O.morphoStack({ dc: 120, da: 170, N: 7 }), 0), 1.15);
  const tampered = permanent > 0.005;
  return (
    <div className="panel stack" style={{ gap: 12 }}>
      <div className="row" style={{ justifyContent: "space-between" }}><h4>Tamper-evident seal</h4><span className={"chip " + (tampered ? "bad" : "good")}>{tampered ? "Tampered" : "Intact"}</span></div>
      <p className="muted" style={{ fontSize: "var(--t-sm)" }}>An elastic photonic film over a cap. Stretch it and the layers thin, so the colour shifts. Past {Math.round(YIELD * 100)}% strain the film yields and the shift becomes permanent.</p>
      <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) minmax(0,1fr)", gap: 12 }}>
        <div className="stack" style={{ gap: 6 }}><div className="swatch" style={{ background: orig.css, color: orig.css, aspectRatio: "2 / 1" }} /><span className="mono faint" style={{ fontSize: 11 }}>as manufactured</span></div>
        <div className="stack" style={{ gap: 6 }}>
          <div className="swatch" style={{ background: now.css, color: now.css, aspectRatio: "2 / 1", transform: `scaleX(${1 + strain})`, transformOrigin: "left" }} />
          <span className="mono faint" style={{ fontSize: 11 }}>now &middot; {Math.round(eff * 100)}% stretched</span>
        </div>
      </div>
      <Range label="Pull on the seal" value={strain} min={0} max={0.3} step={0.005} onChange={set} fmt={(v) => Math.round(v * 100) + "%"} />
      <div className="row">
        <button className="btn sm" onClick={() => setStrain(0)}>Let go</button>
        <button className="btn sm ghost" onClick={() => { setStrain(0); setMax(0); }}><RotateCcw size={13} /> New seal</button>
      </div>
    </div>
  );
}

export default function Future() {
  return (
    <div className="stack" style={{ gap: 22 }}>
      <Timeline />
      <div>
        <p className="eyebrow" style={{ marginBottom: 12 }}>Future possibilities</p>
        <div className="grid2"><Reveal /><Seal /></div>
      </div>
    </div>
  );
}
