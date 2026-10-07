"use client";
import { OrbitControls } from "@react-three/drei";
import { Palette, Pipette, RotateCcw, Waves } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import Backdrop from "@/components/three/Backdrop";
import Lamellae, { colourName, lamellaeFit, type LamellaeSpec } from "@/components/three/Lamellae";
import Stage3D from "@/components/three/Stage3D";
import { Notes, Plot, Range, Readouts, Seg, useRaf } from "@/components/ui";
import * as I from "@/lib/inverse";
import * as O from "@/lib/optics";

type Mode = "wave" | "colour";
const PRESETS: [string, string][] = [
  ["Morpho blue", "#1e7bff"], ["Cyan", "#00e5ff"], ["Emerald", "#00c853"], ["Gold", "#ffd000"],
  ["Orange", "#ff8a00"], ["Red", "#ff3b30"], ["Magenta", "#ff00cc"], ["Violet", "#8a2be2"],
];
const RAINBOW = "linear-gradient(90deg," + Array.from({ length: 16 }, (_, i) => O.wlColor(400 + i * 20)).join(",") + ")";

/* Ease the drawn structure toward the designed one so every change morphs instead of jumping. */
function useEased(dc: number, da: number, rate = 6) {
  const [cur, setCur] = useState({ dc, da });
  const ref = useRef(cur);
  const moving = Math.abs(cur.dc - dc) + Math.abs(cur.da - da) > 0.05;
  useRaf((_t, dt) => {
    const k = 1 - Math.exp(-dt * rate), r = ref.current;
    const n = { dc: r.dc + (dc - r.dc) * k, da: r.da + (da - r.da) * k };
    ref.current = Math.abs(n.dc - dc) + Math.abs(n.da - da) < 0.05 ? { dc, da } : n;
    setCur(ref.current);
  }, moving);
  return cur;
}

