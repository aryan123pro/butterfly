"use client";
import { OrbitControls, Sparkles } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import { AnimatePresence, motion } from "motion/react";
import { ArrowDownToLine, Bird, Microscope, Pause, Play, RotateCcw } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import Backdrop from "@/components/three/Backdrop";
import Butterfly from "@/components/three/Butterfly";
import NanoDive from "@/components/three/NanoDive";
import Stage3D from "@/components/three/Stage3D";
import { Notes, Plot, Range, Readouts, Seg, useRaf } from "@/components/ui";
import * as O from "@/lib/optics";
import { lutTexture, updateLut } from "@/lib/scene/materials";

type Fill = "air" | "ethanol" | "ipa" | "dmmp"; // no water: the scales are hydrophobic and shed it
interface P { dc: number; da: number; N: number; fill: Fill }
const SPECIES: { name: string; p: P; note: string }[] = [
  { name: "M. didius", p: { dc: 75, da: 110, N: 8, fill: "air" }, note: "the classic blue" },
  { name: "M. rhetenor", p: { dc: 70, da: 105, N: 11, fill: "air" }, note: "more shelves: deeper and more brilliant" },
  { name: "Green mutant", p: { dc: 75, da: 150, N: 8, fill: "air" }, note: "wider gaps, a butterfly that does not exist" },
  { name: "Security tag", p: { dc: 120, da: 480, N: 6, fill: "air" }, note: "the magenta-to-green stack from Chapter 2" },
];

const TOP = new THREE.Vector3(4.6, 4.4, 6.6), UNDER = new THREE.Vector3(3.5, -5.5, 5);
const easeInOut = (x: number) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);

/* Camera moves on a sphere around the wing, so flipping underneath swings round the edge instead of
   cutting through it. The first glide is the intro fly-in from the far starting position.
   Never touches the camera before the first frame; a drag cancels any glide. */
function CameraGlide({ flip }: { flip: boolean }) {
  const { camera, controls } = useThree() as unknown as { camera: THREE.Camera; controls: { addEventListener: (e: string, f: () => void) => void; removeEventListener: (e: string, f: () => void) => void } | null };
  const anim = useRef<{ from: THREE.Spherical; to: THREE.Spherical; t0: number; dur: number } | null>(null);
  const first = useRef(true);
  useEffect(() => {
    const to = new THREE.Spherical().setFromVector3(flip ? UNDER : TOP);
    const from = new THREE.Spherical().setFromVector3(camera.position);
    if (to.theta - from.theta > Math.PI) to.theta -= 2 * Math.PI; else if (from.theta - to.theta > Math.PI) to.theta += 2 * Math.PI;
    anim.current = { from, to, t0: performance.now(), dur: first.current ? 2.6 : 1.7 };
    first.current = false;
  }, [flip, camera]);
  useEffect(() => {
    if (!controls) return;
    const stop = () => { anim.current = null; };
    controls.addEventListener("start", stop);
    return () => controls.removeEventListener("start", stop);
  }, [controls]);
  useFrame(() => {
    const a = anim.current;
    if (!a) return;
    const t = Math.min(1, (performance.now() - a.t0) / 1000 / a.dur);
    const e = easeInOut(t), mix = (u: number, v: number) => u + (v - u) * e;
    camera.position.setFromSpherical(new THREE.Spherical(mix(a.from.radius, a.to.radius), mix(a.from.phi, a.to.phi), mix(a.from.theta, a.to.theta)));
    camera.lookAt(0, 0, 0);
    if (t >= 1) anim.current = null;
  });
  return null;
}

/* Ease displayed values toward their targets so every change morphs instead of jumping. */
function useEased(target: { dc: number; da: number; nf: number; pigment: number }, rate = 7) {
  const [cur, setCur] = useState(target);
  const ref = useRef(target);
  const moving = Math.abs(cur.dc - target.dc) + Math.abs(cur.da - target.da) + Math.abs(cur.nf - target.nf) * 100 + Math.abs(cur.pigment - target.pigment) > 0.05;
  useRaf((_t, dt) => {
    const k = 1 - Math.exp(-dt * rate), r = ref.current;
    const n = { dc: r.dc + (target.dc - r.dc) * k, da: r.da + (target.da - r.da) * k, nf: r.nf + (target.nf - r.nf) * k, pigment: r.pigment + (target.pigment - r.pigment) * k };
    const close = Math.abs(n.dc - target.dc) + Math.abs(n.da - target.da) + Math.abs(n.nf - target.nf) * 100 + Math.abs(n.pigment - target.pigment) < 0.05;
    ref.current = close ? target : n;
    setCur(ref.current);
  }, moving);
  return cur;
}

