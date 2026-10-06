/* Morpho Lab optics engine.
   Real thin-film physics: transfer-matrix reflectance of a multilayer stack,
   integrated against CIE 1931 colour-matching functions to get the colour a
   human eye would see. Every structural colour on the site comes from here. */

export type Cx = [number, number];
export type Index = number | Cx;
export interface Layer { n: Index; d: number }
export interface Colour { rgb: [number, number, number]; lin: [number, number, number]; css: string; hex: string }

export const L0 = 380, L1 = 780, DL = 5;
export const WL: number[] = [];
for (let l = L0; l <= L1; l += DL) WL.push(l);

// ---- CIE 1931 2deg observer (multi-lobe Gaussian fit, Wyman/Sloan/Shirley 2013)
function g(x: number, m: number, s1: number, s2: number) { const t = (x - m) / (x < m ? s1 : s2); return Math.exp(-0.5 * t * t); }
export function cmf(l: number): [number, number, number] {
  return [
    1.056 * g(l, 599.8, 37.9, 31.0) + 0.362 * g(l, 442.0, 16.0, 26.7) - 0.065 * g(l, 501.1, 20.4, 26.2),
    0.821 * g(l, 568.8, 46.9, 40.5) + 0.286 * g(l, 530.9, 16.3, 31.1),
    1.217 * g(l, 437.0, 11.8, 36.0) + 0.681 * g(l, 459.0, 26.0, 13.8),
  ];
}
function planck(l: number, T: number) { const m = l * 1e-9; return 1 / (Math.pow(m, 5) * (Math.exp(1.4388e-2 / (m * T)) - 1)); }

const CMF = WL.map(cmf);
const ILL = WL.map((l) => planck(l, 6504)); // daylight-like source
const M = [[3.2406, -1.5372, -0.4986], [-0.9689, 1.8758, 0.0415], [0.0557, -0.2040, 1.0570]];
function mul3(m: number[][], v: number[]): [number, number, number] {
  return [m[0][0] * v[0] + m[0][1] * v[1] + m[0][2] * v[2], m[1][0] * v[0] + m[1][1] * v[1] + m[1][2] * v[2], m[2][0] * v[0] + m[2][1] * v[1] + m[2][2] * v[2]];
}
function xyzOf(R: ArrayLike<number> | number): [number, number, number] {
  let X = 0, Y = 0, Z = 0;
  for (let i = 0; i < WL.length; i++) {
    const w = ILL[i] * (typeof R === "number" ? R : R[i]);
    X += w * CMF[i][0]; Y += w * CMF[i][1]; Z += w * CMF[i][2];
  }
  return [X, Y, Z];
}
const Wlin = mul3(M, xyzOf(1));
const gamma = (c: number) => (c <= 0.0031308 ? 12.92 * c : 1.055 * Math.pow(c, 1 / 2.4) - 0.055);

// Bring an out-of-gamut linear colour back inside by desaturating toward its luminance.
function fitGamut(c: number[]): [number, number, number] {
  const Y = 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
  const mn = Math.min(c[0], c[1], c[2]);
  if (mn < 0) { const t = Y / (Y - mn + 1e-9); c = [Y + t * (c[0] - Y), Y + t * (c[1] - Y), Y + t * (c[2] - Y)]; }
  const mx = Math.max(c[0], c[1], c[2]);
  if (mx > 1) c = [c[0] / mx, c[1] / mx, c[2] / mx];
  return [Math.max(0, c[0]), Math.max(0, c[1]), Math.max(0, c[2])];
}
const hex2 = (v: number) => { const h = Math.round(v * 255).toString(16); return h.length < 2 ? "0" + h : h; };
export function fromRgb(s: [number, number, number], lin?: [number, number, number]): Colour {
  return {
    rgb: s, lin: lin || s,
    css: `rgb(${Math.round(s[0] * 255)},${Math.round(s[1] * 255)},${Math.round(s[2] * 255)})`,
    hex: "#" + s.map(hex2).join(""),
  };
}

