"use client";
import { useMemo, useRef, useState } from "react";
import * as O from "@/lib/optics";
import { Range, Readouts, Seg, useCanvas, useRaf } from "../ui";

const LAMS = Array.from({ length: 51 }, (_, i) => 400 + i * 6);
const stack = O.morphoStack();
type Mode = "cd" | "morpho";

function rnd(i: number) { const x = Math.sin(i * 91.7 + 3.1) * 43758.5453; return x - Math.floor(x); }

/* Brightness an eye at viewing angle phi (deg) receives, as a spectrum over O.WL. */
function viewSpectrum(phi: number, d: number, mode: Mode, disorder: number) {
  const out = new Float32Array(O.WL.length);
  const sigma = mode === "morpho" ? 3 + disorder * 22 : 1.6;
  O.WL.forEach((lam, i) => {
    const w = mode === "morpho" ? O.reflectance(stack, lam, Math.min(70, Math.abs(phi))) : 0.55;
    let s = 0;
    for (const m of [-2, -1, 0, 1, 2]) {
      const sn = (m * lam) / (d * 1000);
      if (Math.abs(sn) > 1) continue;
      const th = (Math.asin(sn) * 180) / Math.PI;
      const amp = m === 0 ? (mode === "cd" ? 0.25 : 0.6) : Math.abs(m) === 1 ? 0.8 : 0.35;
      s += amp * Math.exp(-0.5 * ((phi - th) / sigma) ** 2);
    }
    out[i] = Math.min(1, w * s);
  });
  return out;
}

