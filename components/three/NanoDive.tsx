"use client";
import { OrbitControls, Sparkles } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import { ChevronRight, Pause, Play } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import type { OrbitControls as OrbitImpl } from "three-stdlib";
import { structuralMaterial } from "@/lib/scene/materials";
import Backdrop from "./Backdrop";
import Butterfly from "./Butterfly";
import Lamellae, { colourName, DEFAULT_LAMELLAE, lamellaeFit, type LamellaeSpec } from "./Lamellae";
import Stage3D from "./Stage3D";

export const LEVELS = [
  { key: "wing", name: "Wing", scale: "1 cm", mag: "1×", text: "A Blue Morpho, wingspan up to 15 cm. The top of the wing is structural blue; the underside is brown pigment with eyespots." },
  { key: "scales", name: "Scales", scale: "100 µm", mag: "200×", text: "The wing is tiled with overlapping scales like a roof. Each is about 100 × 50 µm, roughly 15 times wider than a red blood cell." },
  { key: "ridges", name: "Ridges", scale: "1 µm", mag: "15,000×", text: "Each scale is ruled with parallel ridges about 0.8 µm apart. The ridges work as a diffraction grating that spreads the blue across many angles." },
  { key: "lamellae", name: "Lamellae", scale: "100 nm", mag: "120,000×", text: "Cut a ridge and you find a 'Christmas tree' of chitin shelves, 75 nm thick with 110 nm of air between. White light goes in. Only blue comes back out; the rest is absorbed by melanin underneath." },
] as const;

const POSES: { pos: [number, number, number]; target: [number, number, number]; min: number; max: number }[] = [
  { pos: [4.6, 4.2, 6.6], target: [0, 0, 0], min: 4, max: 14 },
  { pos: [4.2, 3.0, 6.0], target: [0, 0, -1], min: 2.5, max: 14 },
  { pos: [5.5, 4.2, 7.5], target: [0, 0, 0], min: 3, max: 16 },
  { pos: [9, 11, 36], target: [0, 8.5, 0], min: 10, max: 52 },
];

/* ---------- level 1: a field of scales ---------- */
function scaleGeometry(len = 2, w = 0.5) {
  const s = new THREE.Shape();
  s.moveTo(-0.1, 0);
  s.bezierCurveTo(-0.28, 0.08, -w, 0.3, -w, 0.62);
  s.lineTo(-w, len - 0.22);
  const teeth = 4;
  for (let t = 0; t < teeth; t++) {
    const x0 = -w + (2 * w * t) / teeth, x1 = x0 + (2 * w) / teeth;
    s.quadraticCurveTo((x0 + x1) / 2, len + 0.16, x1, len - 0.22 + (t === teeth - 1 ? 0 : 0.02));
  }
  s.lineTo(w, 0.62);
  s.bezierCurveTo(w, 0.3, 0.28, 0.08, 0.1, 0);
  s.closePath();
  const g = new THREE.ShapeGeometry(s, 10);
  const p = g.attributes.position, uv = g.attributes.uv;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i);
    uv.setXY(i, (x + w) / (2 * w), y / len);
    p.setZ(i, 0.1 * Math.sin((Math.PI * y) / len) - 0.06 * (x / w) * (x / w)); // gentle curl
  }
  g.rotateX(-Math.PI / 2);
  g.computeVertexNormals();
  return g;
}