/** Spectrum (array over WL, values 0..1) -> displayable colour under daylight. */
export function color(R: ArrayLike<number>, exposure = 1): Colour {
  let lin = mul3(M, xyzOf(R));
  lin = [lin[0] / Wlin[0] * exposure, lin[1] / Wlin[1] * exposure, lin[2] / Wlin[2] * exposure];
  const f = fitGamut(lin);
  return fromRgb([gamma(f[0]), gamma(f[1]), gamma(f[2])], f);
}

/** Linear mix of two colours, for fades in simulations. */
export function mix(a: Colour, b: Colour, t: number): Colour {
  const l: [number, number, number] = [0, 1, 2].map((i) => a.lin[i] + (b.lin[i] - a.lin[i]) * t) as [number, number, number];
  return fromRgb([gamma(l[0]), gamma(l[1]), gamma(l[2])], l);
}

// Colour of a single wavelength, for drawing rainbows and waves
const wlCache: Record<number, number[]> = {};
export function wlColor(l: number, alpha?: number): string {
  const key = Math.round(Math.max(360, Math.min(800, l)));
  if (!wlCache[key]) {
    const lin = mul3(M, cmf(key));
    const f = fitGamut([Math.max(lin[0], -1), lin[1], lin[2]]);
    const mx = Math.max(f[0], f[1], f[2], 1e-6);
    let edge = Math.min(1, (key - 380) / 40, (780 - key) / 60);
    edge = Math.max(0.25, edge);
    wlCache[key] = [gamma(f[0] / mx) * edge, gamma(f[1] / mx) * edge, gamma(f[2] / mx) * edge];
  }
  const c = wlCache[key];
  const r = Math.round(c[0] * 255), gg = Math.round(c[1] * 255), b = Math.round(c[2] * 255);
  return alpha == null ? `rgb(${r},${gg},${b})` : `rgba(${r},${gg},${b},${alpha})`;
}

// ---- complex helpers
const C = (re: number, im = 0): Cx => [re, im];
// Indices are given as n + ik (k > 0 absorbs). The characteristic-matrix method below uses the
// N = n - ik convention, so flip the sign here; otherwise an absorbing layer would amplify.
const cz = (n: Index): Cx => (typeof n === "number" ? [n, 0] : [n[0], -Math.abs(n[1])]);
const cadd = (a: Cx, b: Cx): Cx => [a[0] + b[0], a[1] + b[1]];
const csub = (a: Cx, b: Cx): Cx => [a[0] - b[0], a[1] - b[1]];
const cmul = (a: Cx, b: Cx): Cx => [a[0] * b[0] - a[1] * b[1], a[0] * b[1] + a[1] * b[0]];
const cdiv = (a: Cx, b: Cx): Cx => { const d = b[0] * b[0] + b[1] * b[1]; return [(a[0] * b[0] + a[1] * b[1]) / d, (a[1] * b[0] - a[0] * b[1]) / d]; };
function csqrt(a: Cx): Cx {
  const r = Math.sqrt(Math.hypot(a[0], a[1])), t = Math.atan2(a[1], a[0]) / 2;
  let z: Cx = [r * Math.cos(t), r * Math.sin(t)];
  if (z[1] > 0) z = [-z[0], -z[1]]; // decaying branch in the N = n - ik convention
  if (z[0] < 0 && Math.abs(z[1]) < 1e-12) z = [-z[0], 0];
  return z;
}
const ccos = (a: Cx): Cx => [Math.cos(a[0]) * Math.cosh(a[1]), -Math.sin(a[0]) * Math.sinh(a[1])];
const csin = (a: Cx): Cx => [Math.sin(a[0]) * Math.cosh(a[1]), Math.cos(a[0]) * Math.sinh(a[1])];

export interface StackOpts { n0?: Index; ns?: Index }

