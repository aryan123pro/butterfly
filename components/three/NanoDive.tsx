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
import Label3D from "./Label3D";
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

/* ---------- level 3: lamellae cross-section with photons ---------- */
const NM = 0.01; // scene units per nm (1 unit = 100 nm)
const DC = 75 * NM, DA = 110 * NM, PERIOD = DC + DA, SHELVES = 8;
const TREES = [-8, 0, 8];
const TOP = 15.5;
const shelfY = (k: number, side: number) => TOP - k * PERIOD - (side > 0 ? PERIOD / 2 : 0);

function Lamellae() {
  const shelves = useRef<THREE.InstancedMesh>(null!);
  const chitin = useMemo(() => new THREE.MeshPhysicalMaterial({
    color: "#f0dcae", roughness: 0.22, clearcoat: 1, clearcoatRoughness: 0.15, sheen: 0.8, sheenColor: new THREE.Color("#fff3d6"),
    emissive: new THREE.Color("#4a3414"), emissiveIntensity: 0.55, transmission: 0.35, thickness: 0.8, ior: 1.56, attenuationColor: new THREE.Color("#c98a3a"), attenuationDistance: 3,
  }), []);
  const shelfGeo = useMemo(() => new THREE.BoxGeometry(2.7, DC, 5, 1, 1, 1), []);
  const count = TREES.length * SHELVES * 2;
  useEffect(() => {
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler();
    let k = 0;
    for (const tx of TREES) for (let s = 0; s < SHELVES; s++) for (const side of [-1, 1]) {
      const len = 1 - s * 0.03;
      e.set(0, 0, side * 0.06); q.setFromEuler(e);
      m.compose(new THREE.Vector3(tx + side * (0.2 + 1.35 * len), shelfY(s, side), 0), q, new THREE.Vector3(len, 1, 1));
      shelves.current.setMatrixAt(k++, m);
    }
    shelves.current.instanceMatrix.needsUpdate = true;
  }, []);
  return (
    <group>
      <directionalLight position={[-8, 30, 18]} intensity={2.2} color="#fff4e0" />
      <pointLight position={[0, 4, 8]} intensity={40} distance={30} color="#6fb0ff" />
      <instancedMesh ref={shelves} args={[shelfGeo, chitin, count]} />
      {TREES.map((x) => <mesh key={x} material={chitin} position={[x, TOP / 2 - 1, 0]}><boxGeometry args={[0.4, TOP + 1.4, 5]} /></mesh>)}
      <mesh position={[0, -1.6, 0]}><boxGeometry args={[34, 1.4, 7]} /><meshPhysicalMaterial color="#23140a" roughness={0.9} sheen={0.4} sheenColor="#5a3518" /></mesh>
      <Photons />
      <Label3D position={[3.2, TOP + 1.1, 2.6]} color="#f0d9a8">chitin shelf · 75 nm</Label3D>
      <Label3D position={[-4.6, shelfY(1, -1) - DC / 2 - DA / 2, 2.6]}>air gap · 110 nm</Label3D>
      <Label3D position={[8, -3.1, 3.6]} color="#ff9a5a">melanin absorbs the rest</Label3D>
      <Label3D position={[-8, TOP + 5.6, 2]} color="#ffffff">white light in ↓</Label3D>
      <Label3D position={[0.6, TOP + 6.6, 2]} color="#7fc4ff">↑ blue reflected</Label3D>
    </group>
  );
}

