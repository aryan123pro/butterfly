"use client";
import { RoundedBox } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import { Brush, Eraser, Pause, Play, Printer, ScanLine, Sparkles, Wand2, Wind } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import Backdrop from "@/components/three/Backdrop";
import Label3D from "@/components/three/Label3D";
import Stage3D from "@/components/three/Stage3D";
import { Notes, Plot, Range, Readouts, Seg, useCanvas, useRaf } from "@/components/ui";
import * as O from "@/lib/optics";
import { lutTexture, STRUCT_GLSL, updateLut } from "@/lib/scene/materials";

const W = 28, H = 16;
const BASE = { dc: 200, da: 380, N: 6 }; // royal blue head-on
const IMG_DC = 40; // the image structure has thicker shelves; its gap is what you tune
type Tool = "B" | "A" | "pit";

function preset(kind: string): Uint8Array {
  const g = new Uint8Array(W * H);
  const cv = document.createElement("canvas"); cv.width = W; cv.height = H;
  const c = cv.getContext("2d")!; c.fillStyle = "#000"; c.fillRect(0, 0, W, H); c.fillStyle = "#fff";
  if (kind === "text") { c.font = "bold 11px monospace"; c.textBaseline = "middle"; c.fillText("MORPHO", 1, H / 2 + 1); }
  else if (kind === "rupee") { c.font = "bold 15px Georgia"; c.textBaseline = "middle"; c.fillText("₹500", 1, H / 2 + 1); }
  else if (kind === "fly") {
    for (const s of [1, -1]) { c.beginPath(); c.ellipse(W / 2 + s * 5, 5.5, 5, 4, s * -0.4, 0, 7); c.fill(); c.beginPath(); c.ellipse(W / 2 + s * 4, 11, 3.5, 3, s * 0.4, 0, 7); c.fill(); }
    c.fillRect(W / 2 - 0.5, 3, 1, 11);
  }
  const d = c.getImageData(0, 0, W, H).data;
  for (let i = 0; i < W * H; i++) g[i] = d[i * 4] > 100 ? 1 : 0;
  if (kind === "pits") { for (let y = 2; y < H - 2; y++) for (let x = 2; x < W - 2; x++) if (((x * 7 + y * 13) % 5) < 2) g[y * W + x] = 2; }
  return g;
}

function CamZ({ z }: { z: number }) {
  const { camera } = useThree();
  useFrame(() => { camera.position.z += (z - camera.position.z) * 0.08; camera.lookAt(0, 0, 0); });
  return null;
}

function colourDiff(a: O.Colour, b: O.Colour) { return Math.hypot(a.lin[0] - b.lin[0], a.lin[1] - b.lin[1], a.lin[2] - b.lin[2]) * 100; }

