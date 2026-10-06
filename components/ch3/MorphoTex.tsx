"use client";
import { OrbitControls } from "@react-three/drei";
import { Droplet } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import * as O from "@/lib/optics";
import { lutTexture, structuralMaterial, updateLut } from "@/lib/scene/materials";
import Backdrop from "../three/Backdrop";
import Stage3D from "../three/Stage3D";
import { Readouts, useCanvas, useRaf } from "../ui";

const N_PET = 1.64, N_NYLON = 1.53;
const VARIANTS = [
  { k: "violet", name: "Violet", t: 65 },
  { k: "blue", name: "Blue · 70 nm", t: 70 },
  { k: "green", name: "Green", t: 84 },
  { k: "red", name: "Red", t: 98 },
];
const texStack = (t: number) => [...O.periodic([{ n: N_PET, d: t }, { n: N_NYLON, d: t }], 30), { n: N_PET, d: t }]; // 61 layers

function Weave({ lut }: { lut: THREE.DataTexture }) {
  const mat = useMemo(() => structuralMaterial(lut, { spread: 3, gain: 0.85, stripesV: 0, base: "#020308" }), [lut]);
  const geos = useMemo(() => {
    const out: THREE.BufferGeometry[] = [];
    const n = 16, sp = 0.42, amp = 0.07, half = (n * sp) / 2;
    for (let j = 0; j < n; j++) {
      const pts: THREE.Vector3[] = [];
      for (let k = 0; k <= 80; k++) { const x = -half + (k / 80) * n * sp; pts.push(new THREE.Vector3(x, amp * Math.sin((Math.PI * (x + half)) / sp + j * Math.PI), -half + j * sp + sp / 2)); }
      const g = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 160, 0.13, 10, false); g.scale(1, 0.55, 1); out.push(g);
    }
    for (let i = 0; i < n; i++) {
      const pts: THREE.Vector3[] = [];
      for (let k = 0; k <= 80; k++) { const z = -half + (k / 80) * n * sp; pts.push(new THREE.Vector3(-half + i * sp + sp / 2, -amp * Math.sin((Math.PI * (z + half)) / sp + i * Math.PI), z)); }
      const g = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 160, 0.13, 10, false); g.scale(1, 0.55, 1); out.push(g);
    }
    return out;
  }, []);
  useEffect(() => () => { geos.forEach((g) => g.dispose()); mat.dispose(); }, [geos, mat]);
  return <group rotation={[0, 0.5, 0]}>{geos.map((g, i) => <mesh key={i} geometry={g} material={mat} />)}</group>;
}

function Drops() {
  const t = useRef(0);
  const draw = (cv: HTMLCanvasElement) => {
    const { ctx: g, w, h } = O.setupCanvas(cv);
    g.clearRect(0, 0, w, h);
    const lanes = [{ label: "Lotus-leaf inspired", contact: 1.0 }, { label: "Morpho sulkowskyi inspired", contact: 0.6 }];
    lanes.forEach((L, li) => {
      const x0 = (li * w) / 2, cx = x0 + w / 4, floor = h - 40, R = 18;
      const period = 2.6, tt = t.current % period;
      const fallT = 0.7, cT = L.contact, upT = 0.7;
      let y = floor - R, sx = 1, sy = 1;
      if (tt < fallT) { const p = tt / fallT; y = 30 + (floor - R - 30) * p * p; }
      else if (tt < fallT + cT) { const p = (tt - fallT) / cT; const s = Math.sin(Math.PI * p); sx = 1 + 0.9 * s; sy = 1 - 0.55 * s; y = floor - R * sy; }
      else if (tt < fallT + cT + upT) { const p = (tt - fallT - cT) / upT; y = floor - R - (floor - R - 60) * (1 - (1 - p) * (1 - p)); }
      else y = 60;
      // surface texture
      g.fillStyle = li ? "#123a7a" : "#1d3a22"; g.fillRect(x0 + 20, floor, w / 2 - 40, 10);
      for (let x = x0 + 22; x < x0 + w / 2 - 22; x += li ? 5 : 8) { g.fillStyle = li ? "#3fa9ff" : "#4fae63"; g.fillRect(x, floor - (li ? 4 : 3), li ? 2 : 3, li ? 4 : 3); }
      const gr = g.createRadialGradient(cx - 6, y - 6, 2, cx, y, R * 1.6);
      gr.addColorStop(0, "rgba(230,245,255,.95)"); gr.addColorStop(0.5, "rgba(120,190,255,.55)"); gr.addColorStop(1, "rgba(60,120,220,.15)");
      g.fillStyle = gr; g.beginPath(); g.ellipse(cx, y, R * sx, R * sy, 0, 0, Math.PI * 2); g.fill();
      g.fillStyle = "#8796aa"; g.font = '11px "IBM Plex Mono", monospace'; g.textAlign = "center";
      g.fillText(L.label, cx, h - 12);
      g.fillStyle = "#e4ebf3"; g.fillText("contact " + L.contact.toFixed(1) + " (relative)", cx, 20);
    });
    g.strokeStyle = "#1d2734"; g.beginPath(); g.moveTo(w / 2, 10); g.lineTo(w / 2, h - 10); g.stroke();
  };
  const ref = useCanvas(draw, []);
  useRaf((_t, dt) => { t.current += dt; if (ref.current) draw(ref.current); });
  return (
    <div className="stack" style={{ gap: 10 }}>
      <div className="panel flush"><canvas ref={ref} className="cv" style={{ height: 200 }} role="img" aria-label="Water drops bouncing on two surfaces" /></div>
      <p className="muted" style={{ fontSize: "var(--t-sm)" }}>Slow motion. Drops leave the Morpho-inspired surface about 40% sooner than the lotus-inspired one: less time touching means less water soaking in.</p>
    </div>
  );
}