function Photons() {
  const MAX = 420;
  const mesh = useRef<THREE.InstancedMesh>(null!);
  const st = useMemo(() => ({
    x: new Float32Array(MAX), y: new Float32Array(MAX), z: new Float32Array(MAX), vx: new Float32Array(MAX), vy: new Float32Array(MAX),
    kind: new Int8Array(MAX), loss: new Float32Array(MAX), next: new Int8Array(MAX), alive: new Uint8Array(MAX), life: new Float32Array(MAX), acc: 0,
  }), []);
  const geo = useMemo(() => new THREE.SphereGeometry(0.2, 12, 8), []);
  const mat = useMemo(() => new THREE.MeshBasicMaterial({ toneMapped: false }), []);
  const m = useMemo(() => new THREE.Matrix4(), []), c = useMemo(() => new THREE.Color(), []);
  const spawn = (kind: number, x: number, y: number, z: number, vx: number, vy: number) => {
    for (let i = 0; i < MAX; i++) if (!st.alive[i]) {
      st.alive[i] = 1; st.kind[i] = kind; st.x[i] = x; st.y[i] = y; st.z[i] = z; st.vx[i] = vx; st.vy[i] = vy; st.loss[i] = 0; st.next[i] = 0; st.life[i] = 0;
      return;
    }
  };
  useEffect(() => { mesh.current.setColorAt(0, c.setRGB(1, 1, 1)); }, [c]);
  useFrame((_s, dtRaw) => {
    const dt = Math.min(dtRaw, 0.05);
    st.acc += dt * 36;
    while (st.acc > 1) {
      st.acc -= 1;
      const tx = TREES[Math.floor(Math.random() * TREES.length)], side = Math.random() < 0.5 ? -1 : 1;
      spawn(0, tx + side * (0.4 + Math.random() * 2.3), TOP + 8, (Math.random() - 0.5) * 4, 0, -8);
    }
    let n = 0;
    for (let i = 0; i < MAX; i++) {
      if (!st.alive[i]) continue;
      st.life[i] += dt;
      const py = st.y[i];
      st.x[i] += st.vx[i] * dt; st.y[i] += st.vy[i] * dt;
      if (st.kind[i] === 0) {
        // crossing the next shelf going down: some blue is reflected back up
        const tree = TREES.reduce((a, b) => (Math.abs(b - st.x[i]) < Math.abs(a - st.x[i]) ? b : a));
        const side = st.x[i] > tree ? 1 : -1;
        while (st.next[i] < SHELVES && st.y[i] < shelfY(st.next[i], side) && py >= shelfY(st.next[i], side) - 0.5) {
          if (Math.random() < 0.32) { spawn(1, st.x[i], shelfY(st.next[i], side) + 0.2, st.z[i], side * (0.6 + Math.random() * 1.2), 8.5); st.loss[i] += 0.16; }
          st.next[i]++;
        }
        if (st.y[i] < -0.9) { st.alive[i] = 0; continue; }
      } else if (st.y[i] > TOP + 10) { st.alive[i] = 0; continue; }
      const L = Math.min(1, st.loss[i]);
      if (st.kind[i] === 0) c.setRGB(2.6 + 0.4 * L, 2.6 - 1.2 * L, 2.6 - 2.3 * L);
      else c.setRGB(0.25, 0.85, 3.4);
      const fade = st.kind[i] === 0 && st.y[i] < 0.5 ? Math.max(0, (st.y[i] + 0.9) / 1.4) : 1;
      c.multiplyScalar(fade);
      m.makeScale(1, 2.6, 1).setPosition(st.x[i], st.y[i], st.z[i]);
      mesh.current.setMatrixAt(n, m); mesh.current.setColorAt(n, c); n++;
    }
    mesh.current.count = n;
    mesh.current.instanceMatrix.needsUpdate = true;
    if (mesh.current.instanceColor) mesh.current.instanceColor.needsUpdate = true;
  });
  return <instancedMesh ref={mesh} args={[geo, mat, MAX]} frustumCulled={false} />;
}

