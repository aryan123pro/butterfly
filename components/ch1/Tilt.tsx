"use client";
import { RoundedBox } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import { Pause, Play } from "lucide-react";
import { useMemo, useRef, useState } from "react";
import * as THREE from "three";
import * as O from "@/lib/optics";
import { lutTexture, structuralMaterial } from "@/lib/scene/materials";
import Backdrop from "../three/Backdrop";
import Label3D from "../three/Label3D";
import Stage3D from "../three/Stage3D";
import { Plot, Range, Readouts, useCanvas, useRaf } from "../ui";

const stack = O.morphoStack();
const ANGLES = Array.from({ length: 41 }, (_, i) => i * 2);

function Cards({ tilt, lut }: { tilt: number; lut: THREE.DataTexture }) {
  const a = useRef<THREE.Group>(null!), b = useRef<THREE.Group>(null!);
  const { camera } = useThree();
  const mat = useMemo(() => { const m = structuralMaterial(lut, { spread: 2.2, gain: 0.42, stripesU: 60, base: "#02040a" }); return m; }, [lut]);
  const pig = useMemo(() => new THREE.MeshPhysicalMaterial({ color: "#1d47b8", roughness: 0.55, clearcoat: 0.3 }), []);
  useFrame(() => {
    const r = -(tilt * Math.PI) / 180;
    a.current.rotation.x += (r - a.current.rotation.x) * 0.2;
    b.current.rotation.x = a.current.rotation.x;
    // lamp sits beside the eye, so the angle of incidence equals the tilt shown on the slider
    (mat.uniforms.uLight.value as THREE.Vector3).copy(camera.position);
  });
  return (
    <>
      <group ref={a} position={[-1.35, 0, 0]}>
        <RoundedBox args={[2.2, 2.9, 0.06]} radius={0.06} smoothness={4} material={mat} />
        <Label3D position={[0, -1.8, 0.05]} size={0.17}>STRUCTURAL</Label3D>
      </group>
      <group ref={b} position={[1.35, 0, 0]}>
        <RoundedBox args={[2.2, 2.9, 0.06]} radius={0.06} smoothness={4} material={pig} />
        <Label3D position={[0, -1.8, 0.05]} size={0.17}>BLUE PIGMENT</Label3D>
      </group>
      <directionalLight position={[3, 4, 5]} intensity={1.6} />
    </>
  );
}

export default function Tilt() {
  const [th, setTh] = useState(10);
  const [rock, setRock] = useState(false);
  const tRef = useRef(0);
  useRaf((_t, dt) => { tRef.current += dt; setTh(Math.round(35 + 35 * Math.sin(tRef.current * 0.8 - Math.PI / 2))); }, rock);
  const lut = useMemo(() => lutTexture(O.angleLUT(stack, 96, 80).data), []);
  // follow the first-order peak near the Bragg estimate rather than jumping to side lobes
  const table = useMemo(() => ANGLES.map((a) => { const s = O.spectrum(stack, a), b = O.braggPeak(1.56, 75, 1, 110, a); return { a, c: O.color(s), pk: b + 45 < 390 ? NaN : O.peak(s, b - 45, b + 45).lambda }; }), []);
  const cur = table[Math.round(th / 2)];
  const bragg = ANGLES.map((a) => O.braggPeak(1.56, 75, 1, 110, a));
  const R = useMemo(() => O.spectrum(stack, th), [th]);

  const strip = useCanvas((cv) => {
    const { ctx: g, w, h } = O.setupCanvas(cv);
    g.clearRect(0, 0, w, h);
    table.forEach((r, i) => { g.fillStyle = r.c.css; g.fillRect((i / table.length) * w, 0, w / table.length + 1, h - 18); });
    const x = (th / 82) * w;
    g.fillStyle = "#fff"; g.shadowColor = "#fff"; g.shadowBlur = 8; g.fillRect(x - 1.5, 0, 3, h - 18); g.shadowBlur = 0;
    g.font = '10px "IBM Plex Mono", monospace'; g.fillStyle = "#56637a";
    [0, 20, 40, 60, 80].forEach((a) => g.fillText(a + "°", (a / 82) * w + 2, h - 4));
  }, [th, table]);

  return (
    <div className="split even">
      <div className="stack" style={{ gap: 14 }}>
        <Stage3D style={{ height: 380 }} label="Two cards tilting: one structural, one pigment" camera={{ position: [0, 0.4, 7.2], fov: 38 }} bloom={1.2}
          overlay={<div className="hud" style={{ top: 12, left: 14 }}>tilt <b>{th}&deg;</b> &middot; lamp beside your eye</div>}>
          <Backdrop haloDir={[0, 0.1, -1]} />
          <Cards tilt={th} lut={lut} />
        </Stage3D>
        <div className="row" style={{ alignItems: "end" }}>
          <div style={{ flex: 1, minWidth: 200 }}><Range label="Tilt (angle of incidence)" value={th} min={0} max={80} onChange={(v) => { setRock(false); setTh(v); }} fmt={(v) => v + "°"} /></div>
          <button className="btn" aria-pressed={rock} onClick={() => setRock((s) => !s)}>{rock ? <><Pause size={14} /> Stop</> : <><Play size={14} /> Rock the card</>}</button>
        </div>
        <div className="panel" style={{ padding: 12 }}>
          <p className="eyebrow" style={{ marginBottom: 8 }}>Colour at every angle, computed</p>
          <canvas ref={strip} className="cv" style={{ height: 64 }} aria-label="Colour against viewing angle" />
        </div>
      </div>
      <div className="stack" style={{ gap: 14 }}>
        <Readouts items={[["Angle", th, "°"], ["Peak", Number.isFinite(cur.pk) ? cur.pk : "UV", Number.isFinite(cur.pk) ? "nm" : ""], ["Shift from 0°", Number.isFinite(cur.pk) ? cur.pk - table[0].pk : "—", "nm"]]} />
        <div className="panel">
          <Plot label="Peak wavelength against angle" height={220} opts={{
            x: [0, 80], y: [340, 480], xticks: [0, 20, 40, 60, 80], yticks: [360, 400, 440, 480], yfmt: (v) => v + "", padL: 40, xlabel: "angle (°)",
            series: [
              { xs: ANGLES, data: table.map((r) => r.pk), color: O.MORPHO, width: 2.4 },
              { xs: ANGLES, data: bragg, color: O.MUTED, width: 1.4, dash: [4, 4] },
            ],
            markers: [{ x: th, label: "now", color: O.INK }],
          }} />
          <p className="faint" style={{ fontSize: "var(--t-xs)" }}>Solid: full transfer-matrix peak. Dashed: the Bragg formula below.</p>
        </div>
        <div className="panel">
          <Plot label="Spectrum at this angle" height={150} opts={{ spectral: true, yticks: [0, 0.5, 1], series: [{ data: R, color: O.INK, fill: "spectral", fillAlpha: 0.55 }] }} />
        </div>
        <div className="formula">&lambda;(&theta;) = 2 [ d<sub>c</sub>&radic;(n<sub>c</sub>&sup2; &minus; sin&sup2;&theta;) + d<sub>a</sub>&radic;(n<sub>a</sub>&sup2; &minus; sin&sup2;&theta;) ]</div>
      </div>
    </div>
  );
}
