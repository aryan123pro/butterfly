"use client";
import { OrbitControls } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { BatteryCharging, Sun, Zap } from "lucide-react";
import { useMemo, useRef, useState } from "react";
import * as THREE from "three";
import * as O from "@/lib/optics";
import Backdrop from "../three/Backdrop";
import Label3D from "../three/Label3D";
import Stage3D from "../three/Stage3D";
import { Plot, Range, Readouts, useCanvas } from "../ui";

const CR: O.Cx = [3.1, 3.3], AL: O.Cx = [1.2, 7.0];
export const imodSpectrum = (gap: number) => O.spectrum([{ n: CR, d: 6 }, { n: 1.46, d: 82 }, { n: 1.0, d: Math.max(0, gap) }], 0, { n0: 1.52, ns: AL });
const SUB = [{ k: "R", gap: 238, name: "red" }, { k: "G", gap: 390, name: "green" }, { k: "B", gap: 310, name: "blue" }];
const V_PULL = 6, V_REL = 2.5;
const U = 0.01; // scene units per nm (vertical)

function restGap(g0: number, V: number) { return g0 * (1 - 0.3 * Math.min(1, (V / V_PULL) ** 2)); }

function Pixel({ x, gap, color }: { x: number; gap: number; color: string }) {
  const mem = useRef<THREE.Mesh>(null!);
  const ray = useRef<THREE.Mesh>(null!);
  const cur = useRef(gap);
  const al = useMemo(() => new THREE.MeshPhysicalMaterial({ color: "#c9ced6", metalness: 1, roughness: 0.18 }), []);
  const rayMat = useMemo(() => new THREE.MeshBasicMaterial({ toneMapped: false, transparent: true, opacity: 0.9 }), []);
  useFrame((_s, dt) => {
    cur.current += (gap - cur.current) * Math.min(1, dt * (gap < cur.current - 50 ? 30 : 8)); // snaps down fast, relaxes slower
    mem.current.position.y = -0.82 - cur.current * U - 0.05;
    const c = new THREE.Color(color); rayMat.color.setRGB(c.r * 2, c.g * 2, c.b * 2);
    rayMat.opacity = cur.current < 20 ? 0.05 : 0.9;
  });
  return (
    <group position={[x, 0, 0]}>
      <mesh ref={mem} material={al}><boxGeometry args={[2.6, 0.1, 2.2]} /></mesh>
      {[-1.35, 1.35].map((px) => <mesh key={px} position={[px, -3.0, 0]}><boxGeometry args={[0.12, 4.4, 2.2]} /><meshPhysicalMaterial color="#3a4250" roughness={0.6} /></mesh>)}
      {/* incoming white light and reflected colour */}
      <mesh position={[-0.4, 2.0, 0.6]} rotation={[0, 0, 0.18]}><cylinderGeometry args={[0.022, 0.022, 3.6, 8]} /><meshBasicMaterial color={[1.4, 1.4, 1.4]} toneMapped={false} /></mesh>
      <mesh ref={ray} position={[0.4, 2.0, 0.6]} rotation={[0, 0, -0.18]} material={rayMat}><cylinderGeometry args={[0.045, 0.045, 3.6, 8]} /></mesh>
    </group>
  );
}