function ScaleField({ lut }: { lut: THREE.DataTexture }) {
  const cover = useRef<THREE.InstancedMesh>(null!), ground = useRef<THREE.InstancedMesh>(null!);
  const geo = useMemo(() => scaleGeometry(), []);
  const geoG = useMemo(() => scaleGeometry(1.7, 0.46), []);
  const matC = useMemo(() => structuralMaterial(lut, { spread: 5, gain: 1.05, edge: 1, stripesU: 16 }), [lut]);
  const matG = useMemo(() => structuralMaterial(lut, { spread: 3, gain: 0.35, edge: 1, stripesU: 14, base: "#010205" }), [lut]);
  const cols = 13, rows = 16, n = (2 * cols + 1) * rows;
  useEffect(() => {
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), c = new THREE.Color();
    let k = 0;
    for (let r = 0; r < rows; r++) for (let col = -cols; col <= cols; col++) {
      const rnd = (s: number) => { const x = Math.sin((r * 97 + col * 13 + s) * 12.9898) * 43758.5453; return x - Math.floor(x); };
      const x = col * 1.02 + (r % 2 ? 0.51 : 0), z = 8 - r * 1.12;
      e.set(0.15 + (rnd(1) - 0.5) * 0.1, (rnd(2) - 0.5) * 0.08, (rnd(3) - 0.5) * 0.1);
      q.setFromEuler(e); m.compose(new THREE.Vector3(x, r * 0.004, z), q, new THREE.Vector3(1, 1, 1));
      cover.current.setMatrixAt(k, m); cover.current.setColorAt(k, c.setRGB(rnd(4), 0, 0));
      e.set(0.1, 0, 0); q.setFromEuler(e); m.compose(new THREE.Vector3(x + 0.51, -0.08, z + 0.5), q, new THREE.Vector3(1, 1, 1));
      ground.current.setMatrixAt(k, m); ground.current.setColorAt(k, c.setRGB(rnd(5), 0, 0));
      k++;
    }
    [cover.current, ground.current].forEach((im) => { im.instanceMatrix.needsUpdate = true; if (im.instanceColor) im.instanceColor.needsUpdate = true; });
  }, [n]);
  return (
    <group>
      <instancedMesh ref={ground} args={[geoG, matG, n]} />
      <instancedMesh ref={cover} args={[geo, matC, n]} />
      <mesh rotation-x={-Math.PI / 2} position={[0, -0.12, 0]}><planeGeometry args={[60, 60]} /><meshStandardMaterial color="#020306" /></mesh>
    </group>
  );
}

/* ---------- level 2: ridges on one scale ---------- */
function Ridges({ lut }: { lut: THREE.DataTexture }) {
  const ridges = useRef<THREE.InstancedMesh>(null!), ribs = useRef<THREE.InstancedMesh>(null!);
  const N = 17, L = 16, ribRows = 28;
  const rGeo = useMemo(() => { const g = new THREE.CapsuleGeometry(0.17, L, 6, 16); g.rotateX(Math.PI / 2); g.scale(1, 1.6, 1); return g; }, []);
  const ribGeo = useMemo(() => { const g = new THREE.CylinderGeometry(0.035, 0.035, 0.62, 6); g.rotateZ(Math.PI / 2); return g; }, []);
  const mat = useMemo(() => structuralMaterial(lut, { spread: 4, gain: 1.1, stripesV: 90, base: "#020510" }), [lut]);
  const ribMat = useMemo(() => new THREE.MeshPhysicalMaterial({ color: "#1b2f55", roughness: 0.4, clearcoat: 0.5 }), []);
  useEffect(() => {
    const m = new THREE.Matrix4(), c = new THREE.Color();
    for (let i = 0; i < N; i++) {
      m.makeTranslation((i - (N - 1) / 2) * 0.8, 0.22, 0); ridges.current.setMatrixAt(i, m);
      ridges.current.setColorAt(i, c.setRGB(0.3 + 0.4 * Math.abs(Math.sin(i * 1.7)), 0, 0));
    }
    let k = 0;
    for (let i = 0; i < N - 1; i++) for (let j = 0; j < ribRows; j++) {
      m.makeTranslation((i - (N - 1) / 2) * 0.8 + 0.4, 0.06, -L / 2 + (j + 0.5) * (L / ribRows)); ribs.current.setMatrixAt(k++, m);
    }
    ridges.current.instanceMatrix.needsUpdate = true; ribs.current.instanceMatrix.needsUpdate = true;
    if (ridges.current.instanceColor) ridges.current.instanceColor.needsUpdate = true;
  }, []);
  return (
    <group>
      <instancedMesh ref={ridges} args={[rGeo, mat, N]} />
      <instancedMesh ref={ribs} args={[ribGeo, ribMat, (N - 1) * ribRows]} />
      <mesh rotation-x={-Math.PI / 2}><planeGeometry args={[40, 40]} /><meshPhysicalMaterial color="#06122a" roughness={0.6} /></mesh>
    </group>
  );
}