export default function WingLab() {
  const [p, setP] = useState<P>(SPECIES[0].p);
  const [pigment, setPigment] = useState(0);
  const [flap, setFlap] = useState(true);
  const [speed, setSpeed] = useState(0.5);
  const [glint, setGlint] = useState(1);
  const [az, setAz] = useState(-30);
  const [view, setView] = useState<"fly" | "dive">("fly");
  const [flip, setFlip] = useState(false);
  const nf = O.MEDIA[p.fill].n;
  const ez = useEased({ dc: p.dc, da: p.da, nf, pigment });
  const stack = useMemo(() => O.morphoStack({ dc: ez.dc, da: ez.da, N: p.N, nf: ez.nf }), [ez.dc, ez.da, ez.nf, p.N]);
  const lut = useMemo(() => lutTexture(O.angleLUT(O.morphoStack(), 96, 80).data), []);
  useEffect(() => { updateLut(lut, O.angleLUT(stack, 96, 80).data); }, [stack, lut]);
  const R0 = useMemo(() => O.spectrum(stack, 0), [stack]);
  const R40 = useMemo(() => O.spectrum(stack, 40), [stack]);
  const c0 = O.color(R0), c40 = O.color(R40);
  const light = useMemo(() => new THREE.Vector3(), []);
  const a = (az * Math.PI) / 180;
  light.set(Math.sin(a) * 4, 6, Math.cos(a) * 4);
  const set = (k: keyof P) => (v: number | Fill) => setP((x) => ({ ...x, [k]: v }));

  return (
    <main className="wrap" style={{ paddingBottom: 30 }}>
      <div className="lab-grid">
        <div className="stack" style={{ gap: 12 }}>
          <div className="row" style={{ justifyContent: "space-between" }}>
            <Seg label="View" value={view} onChange={setView} options={[["fly", <span key="a" className="row" style={{ gap: 6 }}><Bird size={14} /> Specimen</span>], ["dive", <span key="b" className="row" style={{ gap: 6 }}><Microscope size={14} /> Nano-dive</span>]]} />
            {view === "fly" && <button className="btn sm" aria-pressed={flip} onClick={() => setFlip((f) => !f)}><ArrowDownToLine size={14} /> {flip ? "Back to the top side" : "Look underneath"}</button>}
          </div>
          <AnimatePresence mode="wait" initial={false}>
          <motion.div key={view} className="wl-view"
            initial={{ opacity: 0, scale: view === "dive" ? 0.9 : 1.12, filter: "blur(14px)" }}
            animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
            exit={{ opacity: 0, scale: view === "dive" ? 1.14 : 0.9, filter: "blur(14px)" }}
            transition={{ duration: 0.55, ease: [0.16, 0.84, 0.24, 1] }}>
          {view === "fly" ? (
            <Stage3D style={{ height: "min(72vh, 680px)" }} label="Interactive 3D Blue Morpho" camera={{ position: [10, 7.5, 15], fov: 32 }} bloom={1.2}
              overlay={<>
                <div className="hud" style={{ top: 14, left: 16 }}><b>{SPECIES.find((s) => JSON.stringify(s.p) === JSON.stringify(p))?.name ?? "Custom wing"}</b> &middot; {p.N} shelves &middot; {p.dc} nm chitin &middot; {p.da} nm {O.MEDIA[p.fill].label.toLowerCase()}</div>
                <div className="hud" style={{ bottom: 14, left: 16 }}>{flip ? "Underside: brown melanin pigment and eyespots. No structural colour." : pigment > 0.5 ? "Pigment mode: same blue from every angle." : "Drag to orbit. Watch the colour slide as the wings flex."}</div>
              </>}>
              <Backdrop />
              <Butterfly lut={lut} flap={flap} speed={speed} amp={0.55} pigment={ez.pigment} glint={glint} light={light} rotation={[0.06, Math.PI * 0.92, 0]} />
              <Sparkles count={80} scale={[10, 6, 10]} size={2.2} speed={0.25} opacity={0.6} color="#9fd2ff" />
              <OrbitControls makeDefault enablePan={false} minDistance={3} maxDistance={15} enableDamping />
              <CameraGlide flip={flip} />
            </Stage3D>
          ) : (
            <NanoDive lut={lut} height="min(66vh, 620px)" initial={1} />
          )}
          </motion.div>
          </AnimatePresence>
        </div>

        <aside className="stack lab-side">
          <div className="panel stack" style={{ gap: 12 }}>
            <p className="eyebrow">Species and designs</p>
            <div className="row">{SPECIES.map((s) => <button key={s.name} className="btn sm" title={s.note} aria-pressed={JSON.stringify(s.p) === JSON.stringify(p)} onClick={() => setP(s.p)}>{s.name}</button>)}</div>
            <Range label="Chitin shelf" value={p.dc} min={40} max={200} onChange={set("dc")} fmt={(v) => v + " nm"} />
            <Range label="Gap" value={p.da} min={60} max={500} step={5} onChange={set("da")} fmt={(v) => v + " nm"} />
            <Range label="Shelves" value={p.N} min={1} max={14} onChange={set("N")} />
            <div className="ctrl"><span className="lbl"><span>Flood the gaps with</span><span className="val">n = {nf.toFixed(3)}</span></span>
              <Seg label="Gap fill" value={p.fill} onChange={set("fill") as (v: Fill) => void} options={[["air", "Air"], ["ethanol", "Ethanol"], ["ipa", "IPA"], ["dmmp", "DMMP"]]} />
            </div>
          </div>
          <div className="panel stack" style={{ gap: 10 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <div className="stack" style={{ gap: 4 }}><div className="swatch" style={{ background: c0.css, color: c0.css, aspectRatio: "3 / 2" }} /><span className="mono faint" style={{ fontSize: 11 }}>head-on</span></div>
              <div className="stack" style={{ gap: 4 }}><div className="swatch" style={{ background: c40.css, color: c40.css, aspectRatio: "3 / 2" }} /><span className="mono faint" style={{ fontSize: 11 }}>at 40&deg;</span></div>
            </div>
            <Plot label="Spectrum head-on and at 40 degrees" height={140} opts={{ spectral: true, yticks: [0, 0.5, 1], series: [{ data: R40, color: O.MUTED, width: 1.2, dash: [4, 3] }, { data: R0, color: O.INK, fill: "spectral", fillAlpha: 0.5 }] }} />
            <Readouts items={[["Peak", O.visiblePeak(R0).lambda, "nm"], ["Brightness", Math.round(O.visiblePeak(R0).R * 100), "%"]]} />
          </div>
          {view === "fly" && (
            <div className="panel stack" style={{ gap: 12 }}>
              <p className="eyebrow">Flight and light</p>
              <div className="row">
                <button className="btn sm" aria-pressed={flap} onClick={() => setFlap((f) => !f)}>{flap ? <Pause size={14} /> : <Play size={14} />} {flap ? "Pause wings" : "Flap"}</button>
                <button className="btn sm" aria-pressed={pigment > 0.5} onClick={() => setPigment((x) => (x > 0.5 ? 0 : 1))}>{pigment > 0.5 ? "Back to structure" : "Swap for blue pigment"}</button>
                <button className="btn sm ghost" onClick={() => { setP(SPECIES[0].p); setPigment(0); setGlint(1); setAz(-30); }}><RotateCcw size={13} /> Reset</button>
              </div>
              <Range label="Wingbeat" value={speed} min={0.1} max={2} step={0.05} onChange={setSpeed} fmt={(v) => v.toFixed(2) + " Hz"} />
              <Range label="Scale glitter" value={glint} min={0} max={2} step={0.05} onChange={setGlint} fmt={(v) => Math.round(v * 100) + "%"} />
              <Range label="Lamp direction" value={az} min={-180} max={180} onChange={setAz} fmt={(v) => v + "°"} />
            </div>
          )}
          <Notes say="Everything on this panel feeds the same transfer-matrix calculation as Chapter 1. The 3D wing is just showing you the answer from every angle at once." ask="Flood the gaps with DMMP. Why would a wing that changes colour with a nerve-agent simulant be useful?" />
        </aside>
      </div>
    </main>
  );
}
