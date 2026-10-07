"use client";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { useEffect, useState } from "react";

/* Apparatus as described by Kittle et al., ACS Omega 2017 and Sensors 2020 (US Air Force Academy). */
const STAGES = [
  { t: "Vapour generation", s: "Nitrogen bubbles through the liquid, then mixes with clean N₂ to set 15–50% of saturation." },
  { t: "Flow cell", s: "400 mL/min flows over a fresh Morpho didius forewing in a sealed glass chamber." },
  { t: "Capillary condensation", s: "Vapour condenses between the lamellae. Polar ridge tops and less-polar bottoms take up different molecules." },
  { t: "Illumination", s: "A halogen lamp lights a 2 mm spot through a fibre probe held normal to the wing." },
  { t: "Spectrum", s: "A spectrometer records the reflectance change, ΔR, across the visible band." },
  { t: "Identification", s: "PCA reduces each spectrum to a point; each vapour moves in its own direction." },
];

/* Measured results. Each figure is from the paper named beside it. */
export const VAPOUR_FACTS: { v: string; s: string; src: string }[] = [
  { v: "120 ppm", s: "lowest DMMP (nerve-agent simulant) tested on its own; 30 ppm inside mixtures", src: "Kittle 2020" },
  { v: "240 ppm", s: "lowest dichloropentane (mustard-gas simulant) on its own; 50 ppm inside mixtures", src: "Kittle 2020" },
  { v: "< 1 min", s: "until the spectral change is visible, at room temperature with no heater", src: "Kittle 2020" },
  { v: "91.9%", s: "of spectral variance in 3 principal components across 5 vapours (71.6 + 16.8 + 3.5)", src: "Kittle 2017" },
];