/* ---------- camera rig ---------- */
const easeIn = (x: number) => x * x * x;
const easeOut = (x: number) => 1 - Math.pow(1 - x, 3);
type Glide = { from: THREE.Vector3; to: THREE.Vector3; t0: number; dur: number; ease: (x: number) => number; done?: () => void };

/* Leaving a level: an accelerating dolly toward (or away from) the subject while the view darkens.
   Arriving: the camera starts close in (or far out) and decelerates onto the pose, so the two halves
   read as one continuous zoom. Time-based easing, so it looks the same at any frame rate. */
function Rig({ level, leaveKey, deeper }: { level: number; leaveKey: number; deeper: boolean }) {
  const { camera, controls } = useThree() as unknown as { camera: THREE.PerspectiveCamera; controls: OrbitImpl | null };
  const glide = useRef<Glide | null>(null);
  const first = useRef(true);
  useEffect(() => {
    if (!controls) return;
    const p = POSES[level];
    const target = new THREE.Vector3(...p.target), goal = new THREE.Vector3(...p.pos);
    const k = first.current ? 0.55 : deeper ? 0.3 : 2.1;
    first.current = false;
    const start = goal.clone().sub(target).multiplyScalar(k).add(target);
    camera.position.copy(start);
    controls.target.copy(target);
    // let the glide pass through distances the user is not allowed to orbit to
    controls.minDistance = Math.min(p.min, start.distanceTo(target) * 0.9); controls.maxDistance = Math.max(p.max, start.distanceTo(target) * 1.1);
    glide.current = { from: start, to: goal, t0: performance.now(), dur: 1.6, ease: easeOut, done: () => { controls.minDistance = p.min; controls.maxDistance = p.max; } };
  }, [level, controls, camera]); // eslint-disable-line react-hooks/exhaustive-deps
  const lastLeave = useRef(leaveKey);
  useEffect(() => {
    // once per click: an effect keyed on anything else can re-fire after the arrival and dive into the scene
    if (leaveKey === lastLeave.current || !controls) return;
    lastLeave.current = leaveKey;
    const t = controls.target.clone();
    const to = camera.position.clone().sub(t).multiplyScalar(deeper ? 0.3 : 2.2).add(t);
    controls.minDistance = 0.01; controls.maxDistance = 1e3;
    glide.current = { from: camera.position.clone(), to, t0: performance.now(), dur: 0.62, ease: easeIn };
  }, [leaveKey]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    // a drag takes over from any glide in progress
    if (!controls) return;
    const stop = () => { const g = glide.current; if (g && g.ease === easeOut) { g.done?.(); glide.current = null; } };
    controls.addEventListener("start", stop);
    return () => controls.removeEventListener("start", stop);
  }, [controls]);
  useFrame(() => {
    const g = glide.current;
    if (!g || !controls) return;
    // wall-clock progress: the move ends on time even when a heavy scene drops frames
    const t = Math.min(1, (performance.now() - g.t0) / 1000 / g.dur);
    camera.position.lerpVectors(g.from, g.to, g.ease(t));
    controls.update();
    if (t >= 1) { g.done?.(); glide.current = null; }
  });
  return null;
}