export default function Mirasol() {
  const [on, setOn] = useState<Record<string, boolean>>({ R: true, G: true, B: false });
  const [V, setV] = useState(0);
  const [collapsedTest, setCollapsedTest] = useState(false);
  const [lux, setLux] = useState(10000);
  const [updates, setUpdates] = useState<number[]>([1.5, 6]);

  // hysteresis on the green test pixel: pull-in and release happen at different voltages
  const driveV = (v: number) => { setV(v); if (v >= V_PULL) setCollapsedTest(true); else if (v <= V_REL) setCollapsedTest(false); };
  const gaps = SUB.map((s) => {
    if (s.k === "G" && V > 0) return collapsedTest ? 0 : restGap(s.gap, V);
    return on[s.k] ? s.gap : 0;
  });
  const cols = gaps.map((g) => O.color(imodSpectrum(g), 1.0));
  const mixLin: [number, number, number] = [0, 1, 2].map((i) => cols.reduce((a, c) => a + c.lin[i], 0) / 3) as [number, number, number];
  const mixCol = O.fromRgb(mixLin.map((v) => (v <= 0.0031308 ? 12.92 * v : 1.055 * Math.pow(v, 1 / 2.4) - 0.055)) as [number, number, number], mixLin);

  // hysteresis loop drawing data
  const loop = useMemo(() => {
    const up: number[] = [], down: number[] = [], vs: number[] = [];
    for (let v = 0; v <= 10; v += 0.1) { vs.push(+v.toFixed(1)); up.push(v < V_PULL ? restGap(390, v) : 0); down.push(v > V_REL ? 0 : restGap(390, v)); }
    return { vs, up, down };
  }, []);

  // contrast in sunlight: emissive LCD vs reflective IMOD
  const E = lux / Math.PI; // ambient luminance on a diffuse white, cd/m^2 per unit reflectance
  const lcdCR = (400 + 0.04 * E) / (0.4 + 0.04 * E);
  const imodCR = (0.6 * E + 0.001) / (0.06 * E + 0.001);
  const readable = (cr: number) => (cr > 5 ? "good" : cr > 2 ? "warn" : "bad");

  const power = useCanvas((cv) => {
    const { ctx: g, w, h } = O.setupCanvas(cv);
    g.clearRect(0, 0, w, h);
    const X = (t: number) => 40 + (t / 10) * (w - 50), Y = (p: number) => h - 22 - p * (h - 40);
    g.strokeStyle = "#18212d"; for (let p = 0; p <= 1; p += 0.5) { g.beginPath(); g.moveTo(40, Y(p)); g.lineTo(w - 10, Y(p)); g.stroke(); }
    g.fillStyle = "#56637a"; g.font = '10px "IBM Plex Mono", monospace'; g.fillText("power", 2, 16); g.fillText("time (s) →", w - 80, h - 6);
    const line = (col: string, f: (t: number) => number, label: string) => {
      g.strokeStyle = col; g.lineWidth = 2; g.beginPath();
      for (let i = 0; i <= 400; i++) { const t = (i / 400) * 10; if (i) g.lineTo(X(t), Y(f(t))); else g.moveTo(X(t), Y(f(t))); }
      g.stroke(); g.fillStyle = col; g.fillText(label, X(10) - 120, Y(f(9.9)) - 6);
    };
    line("#ff5a6e", () => 0.85, "LCD + backlight");
    const spike = (t: number, width: number, hgt: number) => updates.reduce((a, u) => a + hgt * Math.exp(-(((t - u) / width) ** 2)), 0);
    line("#ffb547", (t) => 0.02 + spike(t, 0.35, 0.35), "E-ink");
    line("#39d98a", (t) => 0.01 + spike(t, 0.08, 0.45), "Mirasol");
  }, [updates]);

  return (
    <div className="stack" style={{ gap: 18 }}>
      <div className="split wide">
        <Stage3D style={{ height: "min(58vh, 480px)" }} label="3D cross-section of three interferometric modulator subpixels" camera={{ position: [4, 1.5, 16], fov: 38 }} bloom={0.9}
          overlay={<div className="hud" style={{ top: 12, left: 14 }}><b>IMOD cross-section</b> &middot; heights to scale, widths not</div>}>
          <Backdrop top="#0b1a2c" halo="#30507a" />
          <mesh position={[0, 0.6, 0]}><boxGeometry args={[9.4, 1, 2.6]} /><meshPhysicalMaterial color="#cfe6ff" transmission={0.9} roughness={0.05} thickness={1} ior={1.52} /></mesh>
          <mesh position={[0, 0.06, 0]}><boxGeometry args={[9.4, 0.06, 2.6]} /><meshPhysicalMaterial color="#2c2f36" metalness={0.6} roughness={0.4} /></mesh>
          <mesh position={[0, -0.4, 0]}><boxGeometry args={[9.4, 0.82, 2.6]} /><meshPhysicalMaterial color="#9fd0ff" transmission={0.7} roughness={0.2} opacity={0.6} transparent /></mesh>
          {SUB.map((s, i) => <Pixel key={s.k} x={(i - 1) * 3.1} gap={gaps[i]} color={cols[i].css} />)}
          <mesh position={[0, -5.35, 0]}><boxGeometry args={[9.6, 0.3, 2.8]} /><meshPhysicalMaterial color="#1a1f28" roughness={0.8} /></mesh>
          <Label3D position={[5.6, 0.6, 0]} size={0.24} anchorX="left">glass</Label3D>
          <Label3D position={[5.6, 0.06, 0]} size={0.24} anchorX="left" color="#9aa">chromium absorber, 6 nm</Label3D>
          <Label3D position={[5.6, -0.4, 0]} size={0.24} anchorX="left" color="#9fd0ff">oxide, 82 nm</Label3D>
          <Label3D position={[5.6, -3.4, 0]} size={0.24} anchorX="left" color="#c9ced6">air gap + aluminium mirror</Label3D>
          <pointLight position={[0, -2.5, 4]} intensity={30} distance={14} color="#cfe0ff" />
          <OrbitControls target={[1.2, -1.6, 0]} enablePan={false} minDistance={8} maxDistance={22} enableDamping />
        </Stage3D>
        <div className="stack">
          <p className="eyebrow">Drive each subpixel</p>
          <div className="row">
            {SUB.map((s, i) => (
              <button key={s.k} className="btn sm" aria-pressed={gaps[i] > 20} onClick={() => { driveV(0); setOn((o) => ({ ...o, [s.k]: !o[s.k] })); }}>
                <span style={{ width: 12, height: 12, borderRadius: 3, background: cols[i].css, display: "inline-block", border: "1px solid #ffffff33" }} />
                {s.name} {gaps[i] > 20 ? "open" : "collapsed"}
              </button>
            ))}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "96px minmax(0,1fr)", gap: 14, alignItems: "center" }}>
            <div className="swatch" style={{ background: mixCol.css, color: mixCol.css }} />
            <p className="muted" style={{ fontSize: "var(--t-sm)" }}>From a normal viewing distance the three subpixels blend into this colour. Collapse a mirror and its subpixel turns black.</p>
          </div>
          <Readouts items={SUB.map((s, i) => [s.name + " gap", Math.round(gaps[i]), "nm"]) as [string, number, string][]} />
          <div className="panel">
            <Range label={<span className="row" style={{ gap: 6 }}><Zap size={13} /> Voltage on the green subpixel</span>} value={V} min={0} max={10} step={0.1} onChange={driveV} fmt={(v) => v.toFixed(1) + " V"} />
            <Plot label="Hysteresis loop" height={150} opts={{
              x: [0, 10], y: [-20, 420], xticks: [0, 2.5, 6, 10], yticks: [0, 200, 400], yfmt: (v) => v + "", xfmt: (v) => v + "V", padL: 38,
              series: [{ xs: loop.vs, data: loop.up, color: O.GOOD, width: 2 }, { xs: loop.vs, data: loop.down, color: O.WARN, width: 2, dash: [4, 3] }],
              markers: [{ x: V, label: collapsedTest ? "collapsed" : "open", color: O.INK }],
            }} />
            <p className="faint" style={{ fontSize: "var(--t-xs)" }}>Pulls in at {V_PULL} V, lets go only below {V_REL} V. Between the two it stays where it is with no current flowing: bistable.</p>
          </div>
        </div>
      </div>
      <div className="grid2">
        <div className="panel stack" style={{ gap: 10 }}>
          <div className="row" style={{ justifyContent: "space-between" }}><h4><BatteryCharging size={16} style={{ verticalAlign: -3 }} /> Power over time</h4>
            <button className="btn sm" onClick={() => setUpdates((u) => [...u, 0.5 + Math.random() * 9].slice(-6))}>Turn a page</button></div>
          <canvas ref={power} className="cv" style={{ height: 170 }} role="img" aria-label="Power use of LCD, e-ink and Mirasol over time" />
          <p className="faint" style={{ fontSize: "var(--t-xs)" }}>Illustrative. The backlight burns power constantly; bistable pixels only draw current when they change.</p>
        </div>
        <div className="panel stack" style={{ gap: 10 }}>
          <h4><Sun size={16} style={{ verticalAlign: -3 }} /> Reading in sunlight</h4>
          <Range label="Ambient light" value={lux} min={50} max={100000} step={50} onChange={setLux} fmt={(v) => (v >= 1000 ? (v / 1000).toFixed(0) + "k" : v) + " lux"} />
          <div className="costbars">
            <div><span>LCD</span><i><b style={{ width: Math.min(100, lcdCR / 2) + "%", background: `var(--${readable(lcdCR)})` }} /></i><em>{lcdCR.toFixed(1)}:1</em></div>
            <div><span>Mirasol</span><i><b style={{ width: Math.min(100, imodCR / 2) + "%", background: `var(--${readable(imodCR)})` }} /></i><em>{imodCR.toFixed(1)}:1</em></div>
          </div>
          <p className="muted" style={{ fontSize: "var(--t-sm)" }}>{lux > 20000 ? "Direct sun: the LCD's contrast collapses as glare swamps the backlight. The reflective screen just gets brighter." : "Indoors the backlit LCD wins on contrast. Slide toward direct sunlight (about 100k lux)."}</p>
        </div>
      </div>
    </div>
  );
}