export default function Grating() {
  const [mode, setMode] = useState<Mode>("morpho");
  const [d, setD] = useState(0.8);
  const [dis, setDis] = useState(0.6);
  const t = useRef(0);

  const arc = useMemo(() => {
    const a: { phi: number; css: string; lum: number }[] = [];
    for (let phi = -80; phi <= 80; phi += 2) {
      const s = viewSpectrum(phi, d, mode, dis), c = O.color(s, 1.8);
      a.push({ phi, css: c.css, lum: c.lin[0] * 0.2 + c.lin[1] * 0.7 + c.lin[2] * 0.1 });
    }
    return a;
  }, [d, mode, dis]);

  const draw = (cv: HTMLCanvasElement) => {
    const { ctx: g, w: W, h: H } = O.setupCanvas(cv);
    const bg = g.createLinearGradient(0, 0, 0, H); bg.addColorStop(0, "#04060b"); bg.addColorStop(1, "#0a0f18");
    g.fillStyle = bg; g.fillRect(0, 0, W, H);
    const cx = W / 2, cy = H - 70, R = Math.min(W * 0.46, H - 110);
    // viewing arc: what an eye placed there would see
    arc.forEach((p) => {
      const a0 = ((-90 + p.phi - 1) * Math.PI) / 180, a1 = ((-90 + p.phi + 1) * Math.PI) / 180;
      g.strokeStyle = p.css; g.lineWidth = 18; g.globalAlpha = 0.25 + 0.75 * Math.min(1, p.lum * 3);
      g.beginPath(); g.arc(cx, cy, R + 16, a0, a1); g.stroke();
    });
    g.globalAlpha = 1;
    g.font = '10px "IBM Plex Mono", monospace'; g.fillStyle = "#56637a"; g.textAlign = "center";
    [-60, -30, 0, 30, 60].forEach((p) => {
      const a = ((-90 + p) * Math.PI) / 180;
      g.fillText(p + "°", cx + Math.cos(a) * (R + 40), cy + Math.sin(a) * (R + 40) + 4);
    });
    // diffracted rays, additive so overlapping colours mix like light
    g.globalCompositeOperation = "lighter";
    const flick = 0.85 + 0.15 * Math.sin(t.current * 3);
    LAMS.forEach((lam, li) => {
      const w = mode === "morpho" ? O.reflectance(stack, lam, 20) : 0.6;
      for (const m of [-2, -1, 1, 2]) {
        const sn = (m * lam) / (d * 1000);
        if (Math.abs(sn) > 1) continue;
        const th = Math.asin(sn);
        const reps = mode === "morpho" ? 4 : 1;
        for (let r = 0; r < reps; r++) {
          const jit = mode === "morpho" ? (rnd(li * 7 + r + m * 131) - 0.5) * dis * 0.7 : 0;
          const a = -Math.PI / 2 + th + jit;
          const alpha = (Math.abs(m) === 1 ? 0.5 : 0.22) * w * flick / Math.sqrt(reps);
          const grad = g.createLinearGradient(cx, cy, cx + Math.cos(a) * R, cy + Math.sin(a) * R);
          grad.addColorStop(0, O.wlColor(lam, alpha)); grad.addColorStop(1, O.wlColor(lam, 0));
          g.strokeStyle = grad; g.lineWidth = 2.2;
          g.beginPath(); g.moveTo(cx, cy); g.lineTo(cx + Math.cos(a) * R, cy + Math.sin(a) * R); g.stroke();
        }
      }
    });
    // specular (m = 0) reflection back up the beam
    const spec = g.createLinearGradient(cx, cy, cx, cy - R);
    spec.addColorStop(0, mode === "morpho" ? O.wlColor(455, 0.55) : "rgba(255,255,255,.35)"); spec.addColorStop(1, "rgba(0,0,0,0)");
    g.strokeStyle = spec; g.lineWidth = 8; g.beginPath(); g.moveTo(cx + 6, cy); g.lineTo(cx + 6, cy - R); g.stroke();
    g.globalCompositeOperation = "source-over";
    // incoming white beam
    const inc = g.createLinearGradient(cx, 0, cx, cy);
    inc.addColorStop(0, "rgba(255,255,255,0)"); inc.addColorStop(1, "rgba(255,255,255,.9)");
    g.strokeStyle = inc; g.lineWidth = 4; g.beginPath(); g.moveTo(cx - 6, 10); g.lineTo(cx - 6, cy); g.stroke();
    // the surface: ridges drawn to scale against d
    const px = Math.max(5, Math.min(30, 22 * d));
    for (let x = -W / 2; x < W / 2; x += px) {
      const hgt = mode === "morpho" ? 14 + (rnd(Math.round(x)) - 0.5) * 12 * dis : 10;
      const gr = g.createLinearGradient(0, cy, 0, cy + hgt + 10);
      gr.addColorStop(0, mode === "morpho" ? "#4f9dff" : "#c8d0dc"); gr.addColorStop(1, "#0b1424");
      g.fillStyle = gr; g.beginPath(); g.roundRect(cx + x - px * 0.2, cy + 2, px * 0.4, hgt, 3); g.fill();
    }
    g.fillStyle = "#0b1424"; g.fillRect(0, cy + 16, W, H - cy);
    g.fillStyle = "#8796aa"; g.textAlign = "left"; g.font = '11px "IBM Plex Mono", monospace';
    g.fillText(mode === "morpho" ? "Morpho ridges: multilayer + uneven heights" : "CD: regular grooves, no multilayer", 14, H - 16);
    g.textAlign = "right"; g.fillText("ring = colour seen from each direction", W - 14, H - 16);
  };
  const ref = useCanvas(draw, [mode, d, dis, arc]);
  useRaf((_t, dt) => { t.current += dt; if (ref.current) draw(ref.current); });

  const ang = (lam: number) => { const s = lam / (d * 1000); return Math.abs(s) <= 1 ? Math.round((Math.asin(s) * 180) / Math.PI) + "°" : "none"; };

  return (
    <div className="split">
      <div className="stage" style={{ height: "min(64vh, 520px)" }}>
        <canvas ref={ref} className="cv" style={{ height: "100%" }} role="img" aria-label="Diffraction fan from a ridged surface" />
      </div>
      <div className="stack">
        <div className="ctrl"><span className="lbl"><span>Surface</span></span>
          <Seg label="Surface" value={mode} onChange={setMode} options={[["cd", "CD / ordinary grating"], ["morpho", "Morpho wing"]]} />
        </div>
        <Range label="Ridge spacing d" value={d} min={0.5} max={2} step={0.05} onChange={setD} fmt={(v) => v.toFixed(2) + " µm"} />
        {mode === "morpho" && <Range label="Disorder in ridge height" value={dis} min={0} max={1} step={0.05} onChange={setDis} fmt={(v) => Math.round(v * 100) + "%"} />}
        <Readouts items={[["1st order, 455 nm", ang(455)], ["1st order, 650 nm", ang(650)], ["Spacing", (d * 1000).toFixed(0), "nm"]]} />
        <div className="formula">d sin&theta;<sub>m</sub> = m&lambda; <span className="dim">&rarr; each colour leaves at its own angle</span></div>
        <div className="callout">
          <b>Why the Morpho does not look like a CD.</b> A CD splits white light into a rainbow because every groove is identical. The Morpho
          ridges differ slightly in height, and the shelves only reflect blue in the first place. The result is one blue spread over a wide
          range of angles, which is why the wing looks blue from almost anywhere.
        </div>
      </div>
    </div>
  );
}
