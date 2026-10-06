"use client";
import { OrbitControls, Sparkles } from "@react-three/drei";
import { Droplets, Hammer, RotateCcw, Sun } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import * as O from "@/lib/optics";
import { lutTexture, updateLut } from "@/lib/scene/materials";
import Backdrop from "../three/Backdrop";
import Butterfly from "../three/Butterfly";
import Stage3D from "../three/Stage3D";
import { Plot, Range, Readouts, Seg, Swatch, useCanvas, useRaf } from "../ui";

type Exp = "soak" | "sun" | "crush";
const IPA = 1.377;

/* ---------- 1. soak in isopropanol ---------- */
function Soak() {
  const [f, setF] = useState(0);
  const [phase, setPhase] = useState<"dry" | "soaking" | "wet" | "drying">("dry");
  const clock = useRef(0), fRef = useRef(0);
  const lut = useMemo(() => lutTexture(O.angleLUT(O.morphoStack(), 64, 80).data), []);
  const lastF = useRef(-1);
  useRaf((_t, dt) => {
    clock.current += dt;
    let n = fRef.current;
    if (phase === "soaking") { n = Math.min(1, n + dt / 1.4); if (n >= 1) { setPhase("wet"); clock.current = 0; } }
    else if (phase === "wet" && clock.current > 2.2) setPhase("drying");
    else if (phase === "drying") { n = Math.max(0, n - dt / 6); if (n <= 0) setPhase("dry"); }
    if (n !== fRef.current) { fRef.current = n; setF(n); }
  }, phase !== "dry");
  const nf = 1 + f * (IPA - 1);
  useEffect(() => {
    if (Math.abs(f - lastF.current) < 0.03 && f !== 0 && f !== 1) return;
    lastF.current = f;
    updateLut(lut, O.angleLUT(O.morphoStack({ nf }), 64, 80).data);
  }, [f, nf, lut]);
  const R = useMemo(() => O.spectrum(O.morphoStack({ nf }), 0), [nf]);
  const R0 = useMemo(() => O.spectrum(O.morphoStack(), 0), []);
  const pk = O.peak(R, 380, 780);
  const status = { dry: "Dry wing. Air in every gap.", soaking: "Alcohol is wicking into the gaps…", wet: "Gaps full. Index contrast has dropped from 0.56 to 0.18.", drying: "Evaporating. Nothing was washed out, so the blue comes back." }[phase];

  return (
    <div className="split">
      <Stage3D style={{ height: 420 }} label="3D butterfly being soaked in isopropanol" camera={{ position: [0, 6.5, 6], fov: 34 }} bloom={1.2}
        overlay={<div className="hud" style={{ top: 12, left: 14 }}>gap filled <b>{Math.round(f * 100)}%</b> &middot; n<sub>gap</sub> = <b>{nf.toFixed(3)}</b></div>}>
        <Backdrop />
        <Butterfly lut={lut} flap={false} gain={0.5} light={new THREE.Vector3(-3, 6, -2)} rotation={[0.25, Math.PI, 0]} />
        {phase !== "dry" && <Sparkles count={80} scale={[5, 1.5, 4]} position={[0, 0.4, 0]} size={5} speed={0.6} color="#c9f0ff" opacity={0.7 * f} />}
        <OrbitControls enablePan={false} enableZoom={false} autoRotate autoRotateSpeed={0.4} minPolarAngle={0.2} maxPolarAngle={1.1} />
      </Stage3D>
      <div className="stack">
        <button className="btn primary" disabled={phase !== "dry"} onClick={() => setPhase("soaking")}><Droplets size={16} /> Drop isopropanol on the wing</button>
        <p className="muted" aria-live="polite">{status}</p>
        <Readouts items={[["Peak", pk.lambda, "nm"], ["Shift", pk.lambda - O.peak(R0, 380, 780).lambda, "nm"], ["Gap index", nf.toFixed(2)]]} />
        <div className="panel">
          <Plot label="Spectrum dry and soaked" height={190} opts={{ spectral: true, series: [{ data: R0, color: O.MUTED, width: 1.2, dash: [4, 4] }, { data: R, color: O.INK, fill: "spectral", fillAlpha: 0.55 }] }} />
          <p className="faint" style={{ fontSize: "var(--t-xs)" }}>Dashed: dry. Solid: now.</p>
        </div>
        <div className="callout"><b>Pigment test.</b> Dye would dissolve or stay the same colour. A structural colour shifts, then fully recovers once the liquid leaves. Lepidopterists use exactly this trick.</div>
      </div>
    </div>
  );
}

