"use client";
import { Canvas } from "@react-three/fiber";
import { Environment, Lightformer } from "@react-three/drei";
import { Bloom, EffectComposer, ToneMapping, Vignette } from "@react-three/postprocessing";
import { Expand } from "lucide-react";
import { ToneMappingMode } from "postprocessing";
import { useEffect, useRef, useState, type ReactNode } from "react";
import * as THREE from "three";
import { toggleFullscreen } from "../Shell";

/* A 3D stage: pauses when scrolled away, studio lighting with no downloads, bloom so
   structural colour glows the way it does on a real wing. */
export default function Stage3D({
  children, camera = { position: [0, 2, 8], fov: 36 }, bloom = 0.9, className = "stage", style, overlay, label, envIntensity = 1,
}: {
  children: ReactNode; camera?: { position: [number, number, number]; fov?: number; near?: number; far?: number };
  bloom?: number; className?: string; style?: React.CSSProperties; overlay?: ReactNode; label: string; envIntensity?: number;
}) {
  const host = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(true);
  const [ok, setOk] = useState(true);
  useEffect(() => {
    try { const c = document.createElement("canvas"); setOk(!!(c.getContext("webgl2") || c.getContext("webgl"))); } catch { setOk(false); }
    if (!host.current) return;
    const io = new IntersectionObserver((es) => setVisible(es[0].isIntersecting), { threshold: 0.01 });
    io.observe(host.current);
    return () => io.disconnect();
  }, []);

  return (
    <div ref={host} className={className} style={style} role="img" aria-label={label}>
      {ok ? (
        <Canvas
          frameloop={visible ? "always" : "never"}
          dpr={[1, 2]}
          resize={{ offsetSize: true, scroll: false, debounce: { scroll: 0, resize: 150 } }} // ignore CSS transforms from page transitions
          flat
          camera={{ near: 0.01, far: 400, ...camera }}
          gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
          onCreated={({ gl }) => { gl.setClearColor(0x000000, 0); gl.outputColorSpace = THREE.SRGBColorSpace; }}
        >
          <Environment resolution={256} environmentIntensity={envIntensity}>
            <Lightformer form="rect" intensity={2.4} position={[0, 6, 2]} scale={[10, 3, 1]} rotation-x={Math.PI / 2} />
            <Lightformer form="rect" intensity={1.2} color="#9fd2ff" position={[-6, 2, -2]} scale={[3, 6, 1]} rotation-y={Math.PI / 2} />
            <Lightformer form="rect" intensity={0.8} color="#ffd9a8" position={[6, 1, 2]} scale={[3, 5, 1]} rotation-y={-Math.PI / 2} />
            <Lightformer form="ring" intensity={1.5} position={[0, 3, -6]} scale={3} />
          </Environment>
          {children}
          <EffectComposer multisampling={4}>
            <Bloom intensity={bloom} luminanceThreshold={0.62} luminanceSmoothing={0.25} mipmapBlur radius={0.72} />
            <Vignette offset={0.28} darkness={0.62} />
            <ToneMapping mode={ToneMappingMode.NEUTRAL} />
          </EffectComposer>
        </Canvas>
      ) : (
        <div className="hud" style={{ inset: 0, display: "grid", placeItems: "center", padding: 24, textAlign: "center" }}>
          This 3D view needs WebGL. Turn on hardware acceleration in the browser settings and reload.
        </div>
      )}
      {overlay}
      {ok && <button className="stage-fs" title="Full screen this model" aria-label="Full screen this model" onClick={() => toggleFullscreen(host.current)}><Expand size={15} /></button>}
    </div>
  );
}
