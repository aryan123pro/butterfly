"use client";
import { Flame, Sun } from "lucide-react";
import { useMemo, useState } from "react";
import { TAG_A } from "@/lib/designs";
import * as O from "@/lib/optics";
import { Plot, Range } from "../ui";

const TAU = 230; // dye photobleaching time constant (h): >50% loss inside 100-300 h
const dyeUV = (h: number) => Math.exp(-h / TAU);
// dye binder and colourant decompose above ~120-150 °C; engineered films hold to 250-500 °C
const dyeHeat = (T: number) => Math.max(0, Math.min(1, 1 - (T - 130) / 70));
const tagHeat = (T: number) => Math.max(0, Math.min(1, 1 - (T - 470) / 60));

const DYE = O.WL.map((l) => 0.06 + 0.7 * Math.exp(-(((l - 450) / 38) ** 2)) + 0.6 * Math.exp(-(((l - 650) / 40) ** 2)));
const CHAR = O.WL.map((l) => 0.04 + (0.1 * (l - 380)) / 400);

function dyeColour(keep: number, heat: number) {
  const r = DYE.map((d, i) => { const faded = 1 - (1 - d) * keep * 0.92; return faded * heat + CHAR[i] * (1 - heat); });
  return O.color(new Float32Array(r));
}

export default function Stress() {
  const [h, setH] = useState(0);
  const [T, setT] = useState(25);
  const tagR = useMemo(() => O.spectrum(O.morphoStack(TAG_A), 0), []);
  const tagKeep = tagHeat(T);
  const tag = O.color(new Float32Array(tagR.map((r, i) => r * tagKeep + CHAR[i] * (1 - tagKeep))), 1.25);
  const dyeKeep = dyeUV(h), dyeH = dyeHeat(T);
  const dye = dyeColour(dyeKeep, dyeH);
  const hrs = Array.from({ length: 51 }, (_, i) => i * 20);

  return (
    <div className="split">
      <div className="stack" style={{ gap: 16 }}>
        <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) minmax(0,1fr)", gap: 12 }}>
          <div className="tagcard">
            <div className="tagface" style={{ background: `linear-gradient(135deg, ${tag.css}, ${O.color(O.spectrum(O.morphoStack(TAG_A), 35), 1.25).css})` }}><span>BIOMIMETIC</span></div>
            <div className="row" style={{ justifyContent: "space-between" }}><b>Structural tag</b><span className={"chip " + (tagKeep > 0.95 ? "good" : "bad")}>{Math.round(tagKeep * 100)}% intact</span></div>
          </div>
          <div className="tagcard">
            <div className="tagface" style={{ background: dye.css }}><span>DYE PRINT</span></div>
            <div className="row" style={{ justifyContent: "space-between" }}><b>Dye-based tag</b><span className={"chip " + (dyeKeep * dyeH > 0.8 ? "good" : dyeKeep * dyeH > 0.5 ? "warn" : "bad")}>{Math.round(dyeKeep * dyeH * 100)}% colour left</span></div>
          </div>
        </div>
        <Range label={<span className="row" style={{ gap: 6 }}><Sun size={13} /> UV exposure</span>} value={h} min={0} max={1000} step={10} onChange={setH} fmt={(v) => v + " h"} />
        <Range label={<span className="row" style={{ gap: 6 }}><Flame size={13} /> Temperature</span>} value={T} min={25} max={550} step={5} onChange={setT} fmt={(v) => v + " °C"} />
        <div className="panel">
          <Plot label="Colour kept against hours of UV" height={180} opts={{
            x: [0, 1000], y: [0, 1.05], xticks: [0, 250, 500, 750, 1000], yticks: [0, 0.5, 1], xlabel: "hours of UV exposure", ylabel: "colour kept",
            series: [{ xs: hrs, data: hrs.map(() => 1), color: O.GOOD, width: 2.4 }, { xs: hrs, data: hrs.map(dyeUV), color: O.BAD, width: 2.4 }],
            markers: [{ x: h, color: O.INK, label: h + " h" }],
          }} />
          <p className="faint" style={{ fontSize: "var(--t-xs)" }}>Green: biomimetic tag, 0% degradation over 1000 h. Red: dye, more than half lost within 100&ndash;300 h.</p>
        </div>
      </div>
      <div className="stack">
        <div className="tablewrap">
          <table className="data">
            <thead><tr><th>Metric</th><th>Biomimetic tag</th><th>Traditional dye</th></tr></thead>
            <tbody>
              <tr><td>UV exposure</td><td className="win">0% colour loss after 1000 h</td><td className="lose">&gt;50% loss in 100&ndash;300 h</td></tr>
              <tr><td>Resolution</td><td className="win">100&ndash;300 nm (~10&#8313; structures/cm&sup2;)</td><td className="lose">10,000&ndash;20,000 nm (~10&#8308;&ndash;10&#8309;/cm&sup2;)</td></tr>
              <tr><td>Thermal stability</td><td className="win">up to 250&ndash;500 &deg;C</td><td className="lose">up to 120&ndash;150 &deg;C</td></tr>
              <tr><td>Production cost</td><td className="lose">~&#8377;5.00&ndash;8.50 per tag</td><td className="win">~&#8377;0.08&ndash;0.40 per tag</td></tr>
            </tbody>
          </table>
        </div>
        <p className="faint" style={{ fontSize: "var(--t-xs)" }}>Sources: PMC7560414; Micromachines 16(7):813.</p>
        <div className="callout"><b>Why heat matters.</b> Tags get laminated, ironed, left on car dashboards and run through hot-melt packaging lines. A dye that chars at 150 &deg;C fails all of those. A multilayer of oxides or high-temperature polymer does not.</div>
      </div>
    </div>
  );
}