export default function MorphoTex() {
  const [v, setV] = useState(VARIANTS[1]);
  const lut = useMemo(() => lutTexture(O.angleLUT(texStack(70), 64, 80, 1.3).data), []);
  useEffect(() => { updateLut(lut, O.angleLUT(texStack(v.t), 64, 80, 1.3).data); }, [v, lut]);
  const R = useMemo(() => O.spectrum(texStack(v.t), 0), [v]);
  const pk = O.peak(R, 380, 780), col = O.color(R, 1.3);

  const xs = useCanvas((cv) => {
    const { ctx: g, w, h } = O.setupCanvas(cv);
    g.clearRect(0, 0, w, h);
    // flat fibre outline
    g.save(); g.beginPath(); g.ellipse(w * 0.3, h / 2, w * 0.24, h * 0.32, 0, 0, Math.PI * 2); g.clip();
    for (let i = 0; i < 61; i++) { g.fillStyle = i % 2 ? "#9aa7b8" : "#556274"; g.fillRect(0, h / 2 - h * 0.32 + (i * h * 0.64) / 61, w, (h * 0.64) / 61 + 0.5); }
    g.restore();
    g.strokeStyle = col.css; g.lineWidth = 2; g.beginPath(); g.ellipse(w * 0.3, h / 2, w * 0.24, h * 0.32, 0, 0, Math.PI * 2); g.stroke();
    // magnified inset
    g.strokeStyle = "#56637a"; g.setLineDash([3, 3]); g.beginPath(); g.moveTo(w * 0.42, h * 0.42); g.lineTo(w * 0.62, h * 0.15); g.moveTo(w * 0.42, h * 0.58); g.lineTo(w * 0.62, h * 0.85); g.stroke(); g.setLineDash([]);
    for (let i = 0; i < 8; i++) { g.fillStyle = i % 2 ? "#9aa7b8" : "#556274"; g.fillRect(w * 0.62, h * 0.15 + (i * h * 0.7) / 8, w * 0.34, (h * 0.7) / 8); }
    g.fillStyle = "#e4ebf3"; g.font = '10px "IBM Plex Mono", monospace';
    g.fillText("polyester n=1.64", w * 0.64, h * 0.15 + 12); g.fillText("nylon n=1.53", w * 0.64, h * 0.15 + 12 + (h * 0.7) / 8);
    g.fillStyle = "#8796aa"; g.fillText(`61 layers × ${v.t} nm`, 8, h - 8);
  }, [v, col.css]);

  return (
    <div className="split">
      <div className="stack">
        <Stage3D style={{ height: 380 }} label="3D woven MorphoTex fabric" camera={{ position: [0, 4.2, 5.2], fov: 38 }} bloom={1.0}
          overlay={<div className="hud" style={{ top: 12, left: 14 }}><b>MorphoTex weave</b> &middot; no dye anywhere &middot; drag to tilt</div>}>
          <Backdrop top="#141428" halo="#3b3b8a" />
          <Weave lut={lut} />
          <OrbitControls enablePan={false} autoRotate autoRotateSpeed={0.5} minDistance={3} maxDistance={9} maxPolarAngle={1.35} enableDamping />
        </Stage3D>
        <div className="row">
          {VARIANTS.map((x) => <button key={x.k} className="btn sm" aria-pressed={x.k === v.k} onClick={() => setV(x)}>{x.name}</button>)}
        </div>
      </div>
      <div className="stack">
        <div className="panel flush"><canvas ref={xs} className="cv" style={{ height: 170 }} role="img" aria-label="Cross-section of a MorphoTex fibre" /></div>
        <Readouts items={[["Layer thickness", v.t, "nm"], ["Layers", 61], ["Peak", pk.lambda, "nm"]]} />
        <div className="callout"><b>Teijin&apos;s MorphoTex</b> was the first structurally coloured fibre: 61 alternating layers of polyester and nylon, each about 70 nm thick. Changing only the thickness changes the colour, so one factory line makes every shade with no dye bath.</div>
        <p className="eyebrow" style={{ marginTop: 6 }}><Droplet size={12} style={{ verticalAlign: -1 }} /> Waterproof coats from Morpho sulkowskyi</p>
        <Drops />
      </div>
    </div>
  );
}
