"use client";
import { motion } from "motion/react";
import { FlaskConical, HelpCircle, Play, ScanSearch, Square, Wind } from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { Notes, Plot, Range, Readouts, useCanvas, useRaf } from "@/components/ui";
import * as O from "@/lib/optics";
import { BASE, deltaR, pca, VAPOURS, type Vapour } from "./model";

const TAU_ON = 1.4, TAU_OFF = 0.9; // seconds; recovery to ~5% in about 2.7 s

export default function VapourLab() {
  const [vk, setVk] = useState("dmmp");
  const [frac, setFrac] = useState(0.6);
  const [flow, setFlow] = useState(false);
  const [theta, setTheta] = useState(0);
  const [mystery, setMystery] = useState<null | { v: Vapour; frac: number; revealed: boolean }>(null);
  const [score, setScore] = useState({ right: 0, tries: 0 });
  const [guess, setGuess] = useState<string | null>(null);
  const thRef = useRef(0), acc = useRef(0), mols = useRef<{ x: number; y: number; vx: number; vy: number; stuck: number; life: number }[]>([]);
  const v = mystery ? mystery.v : VAPOURS.find((x) => x.key === vk)!;
  const f = mystery ? mystery.frac : frac;
  const ppm = f * v.maxppm;
  const target = flow ? ppm / (ppm + v.K) : 0;

  // the live measurement: invert Langmuir to find the ppm that gives the current coverage
  const effPpm = theta >= 0.999 ? ppm : (v.K * theta) / (1 - theta);
  const meas = useMemo(() => deltaR(theta > 0.001 ? v : null, effPpm), [v, effPpm, theta]);

  const model = useMemo(() => {
    const X: Float32Array[] = [], lab: string[] = [];
    for (const vv of VAPOURS) for (const ff of [0.15, 0.3, 0.5, 0.7, 0.9, 1.0]) for (let r = 0; r < 4; r++) { X.push(deltaR(vv, ff * vv.maxppm, 0.004).d); lab.push(vv.key); }
    const P = pca(X, 2);
    const pts = X.map((x, i) => ({ p: P.project(x), k: lab[i] }));
    const origin = P.project(new Float32Array(O.WL.length));
    const cent = VAPOURS.map((vv) => { const s = pts.filter((q) => q.k === vv.key); return { k: vv.key, c: [s.reduce((a, q) => a + q.p[0], 0) / s.length, s.reduce((a, q) => a + q.p[1], 0) / s.length] }; });
    return { P, pts, origin, cent };
  }, []);

  const live = model.P.project(meas.d);
  const dv = [live[0] - model.origin[0], live[1] - model.origin[1]], mag = Math.hypot(dv[0], dv[1]);
  const ranked = model.cent.map((c) => {
    const cv = [c.c[0] - model.origin[0], c.c[1] - model.origin[1]];
    const cos = (dv[0] * cv[0] + dv[1] * cv[1]) / (mag * Math.hypot(cv[0], cv[1]) + 1e-9);
    return { k: c.k, cos };
  }).sort((a, b) => b.cos - a.cos);
  const identified = mag > 0.03 ? VAPOURS.find((x) => x.key === ranked[0].k)! : null;
  const confidence = identified ? Math.max(0, Math.min(1, (ranked[0].cos - ranked[1].cos) * 4 + 0.5)) : 0;

  useRaf((_t, dt) => {
    const tau = target > thRef.current ? TAU_ON : TAU_OFF;
    thRef.current += (target - thRef.current) * (1 - Math.exp(-dt / tau));
    if (Math.abs(thRef.current - target) < 1e-4) thRef.current = target;
    acc.current += dt;
    if (acc.current > 0.08) { acc.current = 0; setTheta(thRef.current); }
    // molecules
    const M = mols.current;
    if (flow && M.length < 260 && Math.random() < 0.9) M.push({ x: -0.02, y: 0.15 + Math.random() * 0.7, vx: 0.25 + Math.random() * 0.2, vy: (Math.random() - 0.5) * 0.1, stuck: 0, life: 0 });
    for (const m of M) {
      m.life += dt;
      if (m.stuck > 0) { if (!flow && Math.random() < dt / TAU_OFF) m.stuck = 0, m.vx = 0.4, m.vy = -0.3; continue; }
      m.x += m.vx * dt; m.y += m.vy * dt + Math.sin(m.life * 6) * 0.002;
      if (flow && m.x > 0.3 && m.x < 0.95 && Math.random() < dt * 2.2 * thRef.current * (m.y > 0.5 ? v.bottom : v.top)) m.stuck = 1;
    }
    mols.current = M.filter((m) => m.x < 1.05 && m.y > -0.05 && m.y < 1.05);
    if (chamber.current) drawChamber(chamber.current);
  });

  const drawChamber = (cv: HTMLCanvasElement) => {
    const { ctx: g, w, h } = O.setupCanvas(cv);
    const bg = g.createLinearGradient(0, 0, w, h); bg.addColorStop(0, "#070b12"); bg.addColorStop(1, "#0b1220");
    g.fillStyle = bg; g.fillRect(0, 0, w, h);
    // lamella trees
    for (const cx of [0.42, 0.72]) {
      g.fillStyle = "#b8996a"; g.fillRect(cx * w - 3, h * 0.08, 6, h * 0.84);
      for (let k = 0; k < 8; k++) for (const s of [-1, 1]) {
        const y = h * 0.1 + k * h * 0.1 + (s > 0 ? h * 0.05 : 0);
        const gr = g.createLinearGradient(0, y, 0, y + 7); gr.addColorStop(0, "#ecd5a3"); gr.addColorStop(1, "#9c7f52");
        g.fillStyle = gr; g.beginPath(); g.roundRect(s > 0 ? cx * w + 3 : cx * w - 3 - w * 0.11 * (1 - k * 0.03), y, w * 0.11 * (1 - k * 0.03), 7, 3); g.fill();
      }
    }
    // vapour condensed in the gaps: a tint whose strength follows coverage
    g.fillStyle = v.color + Math.round(Math.min(1, thRef.current * 1.4) * 70).toString(16).padStart(2, "0");
    g.fillRect(0.28 * w, h * 0.08, 0.6 * w, h * 0.84);
    for (const m of mols.current) {
      g.fillStyle = v.color; g.globalAlpha = m.stuck ? 0.95 : 0.6;
      g.beginPath(); g.arc(m.x * w, m.y * h, m.stuck ? 3 : 2.4, 0, 6.3); g.fill();
    }
    g.globalAlpha = 1;
    // lamp and fibre
    g.strokeStyle = "rgba(255,230,160,.35)"; g.lineWidth = 3; g.beginPath(); g.moveTo(w * 0.57, 0); g.lineTo(w * 0.57, h * 0.08); g.stroke();
    g.font = '11px "IBM Plex Mono", monospace'; g.fillStyle = "#8796aa";
    g.fillText(flow ? `${v.name} in →` : "clean air", 10, 18);
    g.fillText(`coverage ${(thRef.current * 100).toFixed(0)}% · 25 °C, no heater`, 10, h - 10);
  };
  const chamber = useCanvas(drawChamber, [v, flow]);

  const pcaRef = useCanvas((cv) => {
    const { ctx: g, w, h } = O.setupCanvas(cv);
    g.fillStyle = "#070a10"; g.fillRect(0, 0, w, h);
    const all = model.pts.map((p) => p.p);
    const xs = all.map((p) => p[0]), ys = all.map((p) => p[1]);
    const x0 = Math.min(...xs, model.origin[0]) - 0.05, x1 = Math.max(...xs) + 0.05, y0 = Math.min(...ys) - 0.05, y1 = Math.max(...ys) + 0.05;
    const X = (x: number) => 30 + ((x - x0) / (x1 - x0)) * (w - 44), Y = (y: number) => h - 26 - ((y - y0) / (y1 - y0)) * (h - 40);
    g.strokeStyle = "#18212d"; g.beginPath(); g.moveTo(30, Y(0)); g.lineTo(w - 10, Y(0)); g.moveTo(X(0), 10); g.lineTo(X(0), h - 24); g.stroke();
    // rays from clean air through each cluster: concentration moves you along the ray, identity is the direction
    for (const c of model.cent) {
      const vv = VAPOURS.find((x) => x.key === c.k)!;
      g.strokeStyle = vv.color + "33"; g.setLineDash([3, 4]); g.beginPath(); g.moveTo(X(model.origin[0]), Y(model.origin[1])); g.lineTo(X(c.c[0] + (c.c[0] - model.origin[0]) * 0.6), Y(c.c[1] + (c.c[1] - model.origin[1]) * 0.6)); g.stroke(); g.setLineDash([]);
    }
    for (const p of model.pts) { const vv = VAPOURS.find((x) => x.key === p.k)!; g.fillStyle = vv.color; g.globalAlpha = 0.75; g.beginPath(); g.arc(X(p.p[0]), Y(p.p[1]), 3.2, 0, 6.3); g.fill(); }
    g.globalAlpha = 1;
    g.fillStyle = "#e4ebf3"; g.beginPath(); g.arc(X(model.origin[0]), Y(model.origin[1]), 4, 0, 6.3); g.fill();
    // live reading
    const lx = X(live[0]), ly = Y(live[1]);
    g.strokeStyle = "#fff"; g.lineWidth = 1.5; g.shadowColor = "#fff"; g.shadowBlur = 12;
    g.beginPath(); g.arc(lx, ly, 8, 0, 6.3); g.stroke(); g.beginPath(); g.moveTo(lx - 13, ly); g.lineTo(lx + 13, ly); g.moveTo(lx, ly - 13); g.lineTo(lx, ly + 13); g.stroke(); g.shadowBlur = 0;
    g.font = '10.5px "IBM Plex Mono", monospace'; g.fillStyle = "#8796aa";
    g.fillText(`PC1 ${(model.P.explained[0] * 100).toFixed(1)}%`, w - 90, h - 8);
    g.save(); g.translate(12, 70); g.rotate(-Math.PI / 2); g.fillText(`PC2 ${(model.P.explained[1] * 100).toFixed(1)}%`, 0, 0); g.restore();
    g.fillText("clean air", X(model.origin[0]) + 7, Y(model.origin[1]) - 6);
  }, [live[0], live[1]]);

  const startMystery = () => {
    const vv = VAPOURS[Math.floor(Math.random() * VAPOURS.length)];
    setMystery({ v: vv, frac: 0.35 + Math.random() * 0.6, revealed: false }); setGuess(null); setFlow(false);
  };
  const reveal = () => {
    if (!mystery) return;
    setMystery({ ...mystery, revealed: true });
    setScore((s) => ({ right: s.right + (guess === mystery.v.key ? 1 : 0), tries: s.tries + 1 }));
  };

  return (
    <main className="wrap" style={{ paddingBottom: 30 }}>
      <div className="vl-grid">
        <section className="panel stack" style={{ gap: 12 }}>
          <div className="row" style={{ justifyContent: "space-between" }}><p className="eyebrow"><FlaskConical size={12} style={{ verticalAlign: -1 }} /> Exposure chamber</p>
            {mystery && !mystery.revealed ? <span className="chip warn"><HelpCircle size={12} /> mystery vial loaded</span> : null}</div>
          <canvas ref={chamber} className="cv" style={{ height: 260, borderRadius: 10 }} role="img" aria-label="Vapour molecules condensing on wing lamellae" />
          <div className="vap-row" role="group" aria-label="Vapour">
            {VAPOURS.map((x) => (
              <button key={x.key} disabled={!!mystery && !mystery.revealed} className={"vap" + (x.key === vk && !mystery ? " on" : "")} style={{ ["--c" as string]: x.color }} onClick={() => { setVk(x.key); setMystery(null); }}>
                <i />{x.name}{x.cwa && <small>CWA simulant</small>}
              </button>
            ))}
          </div>
          {!mystery && <Range label="Concentration" value={frac} min={0.05} max={1} step={0.01} onChange={setFrac} fmt={() => Math.round(ppm).toLocaleString("en-IN") + " ppm"} />}
          <div className="row">
            <button className={"btn" + (flow ? "" : " primary")} onClick={() => setFlow((x) => !x)}>{flow ? <><Square size={14} /> Purge with clean air</> : <><Play size={14} /> Expose the wing</>}</button>
            <button className="btn ghost" onClick={startMystery}><HelpCircle size={15} /> Mystery vial</button>
          </div>
        </section>

        <section className="panel stack" style={{ gap: 10 }}>
          <p className="eyebrow">Spectrograph</p>
          <Plot label="Reflectance now and in clean air" height={170} opts={{ spectral: true, yticks: [0, 0.5, 1], series: [{ data: BASE, color: O.MUTED, width: 1.2, dash: [4, 3] }, { data: meas.R, color: O.INK, fill: "spectral", fillAlpha: 0.5 }] }} />
          <Plot label="Change in reflectance" height={150} opts={{ spectral: true, y: [-1, 1], yticks: [-1, 0, 1], yfmt: (x) => (x > 0 ? "+" : "") + Math.round(x * 100) + "%", series: [{ data: meas.d, color: v.color, width: 2.2, fill: v.color + "33" }] }} />
          <Readouts items={[["Coverage", Math.round(theta * 100), "%"], ["Peak shift", O.peak(meas.R, 380, 780).lambda - O.peak(BASE, 380, 780).lambda, "nm"], ["Recovery", "2–3", "s"]]} />
        </section>

        <section className="panel stack" style={{ gap: 10 }}>
          <div className="row" style={{ justifyContent: "space-between" }}><p className="eyebrow"><ScanSearch size={12} style={{ verticalAlign: -1 }} /> Principal component analysis</p><span className="chip">{((model.P.explained[0] + model.P.explained[1]) * 100).toFixed(1)}% variance</span></div>
          <canvas ref={pcaRef} className="cv" style={{ height: 250, borderRadius: 10 }} role="img" aria-label="PCA scatter of calibration vapours with the live reading" />
          <div className="legend">{VAPOURS.map((x) => <span key={x.key}><i style={{ background: x.color }} />{x.name}</span>)}</div>
          <motion.div className="ident" animate={{ borderColor: identified ? identified.color : "#1d2734" }}>
            {identified ? <>
              <span className="eyebrow">Identified</span>
              <b style={{ color: identified.color }}>{mystery && !mystery.revealed ? "Reading…" : identified.name}</b>
              <i className="conf"><b style={{ width: confidence * 100 + "%", background: identified.color }} /></i>
            </> : <span className="muted">Expose the wing to get a reading. Clean air sits at the white dot.</span>}
          </motion.div>
          {mystery && (
            <div className="stack" style={{ gap: 8 }}>
              <p className="muted" style={{ fontSize: "var(--t-sm)" }}>Expose the wing to the mystery vial, read the PCA plot, then make your call.</p>
              <div className="row">{VAPOURS.map((x) => <button key={x.key} className="btn sm" disabled={mystery.revealed} aria-pressed={guess === x.key} onClick={() => setGuess(x.key)}>{x.name}</button>)}</div>
              {!mystery.revealed ? <button className="btn primary" disabled={!guess} onClick={reveal}>Reveal the vial</button>
                : <p style={{ fontSize: "var(--t-sm)" }}><b style={{ color: guess === mystery.v.key ? "var(--good)" : "var(--bad)" }}>{guess === mystery.v.key ? "Correct." : "Not quite."}</b> It was {mystery.v.name} at {Math.round(mystery.frac * mystery.v.maxppm).toLocaleString("en-IN")} ppm. Score {score.right}/{score.tries}. <button className="btn sm ghost" onClick={startMystery}>Another vial</button></p>}
            </div>
          )}
        </section>
      </div>
      <div style={{ marginTop: 18 }}>
        <Notes say="Same direction, further out means more concentrated. A different direction means a different molecule. That is all PCA is doing here: finding the two directions in which the 81-point spectra differ most." ask="DMMP and dichloropentane have similar refractive indices. Why do they still separate?" show="Purge after exposing: the reading is back at clean air in two to three seconds, against 70 to 90 seconds for a heated metal-oxide sensor." />
      </div>
      <p className="faint" style={{ fontSize: "var(--t-xs)", marginTop: 10 }}><Wind size={11} style={{ verticalAlign: -1 }} /> Teaching model: refractive indices are real; uptake constants and depth preferences are chosen to reproduce the reported behaviour (selective, ppm-level, 2&ndash;3 s recovery), not fitted to one paper.</p>
    </main>
  );
}