/** Reflectance of a stack (top layer first) for one wavelength and angle; s and p averaged. */
export function reflectance(stack: Layer[], lambda: number, thetaDeg: number, opts: StackOpts = {}): number {
  const n0 = cz(opts.n0 ?? 1);
  const ns = cz(opts.ns ?? [1.56, 0.3]); // melanin-darkened scale base absorbs what passes through
  const th = (thetaDeg * Math.PI) / 180;
  const kx = cmul(n0, C(Math.sin(th)));
  const cosIn = (n: Cx) => { const s = cdiv(kx, n); return csqrt(csub(C(1), cmul(s, s))); };
  const cos0 = cosIn(n0), cosS = cosIn(ns);
  let Rsum = 0;
  for (let pol = 0; pol < 2; pol++) {
    const eta = (n: Cx, c: Cx) => (pol === 0 ? cmul(n, c) : cdiv(n, c));
    let m11 = C(1), m12 = C(0), m21 = C(0), m22 = C(1);
    for (const layer of stack) {
      const n = cz(layer.n), cj = cosIn(n);
      const delta = cmul(C((2 * Math.PI * layer.d) / lambda), cmul(n, cj));
      const e = eta(n, cj), cs = ccos(delta), sn = csin(delta);
      const a12 = cdiv(cmul(C(0, 1), sn), e), a21 = cmul(cmul(C(0, 1), e), sn);
      const b11 = cadd(cmul(m11, cs), cmul(m12, a21));
      const b12 = cadd(cmul(m11, a12), cmul(m12, cs));
      const b21 = cadd(cmul(m21, cs), cmul(m22, a21));
      const b22 = cadd(cmul(m21, a12), cmul(m22, cs));
      m11 = b11; m12 = b12; m21 = b21; m22 = b22;
    }
    const es = eta(ns, cosS), e0 = eta(n0, cos0);
    const B = cadd(m11, cmul(m12, es)), Cc = cadd(m21, cmul(m22, es));
    const r = cdiv(csub(cmul(e0, B), Cc), cadd(cmul(e0, B), Cc));
    Rsum += r[0] * r[0] + r[1] * r[1];
  }
  return Math.min(1, Rsum / 2);
}

export function spectrum(stack: Layer[], thetaDeg = 0, opts?: StackOpts): Float32Array {
  const out = new Float32Array(WL.length);
  for (let i = 0; i < WL.length; i++) out[i] = reflectance(stack, WL[i], thetaDeg, opts);
  return out;
}

export interface MorphoParams { dc?: number; da?: number; N?: number; nc?: number; nf?: number }
/** The Morpho lamella stack: N chitin shelves separated by gaps of a fill medium. */
export function morphoStack(p: MorphoParams = {}): Layer[] {
  const { dc = 75, da = 110, N = 8, nc = 1.56, nf = 1.0 } = p;
  const s: Layer[] = [];
  for (let i = 0; i < N; i++) { s.push({ n: nc, d: dc }); if (i < N - 1) s.push({ n: nf, d: da }); }
  return s;
}
export function periodic(cell: Layer[], N: number): Layer[] {
  const s: Layer[] = [];
  for (let i = 0; i < N; i++) for (const c of cell) s.push({ n: c.n, d: c.d });
  return s;
}

/** First-order Bragg estimate for a two-material periodic stack. */
export function braggPeak(n1: number, d1: number, n2: number, d2: number, thetaDeg = 0, n0 = 1) {
  const s = n0 * Math.sin((thetaDeg * Math.PI) / 180);
  return 2 * (d1 * Math.sqrt(n1 * n1 - s * s) + d2 * Math.sqrt(n2 * n2 - s * s));
}

export function peak(R: ArrayLike<number>, lo = 0, hi = 9999) {
  let bi = -1;
  for (let i = 0; i < R.length; i++) {
    if (WL[i] < lo || WL[i] > hi) continue;
    if (bi < 0 || R[i] > R[bi]) bi = i;
  }
  return { lambda: WL[bi], R: R[bi], index: bi };
}
export const visiblePeak = (R: ArrayLike<number>) => peak(R, 400, 720);