/* ---------- camera rig ---------- */
function Rig({ level, push }: { level: number; push: number }) {
  const { camera, controls } = useThree() as unknown as { camera: THREE.PerspectiveCamera; controls: OrbitImpl | null };
  const prev = useRef(-1);
  useEffect(() => {
    if (!controls) return;
    const p = POSES[level];
    // start a little further in, then settle back: feels like arriving from the zoom
    const target = new THREE.Vector3(...p.target);
    const start = new THREE.Vector3(...p.pos).sub(target).multiplyScalar(prev.current < level ? 0.45 : 1.6).add(target);
    camera.position.copy(start);
    controls.target.copy(target);
    controls.minDistance = p.min; controls.maxDistance = p.max;
    controls.update();
    prev.current = level;
  }, [level, controls, camera]);
  useFrame((_s, dt) => {
    if (!controls) return;
    const p = POSES[level];
    const goal = new THREE.Vector3(...p.pos);
    if (push > 0) {
      // diving: rush toward the target
      const t = new THREE.Vector3(...p.target);
      camera.position.lerp(t, Math.min(1, dt * 3.5 * push));
    } else if (camera.position.distanceTo(goal) > 0.05 && camera.userData.settle !== level) {
      camera.position.lerp(goal, Math.min(1, dt * 1.6));
      if (camera.position.distanceTo(goal) < 0.08) camera.userData.settle = level;
    }
    controls.update();
  });
  return null;
}

export default function NanoDive({ lut, height = "min(70vh, 620px)", initial = 0, onLevel, extraHud }: {
  lut: THREE.DataTexture; height?: string; initial?: number; onLevel?: (i: number) => void; extraHud?: React.ReactNode;
}) {
  const [level, setLevel] = useState(initial);
  const [shown, setShown] = useState(initial);
  const [fade, setFade] = useState(0);
  const [touring, setTouring] = useState(false);
  const timers = useRef<number[]>([]);
  const go = (i: number) => {
    if (i === level) return;
    timers.current.forEach(clearTimeout);
    setLevel(i); setFade(1);
    timers.current = [window.setTimeout(() => { setShown(i); onLevel?.(i); setFade(0); }, 520)];
  };
  useEffect(() => {
    if (!touring) return;
    const id = window.setTimeout(() => { if (level < 3) go(level + 1); else setTouring(false); }, level === 0 ? 1800 : 5200);
    return () => clearTimeout(id);
  }, [touring, level]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => () => timers.current.forEach(clearTimeout), []);
  const L = LEVELS[level];

  return (
    <div className="dive">
      <Stage3D
        style={{ height }}
        label={"3D model: " + LEVELS[shown].name}
        camera={{ position: POSES[initial].pos, fov: 36 }}
        bloom={shown === 3 ? 1.5 : 1.1}
        overlay={<>
          <div className="dive-fade" style={{ opacity: fade }} />
          <div className="hud" style={{ top: 14, left: 16 }}><b>{L.name}</b> &middot; magnification {L.mag}</div>
          <div className="dive-scalebar hud"><i /><span>{L.scale}</span></div>
          {extraHud}
        </>}
      >
        <Backdrop top={shown === 3 ? "#120c06" : "#0b2043"} bottom="#010204" halo={shown === 3 ? "#5a3a14" : "#1d5fb8"} />
        <group visible={shown === 0}>{shown === 0 && <Butterfly lut={lut} speed={0.35} amp={0.45} light={new THREE.Vector3(-2, 6, 3.5)} rotation={[0.05, Math.PI * 0.9, 0]} />}</group>
        {shown === 1 && <ScaleField lut={lut} />}
        {shown === 2 && <Ridges lut={lut} />}
        {shown === 3 && <Lamellae />}
        {shown < 3 && <Sparkles count={60} scale={[12, 6, 12]} size={2} speed={0.2} opacity={0.5} color="#9fd2ff" />}
        <OrbitControls makeDefault enablePan={false} enableDamping autoRotate={shown < 3} autoRotateSpeed={0.35} maxPolarAngle={shown === 3 ? Math.PI * 0.62 : Math.PI * 0.49} />
        <Rig level={shown} push={fade} />
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
      <p className="dive-text">{L.text}</p>
    </div>
  );
}
