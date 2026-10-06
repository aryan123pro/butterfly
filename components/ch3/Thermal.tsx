"use client";
import { Eye, Hand, Thermometer } from "lucide-react";
import { useMemo, useRef, useState } from "react";
import * as O from "@/lib/optics";
import { Readouts, Seg, useCanvas, useRaf } from "../ui";

type Sensor = "conv" | "morpho";
const SPEC = {
  conv: { name: "Uncooled microbolometer", netd: 0.04, fps: 120, cols: 120, rows: 76, pixel: "17 × 17 µm" },
  morpho: { name: "Morpho-inspired (CNT-doped scales)", netd: 0.0029, fps: 200, cols: 48, rows: 30, pixel: "50 × 100 µm" },
};
const SLOWMO = 8; // show sensor frames 8x slower than real time, so the frame-rate difference is visible

// inferno-like palette
const PAL = [[0, 0, 4], [40, 11, 84], [101, 21, 110], [159, 42, 99], [212, 72, 66], [245, 125, 21], [250, 193, 39], [252, 255, 164]];
function pal(t: number) {
  const x = Math.max(0, Math.min(0.9999, t)) * (PAL.length - 1), i = Math.floor(x), f = x - i;
  const a = PAL[i], b = PAL[i + 1];
  return [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f, a[2] + (b[2] - a[2]) * f];
}
function gauss() { let u = 0, v = 0; while (!u) u = Math.random(); while (!v) v = Math.random(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); }

