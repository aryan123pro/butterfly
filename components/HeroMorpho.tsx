"use client";
import { OrbitControls, Sparkles } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import { useMemo, useRef, useState } from "react";
import * as THREE from "three";
import * as O from "@/lib/optics";
import { lutTexture } from "@/lib/scene/materials";
import Backdrop from "./three/Backdrop";
import Butterfly from "./three/Butterfly";
import Stage3D from "./three/Stage3D";

const stack = O.morphoStack();
const LAMP = new THREE.Vector3(-2.2, 6, 3.5);

function Reader({ onRead }: { onRead: (a: number) => void }) {
  const { camera } = useThree();
  const last = useRef(-1);
  const v = useMemo(() => new THREE.Vector3(), []);
  useFrame(() => {
    v.copy(camera.position).normalize();
    const ang = Math.round(Math.min(80, (Math.acos(Math.abs(v.y)) * 180) / Math.PI));
    if (ang !== last.current) { last.current = ang; onRead(ang); }
  });
  return null;
}

export default function HeroMorpho() {
  const lut = useMemo(() => lutTexture(O.angleLUT(stack, 96, 80).data), []);
  const [ang, setAng] = useState(30);
  const sp = useMemo(() => O.spectrum(stack, ang), [ang]);
  const col = O.color(sp), pk = O.visiblePeak(sp).lambda;

  return (
    <Stage3D
      className="stage hero-stage"
      label="Rotating 3D Blue Morpho butterfly. Drag to change the viewing angle."
      camera={{ position: [4.6, 4.4, 6.4], fov: 32 }}
      bloom={1.25}
      overlay={<>
        <div className="hud tl"><b>Morpho didius</b> &middot; live thin-film render<br /><span className="hint">drag to tilt &middot; scroll to zoom &middot; look underneath</span></div>
        <div className="hud bl">
          <div className="angle-read">
            <div className="sw" style={{ background: col.css, boxShadow: `0 0 24px ${col.css}` }} />
            <div><div className="big">viewing {ang}&deg;</div><div>reflection peak {pk} nm</div></div>
          </div>
          <div style={{ textAlign: "right" }}>8 chitin lamellae &middot; 75 nm<br />air gaps &middot; 110 nm</div>
        </div>
      </>}
    >
      <Backdrop haloDir={[-0.3, 0.5, -1]} />
      <Butterfly lut={lut} speed={0.42} amp={0.55} light={LAMP} position={[0, 0, 0.2]} rotation={[0.08, Math.PI * 0.92, 0]} />
      <Sparkles count={90} scale={[10, 6, 10]} size={2.4} speed={0.25} opacity={0.7} color="#9fd2ff" />
      <Sparkles count={30} scale={[7, 4, 7]} size={4.5} speed={0.12} opacity={0.4} color="#ffe2b0" />
      <Reader onRead={setAng} />
      <OrbitControls enablePan={false} autoRotate autoRotateSpeed={0.6} minDistance={4} maxDistance={14} enableDamping />
    </Stage3D>
  );
}






