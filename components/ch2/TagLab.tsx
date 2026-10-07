"use client";
import { OrbitControls } from "@react-three/drei";
import { Copy, Layers, MoveVertical, Palette, Pause, Play } from "lucide-react";
import { useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { TAG_A, TAG_B } from "@/lib/designs";
import * as O from "@/lib/optics";
import { lutTexture } from "@/lib/scene/materials";
import Backdrop from "../three/Backdrop";
import Banknote, { type StripeFx } from "../three/Banknote";
import Stage3D from "../three/Stage3D";
import { Range, useRaf } from "../ui";

export default function TagLab() {
  const [tilt, setTilt] = useState(18);
  const [wobble, setWobble] = useState(true);
  const [fx, setFx] = useState<StripeFx>({ shift: true, move: true, depth: true, printed: false });
  const t = useRef(0);
  useRaf((_t, dt) => { t.current += dt; setTilt(Math.round(26 + 24 * Math.sin(t.current * 0.7))); }, wobble);
  const lutA = useMemo(() => lutTexture(O.angleLUT(O.morphoStack(TAG_A), 96, 80, 1.25).data), []);
  const lutB = useMemo(() => lutTexture(O.angleLUT(O.morphoStack(TAG_B), 96, 80, 1.25).data), []);
  const light = useMemo(() => new THREE.Vector3(0, 3.2, 9), []);
  const cA = O.color(O.spectrum(O.morphoStack(TAG_A), fx.shift && !fx.printed ? tilt : 7), 1.25);
  const cB = O.color(O.spectrum(O.morphoStack(TAG_B), fx.shift && !fx.printed ? tilt : 7), 1.25);
  const toggle = (k: keyof StripeFx) => setFx((f) => ({ ...f, [k]: !f[k] }));

  return (
    <div className="stack" style={{ gap: 16 }}>
      <div className="split wide">
        <Stage3D style={{ height: "min(62svh, 520px)" }} label="3D specimen banknote with a structural-colour security stripe" camera={{ position: [0, 0.6, 7.4], fov: 40 }} bloom={0.9} envIntensity={0.9}
          overlay={<div className="hud" style={{ top: 12, left: 14 }}>note tilted <b>{tilt}&deg;</b> &middot; drag to look around</div>}>
          <Backdrop top="#10213a" halo="#294f86" haloDir={[0, 0.2, -1]} />
          <Banknote lutA={lutA} lutB={lutB} tilt={tilt} fx={fx} light={light} />
          <directionalLight position={[2, 4, 6]} intensity={1.6} />
          <OrbitControls enablePan={false} minDistance={4} maxDistance={11} minAzimuthAngle={-0.7} maxAzimuthAngle={0.7} minPolarAngle={0.9} maxPolarAngle={2.2} enableDamping />
        </Stage3D>
        <div className="stack">
          <div className="row" style={{ alignItems: "end" }}>
            <div style={{ flex: 1, minWidth: 180 }}><Range label="Tilt the note" value={tilt} min={0} max={60} onChange={(v) => { setWobble(false); setTilt(v); }} fmt={(v) => v + "°"} /></div>
            <button className="btn sm" aria-pressed={wobble} onClick={() => setWobble((w) => !w)}>{wobble ? <Pause size={14} /> : <Play size={14} />} {wobble ? "Hold" : "Wobble"}</button>
          </div>
          <div className="stack" style={{ gap: 8 }}>
            <p className="eyebrow">Effects in the stripe</p>
            <div className="row">
              <button className="btn sm" aria-pressed={fx.shift} onClick={() => toggle("shift")}><Palette size={14} /> Colour shift</button>
              <button className="btn sm" aria-pressed={fx.move} onClick={() => toggle("move")}><MoveVertical size={14} /> Movement</button>
              <button className="btn sm" aria-pressed={fx.depth} onClick={() => toggle("depth")}><Layers size={14} /> Depth</button>
            </div>
          </div>
          <div className="panel stack" style={{ gap: 10 }}>
            <p className="eyebrow">The two nanostructures, at this angle</p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <div className="stack" style={{ gap: 6 }}><div className="swatch" style={{ background: cA.css, color: cA.css, aspectRatio: "2 / 1" }} /><span className="mono faint" style={{ fontSize: 11 }}>background &middot; 120/480 nm</span></div>
              <div className="stack" style={{ gap: 6 }}><div className="swatch" style={{ background: cB.css, color: cB.css, aspectRatio: "2 / 1" }} /><span className="mono faint" style={{ fontSize: 11 }}>motif &middot; 200/490 nm</span></div>
            </div>
          </div>
          <button className={"btn" + (fx.printed ? " primary" : "")} onClick={() => toggle("printed")}><Copy size={15} /> {fx.printed ? "Back to the genuine stripe" : "Swap in a printed copy"}</button>
        </div>
      </div>
    </div>
  );
}
