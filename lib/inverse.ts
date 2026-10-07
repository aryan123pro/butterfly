import * as O from "./optics";

/* Inverse design: given a colour, find the chitin/air stack that reflects it.
   Forward physics is the same transfer matrix as everywhere else; this file only searches it. */

export const NC = 1.56; // chitin

export interface Design { dc: number; da: number; N: number; R: Float32Array; colour: O.Colour; peak: number; refl: number; peaks: number[] }

/* Two ways to build the stack. Chitin and air (the butterfly) differ so much in index that the
   reflection band is ~30% of the wavelength wide: brilliant with few shelves, but a broad, paler
   colour. Filling the gaps with a resin of n = 1.40 narrows the band to ~7%, so the colour is
   close to a pure wavelength, at the price of needing many more shelves. */
export const MATERIALS = {
  air: { nf: 1.0, label: "Chitin + air", gap: "air", N: 8, maxN: 14, note: "the butterfly: few shelves, broad and brilliant" },
  resin: { nf: 1.4, label: "Chitin + resin", gap: "resin", N: 22, maxN: 30, note: "engineered: low contrast, narrow and pure" },
} as const;
export type Material = keyof typeof MATERIALS;

function evaluate(dc: number, da: number, N: number, nf = 1): Design {
  const R = O.spectrum(O.morphoStack({ dc, da, N, nf }), 0);
  const pk = O.visiblePeak(R);
  return { dc, da, N, R, colour: O.color(R), peak: pk.lambda, refl: pk.R, peaks: peaksOf(R) };
}

/* Visible reflection bands: local maxima above half the strongest one. */
export function peaksOf(R: ArrayLike<number>) {
  let mx = 0;
  for (let i = 0; i < R.length; i++) if (O.WL[i] >= 390 && O.WL[i] <= 720) mx = Math.max(mx, R[i]);
  const out: number[] = [];
  for (let i = 1; i < R.length - 1; i++) {
    if (O.WL[i] < 390 || O.WL[i] > 720) continue;
    if (R[i] >= R[i - 1] && R[i] > R[i + 1] && R[i] > 0.5 * mx) out.push(O.WL[i]);
  }
  return out;
}

/* Quarter-wave rule: every layer one quarter of the target wavelength thick, optically (n·d = λ/4),
   so the echoes from every interface return in step. Then nudge the scale until the full
   calculation (not the textbook estimate) peaks exactly on target. */
export function designForWavelength(lambda: number, N: number, nf = 1): Design {
  let s = 1;
  for (let it = 0; it < 4; it++) {
    const R = O.spectrum(O.morphoStack({ dc: (s * lambda) / (4 * NC), da: (s * lambda) / (4 * nf), N, nf }), 0);
    const pk = O.peak(R, lambda - 90, lambda + 90).lambda;
    if (Math.abs(pk - lambda) < 2.5) break;
    s *= lambda / pk;
  }
  return evaluate((s * lambda) / (4 * NC), (s * lambda) / (4 * nf), N, nf);
}

/* ---------- colour matching ---------- */
const lin = (c: number) => (c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
export function oklab([r, g, b]: [number, number, number]): [number, number, number] {
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  return [0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s, 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s, 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s];
}
export function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16) / 255) as [number, number, number];
}

// Hue and chroma matter most: a structure cannot choose how bright the lamp is.
function distance(t: [number, number, number], c: [number, number, number], period: number) {
  const tc = Math.hypot(t[1], t[2]), cc = Math.hypot(c[1], c[2]);
  let dh = Math.atan2(c[2], c[1]) - Math.atan2(t[2], t[1]);
  dh = Math.abs(Math.atan2(Math.sin(dh), Math.cos(dh)));
  return dh * Math.min(tc, 0.2) * 2.5 + Math.abs(tc - cc) * 0.6 + Math.abs(t[0] - c[0]) * 0.25 + period * 0.00004;
}

// One coarse map of colour over (shelf, gap) at 8 shelves, built once and reused for every pick.
interface Cell { dc: number; da: number; lab: [number, number, number] }
const CELLS: [number, number][] = [];
for (let dc = 40; dc <= 200; dc += 10) for (let da = 60; da <= 500; da += 20) CELLS.push([dc, da]);
const GRIDS: Record<string, Cell[]> = {};
function fill(m: Material, until: number) {
  const G = (GRIDS[m] ??= []), { nf, N } = MATERIALS[m];
  while (G.length < Math.min(until, CELLS.length)) {
    const [dc, da] = CELLS[G.length];
    G.push({ dc, da, lab: oklab(O.color(O.spectrum(O.morphoStack({ dc, da, N, nf }), 0)).lin) });
  }
  return G;
}
const grid = (m: Material) => fill(m, Infinity);
/* Build the map a slice at a time so the page stays responsive; resolves when it is ready. */
export function warmGrid(m: Material): Promise<void> {
  return new Promise((done) => {
    const tick = () => { const G = fill(m, (GRIDS[m]?.length ?? 0) + 30); if (G.length < CELLS.length) setTimeout(tick, 0); else done(); };
    tick();
  });
}

export function designForColour(hex: string, N: number, m: Material = "air"): Design {
  const nf = MATERIALS[m].nf;
  const rgb = hexToRgb(hex);
  const t = oklab(rgb.map(lin) as [number, number, number]);
  let best = grid(m)[0], bd = Infinity;
  for (const g of grid(m)) { const d = distance(t, g.lab, g.dc + g.da); if (d < bd) { bd = d; best = g; } }
  // refine around the winner with the real shelf count
  let { dc, da } = best;
  bd = distance(t, oklab(O.color(O.spectrum(O.morphoStack({ dc, da, N, nf }), 0)).lin), dc + da);
  for (const step of [8, 4, 2, 1]) {
    let improved = true;
    while (improved) {
      improved = false;
      for (const [ddc, dda] of [[step, 0], [-step, 0], [0, 2 * step], [0, -2 * step]]) {
        const ndc = dc + ddc, nda = da + dda;
        if (ndc < 30 || ndc > 220 || nda < 50 || nda > 520) continue;
        const c = O.color(O.spectrum(O.morphoStack({ dc: ndc, da: nda, N, nf }), 0));
        const d = distance(t, oklab(c.lin), ndc + nda);
        if (d < bd - 1e-5) { bd = d; dc = ndc; da = nda; improved = true; }
      }
    }
  }
  return evaluate(dc, da, N, nf);
}

/* The colour that sits at a wavelength, as a hex, for seeding the colour picker. */
export function hexForWavelength(lambda: number) {
  const m = /rgb\((\d+),(\d+),(\d+)\)/.exec(O.wlColor(lambda))!;
  return "#" + [m[1], m[2], m[3]].map((v) => (+v).toString(16).padStart(2, "0")).join("");
}

export { evaluate };