export default function StructureLab() {
  const [mode, setMode] = useState<Mode>("wave");
  const [lambda, setLambda] = useState(460);
  const [hex, setHex] = useState("#00c853");
  const [mat, setMat] = useState<I.Material>("air");
  const [N, setN] = useState(8);
  const M = I.MATERIALS[mat], nf = M.nf;
  const [ready, setReady] = useState<Record<string, boolean>>({});
  useEffect(() => {
    let live = true;
    I.warmGrid(mat).then(() => live && setReady((r) => ({ ...r, [mat]: true })));
    return () => { live = false; };
  }, [mat]);
  const chooseMat = (m: I.Material) => { setMat(m); setN(I.MATERIALS[m].N); };

  const design = useMemo(() => (mode === "wave" ? I.designForWavelength(lambda, N, nf) : I.designForColour(hex, N, mat)), [mode, lambda, hex, N, nf, mat]);
  const ez = useEased(design.dc, design.da);
  // the structure on screen, mid-morph, with the colour it reflects at that instant
  const shown = useMemo(() => I.evaluate(ez.dc, ez.da, N, nf), [ez.dc, ez.da, N, nf]);
  const spec = useMemo<LamellaeSpec>(() => ({ dc: ez.dc, da: ez.da, N, fill: M.gap, nf, reflect: shown.colour.lin, css: shown.colour.css, peak: shown.peak, R: shown.refl }), [ez.dc, ez.da, N, M.gap, nf, shown]);
  const R40 = useMemo(() => O.spectrum(O.morphoStack({ dc: design.dc, da: design.da, N, nf }), 40), [design, N, nf]);
  const fit = lamellaeFit(ez.dc, ez.da, N);
  const c40 = O.color(R40);

  const target = mode === "wave" ? O.wlColor(lambda) : hex;
  const bragg = Math.round(2 * (I.NC * design.dc + nf * design.da));
  const multi = design.peaks.length > 1;
  const pickWave = (l: number) => { setMode("wave"); setLambda(l); };
  const pickHex = (h: string) => { setMode("colour"); setHex(h); };

  return (
    <main className="wrap" style={{ paddingBottom: 30 }}>
      <div className="lab-grid">
        <div className="stack" style={{ gap: 12 }}>
          <Stage3D style={{ height: "min(72vh, 680px)" }} label="3D cross-section of the designed chitin stack" camera={{ position: [8, 11, 33], fov: 36 }} bloom={1.4}
            overlay={<>
              <div className="hud" style={{ top: 14, left: 16 }}>
                <b style={{ color: shown.colour.css }}>{mode === "wave" ? `Target ${lambda} nm` : `Target ${hex}`}</b> &middot; {N} shelves &middot; {Math.round(ez.dc)} nm chitin &middot; {Math.round(ez.da)} nm {M.gap}
              </div>
              <div className="hud" style={{ bottom: 14, left: 16 }}>Drag to orbit. White light falls in; only the designed colour climbs back out.{fit < 0.999 && <> Height drawn &times;{fit.toFixed(2)} to fit.</>}</div>
            </>}>
            <Backdrop top="#120c06" bottom="#010204" halo="#5a3a14" />
            <Lamellae spec={spec} />
            <OrbitControls makeDefault target={[0, 8.5, 0]} enablePan={false} enableDamping minDistance={10} maxDistance={52} maxPolarAngle={Math.PI * 0.62} />
          </Stage3D>
          <div className="panel stack" style={{ gap: 10 }}>
            <Plot label="Reflectance of the designed stack, head-on" height={170} opts={{
              spectral: true, xlabel: "wavelength (nm)", yticks: [0, 0.5, 1],
              series: [{ data: R40, color: O.MUTED, width: 1.2, dash: [4, 3] }, { data: shown.R, color: O.INK, fill: "spectral", fillAlpha: 0.55 }],
              markers: mode === "wave" ? [{ x: lambda, label: "target " + lambda + " nm", color: O.wlColor(lambda) }] : design.peaks.map((p, i) => ({ x: p, label: p + " nm", color: O.wlColor(p), row: i })),
            }} />
            <span className="mono faint" style={{ fontSize: 11 }}>solid: head-on &middot; dashed: tilted 40&deg;, where the peak slides to {O.visiblePeak(R40).lambda} nm</span>
          </div>
        </div>

        <aside className="stack lab-side">
          <div className="panel stack" style={{ gap: 14 }}>
            <p className="eyebrow">Choose the colour</p>
            <Seg label="Design from" value={mode} onChange={setMode} options={[
              ["wave", <span key="w" className="row" style={{ gap: 6 }}><Waves size={14} /> Wavelength</span>],
              ["colour", <span key="c" className="row" style={{ gap: 6 }}><Palette size={14} /> Colour</span>],
            ]} />
            {mode === "wave" ? (
              <div className="stack" style={{ gap: 8 }}>
                <Range label="Wavelength to reflect" value={lambda} min={400} max={700} step={5} onChange={setLambda} fmt={(v) => `${v} nm · ${colourName(v)}`} />
                <div role="slider" aria-label="Pick a wavelength from the spectrum" aria-valuemin={400} aria-valuemax={700} aria-valuenow={lambda} tabIndex={0}
                  onKeyDown={(e) => { if (e.key === "ArrowRight") setLambda((l) => Math.min(700, l + 5)); if (e.key === "ArrowLeft") setLambda((l) => Math.max(400, l - 5)); }}
                  onPointerDown={(e) => {
                    const el = e.currentTarget, set = (x: number) => { const r = el.getBoundingClientRect(); pickWave(Math.round((400 + Math.max(0, Math.min(1, (x - r.left) / r.width)) * 300) / 5) * 5); };
                    el.setPointerCapture(e.pointerId); set(e.clientX);
                    el.onpointermove = (m) => set(m.clientX); el.onpointerup = () => { el.onpointermove = null; };
                  }}
                  style={{ position: "relative", height: 26, borderRadius: 8, background: RAINBOW, cursor: "crosshair", touchAction: "none", border: "1px solid rgba(255,255,255,.08)" }}>
                  <i style={{ position: "absolute", top: -3, bottom: -3, width: 3, borderRadius: 2, background: "#fff", boxShadow: "0 0 0 2px #05070b", left: `calc(${((lambda - 400) / 300) * 100}% - 1.5px)` }} />
                </div>
              </div>
            ) : (
              <div className="stack" style={{ gap: 10 }}>
                <label className="row" style={{ gap: 10, cursor: "pointer" }}>
                  <input type="color" value={hex} onChange={(e) => pickHex(e.target.value)} aria-label="Pick any colour" style={{ width: 52, height: 36, border: 0, padding: 0, background: "none", cursor: "pointer" }} />
                  <span className="mono" style={{ fontSize: 12 }}><Pipette size={12} /> {hex} {!ready[mat] && <span className="faint">&middot; mapping the stacks&hellip;</span>}</span>
                </label>
                <div className="row" style={{ gap: 6 }}>
                  {PRESETS.map(([name, h]) => (
                    <button key={h} className="btn sm" aria-pressed={hex === h} title={name} onClick={() => pickHex(h)} style={{ gap: 6 }}>
                      <i style={{ width: 12, height: 12, borderRadius: 3, background: h, display: "inline-block" }} />{name}
                    </button>
                  ))}
                </div>
              </div>
            )}
            <div className="ctrl"><span className="lbl"><span>Build it from</span><span className="val">n = 1.56 / {nf.toFixed(2)}</span></span>
              <Seg label="Materials" value={mat} onChange={chooseMat} options={(Object.keys(I.MATERIALS) as I.Material[]).map((k) => [k, I.MATERIALS[k].label])} />
              <span className="faint" style={{ fontSize: 12 }}>{M.note}</span>
            </div>
            <Range label="Shelves" value={N} min={2} max={M.maxN} onChange={setN} fmt={(v) => v + (design.refl < 0.5 ? " · dim: add shelves" : "")} />
            <button className="btn sm ghost" style={{ justifySelf: "start" }} onClick={() => { setMode("wave"); setLambda(460); chooseMat("air"); }}><RotateCcw size={13} /> Back to the Morpho</button>
          </div>

          <div className="panel stack" style={{ gap: 10 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
              <div className="stack" style={{ gap: 4 }}><div className="swatch" style={{ background: target, color: target, aspectRatio: "1" }} /><span className="mono faint" style={{ fontSize: 11 }}>you asked</span></div>
              <div className="stack" style={{ gap: 4 }}><div className="swatch" style={{ background: design.colour.css, color: design.colour.css, aspectRatio: "1" }} /><span className="mono faint" style={{ fontSize: 11 }}>stack reflects</span></div>
              <div className="stack" style={{ gap: 4 }}><div className="swatch" style={{ background: c40.css, color: c40.css, aspectRatio: "1" }} /><span className="mono faint" style={{ fontSize: 11 }}>tilted 40&deg;</span></div>
            </div>
            <Readouts items={[
              ["Chitin shelf", Math.round(design.dc), "nm"],
              [mat === "air" ? "Air gap" : "Resin gap", Math.round(design.da), "nm"],
              ["Peak", design.peaks.join(" + ") || design.peak, "nm"],
              ["Reflectance", Math.round(design.refl * 100), "%"],
            ]} />
            <p className="faint" style={{ fontSize: 13, lineHeight: 1.5 }}>
              {mode === "wave"
                ? <>Quarter-wave rule: each layer is a quarter of {lambda} nm thick <i>optically</i> (n&times;d). 1.56 &times; {Math.round(design.dc)} &asymp; {nf.toFixed(2)} &times; {Math.round(design.da)} &asymp; {Math.round(lambda / 4)} nm, so every echo comes back in step. Bragg check: 2(n<sub>c</sub>d<sub>c</sub> + n<sub>g</sub>d<sub>g</sub>) = {bragg} nm.{mat === "air" && lambda > 560 && <> The band is so wide it spills into yellow-green, so long wavelengths look gold. Try Chitin + resin.</>}</>
                : multi
                  ? <>No single wavelength looks like this colour. The search found a thick stack whose higher-order reflections land at {design.peaks.join(" and ")} nm together; the eye mixes them. Same trick as the magenta security tag.</>
                  : <>Closest structure in the search: one reflection band at {design.peak} nm. Pale or greyish picks come out more saturated, because a stack reflects a narrow band, not a mixture.</>}
            </p>
          </div>
          <Notes say="This is the forward model run backwards. Pick the colour, and the page searches the same transfer-matrix physics for shelf and gap thicknesses that produce it." show="Slide from 400 to 700 nm and watch the shelves and gaps both thicken in proportion. Then pick magenta." ask="Why can't you get magenta from one thin quarter-wave stack? What does the search do instead?" />
        </aside>
      </div>
    </main>
  );
}