/** Colour vs incidence angle as RGBA bytes; entry i is angle maxDeg*i/(n-1). Feeds the 3D shaders. */
export function angleLUT(stack: Layer[], n = 64, maxDeg = 80, exposure = 1, opts?: StackOpts) {
  const data = new Uint8Array(n * 4), colors: Colour[] = [];
  for (let i = 0; i < n; i++) {
    const c = color(spectrum(stack, (maxDeg * i) / (n - 1), opts), exposure);
    colors.push(c);
    data[i * 4] = Math.round(c.rgb[0] * 255); data[i * 4 + 1] = Math.round(c.rgb[1] * 255);
    data[i * 4 + 2] = Math.round(c.rgb[2] * 255); data[i * 4 + 3] = 255;
  }
  return { data, colors, maxDeg };
}

export const MEDIA = {
  air: { n: 1.0, label: "Air" },
  water: { n: 1.333, label: "Water" },
  methanol: { n: 1.329, label: "Methanol" },
  ethanol: { n: 1.361, label: "Ethanol" },
  ipa: { n: 1.377, label: "Isopropanol" },
  dmmp: { n: 1.413, label: "DMMP" },
  dcp: { n: 1.448, label: "Dichloropentane" },
  toluene: { n: 1.497, label: "Toluene" },
  chitin: { n: 1.56, label: "Chitin" },
} as const;
export type MediumKey = keyof typeof MEDIA;

/* ---------- canvas plotting ---------- */
export function setupCanvas(cv: HTMLCanvasElement) {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const w = cv.clientWidth || cv.width, h = cv.clientHeight || cv.height;
  if (cv.width !== Math.round(w * dpr) || cv.height !== Math.round(h * dpr)) { cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr); }
  const ctx = cv.getContext("2d")!;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  return { ctx, w, h };
}

export const INK = "#e4ebf3", MUTED = "#8796aa", FAINT = "#56637a", GRID = "#18212d", MORPHO = "#3fa9ff", CHITIN = "#d8b46e", GOOD = "#39d98a", BAD = "#ff5a6e", WARN = "#ffb547";

export interface Series { data: ArrayLike<number>; xs?: ArrayLike<number>; color?: string; width?: number; fill?: string; fillAlpha?: number; dash?: number[] }
export interface PlotOpts {
  x?: [number, number]; y?: [number, number]; xlabel?: string; ylabel?: string; spectral?: boolean;
  series?: Series[]; markers?: { x: number; label?: string; color?: string; row?: number }[];
  xticks?: number[]; yticks?: number[]; yfmt?: (v: number) => string; xfmt?: (v: number) => string; padL?: number;
}

