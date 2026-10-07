import * as O from "@/lib/optics";

/* A physical teaching model of the Morpho didius vapour sensor.

   What comes from the literature:
   - the five vapours and the 0.15–0.50 P/P0 range (Kittle et al., ACS Omega 2017, 2, 8301);
   - saturated vapour pressures at 20 °C: DMMP 1575 ppm and DCP 2750 ppm as quoted in that paper,
     water, methanol and ethanol from standard tables (2.34, 12.9 and 5.9 kPa);
   - refractive indices (n_D at 20 °C);
   - the mechanism: capillary condensation between lamellae (Potyrailo et al., Nat. Photonics 2007),
     on ridges whose tops are polar and whose bottoms are less polar (Potyrailo et al., PNAS 2013),
     with polar solvents also swelling the chitin;
   - a uniform ALD Al2O3 coat removes that gradient and the swelling, and with them the selectivity
     (Piszter et al., 2014–2016).
   What is tuned: the affinity constants, the depth preferences and the swelling magnitudes. They
   are chosen to follow the mechanism above, not fitted to one dataset. */
export interface Vapour {
  key: string; name: string; n: number; p0: number; // p0 in ppm at 20 °C
  c: number; top: number; bottom: number; swell: number; tauOff: number; color: string; cwa?: string;
}

export const VAPOURS: Vapour[] = [
  { key: "water", name: "Water", n: 1.333, p0: 23100, c: 3, top: 1.0, bottom: 0.25, swell: 0.03, tauOff: 90, color: "#3fa9ff" },
  { key: "methanol", name: "Methanol", n: 1.329, p0: 127000, c: 5, top: 0.9, bottom: 0.45, swell: 0.02, tauOff: 35, color: "#c78bff" },
  { key: "ethanol", name: "Ethanol", n: 1.361, p0: 58700, c: 6, top: 0.65, bottom: 0.75, swell: 0.012, tauOff: 40, color: "#ffb547" },
  { key: "dmmp", name: "DMMP", n: 1.413, p0: 1575, c: 12, top: 0.5, bottom: 0.9, swell: 0.006, tauOff: 60, color: "#ff5a6e", cwa: "nerve-agent simulant" },
  { key: "dcp", name: "Dichloropentane", n: 1.456, p0: 2750, c: 9, top: 0.2, bottom: 1.0, swell: 0, tauOff: 50, color: "#39d98a", cwa: "mustard-gas simulant" },
];

export const P_MIN = 0.05, P_MAX = 0.5, TRAIN_P = [0.15, 0.25, 0.5];
const N = 8, DC = 75, DA = 110;

/* Fraction of each gap filled at relative pressure x (BET-like uptake in P/P0). */
export function uptake(v: Vapour, x: number, coated = false) {
  const c = coated ? 6 : v.c;
  return Math.min(1, (c * x) / (1 + (c - 1) * x));
}

export function exposedStack(v: Vapour | null, theta: number, coated = false) {
  const s: O.Layer[] = [];
  for (let i = 0; i < N; i++) {
    const depth = i / (N - 1);
    const swell = v && !coated ? v.swell * theta : 0;
    s.push({ n: 1.56, d: DC * (1 + swell) });
    if (i < N - 1) {
      const pref = !v ? 0 : coated ? 0.6 : v.top * (1 - depth) + v.bottom * depth;
      const fill = v ? 0.4 * theta * pref : 0;
      s.push({ n: 1 + fill * ((v?.n ?? 1) - 1), d: DA });
    }
  }
  return s;
}

export const BASE = O.spectrum(exposedStack(null, 0), 0);

export function deltaR(v: Vapour | null, theta: number, coated = false, noise = 0) {
  const R = O.spectrum(exposedStack(v, theta, coated), 0);
  const d = new Float32Array(R.length);
  for (let i = 0; i < R.length; i++) d[i] = R[i] - BASE[i] + (noise ? noise * gauss() : 0);
  return { R, d };
}

function gauss() { let u = 0, v = 0; while (!u) u = Math.random(); while (!v) v = Math.random(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); }

/* Calibration set like the paper's: every vapour at 0.15, 0.25 and 0.50 P/P0, four noisy repeats. */
export function calibration(coated: boolean) {
  const X: Float32Array[] = [], lab: string[] = [];
  for (const v of VAPOURS) for (const x of TRAIN_P) for (let r = 0; r < 4; r++) { X.push(deltaR(v, uptake(v, x, coated), coated, 0.004).d); lab.push(v.key); }
  return { X, lab };
}

/* PCA by power iteration on the covariance of ΔR vectors. */
export function pca(X: Float32Array[], k = 3) {
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
