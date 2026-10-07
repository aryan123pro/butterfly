"use client";
import { motion } from "motion/react";
import { FlaskConical, HelpCircle, Layers, Play, ScanSearch, Square } from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { Notes, Plot, Range, Readouts, useCanvas, useRaf } from "@/components/ui";
import * as O from "@/lib/optics";
import { BASE, calibration, deltaR, P_MAX, P_MIN, pca, uptake, VAPOURS, type Vapour } from "./model";

const SPEED = 10; // simulated seconds per real second
const TAU_ON = 18; // simulated seconds: the change is visible well inside a minute, as reported

export default function VapourLab() {
  const [vk, setVk] = useState("dmmp");
  const [x, setX] = useState(0.25);
  const [flow, setFlow] = useState(false);
  const [coated, setCoated] = useState(false);
  const [theta, setTheta] = useState(0);
  const [simT, setSimT] = useState(0);
  const [mystery, setMystery] = useState<null | { v: Vapour; x: number; revealed: boolean }>(null);
  const [score, setScore] = useState({ right: 0, tries: 0 });
  const [guess, setGuess] = useState<string | null>(null);
  const thRef = useRef(0), tRef = useRef(0), acc = useRef(0);
  const mols = useRef<{ x: number; y: number; vx: number; vy: number; stuck: number; life: number }[]>([]);
  const v = mystery ? mystery.v : VAPOURS.find((q) => q.key === vk)!;
  const rel = mystery ? mystery.x : x;
  const ppm = rel * v.p0;
  const target = flow ? uptake(v, rel, coated) : 0;

  const meas = useMemo(() => deltaR(theta > 0.001 ? v : null, theta, coated), [v, theta, coated]);

  const model = useMemo(() => {
    const { X, lab } = calibration(coated);
    const P = pca(X, 3);
    const pts = X.map((q, i) => ({ p: P.project(q), k: lab[i] }));
    const origin = P.project(new Float32Array(O.WL.length));
    const cent = VAPOURS.map((vv) => { const s = pts.filter((q) => q.k === vv.key); return { k: vv.key, c: [s.reduce((a, q) => a + q.p[0], 0) / s.length, s.reduce((a, q) => a + q.p[1], 0) / s.length] }; });
    // unit-length calibration spectra: identity is the shape of ΔR, concentration mostly its size
    const unit = X.map((q) => { const n = Math.hypot(...q) || 1; return q.map((u) => u / n); });
    return { P, pts, origin, cent, unit, lab };
  }, [coated]);

  const live = model.P.project(meas.d);
  const dv = [live[0] - model.origin[0], live[1] - model.origin[1]], mag = Math.hypot(dv[0], dv[1]);
  // nearest calibration spectrum by shape (cosine over all 81 wavelengths), best per vapour
  const mn = Math.hypot(...meas.d) || 1;
  const ranked = VAPOURS.map((vv) => {
    let best = -1;
    model.unit.forEach((u, i) => { if (model.lab[i] !== vv.key) return; let c = 0; for (let j = 0; j < u.length; j++) c += u[j] * meas.d[j]; best = Math.max(best, c / mn); });
    return { k: vv.key, cos: best };
  }).sort((a, b) => b.cos - a.cos);
  const identified = mag > 0.02 ? VAPOURS.find((q) => q.key === ranked[0].k)! : null;
  const confidence = identified ? Math.max(0.05, Math.min(1, (ranked[0].cos - ranked[1].cos) * 25)) : 0;

  useRaf((_t, dt) => {
    const sdt = dt * SPEED;
    const tau = target > thRef.current ? TAU_ON : v.tauOff;
    thRef.current += (target - thRef.current) * (1 - Math.exp(-sdt / tau));
    if (Math.abs(thRef.current - target) < 1e-4) thRef.current = target;
    if (flow || thRef.current > 0.002) tRef.current += sdt;
    acc.current += dt;
    if (acc.current > 0.08) { acc.current = 0; setTheta(thRef.current); setSimT(tRef.current); }
    const M = mols.current;
    if (flow && M.length < 260 && Math.random() < 0.9) M.push({ x: -0.02, y: 0.15 + Math.random() * 0.7, vx: 0.25 + Math.random() * 0.2, vy: (Math.random() - 0.5) * 0.1, stuck: 0, life: 0 });
    for (const m of M) {
      m.life += dt;
      if (m.stuck > 0) { if (!flow && Math.random() < sdt / v.tauOff) { m.stuck = 0; m.vx = 0.4; m.vy = -0.3; } continue; }
      m.x += m.vx * dt; m.y += m.vy * dt + Math.sin(m.life * 6) * 0.002;
      const pref = coated ? 0.6 : m.y < 0.5 ? v.top : v.bottom;
      if (flow && m.x > 0.3 && m.x < 0.95 && Math.random() < dt * 2.4 * thRef.current * pref) m.stuck = 1;
    }
    mols.current = M.filter((m) => m.x < 1.05 && m.y > -0.05 && m.y < 1.05);
    if (chamber.current) drawChamber(chamber.current);
  });

  const drawChamber = (cv: HTMLCanvasElement) => {
    const { ctx: g, w, h } = O.setupCanvas(cv);
    const bg = g.createLinearGradient(0, 0, w, h); bg.addColorStop(0, "#070b12"); bg.addColorStop(1, "#0b1220");
    g.fillStyle = bg; g.fillRect(0, 0, w, h);
    // polarity gradient along the ridge: polar tops, less-polar bottoms (gone under an Al2O3 coat)
    if (!coated) {
      const pg = g.createLinearGradient(0, h * 0.08, 0, h * 0.92); pg.addColorStop(0, "rgba(63,169,255,.10)"); pg.addColorStop(1, "rgba(57,217,138,.08)");
      g.fillStyle = pg; g.fillRect(0.28 * w, h * 0.08, 0.6 * w, h * 0.84);
    }
    for (const cx of [0.42, 0.72]) {
      g.fillStyle = coated ? "#9aa4b2" : "#b8996a"; g.fillRect(cx * w - 3, h * 0.08, 6, h * 0.84);
      for (let k = 0; k < 8; k++) for (const s of [-1, 1]) {
        const y = h * 0.1 + k * h * 0.1 + (s > 0 ? h * 0.05 : 0);
        const gr = g.createLinearGradient(0, y, 0, y + 7);
        gr.addColorStop(0, coated ? "#e6ebf2" : "#ecd5a3"); gr.addColorStop(1, coated ? "#8792a2" : "#9c7f52");
        g.fillStyle = gr; g.beginPath(); g.roundRect(s > 0 ? cx * w + 3 : cx * w - 3 - w * 0.11 * (1 - k * 0.03), y, w * 0.11 * (1 - k * 0.03), 7, 3); g.fill();
      }
    }
    g.fillStyle = v.color + Math.round(Math.min(1, thRef.current * 1.4) * 70).toString(16).padStart(2, "0");
    g.fillRect(0.28 * w, h * 0.08, 0.6 * w, h * 0.84);
    for (const m of mols.current) {
      g.fillStyle = v.color; g.globalAlpha = m.stuck ? 0.95 : 0.6;
      g.beginPath(); g.arc(m.x * w, m.y * h, m.stuck ? 3 : 2.4, 0, 6.3); g.fill();
    }
    g.globalAlpha = 1;
    g.strokeStyle = "rgba(255,230,160,.35)"; g.lineWidth = 3; g.beginPath(); g.moveTo(w * 0.57, 0); g.lineTo(w * 0.57, h * 0.08); g.stroke();
    g.font = '11px "IBM Plex Mono", monospace'; g.fillStyle = "#8796aa"; g.textAlign = "left";
    g.fillText(flow ? `${v.name} in N₂ →` : "N₂ purge", 10, 18);
    g.textAlign = "right";
    if (!coated) { g.fillText("polar tops", w - 8, h * 0.14); g.fillText("less-polar bottoms", w - 8, h * 0.9); }
    else g.fillText("30 nm Al₂O₃ everywhere", w - 8, h * 0.14);
    g.textAlign = "left";
    g.fillText(`gap filling ${(thRef.current * 100).toFixed(0)}% · room temperature`, 10, h - 10);
  };
  const chamber = useCanvas(drawChamber, [v, flow, coated]);

  const pcaRef = useCanvas((cv) => {
    const { ctx: g, w, h } = O.setupCanvas(cv);
    g.fillStyle = "#070a10"; g.fillRect(0, 0, w, h);
    const all = model.pts.map((p) => p.p);
    const xs = all.map((p) => p[0]), ys = all.map((p) => p[1]);
    const pad = 0.08 * Math.max(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys));
    const x0 = Math.min(...xs, model.origin[0]) - pad, x1 = Math.max(...xs, model.origin[0]) + pad, y0 = Math.min(...ys, model.origin[1]) - pad, y1 = Math.max(...ys, model.origin[1]) + pad;
    const X = (q: number) => 30 + ((q - x0) / (x1 - x0)) * (w - 44), Y = (q: number) => h - 26 - ((q - y0) / (y1 - y0)) * (h - 40);
    for (const c of model.cent) {
      const vv = VAPOURS.find((q) => q.key === c.k)!;
      g.strokeStyle = vv.color + "33"; g.setLineDash([3, 4]); g.beginPath(); g.moveTo(X(model.origin[0]), Y(model.origin[1])); g.lineTo(X(c.c[0] + (c.c[0] - model.origin[0]) * 0.6), Y(c.c[1] + (c.c[1] - model.origin[1]) * 0.6)); g.stroke(); g.setLineDash([]);
    }
    for (const p of model.pts) { const vv = VAPOURS.find((q) => q.key === p.k)!; g.fillStyle = vv.color; g.globalAlpha = 0.75; g.beginPath(); g.arc(X(p.p[0]), Y(p.p[1]), 3.2, 0, 6.3); g.fill(); }
    g.globalAlpha = 1;
    g.fillStyle = "#e4ebf3"; g.beginPath(); g.arc(X(model.origin[0]), Y(model.origin[1]), 4, 0, 6.3); g.fill();
    const lx = X(live[0]), ly = Y(live[1]);
    g.strokeStyle = "#fff"; g.lineWidth = 1.5; g.shadowColor = "#fff"; g.shadowBlur = 12;
    g.beginPath(); g.arc(lx, ly, 8, 0, 6.3); g.stroke(); g.beginPath(); g.moveTo(lx - 13, ly); g.lineTo(lx + 13, ly); g.moveTo(lx, ly - 13); g.lineTo(lx, ly + 13); g.stroke(); g.shadowBlur = 0;
    g.font = '10.5px "IBM Plex Mono", monospace'; g.fillStyle = "#8796aa";
    g.fillText(`PC1 ${(model.P.explained[0] * 100).toFixed(1)}%`, w - 90, h - 8);
    g.save(); g.translate(12, 70); g.rotate(-Math.PI / 2); g.fillText(`PC2 ${(model.P.explained[1] * 100).toFixed(1)}%`, 0, 0); g.restore();
    g.fillText("clean N₂", X(model.origin[0]) + 7, Y(model.origin[1]) - 6);
  }, [live[0], live[1], model]);

  const startMystery = () => {
    const vv = VAPOURS[Math.floor(Math.random() * VAPOURS.length)];
    setMystery({ v: vv, x: 0.15 + Math.random() * 0.35, revealed: false }); setGuess(null); setFlow(false);
  };
  const reveal = () => {
    if (!mystery) return;
    setMystery({ ...mystery, revealed: true });
    setScore((s) => ({ right: s.right + (guess === mystery.v.key ? 1 : 0), tries: s.tries + 1 }));
  };
  const var3 = (model.P.explained[0] + model.P.explained[1] + model.P.explained[2]) * 100;
  const mm = Math.floor(simT / 60), ss = Math.floor(simT % 60);

  return (
    <main className="wrap" style={{ paddingBottom: 30 }}>
      <div className="vl-grid">
        <section className="panel stack" style={{ gap: 12 }}>
          <div className="row" style={{ justifyContent: "space-between" }}><p className="eyebrow"><FlaskConical size={12} style={{ verticalAlign: -1 }} /> Flow cell &middot; M. didius forewing</p>
            {mystery && !mystery.revealed ? <span className="chip warn"><HelpCircle size={12} /> mystery vial loaded</span> : <span className="chip num">t = {mm}:{String(ss).padStart(2, "0")}</span>}</div>
          <canvas ref={chamber} className="cv" style={{ height: 260, borderRadius: 10 }} role="img" aria-label="Vapour molecules condensing on wing lamellae" />
          <div className="vap-row" role="group" aria-label="Vapour">
            {VAPOURS.map((q) => (
              <button key={q.key} disabled={!!mystery && !mystery.revealed} className={"vap" + (q.key === vk && !mystery ? " on" : "")} style={{ ["--c" as string]: q.color }} onClick={() => { setVk(q.key); setMystery(null); }}>
                <i />{q.name}{q.cwa && <small>{q.cwa}</small>}
              </button>
            ))}
          </div>
          {!mystery && <Range label="Vapour level (fraction of saturation)" value={x} min={P_MIN} max={P_MAX} step={0.01} onChange={setX} fmt={() => `${Math.round(x * 100)}% · ${Math.round(ppm).toLocaleString("en-IN")} ppm`} />}
          <div className="row">
            <button className={"btn" + (flow ? "" : " primary")} onClick={() => { if (!flow) tRef.current = 0; setFlow((f) => !f); }}>{flow ? <><Square size={14} /> Purge with N&#8322;</> : <><Play size={14} /> Expose the wing</>}</button>
            <button className="btn ghost" onClick={startMystery}><HelpCircle size={15} /> Mystery vial</button>
            <button className="btn sm" aria-pressed={coated} onClick={() => setCoated((c) => !c)} title="Coat the wing with 30 nm of alumina by atomic layer deposition"><Layers size={14} /> {coated ? "Remove Al₂O₃ coat" : "Coat with Al₂O₃"}</button>
          </div>
        </section>

        <section className="panel stack" style={{ gap: 10 }}>
          <p className="eyebrow">Spectrometer</p>
          <Plot label="Reflectance now and in clean nitrogen" height={170} opts={{ spectral: true, yticks: [0, 0.5, 1], series: [{ data: BASE, color: O.MUTED, width: 1.2, dash: [4, 3] }, { data: meas.R, color: O.INK, fill: "spectral", fillAlpha: 0.5 }] }} />
          <Plot label="Change in reflectance" height={150} opts={{ spectral: true, y: [-1, 1], yticks: [-1, 0, 1], yfmt: (q) => (q > 0 ? "+" : "") + Math.round(q * 100) + "%", series: [{ data: meas.d, color: v.color, width: 2.2, fill: v.color + "33" }] }} />
          <Readouts items={[["Gaps filled", Math.round(theta * 100), "%"], ["Peak shift", O.peak(meas.R, 380, 780).lambda - O.peak(BASE, 380, 780).lambda, "nm"], ["Time ×" + SPEED, `${mm}:${String(ss).padStart(2, "0")}`]]} />
        </section>

        <section className="panel stack" style={{ gap: 10 }}>
          <div className="row" style={{ justifyContent: "space-between" }}><p className="eyebrow"><ScanSearch size={12} style={{ verticalAlign: -1 }} /> Principal component analysis</p><span className="chip" title="Kittle et al. 2017 measured 91.9% in 3 PCs on real wings">3 PCs: {var3.toFixed(1)}%</span></div>
          <canvas ref={pcaRef} className="cv" style={{ height: 250, borderRadius: 10 }} role="img" aria-label="PCA scatter of calibration vapours with the live reading" />
          <div className="legend">{VAPOURS.map((q) => <span key={q.key}><i style={{ background: q.color }} />{q.name}</span>)}</div>
          <motion.div className="ident" animate={{ borderColor: identified ? identified.color : "#1d2734" }}>
            {identified ? <>
              <span className="eyebrow">Closest match</span>
              <b style={{ color: identified.color }}>{mystery && !mystery.revealed ? "Reading…" : identified.name}</b>
              <i className="conf"><b style={{ width: confidence * 100 + "%", background: identified.color }} /></i>
            </> : <span className="muted">Expose the wing to get a reading. Clean nitrogen sits at the white dot.</span>}
          </motion.div>
          {mystery && (
            <div className="stack" style={{ gap: 8 }}>
              <div className="row">{VAPOURS.map((q) => <button key={q.key} className="btn sm" disabled={mystery.revealed} aria-pressed={guess === q.key} onClick={() => setGuess(q.key)}>{q.name}</button>)}</div>
              {!mystery.revealed ? <button className="btn primary" disabled={!guess} onClick={reveal}>Reveal the vial</button>
                : <p style={{ fontSize: "var(--t-sm)" }}><b style={{ color: guess === mystery.v.key ? "var(--good)" : "var(--bad)" }}>{guess === mystery.v.key ? "Correct." : "Not quite."}</b> It was {mystery.v.name} at {Math.round(mystery.x * mystery.v.p0).toLocaleString("en-IN")} ppm. Score {score.right}/{score.tries}. <button className="btn sm ghost" onClick={startMystery}>Another vial</button></p>}
            </div>
          )}
        </section>
      </div>
      <div style={{ marginTop: 18 }}>
        <Notes
          say="Same direction, further out means more vapour. A different direction means a different molecule. PCA just finds the directions in which the spectra differ most."
          show="Press 'Coat with Al₂O₃'. A 30 nm alumina film makes every surface the same, so the polar tops and less-polar bottoms disappear. Water and methanol collapse onto one line: the selectivity was in the chemistry of the wing, not only its shape."
          ask="DMMP and dichloropentane have similar refractive indices. Why do they still separate?"
        />
      </div>
      <p className="faint" style={{ fontSize: "var(--t-xs)", marginTop: 10 }}>
        Teaching model. From the papers: the five vapours, the 15&ndash;50% saturation range, their vapour pressures and refractive indices, the polarity gradient and the effect of an Al&#8322;O&#8323; coat. Tuned: uptake strengths, depth preferences and swelling. Time runs {SPEED}&times; faster than the lab.
      </p>
    </main>
  );
}