export default function VapourRig() {
  const [i, setI] = useState(0);
  const [auto, setAuto] = useState(true);
  useEffect(() => { if (!auto) return; const id = setInterval(() => setI((x) => (x + 1) % STAGES.length), 2600); return () => clearInterval(id); }, [auto]);
  const on = (k: number) => (i === k ? 1 : 0.55);

  return (
    <div className="stack" style={{ gap: 16 }}>
    <div className="split wide">
      <div className="panel flush rig">
        <svg viewBox="0 0 860 380" role="img" aria-label="Vapour sensing apparatus">
          <defs>
            <linearGradient id="wing" x1="0" x2="1"><stop offset="0" stopColor="#1f6fff" /><stop offset="1" stopColor="#38d6ff" /></linearGradient>
            <radialGradient id="lamp" cx=".5" cy=".5" r=".5"><stop offset="0" stopColor="#fff6d0" /><stop offset="1" stopColor="#ffb340" stopOpacity="0" /></radialGradient>
            <path id="flow" d="M150 230 C 230 230, 250 170, 330 170 L 380 170" />
            <path id="fibre" d="M500 120 C 560 60, 620 60, 650 110" />
          </defs>
          <rect width="860" height="380" fill="#070a10" />
          {/* 1 generator */}
          <g opacity={on(0)} style={{ transition: "opacity .4s" }}>
            <rect x="30" y="160" width="120" height="130" rx="10" fill="#111823" stroke="#2a3646" />
            {[0, 1, 2].map((k) => <g key={k}><rect x={48 + k * 34} y="185" width="20" height="60" rx="6" fill="#0d1520" stroke="#3a4a60" /><rect x={50 + k * 34} y={215 - k * 8} width="16" height={28 + k * 8} rx="4" fill={["#39d98a", "#ffb547", "#ff5a6e"][k]} opacity=".7" /></g>)}
            <text x="90" y="275" textAnchor="middle" className="svgt">N&#8322; bubblers</text>
          </g>
          {/* 2 flow */}
          <use href="#flow" stroke="#2a3646" strokeWidth="10" fill="none" />
          <g opacity={on(1)}>
            {[0, 1, 2, 3, 4, 5].map((k) => (
              <circle key={k} r="4" fill="#9fe7c6"><animateMotion dur="2.4s" begin={`${k * 0.4}s`} repeatCount="indefinite"><mpath href="#flow" /></animateMotion></circle>
            ))}
          </g>
          {/* 3 chamber + wing */}
          <g opacity={Math.max(on(2), on(1), on(3))}>
            <rect x="380" y="120" width="180" height="120" rx="14" fill="#0d1520" stroke="#3a4a60" />
            <path d="M400 210 C 440 150, 500 150, 540 210 Z" fill="url(#wing)" opacity=".9" />
            {[0, 1, 2, 3, 4, 5, 6, 7].map((k) => <rect key={k} x={420 + k * 12} y={196 - (k % 2) * 3} width="9" height="2" fill="#d8b46e" opacity={i === 2 ? 0.9 : 0.4} />)}
            {i === 2 && [0, 1, 2, 3, 4, 5, 6].map((k) => <circle key={"m" + k} cx={418 + k * 15} cy={185 + (k % 3) * 5} r="3" fill="#9fe7c6"><animate attributeName="opacity" values="0;1;0" dur="1.2s" begin={`${k * 0.15}s`} repeatCount="indefinite" /></circle>)}
            <text x="470" y="262" textAnchor="middle" className="svgt">M. didius forewing &middot; flow cell</text>
          </g>
          {/* 4 lamp */}
          <g opacity={on(3)}>
            <circle cx="430" cy="60" r="44" fill="url(#lamp)" />
            <rect x="415" y="40" width="30" height="24" rx="5" fill="#2a2416" stroke="#6a5a30" />
            <path d="M430 70 L 455 170" stroke="#ffe7a6" strokeWidth="3" opacity=".8" />
            <text x="430" y="22" textAnchor="middle" className="svgt">halogen lamp &middot; fibre probe</text>
          </g>
          {/* fibre to spectrograph */}
          <use href="#fibre" stroke="#3fa9ff" strokeWidth="3" fill="none" opacity={Math.max(on(3), on(4))} />
          {/* 5 spectrograph */}
          <g opacity={on(4)}>
            <rect x="610" y="110" width="110" height="80" rx="10" fill="#111823" stroke="#2a3646" />
            {Array.from({ length: 20 }, (_, k) => <rect key={k} x={622 + k * 4.4} y="160" width="4" height="12" fill={`hsl(${270 - k * 13} 90% 55%)`} />)}
            <path d={`M622 150 ${Array.from({ length: 20 }, (_, k) => `L ${622 + k * 4.4} ${150 - 22 * Math.exp(-(((k - 7) / 3.5) ** 2)) + (i === 4 ? 8 * Math.exp(-(((k - 11) / 3) ** 2)) : 0)}`).join(" ")}`} stroke="#e4ebf3" fill="none" strokeWidth="1.6" />
            <text x="665" y="208" textAnchor="middle" className="svgt">spectrometer &middot; &Delta;R</text>
          </g>
          {/* 6 PCA */}
          <g opacity={on(5)}>
            <rect x="620" y="240" width="200" height="120" rx="10" fill="#0d1520" stroke="#2a3646" />
            <line x1="640" y1="340" x2="805" y2="340" stroke="#2a3646" /><line x1="640" y1="340" x2="640" y2="255" stroke="#2a3646" />
            {[["#39d98a", 680, 300], ["#ffb547", 740, 280], ["#ff5a6e", 770, 320], ["#3fa9ff", 700, 265], ["#c78bff", 660, 320]].map(([c, x, y], k) => (
              <g key={k}>{[0, 1, 2, 3].map((j) => <circle key={j} cx={(x as number) + Math.cos(j * 1.7 + k) * 7} cy={(y as number) + Math.sin(j * 2.3 + k) * 6} r="3.4" fill={c as string} />)}</g>
            ))}
            <text x="720" y="374" textAnchor="middle" className="svgt">PCA &middot; 3 PCs = 91.9%</text>
          </g>
          <text x="20" y="30" className="svgt" fill="#e4ebf3">stage {i + 1} of 6</text>
          <text x="240" y="160" textAnchor="middle" className="svgt">400 mL/min</text>
        </svg>
      </div>
      <div className="stack" style={{ gap: 8 }}>
        {STAGES.map((s, k) => (
          <button key={s.t} className={"stage-row" + (k === i ? " on" : "")} onClick={() => { setAuto(false); setI(k); }}>
            <span className="n">{k + 1}</span><span><b>{s.t}</b><small>{s.s}</small></span>
          </button>
        ))}
        <Link className="btn primary" href="/vapour-lab" style={{ marginTop: 6 }}>Run it yourself in the Vapour Lab <ArrowRight size={15} /></Link>
      </div>
    </div>
    <div className="facts">
      {VAPOUR_FACTS.map((f) => <div key={f.v}><b className="num">{f.v}</b><span>{f.s}</span><small>{f.src}</small></div>)}
    </div>
    </div>
  );
}