export default function Thermal() {
  const [sensor, setSensor] = useState<Sensor>("morpho");
  const [view, setView] = useState<"false" | "raw">("false");
  const [hunt, setHunt] = useState(false);
  const hand = useRef({ x: 0.62, y: 0.45, on: false });
  const trail = useRef<{ x: number; y: number; t: number }[]>([]);
  const frame = useRef<Float32Array | null>(null);
  const clock = useRef({ t: 0, next: 0 });
  const S = SPEC[sensor];

  // Morpho raw colour: the lamella gap shrinks as the pixel warms; map scene temperature to that shift (exaggerated)
  const raw = useMemo(() => Array.from({ length: 64 }, (_, i) => O.color(O.spectrum(O.morphoStack({ da: 112 - i * 0.55 }), 0)).rgb.map((v) => v * 255)), []);

  const sceneT = (x: number, y: number, t: number) => {
    let T = 22 + 0.6 * y; // table, slightly warmer toward the front
    const mug = ((x - 0.22) / 0.09) ** 2 + ((y - 0.62) / 0.13) ** 2;
    if (mug < 1) T = 58 - 6 * mug; else if (mug < 1.6) T = Math.max(T, 30 - 8 * (mug - 1));
    if (((x - 0.22) / 0.03) ** 2 + ((y - 0.38) / 0.12) ** 2 < 1 && y < 0.5) T = Math.max(T, 26 + 6 * Math.sin(t * 3 + y * 20)); // steam
    const bx = 0.85 + 0.1 * Math.sin(t * 2.2), by = 0.25; // a fast-moving warm motor part
    if ((x - bx) ** 2 + (y - by) ** 2 < 0.0025) T = 45;
    for (const p of trail.current) { const age = t - p.t, d = (x - p.x) ** 2 + (y - p.y) ** 2; if (d < 0.004) T += 0.03 * Math.exp(-age / 8) * (1 - d / 0.004); }
    if (hand.current.on) {
      const hx = hand.current.x, hy = hand.current.y;
      const palm = ((x - hx) / 0.075) ** 2 + ((y - hy) / 0.1) ** 2 < 1;
      let finger = false;
      for (let k = 0; k < 5; k++) { const fx = hx - 0.06 + k * 0.03, fy = hy - 0.14 + Math.abs(k - 2) * 0.02; if (((x - fx) / 0.012) ** 2 + ((y - fy) / 0.06) ** 2 < 1) finger = true; }
      if (palm || finger) T = 34;
    }
    return T;
  };

  const draw = (cv: HTMLCanvasElement) => {
    const { ctx: g, w, h } = O.setupCanvas(cv);
    const f = frame.current; if (!f) return;
    const pw = w / S.cols, ph = h / S.rows;
    const lo = hunt ? 21.98 : 20, hi = hunt ? 22.12 : 40;
    for (let j = 0; j < S.rows; j++) for (let i = 0; i < S.cols; i++) {
      const T = f[j * S.cols + i], t = (T - lo) / (hi - lo);
      let c: number[];
      if (view === "raw" && sensor === "morpho") c = raw[Math.max(0, Math.min(63, Math.round(t * 63)))];
      else c = pal(t);
      g.fillStyle = `rgb(${c[0] | 0},${c[1] | 0},${c[2] | 0})`;
      g.fillRect(i * pw, j * ph, pw + 0.6, ph + 0.6);
    }
    g.font = '600 11px "IBM Plex Mono", monospace'; g.fillStyle = "rgba(255,255,255,.85)";
    g.fillText(`${S.cols}×${S.rows} px · ${S.fps} Hz shown at 1/${SLOWMO} speed · range ${lo.toFixed(2)}–${hi.toFixed(2)} °C`, 10, h - 10);
  };
  const ref = useCanvas(draw, [sensor, view, hunt]);

  useRaf((_t, dt) => {
    const c = clock.current; c.t += dt;
    if (hand.current.on && (trail.current.length === 0 || c.t - trail.current[trail.current.length - 1].t > 0.15)) {
      trail.current.push({ x: hand.current.x, y: hand.current.y + 0.04, t: c.t });
      if (trail.current.length > 80) trail.current.shift();
    }
    if (c.t < c.next) return;
    c.next = c.t + SLOWMO / S.fps; // one sensor frame per 1/fps, shown in slow motion
    const n = S.cols * S.rows;
    if (!frame.current || frame.current.length !== n) frame.current = new Float32Array(n);
    const f = frame.current;
    for (let j = 0; j < S.rows; j++) for (let i = 0; i < S.cols; i++) f[j * S.cols + i] = sceneT((i + 0.5) / S.cols, (j + 0.5) / S.rows, c.t) + gauss() * S.netd;
    if (ref.current) draw(ref.current);
  });

  const onMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    hand.current = { x: (e.clientX - r.left) / r.width, y: (e.clientY - r.top) / r.height, on: true };
  };

  return (
    <div className="split">
      <div className="stack">
        <div className="stage" style={{ height: "min(56vh, 460px)", cursor: "none" }}>
          <canvas ref={ref} className="cv" style={{ height: "100%" }} onPointerMove={onMove} onPointerLeave={() => (hand.current.on = false)} role="img" aria-label="Simulated thermal camera view" />
          <div className="hud" style={{ top: 12, left: 14 }}><b>{S.name}</b><br />move your pointer over the scene: it is a warm hand</div>
        </div>
        <div className="row">
          <Seg label="Sensor" value={sensor} onChange={setSensor} options={[["conv", "Conventional uncooled"], ["morpho", "Morpho-inspired"]]} />
          <Seg label="View" value={view} onChange={setView} options={[["false", <span key="f" className="row" style={{ gap: 6 }}><Thermometer size={13} /> False colour</span>], ["raw", <span key="r" className="row" style={{ gap: 6 }}><Eye size={13} /> Raw wing colour</span>]]} />
          <button className="btn sm" aria-pressed={hunt} onClick={() => setHunt((x) => !x)}><Hand size={14} /> {hunt ? "Normal range" : "Find the handprint"}</button>
        </div>
        <p className="muted" style={{ fontSize: "var(--t-sm)" }}>
          {hunt
            ? sensor === "morpho"
              ? "Range narrowed to 0.14 °C. The 0.03 °C warmth your hand left on the table stands clear of the 2.9 mK noise."
              : "Range narrowed to 0.14 °C. With 40 mK of noise, the 0.03 °C handprint is buried. Switch sensors."
            : view === "raw" && sensor === "morpho"
            ? "This is what the visible camera actually records: the wing's colour, shifted by heat. Shift exaggerated so you can see it."
            : "Wave your hand, then press 'Find the handprint'."}
        </p>
      </div>
      <div className="stack">
        <div className="pixel-explain">
          <p className="eyebrow">How one pixel works</p>
          <ol>
            <li><b>Absorb.</b> Carbon nanotubes added to the chitin absorb infrared.</li>
            <li><b>Expand.</b> The shelves warm up and expand, so the air gaps between them change.</li>
            <li><b>Shift.</b> A different gap reinforces a different wavelength: the colour moves.</li>
            <li><b>Read.</b> An ordinary visible camera watches the colour change.</li>
          </ol>
        </div>
        <Readouts items={[["Smallest ΔT seen", sensor === "morpho" ? "2.9" : "40", "mK"], ["Frame rate", S.fps, "Hz"], ["Pixel", S.pixel]]} />
        <div className="tablewrap">
          <table className="data">
            <thead><tr><th>Metric</th><th>Conventional</th><th>Butterfly-inspired</th></tr></thead>
            <tbody>
              <tr><td>Temperature sensitivity</td><td className="lose">needs 40 mK</td><td className="win">needs 2.9 mK</td></tr>
              <tr><td>Response speed</td><td className="lose">120 Hz (uncooled)</td><td className="win">200 Hz</td></tr>
              <tr><td>Pixel area</td><td className="win">17 &times; 17 &micro;m</td><td className="lose">50 &times; 100 &micro;m</td></tr>
              <tr><td>Cooling</td><td>cryogenic for the best sensors</td><td className="win">none, room temperature</td></tr>
            </tbody>
          </table>
        </div>
        <div className="pc">
          <div className="panel"><ul><li>About 3 thousandths of a degree sensitivity</li><li>Fast: over 200 Hz</li><li>No cryogenic cooling</li></ul></div>
          <div className="panel cons"><ul><li>Output is a colour shift, so a second camera must read it</li><li>The shelves need room to expand</li><li>Hard to replicate</li></ul></div>
        </div>
      </div>
    </div>
  );
}