export function plot(cv: HTMLCanvasElement, o: PlotOpts) {
  const { ctx, w, h } = setupCanvas(cv);
  const pad = { l: o.padL ?? 46, r: 14, t: 14, b: o.xlabel ? 38 : 24 };
  const pw = w - pad.l - pad.r, ph = h - pad.t - pad.b;
  const xr = o.x || [L0, L1], yr = o.y || [0, 1];
  const X = (v: number) => pad.l + ((v - xr[0]) / (xr[1] - xr[0])) * pw;
  const Y = (v: number) => pad.t + ph - ((v - yr[0]) / (yr[1] - yr[0])) * ph;
  ctx.clearRect(0, 0, w, h);
  ctx.font = '11px "IBM Plex Mono", ui-monospace, monospace';
  if (o.spectral) {
    for (let px = 0; px < pw; px++) {
      const lam = xr[0] + (px / pw) * (xr[1] - xr[0]);
      if (lam < 380 || lam > 780) continue;
      ctx.fillStyle = wlColor(lam, 0.9); ctx.fillRect(pad.l + px, pad.t + ph + 2, 1.2, 5);
    }
  }
  const xt = o.xticks || [400, 450, 500, 550, 600, 650, 700, 750];
  const yt = o.yticks || [0, 0.25, 0.5, 0.75, 1];
  ctx.strokeStyle = GRID; ctx.lineWidth = 1; ctx.fillStyle = FAINT;
  ctx.textAlign = "center"; ctx.textBaseline = "top";
  xt.forEach((v) => { ctx.beginPath(); ctx.moveTo(X(v) + 0.5, pad.t); ctx.lineTo(X(v) + 0.5, pad.t + ph); ctx.stroke(); ctx.fillText(o.xfmt ? o.xfmt(v) : String(v), X(v), pad.t + ph + 9); });
  ctx.textAlign = "right"; ctx.textBaseline = "middle";
  yt.forEach((v) => { ctx.beginPath(); ctx.moveTo(pad.l, Y(v) + 0.5); ctx.lineTo(pad.l + pw, Y(v) + 0.5); ctx.stroke(); ctx.fillText(o.yfmt ? o.yfmt(v) : Math.round(v * 100) + "%", pad.l - 6, Y(v)); });
  if (o.xlabel) { ctx.textAlign = "center"; ctx.textBaseline = "bottom"; ctx.fillText(o.xlabel, pad.l + pw / 2, h - 2); }
  if (o.ylabel) { ctx.save(); ctx.translate(11, pad.t + ph / 2); ctx.rotate(-Math.PI / 2); ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText(o.ylabel, 0, 0); ctx.restore(); }

  ctx.save(); ctx.beginPath(); ctx.rect(pad.l, pad.t - 2, pw, ph + 4); ctx.clip();
  const base = Y(Math.max(yr[0], 0));
  for (const sr of o.series || []) {
    const xs = sr.xs || WL, d = sr.data;
    if (!d || !d.length) continue;
    if (sr.fill === "spectral") {
      for (let i = 0; i < d.length - 1; i++) {
        ctx.fillStyle = wlColor(xs[i], sr.fillAlpha ?? 0.35);
        ctx.beginPath(); ctx.moveTo(X(xs[i]), base); ctx.lineTo(X(xs[i]), Y(d[i])); ctx.lineTo(X(xs[i + 1]), Y(d[i + 1])); ctx.lineTo(X(xs[i + 1]), base); ctx.closePath(); ctx.fill();
      }
    } else if (sr.fill) {
      ctx.fillStyle = sr.fill; ctx.beginPath(); ctx.moveTo(X(xs[0]), base);
      for (let k = 0; k < d.length; k++) ctx.lineTo(X(xs[k]), Y(d[k]));
      ctx.lineTo(X(xs[d.length - 1]), base); ctx.closePath(); ctx.fill();
    }
    ctx.strokeStyle = sr.color || INK; ctx.lineWidth = sr.width || 2; ctx.setLineDash(sr.dash || []);
    ctx.beginPath();
    for (let m = 0; m < d.length; m++) { const xx = X(xs[m]), yy = Y(d[m]); if (m) ctx.lineTo(xx, yy); else ctx.moveTo(xx, yy); }
    ctx.stroke(); ctx.setLineDash([]);
  }
  ctx.restore();
  for (const mk of o.markers || []) {
    ctx.strokeStyle = mk.color || INK; ctx.setLineDash([3, 3]); ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(X(mk.x) + 0.5, pad.t); ctx.lineTo(X(mk.x) + 0.5, pad.t + ph); ctx.stroke(); ctx.setLineDash([]);
    if (mk.label) {
      ctx.fillStyle = mk.color || INK; ctx.textBaseline = "top";
      const tx = X(mk.x), right = tx > pad.l + pw - 110;
      ctx.textAlign = right ? "right" : "left";
      ctx.fillText(mk.label, tx + (right ? -5 : 5), pad.t + 2 + (mk.row || 0) * 14);
    }
  }
  return { X, Y, pad, pw, ph, ctx, w, h };
}
