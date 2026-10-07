"use client";
import { useMemo, useRef, useState } from "react";
import * as O from "@/lib/optics";
import { Plot, Range, Readouts, useCanvas, useRaf } from "../ui";

const NC = 1.56, DC = 75, DA = 110;
const OPD = 2 * (NC * DC + 1.0 * DA); // optical path difference per shelf, normal incidence

function brightness(lambda: number, N: number) {
  const dphi = (2 * Math.PI * OPD) / lambda;
  let re = 0, im = 0;
  for (let k = 0; k < N; k++) { const a = Math.pow(0.93, k); re += a * Math.cos(k * dphi); im += a * Math.sin(k * dphi); }
  let norm = 0; for (let k = 0; k < N; k++) norm += Math.pow(0.93, k);
  return (re * re + im * im) / (norm * norm);
}

export default function Waves() {
  const [lam, setLam] = useState(455);
  const [N, setN] = useState(6);
  const t = useRef(0);
  const frac = OPD / lam;
  const off = Math.abs(frac - Math.round(frac));
  const B = brightness(lam, N);
  const verdict = off < 0.08 ? ["Constructive", "good"] : off > 0.38 ? ["Destructive", "bad"] : ["Partial", "warn"];

  const draw = (cv: HTMLCanvasElement) => {
    const { ctx: g, w: W, h: H } = O.setupCanvas(cv);
    g.clearRect(0, 0, W, H);
    const col = O.wlColor(lam);
    const leftW = Math.min(220, W * 0.32);
    const rows = N + 1, rowH = (H - 30) / (rows + 0.6);
    // stack diagram
    const top = 30, gap = (H - 60) / 10;
    for (let k = 0; k < N; k++) {
      g.fillStyle = `rgba(216,180,110,${0.85 - k * 0.05})`; g.fillRect(16, top + k * gap, leftW - 40, gap * 0.4);
      g.fillStyle = "#56637a"; g.font = '10px "IBM Plex Mono", monospace'; g.fillText(String(k + 1), 2, top + k * gap + gap * 0.35);
    }
    g.fillStyle = "#8796aa"; g.font = '11px "IBM Plex Mono", monospace';
    g.fillText("chitin 75 nm / air 110 nm", 16, H - 10);
    // rays to each shelf
    for (let k = 0; k < N; k++) {
      const x = 30 + k * ((leftW - 70) / Math.max(1, N - 1)), y = top + k * gap;
      g.strokeStyle = "rgba(255,255,255,.35)"; g.lineWidth = 1; g.beginPath(); g.moveTo(x - 14, 4); g.lineTo(x, y); g.stroke();
      g.strokeStyle = O.wlColor(lam, 0.8 * Math.pow(0.93, k)); g.lineWidth = 1.6; g.beginPath(); g.moveTo(x, y); g.lineTo(x + 14, 4); g.stroke();
    }
    // reflected waves, one row per shelf, then their sum
    const x0 = leftW + 10, ww = W - x0 - 12;
    const kx = (2 * Math.PI) / 90; // display wavelength in px
    const dphi = (2 * Math.PI * OPD) / lam;
    const sum = new Float32Array(Math.ceil(ww));
    for (let k = 0; k < N; k++) {
      const yc = 18 + rowH * (k + 0.5), a = Math.pow(0.93, k) * rowH * 0.34;
      g.strokeStyle = "rgba(29,39,52,1)"; g.lineWidth = 1; g.beginPath(); g.moveTo(x0, yc); g.lineTo(x0 + ww, yc); g.stroke();
      g.strokeStyle = O.wlColor(lam, 0.9); g.lineWidth = 1.6; g.beginPath();
      for (let x = 0; x < ww; x++) {
        const v = Math.sin(kx * x - t.current * 3 + k * dphi) * Math.pow(0.93, k);
        sum[x] += v;
        const y = yc - v * (a / Math.pow(0.93, k));
        if (x) g.lineTo(x0 + x, y); else g.moveTo(x0 + x, y);
      }
      g.stroke();
      g.fillStyle = "#56637a"; g.font = '10px "IBM Plex Mono", monospace';
      g.fillText("from shelf " + (k + 1) + "  +" + Math.round(((k * dphi * 180) / Math.PI) % 360) + "°", x0 + 4, yc - rowH * 0.36);
    }
    const ys = 18 + rowH * (N + 0.9), amp = rowH * 0.7 / N;
    g.strokeStyle = "#2a3646"; g.beginPath(); g.moveTo(x0, ys); g.lineTo(x0 + ww, ys); g.stroke();
    g.strokeStyle = col; g.lineWidth = 3; g.shadowColor = col; g.shadowBlur = 12 * B; g.beginPath();
    for (let x = 0; x < ww; x++) { const y = ys - sum[x] * amp; if (x) g.lineTo(x0 + x, y); else g.moveTo(x0 + x, y); }
    g.stroke(); g.shadowBlur = 0;
    g.fillStyle = "#e4ebf3"; g.font = '600 11px "IBM Plex Mono", monospace'; g.fillText("SUM = what your eye receives", x0 + 4, ys - rowH * 0.8);
  };
  const ref = useCanvas(draw, [lam, N]);
  useRaf((_t, dt) => { t.current += dt; if (ref.current) draw(ref.current); });

  const curve = useMemo(() => {
    const xs: number[] = [], ys: number[] = [];
    for (let l = 380; l <= 780; l += 2) { xs.push(l); ys.push(brightness(l, N)); }
    return { xs, ys };
  }, [N]);

  return (
    <div className="split">
      <div className="stack">
        <div className="stage" style={{ height: "min(64svh, 540px)" }}>
          <canvas ref={ref} className="cv" style={{ height: "100%" }} role="img" aria-label="Reflected waves from each shelf and their sum" />
        </div>
      </div>
      <div className="stack">
        <Range label="Wavelength of the light" value={lam} min={380} max={750} onChange={setLam} fmt={(v) => <span style={{ color: O.wlColor(v) }}>{v} nm</span>} />
        <Range label="Number of shelves" value={N} min={1} max={10} onChange={setN} />
        <div className="row"><span className={"chip " + verdict[1]}>{verdict[0]} interference</span></div>
        <Readouts items={[
          ["Extra path per shelf", OPD.toFixed(0), "nm"],
          ["Path ÷ wavelength", frac.toFixed(2), "λ"],
          ["Brightness", Math.round(B * 100), "%"],
        ]} />
        <div className="panel" style={{ padding: 12 }}>
          <Plot label="Brightness against wavelength" height={180} opts={{
            spectral: true, y: [0, 1], yticks: [0, 0.5, 1], xlabel: "wavelength (nm)",
            series: [{ xs: curve.xs, data: curve.ys, color: "#e4ebf3", width: 1.6, fill: "spectral", fillAlpha: 0.5 }],
            markers: [{ x: lam, label: lam + " nm", color: O.wlColor(lam) }],
          }} />
        </div>
        <div className="formula">2 (n<sub>c</sub>d<sub>c</sub> + n<sub>a</sub>d<sub>a</sub>) = m&lambda; <span className="dim">&rarr; 2(1.56&middot;75 + 1&middot;110) = {OPD.toFixed(0)} nm</span></div>
      </div>
    </div>
  );
}
