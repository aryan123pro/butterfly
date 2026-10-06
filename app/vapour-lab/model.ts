import * as O from "@/lib/optics";

/* A physical toy model of the Morpho vapour sensor (after Potyrailo et al. and the USAFA study).
   Vapour condenses in the gaps between lamellae (Langmuir uptake). Each vapour has its own
   refractive index and its own preference for the top (more polar) or bottom of the stack,
   and polar vapours swell the chitin slightly. That combination gives each one a distinct ΔR. */
export interface Vapour { key: string; name: string; n: number; K: number; top: number; bottom: number; swell: number; maxppm: number; color: string; cwa?: boolean }

export const VAPOURS: Vapour[] = [
  { key: "water", name: "Water", n: 1.333, K: 6000, top: 1.0, bottom: 0.35, swell: 0.035, maxppm: 20000, color: "#3fa9ff" },
  { key: "methanol", name: "Methanol", n: 1.329, K: 3000, top: 1.0, bottom: 0.45, swell: 0.012, maxppm: 10000, color: "#c78bff" },
  { key: "ethanol", name: "Ethanol", n: 1.361, K: 2600, top: 0.3, bottom: 1.0, swell: 0.006, maxppm: 10000, color: "#ffb547" },
  { key: "dmmp", name: "DMMP", n: 1.413, K: 70, top: 0.25, bottom: 0.95, swell: 0.0, maxppm: 200, color: "#ff5a6e", cwa: true },
  { key: "dcp", name: "Dichloropentane", n: 1.448, K: 110, top: 0.95, bottom: 0.25, swell: 0.0, maxppm: 300, color: "#39d98a", cwa: true },
];

const N = 8, DC = 75, DA = 110;

export function exposedStack(v: Vapour | null, ppm: number) {
  const theta = v ? ppm / (ppm + v.K) : 0;
  const s: O.Layer[] = [];
  for (let i = 0; i < N; i++) {
    const depth = i / (N - 1);
    s.push({ n: 1.56, d: DC * (1 + (v ? v.swell * theta : 0)) });
    if (i < N - 1) {
      const fill = v ? 0.35 * theta * (v.top * (1 - depth) + v.bottom * depth) : 0;
      s.push({ n: 1 + fill * ((v?.n ?? 1) - 1), d: DA });
    }
  }
  return { stack: s, theta };
}

export const BASE = O.spectrum(exposedStack(null, 0).stack, 0);

export function deltaR(v: Vapour | null, ppm: number, noise = 0) {
  const R = O.spectrum(exposedStack(v, ppm).stack, 0);
  const d = new Float32Array(R.length);
  for (let i = 0; i < R.length; i++) d[i] = R[i] - BASE[i] + (noise ? noise * gauss() : 0);
  return { R, d };
}

function gauss() { let u = 0, v = 0; while (!u) u = Math.random(); while (!v) v = Math.random(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); }

/* PCA by power iteration on the covariance of ΔR vectors. */
export function pca(X: Float32Array[], k = 2) {
  const n = X.length, d = X[0].length;
  const mean = new Float64Array(d);
  X.forEach((x) => x.forEach((v, j) => (mean[j] += v / n)));
  const C = Array.from({ length: d }, () => new Float64Array(d));
  for (const x of X) for (let a = 0; a < d; a++) { const xa = x[a] - mean[a]; for (let b = a; b < d; b++) C[a][b] += (xa * (x[b] - mean[b])) / (n - 1); }
  for (let a = 0; a < d; a++) for (let b = 0; b < a; b++) C[a][b] = C[b][a];
  let trace = 0; for (let a = 0; a < d; a++) trace += C[a][a];
  const comps: Float64Array[] = [], vals: number[] = [];
  for (let c = 0; c < k; c++) {
    let v = new Float64Array(d).map(() => Math.random() - 0.5);
    let lambda = 0;
    for (let it = 0; it < 200; it++) {
      const w = new Float64Array(d);
      for (let a = 0; a < d; a++) { let s = 0; for (let b = 0; b < d; b++) s += C[a][b] * v[b]; w[a] = s; }
      for (const u of comps) { let p = 0; for (let a = 0; a < d; a++) p += w[a] * u[a]; for (let a = 0; a < d; a++) w[a] -= p * u[a]; }
      let norm = 0; for (let a = 0; a < d; a++) norm += w[a] * w[a]; norm = Math.sqrt(norm) || 1;
      lambda = norm; v = w.map((x) => x / norm);
    }
    comps.push(v); vals.push(lambda);
  }
  const project = (x: Float32Array) => comps.map((u) => { let s = 0; for (let a = 0; a < d; a++) s += (x[a] - mean[a]) * u[a]; return s; });
  return { comps, vals, explained: vals.map((v) => v / trace), project };
}
