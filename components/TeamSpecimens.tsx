"use client";
/* eslint-disable @next/next/no-img-element */
import { useEffect, useMemo, useRef, useState } from "react";
import * as I from "@/lib/inverse";
import * as O from "@/lib/optics";

/* The team as a pinned specimen collection. Each card carries a real structural-colour stack tuned to
   "its" wavelength: tilt the card and the hologram slides toward blue exactly as the physics says,
   and the GENUINE stamp appears, like a security tag. A small Morpho drifts between the cards. */

const TEAM = [
  { roll: "C106", name: "Sarthak Agarwal", latin: "Morpho sarthakii", src: "/team/sarthak.jpg", nm: 460,
    note: "Passport-photo certified. A white background reflects every wavelength equally. Show-off." },
  { roll: "C122", name: "Saharsh B", latin: "Morpho saharshensis", src: "/team/saharsh.jpg", nm: 530,
    note: "The only specimen collected wearing its own ID lanyard. Tamper-evident and very hard to forge." },
  { roll: "C123", name: "Sanidhya Bakliwal", latin: "Morpho sanidhyae", src: "/team/sanidhya.jpg", nm: 590,
    note: "Photographed at night. The black background absorbs everything except the smile." },
  { roll: "C129", name: "Bhavishya Bhaloria", latin: "Morpho bhavishyana", src: "/team/bhavishya.jpg", nm: 630,
    note: "Found in its natural habitat: in front of a green wall. Camouflage still under development." },
];

const MAX_TILT = 14;      // degrees the card leans under the pointer
const LUT_DEG = 60;       // card tilt is mapped onto 0–60° of viewing angle so the shift is easy to see

function Specimen({ m, i, onRef }: { m: (typeof TEAM)[number]; i: number; onRef: (el: HTMLElement | null) => void }) {
  // a narrow-band chitin + resin stack, so each card's hologram is close to a pure colour
  const { lut, peaks } = useMemo(() => {
    const nf = I.MATERIALS.resin.nf, d = I.designForWavelength(m.nm, 22, nf);
    const stack = O.morphoStack({ dc: d.dc, da: d.da, N: 22, nf });
    const a = O.angleLUT(stack, 25, LUT_DEG, 1.25);
    return { lut: a.colors.map((c) => c.css), peaks: a.colors.map((_c, k) => O.visiblePeak(O.spectrum(stack, (LUT_DEG * k) / 24)).lambda) };
  }, [m.nm]);
  const [t, setT] = useState({ x: 0, y: 0 });
  const sweep = useRef(0);
  useEffect(() => () => cancelAnimationFrame(sweep.current), []);
  // a finger cannot hover, so a tap plays a short tilt sweep instead of following the pointer
  const tap = () => {
    cancelAnimationFrame(sweep.current);
    const t0 = performance.now(), dur = 1600;
    const step = (now: number) => {
      const k = Math.min(1, (now - t0) / dur), env = Math.sin(Math.PI * k);
      setT({ x: -0.45 * MAX_TILT * env, y: MAX_TILT * env * Math.cos(Math.PI * k * 0.5) });
      if (k < 1) sweep.current = requestAnimationFrame(step); else setT({ x: 0, y: 0 });
    };
    sweep.current = requestAnimationFrame(step);
  };
  const mag = Math.min(1, Math.hypot(t.x, t.y) / MAX_TILT);
  const idx = (k: number) => Math.min(lut.length - 1, Math.max(0, Math.round(k * (lut.length - 1))));
  const at = (k: number) => lut[idx(k)];
  const move = (e: React.PointerEvent<HTMLElement>) => {
    if (e.pointerType === "touch") return; // scrolling past a card must not wobble it
    const r = e.currentTarget.getBoundingClientRect();
    const u = (e.clientX - r.left) / r.width - 0.5, v = (e.clientY - r.top) / r.height - 0.5;
    setT({ x: -v * 2 * MAX_TILT, y: u * 2 * MAX_TILT });
  };
  return (
    <figure ref={onRef} className={"specimen" + (mag > 0.45 ? " verified" : "")} style={{ ["--d" as string]: i * 0.12 + "s", ["--c0" as string]: lut[0] }}
      onPointerMove={move} onPointerLeave={(e) => { if (e.pointerType !== "touch") setT({ x: 0, y: 0 }); }}
      onPointerUp={(e) => { if (e.pointerType === "touch") tap(); }}>
      <div className="sp-card" style={{ transform: `perspective(900px) rotateX(${t.x}deg) rotateY(${t.y}deg)` }}>
        <i className="sp-pin" aria-hidden="true" />
        <div className="sp-photo">
          <img src={m.src} alt={m.name} loading="lazy" />
          <span className="sp-holo" aria-hidden="true" style={{
            opacity: 0.12 + 0.6 * mag,
            backgroundImage: `linear-gradient(115deg, transparent 18%, ${at(mag * 0.35)} 38%, ${at(mag * 0.7)} 52%, ${at(mag)} 64%, transparent 82%)`,
            backgroundPosition: `${50 + t.y * 3}% ${50 + t.x * 3}%`,
          }} />
          <span className="sp-stamp" aria-hidden="true">Genuine &#10003;<small>can&apos;t be printed</small></span>
        </div>
        <figcaption className="sp-label">
          <span className="sp-roll">{m.roll} <em>&middot; specimen {i + 1} of {TEAM.length}</em></span>
          <b>{m.name}</b>
          <i className="sp-latin">{m.latin}</i>
          <span className="sp-row"><span className="sp-dot" style={{ background: at(mag) }} />reflects {peaks[idx(mag)]} nm {mag > 0.05 ? "tilted" : "head-on"}</span>
          <span className="sp-note">{m.note}</span>
        </figcaption>
      </div>
    </figure>
  );
}

