"use client";
import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import Label3D from "./Label3D";

/* A cross-section through ridges: "Christmas trees" of chitin shelves with photons. Driven by the
   real stack (shelf, gap, count, fill) and the colour the transfer matrix says it reflects, so the
   shelves, labels and returning photons all follow whatever structure is on the panel. */

export interface LamellaeSpec {
  dc: number; da: number; N: number;
  fill?: string;                       // name of what is in the gaps, for the label
  nf?: number;                         // its refractive index; above 1 the gaps are drawn filled
  reflect: [number, number, number];   // linear RGB of the head-on reflection (Colour.lin)
  css: string;                         // same colour for labels and light
  peak: number;                        // nm
  R: number;                           // peak reflectance 0..1
}
export const DEFAULT_LAMELLAE: LamellaeSpec = { dc: 75, da: 110, N: 8, fill: "air", reflect: [0.02, 0.18, 0.75], css: "#3fa9ff", peak: 455, R: 0.8 };

const NM = 0.01;            // scene units per nm (1 unit = 100 nm)
const TREES = [-8, 0, 8];
const TALL = 16.5;          // the camera frames up to here; taller stacks are squeezed vertically to fit
const BASE = -0.9;          // top of the melanin floor

/* Vertical squeeze applied to a stack so it fits the frame (1 = drawn to scale). */
export function lamellaeFit(dc: number, da: number, N: number) {
  const h = (N * (dc + da)) * NM + 1.4;
  return Math.min(1, TALL / h);
}

function layout(s: { dc: number; da: number; N: number }) {
  const k = lamellaeFit(s.dc, s.da, s.N);
  const DC = s.dc * NM * k, PERIOD = (s.dc + s.da) * NM * k;
  const top = BASE + (s.N * (s.dc + s.da) * NM + 1.4) * k;
  const shelfY = (i: number, side: number) => top - i * PERIOD - (side > 0 ? PERIOD / 2 : 0) - DC / 2;
  return { k, DC, PERIOD, top, shelfY, N: s.N };
}

export function colourName(nm: number) {
  if (nm < 450) return "violet-blue";
  if (nm < 490) return "blue";
  if (nm < 520) return "cyan";
  if (nm < 565) return "green";
  if (nm < 590) return "yellow";
  if (nm < 625) return "orange";
  return "red";
}

export default function Lamellae({ spec = DEFAULT_LAMELLAE, labels = true }: { spec?: LamellaeSpec; labels?: boolean }) {
  const shelves = useRef<THREE.InstancedMesh>(null!);
  const trunks = useRef<THREE.InstancedMesh>(null!);
  const L = layout(spec);
  const MAXN = 30, count = TREES.length * MAXN * 2;
  const chitin = useMemo(() => new THREE.MeshPhysicalMaterial({
    color: "#f0dcae", roughness: 0.22, clearcoat: 1, clearcoatRoughness: 0.15, sheen: 0.8, sheenColor: new THREE.Color("#fff3d6"),
    emissive: new THREE.Color("#4a3414"), emissiveIntensity: 0.55, transmission: 0.35, thickness: 0.8, ior: 1.56, attenuationColor: new THREE.Color("#c98a3a"), attenuationDistance: 3,
  }), []);
  const unitBox = useMemo(() => new THREE.BoxGeometry(1, 1, 1), []);
  const glow = useRef<THREE.PointLight>(null!);
  useEffect(() => {
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler();
    let k = 0;
    for (const tx of TREES) for (let s = 0; s < MAXN; s++) for (const side of [-1, 1]) {
      const len = 1 - (s / Math.max(8, L.N)) * 0.24; // the tree tapers toward its foot
      e.set(0, 0, side * 0.06); q.setFromEuler(e);
      const on = s < L.N;
      m.compose(new THREE.Vector3(tx + side * (0.2 + 1.35 * len), on ? L.shelfY(s, side) : -50, 0), q, new THREE.Vector3(2.7 * len, on ? Math.max(0.02, L.DC) : 0.001, 5));
      shelves.current.setMatrixAt(k++, m);
    }
    shelves.current.count = k;
    shelves.current.instanceMatrix.needsUpdate = true;
    const h = L.top + 0.5 - BASE;
    TREES.forEach((tx, i) => { m.compose(new THREE.Vector3(tx, BASE + h / 2, 0), new THREE.Quaternion(), new THREE.Vector3(0.4, h, 5)); trunks.current.setMatrixAt(i, m); });
    trunks.current.instanceMatrix.needsUpdate = true;
  }, [L.N, L.DC, L.PERIOD, L.top]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { glow.current?.color.set(spec.css); }, [spec.css]);
  const filler = useMemo(() => new THREE.MeshPhysicalMaterial({ color: "#8cc4ff", transparent: true, opacity: 0.2, roughness: 0.1, depthWrite: false, emissive: new THREE.Color("#1a3c66"), emissiveIntensity: 0.4 }), []);
  const filled = (spec.nf ?? 1) > 1.001;
  const fillTop = L.shelfY(0, -1) + L.DC / 2, fillBot = L.shelfY(L.N - 1, 1) - L.DC / 2;

  const gapY = L.shelfY(1, -1) - L.DC / 2 - (L.PERIOD - L.DC) / 2;
  return (
    <group>
      <directionalLight position={[-8, 30, 18]} intensity={2.2} color="#fff4e0" />
      <pointLight ref={glow} position={[0, 4, 8]} intensity={40} distance={30} />
      <instancedMesh ref={shelves} args={[unitBox, chitin, count]} frustumCulled={false} />
      <instancedMesh ref={trunks} args={[unitBox, chitin, TREES.length]} frustumCulled={false} />
      {filled && TREES.map((tx) => (
        <mesh key={tx} material={filler} geometry={unitBox} position={[tx, (fillTop + fillBot) / 2, 0]} scale={[6.1, Math.max(0.01, fillTop - fillBot), 4.9]} renderOrder={2} />
      ))}
      <mesh position={[0, -1.6, 0]}><boxGeometry args={[34, 1.4, 7]} /><meshPhysicalMaterial color="#23140a" roughness={0.9} sheen={0.4} sheenColor="#5a3518" /></mesh>
      <Photons spec={spec} L={L} />
      {labels && <>
        <Label3D position={[3.2, L.top + 1.1, 2.6]} color="#f0d9a8">{`chitin shelf · ${Math.round(spec.dc)} nm`}</Label3D>
        <Label3D position={[-4.6, gapY, 2.6]}>{`${spec.fill ?? "air"} gap · ${Math.round(spec.da)} nm`}</Label3D>
        <Label3D position={[8, -3.1, 3.6]} color="#ff9a5a">melanin absorbs the rest</Label3D>
        <Label3D position={[-8, L.top + 5.6, 2]} color="#ffffff">white light in ↓</Label3D>
        <Label3D position={[0.6, L.top + 6.6, 2]} color={spec.css}>{`↑ ${colourName(spec.peak)} reflected · ${Math.round(spec.peak)} nm`}</Label3D>
      </>}
    </group>
  );
}