/* ---------- 2. 1000 hours of sunlight ---------- */
const DYE = O.WL.map((l) => 0.05 + 0.62 * Math.exp(-(((l - 455) / 42) ** 2)));
function dyeSpectrum(hours: number) {
  const c = Math.exp(-hours / 230); // half the colour gone by ~160 h, in the 100-300 h band reported for dyes
  return new Float32Array(DYE.map((r) => 1 - (1 - r) * c * 0.92)); // faded dye washes out toward the white backing
}
function saturation(col: O.Colour) { const [r, g, b] = col.lin; const mx = Math.max(r, g, b), mn = Math.min(r, g, b); return mx > 0 ? (mx - mn) / mx : 0; }

function SunTest() {
  const [h, setH] = useState(0);
  const [run, setRun] = useState(false);
  const hRef = useRef(0);
  hRef.current = h;
  useRaf((_t, dt) => { const n = Math.min(1000, hRef.current + dt * 160); setH(n); if (n >= 1000) setRun(false); }, run);
  const structR = useMemo(() => O.spectrum(O.morphoStack(), 0), []);
  const s = O.color(structR), d = O.color(dyeSpectrum(h)), d0 = O.color(dyeSpectrum(0));
  const loss = Math.max(0, 1 - saturation(d) / saturation(d0));
  const sun = useCanvas((cv) => {
    const { ctx: g, w, h: H } = O.setupCanvas(cv);
    g.clearRect(0, 0, w, H);
    const x = 30 + ((w - 60) * h) / 1000, y = H - 20 - Math.sin((Math.PI * h) / 1000) * (H - 40);
    const gr = g.createRadialGradient(x, y, 2, x, y, 40); gr.addColorStop(0, "rgba(255,230,150,1)"); gr.addColorStop(0.3, "rgba(255,180,60,.5)"); gr.addColorStop(1, "rgba(255,160,40,0)");
    g.fillStyle = gr; g.fillRect(0, 0, w, H);
    g.strokeStyle = "rgba(255,200,120,.25)"; g.setLineDash([3, 5]); g.beginPath();
    for (let i = 0; i <= 50; i++) { const xx = 30 + ((w - 60) * i) / 50, yy = H - 20 - Math.sin((Math.PI * i) / 50) * (H - 40); if (i) g.lineTo(xx, yy); else g.moveTo(xx, yy); }
    g.stroke(); g.setLineDash([]);
  }, [h]);
  return (
    <div className="stack" style={{ gap: 16 }}>
      <canvas ref={sun} className="cv" style={{ height: 90 }} aria-hidden="true" />
      <div className="grid2">
        <div className="panel stack" style={{ gap: 10 }}>
          <div className="row" style={{ justifyContent: "space-between" }}><h3>Structural (biomimetic tag)</h3><span className="chip good">0% loss</span></div>
          <Swatch color={s.css} size="100%" label="Structural colour after exposure" />
        </div>
        <div className="panel stack" style={{ gap: 10 }}>
          <div className="row" style={{ justifyContent: "space-between" }}><h3>Blue dye</h3><span className={"chip " + (loss > 0.5 ? "bad" : loss > 0.2 ? "warn" : "")}>{Math.round(loss * 100)}% colour lost</span></div>
          <Swatch color={d.css} size="100%" label="Dye colour after exposure" />
        </div>
      </div>
      <div className="row" style={{ alignItems: "end" }}>
        <div style={{ flex: 1, minWidth: 220 }}><Range label="UV exposure" value={Math.round(h)} min={0} max={1000} onChange={(v) => { setRun(false); setH(v); }} fmt={(v) => v + " h"} /></div>
        <button className="btn" onClick={() => { setH(0); setRun(true); }}><Sun size={15} /> Run 1000 hours</button>
      </div>
      <div className="callout"><b>Photobleaching</b> breaks the chemical bonds in a dye molecule, so its colour fades. A shape has no bonds to break. Measured: 0% degradation after 1000 hours for a biomimetic tag, over 50% for dye in 100&ndash;300 hours.</div>
    </div>
  );
}