/* A little Morpho that lands on a card, rests, then flutters to another. Click it to shoo it along. */
function Visitor({ cards, box }: { cards: React.RefObject<(HTMLElement | null)[]>; box: React.RefObject<HTMLDivElement | null> }) {
  const [pos, setPos] = useState<{ x: number; y: number; flip: boolean } | null>(null);
  const [n, setN] = useState(0);
  const last = useRef(-1);
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const hop = () => {
      const els = (cards.current ?? []).filter(Boolean) as HTMLElement[];
      if (!els.length || !box.current) return;
      let k = Math.floor(Math.random() * els.length);
      if (k === last.current) k = (k + 1) % els.length;
      last.current = k;
      const b = box.current.getBoundingClientRect(), r = els[k].getBoundingClientRect();
      setPos((p) => {
        const x = r.left - b.left + r.width * (0.62 + Math.random() * 0.22), y = r.top - b.top + 6 + Math.random() * 30;
        return { x, y, flip: p ? x < p.x : false };
      });
    };
    hop();
    const id = window.setInterval(hop, 4200);
    return () => clearInterval(id);
  }, [cards, box, n]);
  if (!pos) return null;
  return (
    <button className="sp-visitor" aria-label="A Morpho butterfly. Click to shoo it." title="Shoo!" onClick={() => setN((v) => v + 1)}
      style={{ transform: `translate(${pos.x}px, ${pos.y}px) scaleX(${pos.flip ? -1 : 1})` }}>
      <svg viewBox="0 0 64 48" width="44" height="33" aria-hidden="true">
        <defs>
          <linearGradient id="spw" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#7fd0ff" /><stop offset=".55" stopColor="#1f7cff" /><stop offset="1" stopColor="#0a2a6b" /></linearGradient>
        </defs>
        <g className="wl"><path d="M31 24 C 20 2, 2 2, 4 16 C 6 26, 18 28, 31 26 Z" fill="url(#spw)" /><path d="M31 27 C 20 30, 10 40, 16 45 C 22 48, 29 38, 31 29 Z" fill="url(#spw)" opacity=".85" /></g>
        <g className="wr"><path d="M33 24 C 44 2, 62 2, 60 16 C 58 26, 46 28, 33 26 Z" fill="url(#spw)" /><path d="M33 27 C 44 30, 54 40, 48 45 C 42 48, 35 38, 33 29 Z" fill="url(#spw)" opacity=".85" /></g>
        <rect x="31" y="14" width="2" height="22" rx="1" fill="#1b130c" />
      </svg>
    </button>
  );
}

export default function TeamSpecimens() {
  const cards = useRef<(HTMLElement | null)[]>([]);
  const box = useRef<HTMLDivElement>(null);
  return (
    <div className="specimens">
      <div className="sp-head">
        <div className="stack" style={{ gap: 6 }}>
          <p className="eyebrow">Specimen collection &middot; C106&ndash;C129</p>
          <h2>Four rare specimens of <i>Homo spectralis</i></h2>
          <p className="muted">Collected October 2026 for <b>Bio-inspired Security &amp; Anti-counterfeiting Technology</b>. Tilt a specimen (hover, or tap on a touch screen) to check it&apos;s genuine: the hologram is a real thin-film stack.</p>
        </div>
      </div>
      <div className="sp-grid" ref={box}>
        {TEAM.map((m, i) => <Specimen key={m.roll} m={m} i={i} onRef={(el) => { cards.current[i] = el; }} />)}
        <Visitor cards={cards} box={box} />
      </div>
      <p className="sp-foot">No butterflies were harmed in the making of this presentation. Four engineering students were mildly inconvenienced.</p>
    </div>
  );
}