function Photons({ spec, L }: { spec: LamellaeSpec; L: ReturnType<typeof layout> }) {
  const MAX = 420;
  const mesh = useRef<THREE.InstancedMesh>(null!);
  // read inside useFrame, so the photons follow the structure as it morphs
  const live = useRef({ spec, L });
  live.current = { spec, L };
  const st = useMemo(() => ({
    x: new Float32Array(MAX), y: new Float32Array(MAX), z: new Float32Array(MAX), vx: new Float32Array(MAX), vy: new Float32Array(MAX),
    kind: new Int8Array(MAX), loss: new Float32Array(MAX), next: new Int8Array(MAX), alive: new Uint8Array(MAX), acc: 0,
  }), []);
  const geo = useMemo(() => new THREE.SphereGeometry(0.2, 12, 8), []);
  const mat = useMemo(() => new THREE.MeshBasicMaterial({ toneMapped: false }), []);
  const m = useMemo(() => new THREE.Matrix4(), []), c = useMemo(() => new THREE.Color(), []);
  const spawn = (kind: number, x: number, y: number, z: number, vx: number, vy: number) => {
    for (let i = 0; i < MAX; i++) if (!st.alive[i]) {
      st.alive[i] = 1; st.kind[i] = kind; st.x[i] = x; st.y[i] = y; st.z[i] = z; st.vx[i] = vx; st.vy[i] = vy; st.loss[i] = 0; st.next[i] = 0;
      return;
    }
  };
  useEffect(() => { mesh.current.setColorAt(0, c.setRGB(1, 1, 1)); }, [c]);
  useFrame((_s, dtRaw) => {
    const dt = Math.min(dtRaw, 0.05);
    const { spec: S, L: G } = live.current;
    // normalised hue of the reflection, and a per-shelf reflection chance that adds up to the peak reflectance
    const mx = Math.max(S.reflect[0], S.reflect[1], S.reflect[2], 1e-4);
    const hr = S.reflect[0] / mx, hg = S.reflect[1] / mx, hb = S.reflect[2] / mx;
    const pShelf = Math.min(0.5, Math.max(0.06, 1 - Math.pow(1 - Math.min(0.97, S.R), 1 / Math.max(1, G.N))) * 1.4);
    st.acc += dt * 36;
    while (st.acc > 1) {
      st.acc -= 1;
      const tx = TREES[Math.floor(Math.random() * TREES.length)], side = Math.random() < 0.5 ? -1 : 1;
      spawn(0, tx + side * (0.4 + Math.random() * 2.3), G.top + 8, (Math.random() - 0.5) * 4, 0, -8);
    }
    let n = 0;
    for (let i = 0; i < MAX; i++) {
      if (!st.alive[i]) continue;
      const py = st.y[i];
      st.x[i] += st.vx[i] * dt; st.y[i] += st.vy[i] * dt;
      if (st.kind[i] === 0) {
        // crossing the next shelf going down: some of the reflected colour bounces back up
        const tree = TREES.reduce((a, b) => (Math.abs(b - st.x[i]) < Math.abs(a - st.x[i]) ? b : a));
        const side = st.x[i] > tree ? 1 : -1;
        while (st.next[i] < G.N && st.y[i] < G.shelfY(st.next[i], side) && py >= G.shelfY(st.next[i], side) - 0.5) {
          if (Math.random() < pShelf) { spawn(1, st.x[i], G.shelfY(st.next[i], side) + 0.2, st.z[i], side * (0.6 + Math.random() * 1.2), 8.5); st.loss[i] += 0.5 / G.N; }
          st.next[i]++;
        }
        if (st.y[i] < -0.9) { st.alive[i] = 0; continue; }
      } else if (st.y[i] > G.top + 10) { st.alive[i] = 0; continue; }
      if (st.kind[i] === 0) {
        // white light that has lost some of the reflected band takes on the complementary tint
        const l = Math.min(1, st.loss[i]) * 0.9;
        c.setRGB(2 * (1 - l * hr), 2 * (1 - l * hg), 2 * (1 - l * hb));
      } else c.setRGB(0.03 + 1.7 * hr, 0.03 + 1.7 * hg, 0.03 + 1.7 * hb); // kept moderate so tone mapping does not bleach the hue
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