export default function NanoDive({ lut, height = "min(70vh, 620px)", initial = 0, onLevel, extraHud, lamellae = DEFAULT_LAMELLAE }: {
  lut: THREE.DataTexture; height?: string; initial?: number; onLevel?: (i: number) => void; extraHud?: React.ReactNode; lamellae?: LamellaeSpec;
}) {
  const [level, setLevel] = useState(initial);
  const [shown, setShown] = useState(initial);
  const [fade, setFade] = useState(0);
  const [touring, setTouring] = useState(false);
  const [deeper, setDeeper] = useState(true);
  const [leaveKey, setLeaveKey] = useState(0);
  const timers = useRef<number[]>([]);
  const go = (i: number) => {
    if (i === level) return;
    timers.current.forEach(clearTimeout);
    setDeeper(i > shown); setLevel(i); setFade(1); setLeaveKey((k) => k + 1);
    // swap the scene while the view is dark, give it a frame to draw, then lift the veil
    timers.current = [
      window.setTimeout(() => { setShown(i); onLevel?.(i); }, 620),
      window.setTimeout(() => setFade(0), 720),
    ];
  };
  useEffect(() => {
    if (!touring) return;
    const id = window.setTimeout(() => { if (level < 3) go(level + 1); else setTouring(false); }, level === 0 ? 1800 : 5200);
    return () => clearTimeout(id);
  }, [touring, level]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => () => timers.current.forEach(clearTimeout), []);
  const L = LEVELS[level];
  const fit = lamellaeFit(lamellae.dc, lamellae.da, lamellae.N);
  const scaleText = (i: number) => (i === 3 ? Math.round(100 / fit) + " nm" : LEVELS[i].scale);
  const levelText = (i: number) => i !== 3 || lamellae === DEFAULT_LAMELLAE ? LEVELS[i].text
    : `Cut a ridge and you find a 'Christmas tree' of ${lamellae.N} chitin shelves, ${Math.round(lamellae.dc)} nm thick with ${Math.round(lamellae.da)} nm of ${lamellae.fill ?? "air"} between. White light goes in. Only ${colourName(lamellae.peak)} around ${Math.round(lamellae.peak)} nm comes back out; the rest is absorbed by melanin underneath.`;

  return (
    <div className="dive">
      <Stage3D
        style={{ height }}
        label={"3D model: " + LEVELS[shown].name}
        camera={{ position: POSES[initial].pos, fov: 36 }}
        bloom={shown === 3 ? 1.5 : 1.1}
        overlay={<>
          <div className={"dive-fade" + (deeper ? "" : " up")} style={{ opacity: fade }} />
          <div className="hud dive-hud" key={"h" + shown} style={{ top: 14, left: 16 }}><b>{LEVELS[shown].name}</b> &middot; magnification {LEVELS[shown].mag}</div>
          <div className="dive-scalebar hud" key={"s" + shown}><i /><span>{scaleText(shown)}</span></div>
          {extraHud}
        </>}
      >
        <Backdrop top={shown === 3 ? "#120c06" : "#0b2043"} bottom="#010204" halo={shown === 3 ? "#5a3a14" : "#1d5fb8"} />
        <group visible={shown === 0}>{shown === 0 && <Butterfly lut={lut} speed={0.35} amp={0.45} light={new THREE.Vector3(-2, 6, 3.5)} rotation={[0.05, Math.PI * 0.9, 0]} />}</group>
        {shown === 1 && <ScaleField lut={lut} />}
        {shown === 2 && <Ridges lut={lut} />}
        {shown === 3 && <Lamellae spec={lamellae} />}
        {shown < 3 && <Sparkles count={60} scale={[12, 6, 12]} size={2} speed={0.2} opacity={0.5} color="#9fd2ff" />}
        <OrbitControls makeDefault enablePan={false} enableDamping autoRotate={shown < 3} autoRotateSpeed={0.35} maxPolarAngle={shown === 3 ? Math.PI * 0.62 : Math.PI * 0.49} />
        <Rig level={shown} leaveKey={leaveKey} deeper={deeper} />
      </Stage3D>
      <div className="dive-bar">
        <div className="dive-levels" role="group" aria-label="Zoom level">
          {LEVELS.map((l, i) => (
            <button key={l.key} aria-pressed={level === i} onClick={() => { setTouring(false); go(i); }}>
              <span className="n">{i + 1}</span>{l.name}<small>{l.scale}</small>
              {i < 3 && <ChevronRight size={14} aria-hidden="true" className="chev" />}
            </button>
          ))}
        </div>
        <button className="btn primary sm" onClick={() => { if (touring) setTouring(false); else { setTouring(true); if (level === 3) go(0); } }}>
          {touring ? <><Pause size={14} /> Stop the dive</> : <><Play size={14} /> Play the dive</>}
        </button>
      </div>
      <p className="dive-text" key={"t" + level}>{levelText(level)}</p>
    </div>
  );
}