function TagCard({ cells, lutA, lutB, lutW, tilt, wet, x, printed, label }: {
  cells: THREE.DataTexture; lutA: THREE.DataTexture; lutB: THREE.DataTexture; lutW: THREE.DataTexture; tilt: number; wet: number; x: number; printed: THREE.CanvasTexture | null; label: string;
}) {
  const g = useRef<THREE.Group>(null!);
  const mat = useMemo(() => new THREE.ShaderMaterial({
    uniforms: {
      uLut: { value: lutA }, uLutB: { value: lutB }, uLutW: { value: lutW }, uCells: { value: cells }, uPrint: { value: printed }, uIsPrint: { value: printed ? 1 : 0 },
      uMaxAng: { value: (80 * Math.PI) / 180 }, uLight: { value: new THREE.Vector3(0, 2.5, 9) }, uSpread: { value: 2.2 }, uGain: { value: 1 }, uWet: { value: 0 },
    },
    vertexShader: "varying vec3 vN; varying vec3 vW; varying vec2 vUv; void main(){ vUv = uv; vec4 w = modelMatrix * vec4(position,1.0); vW = w.xyz; vN = normalize(mat3(modelMatrix) * normal); gl_Position = projectionMatrix * viewMatrix * w; }",
    fragmentShader: STRUCT_GLSL + /* glsl */ `
      uniform sampler2D uLutB; uniform sampler2D uLutW; uniform sampler2D uCells; uniform sampler2D uPrint; uniform float uIsPrint; uniform float uWet;
      varying vec3 vN; varying vec3 vW; varying vec2 vUv;
      vec3 lut2(sampler2D t, float th){ return pow(texture2D(t, vec2(clamp(th / uMaxAng, 0.0, 1.0), 0.5)).rgb, vec3(2.2)); }
      void main(){
        vec3 N = normalize(vN); if (!gl_FrontFacing) N = -N;
        vec3 V = normalize(cameraPosition - vW); vec3 L = normalize(uLight); vec3 H = normalize(L + V);
        float th = acos(clamp(dot(V, H), 0.0, 1.0));
        float lobe = pow(max(dot(N, H), 0.0), uSpread);
        vec3 c;
        if (uIsPrint > 0.5) {
          c = pow(texture2D(uPrint, vUv).rgb, vec3(2.2)) * (0.45 + 0.55 * max(dot(N, L), 0.0));
        } else {
          float cell = texture2D(uCells, vUv).r * 255.0;
          vec3 a = lut2(uLut, th), b = lut2(uLutB, th), w = lut2(uLutW, th);
          c = cell > 1.5 ? mix(a, w, uWet) : (cell > 0.5 ? b : a);
          c *= 0.25 + 1.2 * lobe;
        }
        gl_FragColor = vec4(c, 1.0);
        if (!(gl_FragColor.r >= 0.0 && gl_FragColor.g >= 0.0 && gl_FragColor.b >= 0.0)) gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
  }), [cells, lutA, lutB, lutW, printed]);
  useFrame(() => { const r = -(tilt * Math.PI) / 180; g.current.rotation.x += (r - g.current.rotation.x) * 0.15; mat.uniforms.uWet.value = wet; });
  useEffect(() => () => mat.dispose(), [mat]);
  return (
    <group position={[x, 0, 0]}>
      <group ref={g}>
        <RoundedBox args={[3.56, 2.06, 0.05]} radius={0.06} smoothness={4} position={[0, 0, -0.005]}><meshPhysicalMaterial color="#0d1118" roughness={0.4} clearcoat={0.6} /></RoundedBox>
        <mesh position={[0, 0, 0.022]} material={mat}><planeGeometry args={[3.44, 1.94]} /></mesh>
      </group>
      <Label3D position={[0, 1.4, 0]} size={0.16} color="#8796aa">{label}</Label3D>
    </group>
  );
}

export default function TagForge() {
  const [grid, setGrid] = useState<Uint8Array>(() => new Uint8Array(W * H));
  const [tool, setTool] = useState<Tool>("B");
  const [offset, setOffset] = useState(-60);
  const [tilt, setTilt] = useState(0);
  const [wobble, setWobble] = useState(true);
  const [wet, setWet] = useState(0);
  const [breath, setBreath] = useState(false);
  const [scanAt, setScanAt] = useState(0);
  const [attack, setAttack] = useState(false);
  const painting = useRef(false), t = useRef(0), bT = useRef(0);
  useEffect(() => { setGrid(preset("text")); autoDesign(); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  useRaf((_t, dt) => { t.current += dt; setTilt(Math.round(26 + 26 * Math.sin(t.current * 0.75 - 1.2))); }, wobble);
  useRaf((_t, dt) => { bT.current += dt; setWet(bT.current < 0.6 ? bT.current / 0.6 : Math.max(0, 1 - (bT.current - 1.6) / 3)); if (bT.current > 4.6) { setBreath(false); setWet(0); } }, breath);

  const stackA = useMemo(() => O.morphoStack(BASE), []);
  const stackB = useMemo(() => O.morphoStack({ ...BASE, dc: BASE.dc + IMG_DC, da: BASE.da + offset }), [offset]);
  const stackW = useMemo(() => O.morphoStack({ ...BASE, nf: 1.33 }), []);
  const luts = useMemo(() => ({ A: lutTexture(O.angleLUT(stackA, 96, 80, 1.2).data), B: lutTexture(O.angleLUT(stackB, 96, 80, 1.2).data), W: lutTexture(O.angleLUT(stackW, 96, 80, 1.2).data) }), []); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { updateLut(luts.B, O.angleLUT(stackB, 96, 80, 1.2).data); }, [stackB, luts]);
  const cells = useMemo(() => { const t = new THREE.DataTexture(new Uint8Array(W * H * 4), W, H, THREE.RGBAFormat); t.magFilter = THREE.NearestFilter; t.minFilter = THREE.NearestFilter; t.flipY = false; return t; }, []);
  useEffect(() => {
    const d = cells.image.data as Uint8Array;
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const v = grid[(H - 1 - y) * W + x]; d[(y * W + x) * 4] = v; d[(y * W + x) * 4 + 3] = 255; }
    cells.needsUpdate = true;
  }, [grid, cells]);

  // visibility of the hidden image against angle
  const angles = Array.from({ length: 31 }, (_, i) => i * 2);
  const vis = useMemo(() => angles.map((a) => colourDiff(O.color(O.spectrum(stackA, a), 1.2), O.color(O.spectrum(stackB, a), 1.2))), [stackB]); // eslint-disable-line react-hooks/exhaustive-deps
  const autoDesign = () => {
    let best = offset, score = -1e9;
    for (let o = -150; o <= 150; o += 2) {
      const sB = O.morphoStack({ ...BASE, dc: BASE.dc + IMG_DC, da: BASE.da + o });
      const d0 = colourDiff(O.color(O.spectrum(stackA, 0), 1.2), O.color(O.spectrum(sB, 0), 1.2));
      const d40 = colourDiff(O.color(O.spectrum(stackA, 40), 1.2), O.color(O.spectrum(sB, 40), 1.2));
      const s = d40 - 3 * d0;
      if (s > score) { score = s; best = o; }
    }
    setOffset(best);
  };

  // the counterfeiter's copy: every cell frozen at the scan angle
  const printed = useMemo(() => {
    if (!attack) return null;
    const cv = document.createElement("canvas"); cv.width = W * 8; cv.height = H * 8;
    const g = cv.getContext("2d")!;
    const cA = O.color(O.spectrum(stackA, scanAt), 1.2).css, cB = O.color(O.spectrum(stackB, scanAt), 1.2).css;
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { g.fillStyle = grid[y * W + x] === 1 ? cB : cA; g.fillRect(x * 8, y * 8, 8, 8); }
    const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.NoColorSpace; tex.magFilter = THREE.NearestFilter; return tex;
  }, [attack, scanAt, grid, stackA, stackB]);
  const match = angles.map((a) => {
    const g0 = O.color(O.spectrum(stackA, a), 1.2), p0 = O.color(O.spectrum(stackA, scanAt), 1.2);
    return Math.max(0, 100 - colourDiff(g0, p0) * 1.4);
  });

  const editor = useCanvas((cv) => {
    const { ctx: g, w, h } = O.setupCanvas(cv);
    const s = Math.min(w / W, h / H), ox = (w - s * W) / 2, oy = (h - s * H) / 2;
    const cA = O.color(O.spectrum(stackA, 30), 1.2).css, cB = O.color(O.spectrum(stackB, 30), 1.2).css;
    g.fillStyle = "#06080c"; g.fillRect(0, 0, w, h);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const v = grid[y * W + x];
      g.fillStyle = v === 1 ? cB : cA; g.fillRect(ox + x * s + 0.5, oy + y * s + 0.5, s - 1, s - 1);
      if (v === 2) { g.strokeStyle = "rgba(255,255,255,.7)"; g.lineWidth = 1.2; g.beginPath(); g.arc(ox + (x + 0.5) * s, oy + (y + 0.5) * s, s * 0.22, 0, 6.3); g.stroke(); }
    }
  }, [grid, stackB]);

  const paintAt = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    const s = Math.min(r.width / W, r.height / H), ox = (r.width - s * W) / 2, oy = (r.height - s * H) / 2;
    const x = Math.floor((e.clientX - r.left - ox) / s), y = Math.floor((e.clientY - r.top - oy) / s);
    if (x < 0 || y < 0 || x >= W || y >= H) return;
    const v = tool === "B" ? 1 : tool === "pit" ? 2 : 0;
    setGrid((g) => { if (g[y * W + x] === v) return g; const n = new Uint8Array(g); n[y * W + x] = v; return n; });
  };

  const cA0 = O.color(O.spectrum(stackA, tilt), 1.2), cB0 = O.color(O.spectrum(stackB, tilt), 1.2);

  return (
    <main className="wrap" style={{ paddingBottom: 30 }}>
      <div className="split">
        <section className="stack" style={{ gap: 12 }}>
          <div className="panel stack" style={{ gap: 12 }}>
            <div className="row" style={{ justifyContent: "space-between" }}>
              <p className="eyebrow">1 · Paint your tag in nanostructures</p>
              <Seg label="Tool" value={tool} onChange={setTool} options={[["B", <span key="b" className="row" style={{ gap: 5 }}><Brush size={13} /> Image</span>], ["A", <span key="a" className="row" style={{ gap: 5 }}><Eraser size={13} /> Background</span>], ["pit", <span key="p" className="row" style={{ gap: 5 }}><Wind size={13} /> Vapour pit</span>]]} />
            </div>
            <canvas ref={editor} className="cv" style={{ height: 230, cursor: "crosshair", touchAction: "none" }} aria-label="Tag editor grid"
              onPointerDown={(e) => { painting.current = true; e.currentTarget.setPointerCapture(e.pointerId); paintAt(e); }}
              onPointerMove={(e) => painting.current && paintAt(e)} onPointerUp={() => (painting.current = false)} />
            <div className="row">
              <span className="faint" style={{ fontSize: "var(--t-xs)" }}>Presets:</span>
              {[["text", "MORPHO"], ["rupee", "₹500"], ["fly", "Butterfly"], ["pits", "Vapour code"]].map(([k, l]) => <button key={k} className="btn sm" onClick={() => setGrid(preset(k))}>{l}</button>)}
              <button className="btn sm ghost" onClick={() => setGrid(new Uint8Array(W * H))}>Clear</button>
            </div>
          </div>
          <div className="panel stack" style={{ gap: 12 }}>
            <div className="row" style={{ justifyContent: "space-between" }}><p className="eyebrow">2 · Hide the image</p><button className="btn sm primary" onClick={autoDesign}><Wand2 size={13} /> Auto-design: hidden head-on</button></div>
            <Range label="Image structure: gap offset from background" value={offset} min={-150} max={150} step={2} onChange={setOffset} fmt={(v) => (v > 0 ? "+" : "") + v + " nm"} />
            <Plot label="How visible the image is at each angle" height={150} opts={{
              x: [0, 60], y: [0, Math.max(30, ...vis) * 1.1], xticks: [0, 20, 40, 60], yticks: [0], yfmt: () => "", padL: 18, xlabel: "viewing angle (°)",
              series: [{ xs: angles, data: vis, color: O.MORPHO, width: 2.4, fill: "rgba(63,169,255,.15)" }], markers: [{ x: tilt, label: "now", color: O.INK }],
            }} />
            <p className="faint" style={{ fontSize: "var(--t-xs)" }}>Higher curve: image stands out. A good latent image is near zero head-on and peaks when tilted.</p>
          </div>
        </section>

        <section className="stack" style={{ gap: 12 }}>
          <Stage3D style={{ height: 360 }} label="3D preview of your tag and a counterfeit copy" camera={{ position: [0, 0.2, 5.4], fov: 38 }} bloom={0.8}
            overlay={<div className="hud" style={{ top: 12, left: 14 }}>tilt <b>{tilt}&deg;</b>{wet > 0.05 ? <> &middot; <b>breath on the tag</b></> : null}</div>}>
            <Backdrop top="#0f1a2e" halo="#2a4a7a" haloDir={[0, 0.1, -1]} />
            <TagCard cells={cells} lutA={luts.A} lutB={luts.B} lutW={luts.W} tilt={tilt} wet={wet} x={attack ? -1.95 : 0} printed={null} label="YOUR TAG" />
            {attack && printed && <TagCard cells={cells} lutA={luts.A} lutB={luts.B} lutW={luts.W} tilt={tilt} wet={wet} x={1.95} printed={printed} label={`PRINTED COPY · SCANNED AT ${scanAt}°`} />}
            <CamZ z={attack ? 8.6 : 5.4} />
          </Stage3D>
          <div className="row">
            <div style={{ flex: 1, minWidth: 180 }}><Range label="Tilt" value={tilt} min={0} max={60} onChange={(v) => { setWobble(false); setTilt(v); }} fmt={(v) => v + "°"} /></div>
            <button className="btn sm" aria-pressed={wobble} onClick={() => setWobble((w) => !w)}>{wobble ? <Pause size={14} /> : <Play size={14} />} Wobble</button>
            <button className="btn sm" disabled={breath} onClick={() => { bT.current = 0; setBreath(true); }}><Wind size={14} /> Breathe</button>
          </div>
          <Readouts items={[["Background", cA0.hex], ["Image", cB0.hex], ["Contrast now", colourDiff(cA0, cB0).toFixed(0)]]} />
          <div className="panel stack" style={{ gap: 12 }}>
            <div className="row" style={{ justifyContent: "space-between" }}><p className="eyebrow">3 · Attack it</p>
              <button className={"btn sm" + (attack ? "" : " primary")} onClick={() => setAttack((a) => !a)}>{attack ? "Remove the copy" : <><Printer size={13} /> Make a counterfeit</>}</button></div>
            {attack ? <>
              <Range label={<span className="row" style={{ gap: 6 }}><ScanLine size={13} /> Scanner angle</span>} value={scanAt} min={0} max={50} onChange={setScanAt} fmt={(v) => v + "°"} />
              <Plot label="How well the copy matches the genuine tag at each angle" height={140} opts={{
                x: [0, 60], y: [0, 105], xticks: [0, 20, 40, 60], yticks: [0, 50, 100], yfmt: (v) => v + "%", padL: 40, xlabel: "viewing angle (°)",
                series: [{ xs: angles, data: match, color: O.BAD, width: 2.4, fill: "rgba(255,90,110,.12)" }], markers: [{ x: scanAt, label: "scanned here", color: O.WARN }],
              }} />
              <p className="muted" style={{ fontSize: "var(--t-sm)" }}>The copy matches only near the angle it was scanned. Tilt both and watch the genuine tag move while the copy stays put. It also ignores your breath.</p>
            </> : <p className="muted" style={{ fontSize: "var(--t-sm)" }}><Sparkles size={13} style={{ verticalAlign: -2 }} /> A forger scans your tag at one angle and prints the colours it saw. Try it.</p>}
          </div>
        </section>
      </div>
      <div style={{ marginTop: 18 }}><Notes say="The auto-designer searches gap offsets for a pair of structures that match head-on but separate when tilted. That is how a latent image hides in plain sight." ask="Paint some vapour pits, then breathe. Why is a feature that only appears under a trigger harder to forge?" /></div>
    </main>
  );
}