/* ---------- 3. crush the scales ---------- */
const BROWN = new Float32Array(O.WL.map((l) => 0.05 + (0.16 * (l - 380)) / 400));
function Crush() {
  const [g, setG] = useState(0);
  const structR = useMemo(() => O.spectrum(O.morphoStack(), 0), []);
  const mixR = new Float32Array(O.WL.map((_, i) => structR[i] * (1 - g) ** 2 + BROWN[i] * (1 - (1 - g) ** 2)));
  const s = O.color(mixR), pig = O.color(new Float32Array(DYE));
  const ref = useCanvas((cv) => {
    const { ctx: c, w, h } = O.setupCanvas(cv);
    c.clearRect(0, 0, w, h);
    const half = w / 2;
    [[0, s.css, true], [half, pig.css, false]].forEach(([ox, col, isStruct]) => {
      const n = 160;
      for (let i = 0; i < n; i++) {
        const rx = Math.sin(i * 12.9898) * 43758.5453, ry = Math.sin(i * 78.233) * 12345.678;
        const fx = rx - Math.floor(rx), fy = ry - Math.floor(ry);
        const intact = { x: (ox as number) + half * 0.2 + (i % 16) * (half * 0.6 / 16), y: 30 + Math.floor(i / 16) * 12 };
        const dust = { x: (ox as number) + half * 0.15 + fx * half * 0.7, y: h - 18 - fy * fy * 40 };
        const x = intact.x + (dust.x - intact.x) * g, y = intact.y + (dust.y - intact.y) * g;
        c.fillStyle = col as string;
        const sz = 10 - g * 7;
        c.fillRect(x, y, sz, sz * (isStruct ? 1 : 1));
      }
    });
    c.fillStyle = "#8796aa"; c.font = '11px "IBM Plex Mono", monospace'; c.textAlign = "center";
    c.fillText("Morpho scales", half / 2, 16); c.fillText("blue pigment", half * 1.5, 16);
  }, [g]);
  return (
    <div className="stack" style={{ gap: 16 }}>
      <div className="panel flush"><canvas ref={ref} className="cv" style={{ height: 210 }} role="img" aria-label="Scales and pigment ground into powder" /></div>
      <Range label="Grind" value={g} min={0} max={1} step={0.01} onChange={setG} fmt={(v) => (v < 0.05 ? "intact" : v > 0.95 ? "fine powder" : Math.round(v * 100) + "%")} />
      <div className="row"><button className="btn sm" onClick={() => setG(0)}><RotateCcw size={14} /> Reset</button></div>
      <div className="callout"><b>Structure needs order.</b> Grinding destroys the spacing between shelves, so the blue goes and only the brown melanin underneath is left. Ground pigment stays blue, because every grain still contains the same molecules.</div>
    </div>
  );
}

export default function Prove() {
  const [exp, setExp] = useState<Exp>("soak");
  return (
    <div className="stack" style={{ gap: 18 }}>
      <Seg label="Experiment" value={exp} onChange={setExp} options={[
        ["soak", <span key="a" className="row" style={{ gap: 6 }}><Droplets size={14} /> Soak it</span>],
        ["sun", <span key="b" className="row" style={{ gap: 6 }}><Sun size={14} /> 1000 h of sun</span>],
        ["crush", <span key="c" className="row" style={{ gap: 6 }}><Hammer size={14} /> Crush it</span>],
      ]} />
      {exp === "soak" && <Soak />}
      {exp === "sun" && <SunTest />}
      {exp === "crush" && <Crush />}
    </div>
  );
}
