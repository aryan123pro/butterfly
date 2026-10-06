/* Structural-colour materials for the 3D scenes.
   Colour comes from a look-up table (colour vs angle of incidence) computed by the
   optics engine, so what you see in 3D is the same physics as the charts. */
import * as THREE from "three";

export function lutTexture(data: Uint8Array) {
  const tex = new THREE.DataTexture(new Uint8Array(data), data.length / 4, 1, THREE.RGBAFormat);
  tex.magFilter = THREE.LinearFilter; tex.minFilter = THREE.LinearFilter; tex.generateMipmaps = false;
  tex.needsUpdate = true;
  return tex;
}
export function updateLut(tex: THREE.DataTexture, data: Uint8Array) {
  (tex.image.data as Uint8Array).set(data); tex.needsUpdate = true;
}

/* N, V in world space. Returns linear colour; highlights exceed 1 so bloom picks them up. */
export const STRUCT_GLSL = /* glsl */ `
uniform sampler2D uLut; uniform float uMaxAng; uniform vec3 uLight; uniform float uSpread; uniform float uGain;
vec3 safeNormal(vec3 n){ return dot(n, n) > 1e-12 ? normalize(n) : vec3(0.0, 1.0, 0.0); }
vec3 lutAt(float th){ vec3 c = texture2D(uLut, vec2(clamp(th / uMaxAng, 0.0, 1.0), 0.5)).rgb; return pow(c, vec3(2.2)); }
vec3 structural(vec3 N, vec3 V){
  vec3 L = normalize(uLight); vec3 H = normalize(L + V);
  float cosI = clamp(dot(V, H), 0.0, 1.0);
  vec3 spec = lutAt(acos(cosI));
  float lobe = pow(max(dot(N, H), 0.0), uSpread);
  float nv = max(dot(N, V), 0.0);
  vec3 diffuseView = lutAt(acos(nv));
  float rim = pow(1.0 - nv, 3.0);
  return uGain * (spec * (0.02 + 2.8 * lobe) + 0.1 * diffuseView * nv + 0.4 * rim * diffuseView);
}`;

export function structUniforms(lut: THREE.DataTexture, maxDeg = 80) {
  return {
    uLut: { value: lut }, uMaxAng: { value: (maxDeg * Math.PI) / 180 },
    uLight: { value: new THREE.Vector3(0.3, 1.0, 0.5) }, uSpread: { value: 3.5 }, uGain: { value: 1.0 },
  };
}

// A single NaN pixel gets smeared across the frame by bloom, so sanitise before output.
const TAIL = /* glsl */ `
  if (!(gl_FragColor.r >= 0.0 && gl_FragColor.g >= 0.0 && gl_FragColor.b >= 0.0)) gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);
  gl_FragColor.rgb = min(gl_FragColor.rgb, vec3(24.0));
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
`;
export const SAFE_NORMAL = /* glsl */ `
vec3 safeNormal(vec3 n){ return dot(n, n) > 1e-12 ? normalize(n) : vec3(0.0, 1.0, 0.0); }
`;

/* Generic structural material. Works on instanced meshes; instanceColor.r is a per-instance seed. */
export function structuralMaterial(lut: THREE.DataTexture, o: { spread?: number; gain?: number; base?: THREE.ColorRepresentation; edge?: number; stripesU?: number; stripesV?: number } = {}) {
  const u = {
    ...structUniforms(lut), uBase: { value: new THREE.Color(o.base ?? "#03060c") }, uEdge: { value: o.edge ?? 0 },
    uStripes: { value: new THREE.Vector2(o.stripesU ?? 0, o.stripesV ?? 0) },
  };
  u.uSpread.value = o.spread ?? 6; u.uGain.value = o.gain ?? 1;
  return new THREE.ShaderMaterial({
    side: THREE.DoubleSide, uniforms: u,
    vertexShader: SAFE_NORMAL + /* glsl */ `
      varying vec3 vN; varying vec3 vW; varying vec2 vUv; varying float vSeed;
      void main(){
        vUv = uv; vSeed = 0.5;
        mat4 m = modelMatrix;
        #ifdef USE_INSTANCING
          m = modelMatrix * instanceMatrix;
        #endif
        #ifdef USE_INSTANCING_COLOR
          vSeed = instanceColor.r;
        #endif
        vec4 w = m * vec4(position, 1.0); vW = w.xyz;
        vN = safeNormal(mat3(m) * normal);
        gl_Position = projectionMatrix * viewMatrix * w;
      }`,
    fragmentShader: STRUCT_GLSL + /* glsl */ `
      uniform vec3 uBase; uniform float uEdge; uniform vec2 uStripes;
      varying vec3 vN; varying vec3 vW; varying vec2 vUv; varying float vSeed;
      void main(){
        vec3 N = safeNormal(vN); vec3 V = normalize(cameraPosition - vW);
        if (!gl_FrontFacing) N = -N;
        // ridges running along a scale: tilt the normal across each stripe
        if (uStripes.x > 0.0) { float s = fract(vUv.x * uStripes.x) - 0.5; N = normalize(N + vec3(s * 0.9, 0.0, 0.0)); }
        vec3 c = structural(N, V) * (0.8 + 0.4 * vSeed) + uBase;
        if (uStripes.x > 0.0) c *= 0.7 + 0.3 * (1.0 - smoothstep(0.0, 0.5, abs(fract(vUv.x * uStripes.x) - 0.5)));
        if (uStripes.y > 0.0) c *= 0.82 + 0.18 * step(0.5, fract(vUv.y * uStripes.y));
        float e = smoothstep(0.0, 0.08, vUv.x) * (1.0 - smoothstep(0.92, 1.0, vUv.x)) * smoothstep(0.0, 0.05, vUv.y);
        c *= mix(1.0, 0.35 + 0.65 * e, uEdge);
        gl_FragColor = vec4(c, 1.0);
        ${TAIL}
      }`,
  });
}

/* ---------- butterfly wings ---------- */
type Pt = [number, number];
export type WingDef = [Pt, ...[Pt, Pt, Pt][]];
export const FORE: WingDef = [[0.05, 0.12], [[0.55, 0.62], [1.45, 1.12], [2.3, 1.08]], [[2.44, 0.72], [2.3, 0.12], [2.02, -0.22]], [[1.45, -0.36], [0.62, -0.22], [0.05, -0.08]]];
export const HIND: WingDef = [[0.05, -0.02], [[0.85, 0.02], [1.85, -0.16], [2.02, -0.62]], [[2.1, -1.22], [1.5, -1.74], [0.9, -1.76]], [[0.42, -1.68], [0.12, -1.05], [0.05, -0.32]]];
const UX = 2.5, VY0 = -1.85, VH = 3.05;

function shapeFrom(def: WingDef, sx: number) {
  const s = new THREE.Shape(); s.moveTo(def[0][0] * sx, def[0][1]);
  for (let i = 1; i < def.length; i++) { const c = def[i] as [Pt, Pt, Pt]; s.bezierCurveTo(c[0][0] * sx, c[0][1], c[1][0] * sx, c[1][1], c[2][0] * sx, c[2][1]); }
  return s;
}
const toPx = (x: number, y: number, W: number, H: number): Pt => [(x / UX) * W, (1 - (y - VY0) / VH) * H];
function pathOnCanvas(g: CanvasRenderingContext2D, def: WingDef, W: number, H: number) {
  const a = toPx(def[0][0], def[0][1], W, H); g.moveTo(a[0], a[1]);
  for (let i = 1; i < def.length; i++) {
    const c = def[i] as [Pt, Pt, Pt];
    const p1 = toPx(c[0][0], c[0][1], W, H), p2 = toPx(c[1][0], c[1][1], W, H), p3 = toPx(c[2][0], c[2][1], W, H);
    g.bezierCurveTo(p1[0], p1[1], p2[0], p2[1], p3[0], p3[1]);
  }
}

/** Wing geometry in the XZ plane (y up), finely subdivided so the vertex shader can bend it. */
export function wingGeometry(def: WingDef, sx: number) {
  const flat = new THREE.ShapeGeometry(shapeFrom(def, sx), 48);
  // re-mesh on a fine grid clipped to the outline, so bending is smooth
  const pts = shapeFrom(def, sx).getSpacedPoints(160).map((p) => new THREE.Vector2(p.x, p.y));
  const inside = (x: number, y: number) => {
    let c = false;
    for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
      const a = pts[i], b = pts[j];
      if (a.y > y !== b.y > y && x < ((b.x - a.x) * (y - a.y)) / (b.y - a.y) + a.x) c = !c;
    }
    return c;
  };
  flat.computeBoundingBox();
  const bb = flat.boundingBox!;
  const n = 72, pos: number[] = [], idx: number[] = [];
  const pad = 0.04;
  const x0 = bb.min.x - pad, y0 = bb.min.y - pad;
  const dx = (bb.max.x - bb.min.x + 2 * pad) / n, dy = (bb.max.y - bb.min.y + 2 * pad) / n;
  const ins: boolean[] = [];
  for (let j = 0; j <= n; j++) for (let i = 0; i <= n; i++) ins.push(inside(x0 + i * dx, y0 + j * dy));
  const at = (i: number, j: number) => (i < 0 || j < 0 || i > n || j > n ? false : ins[j * (n + 1) + i]);
  // vertices: inside points as-is; outside points next to the wing snap onto the outline
  const map = new Int32Array((n + 1) * (n + 1)).fill(-1);
  for (let j = 0; j <= n; j++) for (let i = 0; i <= n; i++) {
    let x = x0 + i * dx, y = y0 + j * dy;
    if (!at(i, j)) {
      let near = false;
      for (let b = -1; b <= 1 && !near; b++) for (let a = -1; a <= 1; a++) if (at(i + a, j + b)) { near = true; break; }
      if (!near) continue;
      let best = Infinity, bx = x, by = y;
      for (let k = 0; k < pts.length; k++) {
        const p = pts[k], q = pts[(k + 1) % pts.length];
        const vx = q.x - p.x, vy = q.y - p.y, L2 = vx * vx + vy * vy || 1;
        const t = Math.max(0, Math.min(1, ((x - p.x) * vx + (y - p.y) * vy) / L2));
        const cx = p.x + t * vx, cy = p.y + t * vy, d2 = (cx - x) ** 2 + (cy - y) ** 2;
        if (d2 < best) { best = d2; bx = cx; by = cy; }
      }
      x = bx; y = by;
    }
    map[j * (n + 1) + i] = pos.length / 3;
    pos.push(x, y, 0);
  }
  for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
    if (!(at(i, j) || at(i + 1, j) || at(i, j + 1) || at(i + 1, j + 1))) continue;
    const a = map[j * (n + 1) + i], b = map[j * (n + 1) + i + 1], c = map[(j + 1) * (n + 1) + i], d = map[(j + 1) * (n + 1) + i + 1];
    if (a < 0 || b < 0 || c < 0 || d < 0) continue;
    idx.push(a, b, d, a, d, c);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  const uv: number[] = [];
  for (let i = 0; i < pos.length; i += 3) uv.push(Math.abs(pos[i]) / UX, (pos[i + 1] - VY0) / VH);
  geo.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
  geo.setIndex(idx);
  geo.rotateX(-Math.PI / 2);
  geo.computeVertexNormals();
  flat.dispose();
  return geo;
}

// Top side: R = structural region, B = white marginal spots. Veins and border are dark.
export function topMask() {
  const W = 1024, H = 1024, cv = document.createElement("canvas"); cv.width = W; cv.height = H;
  const g = cv.getContext("2d")!;
  g.fillStyle = "#000"; g.fillRect(0, 0, W, H);
  [FORE, HIND].forEach((def, wi) => {
    g.save(); g.beginPath(); pathOnCanvas(g, def, W, H); g.closePath(); g.clip();
    g.fillStyle = "rgb(255,0,0)"; g.fillRect(0, 0, W, H);
    g.beginPath(); pathOnCanvas(g, def, W, H); g.closePath();
    g.strokeStyle = "#000"; g.lineWidth = wi === 0 ? 74 : 56; g.filter = "blur(9px)"; g.stroke(); g.filter = "none";
    const root = toPx(0.05, wi === 0 ? 0.02 : -0.2, W, H);
    const rg = g.createRadialGradient(root[0], root[1], 0, root[0], root[1], 170);
    rg.addColorStop(0, "rgba(0,0,0,.92)"); rg.addColorStop(1, "rgba(0,0,0,0)"); g.fillStyle = rg; g.fillRect(0, 0, W, H);
    g.strokeStyle = "rgba(0,0,0,.6)"; g.lineWidth = 3.2;
    const hy = wi === 0 ? 0.25 : -0.45, hub = toPx(0.55, hy, W, H);
    const ends: Pt[] = wi === 0
      ? [[2.25, 1.05], [2.38, 0.8], [2.36, 0.5], [2.28, 0.22], [2.1, -0.12], [1.6, -0.3], [1.0, -0.28]]
      : [[1.98, -0.55], [2.05, -0.9], [1.85, -1.35], [1.5, -1.65], [1.1, -1.75], [0.7, -1.7], [0.35, -1.45]];
    for (const e of ends) {
      const p = toPx(e[0], e[1], W, H), mid = toPx((e[0] + 0.55) / 2 + 0.05, (e[1] + hy) / 2, W, H);
      g.beginPath(); g.moveTo(hub[0], hub[1]); g.quadraticCurveTo(mid[0], mid[1], p[0], p[1]); g.stroke();
    }
    const r0 = toPx(0.06, wi === 0 ? 0.05 : -0.1, W, H);
    g.beginPath(); g.moveTo(r0[0], r0[1]); g.lineTo(hub[0], hub[1]); g.lineWidth = 5; g.stroke();
    g.restore();
  });
  g.fillStyle = "rgb(0,0,255)";
  ([[2.12, 0.94], [2.22, 0.76], [2.25, 0.55], [2.2, 0.33], [2.09, 0.1], [1.9, -0.1]] as Pt[]).forEach((s, i) => {
    const p = toPx(s[0], s[1], W, H); g.beginPath(); g.arc(p[0], p[1], 6.5 - i * 0.5, 0, 6.3); g.fill();
  });
  ([[1.86, -0.82], [1.7, -1.26], [1.38, -1.55], [1.0, -1.65]] as Pt[]).forEach((s) => {
    const p = toPx(s[0], s[1], W, H); g.beginPath(); g.arc(p[0], p[1], 4, 0, 6.3); g.fill();
  });
  const tex = new THREE.CanvasTexture(cv); tex.anisotropy = 8; return tex;
}

// Underside: brown pigment with eyespots. No structural colour here.
export function underTexture() {
  const W = 1024, H = 1024, cv = document.createElement("canvas"); cv.width = W; cv.height = H;
  const g = cv.getContext("2d")!;
  g.fillStyle = "#5a3b22"; g.fillRect(0, 0, W, H);
  [FORE, HIND].forEach((def, wi) => {
    g.save(); g.beginPath(); pathOnCanvas(g, def, W, H); g.closePath(); g.clip();
    const lg = g.createLinearGradient(0, 0, W, 0);
    lg.addColorStop(0, "#3b2414"); lg.addColorStop(0.45, "#7a5532"); lg.addColorStop(0.8, "#93693e"); lg.addColorStop(1, "#4a2f1a");
    g.fillStyle = lg; g.fillRect(0, 0, W, H);
    // wavy bands
    g.strokeStyle = "rgba(40,24,12,.45)"; g.lineWidth = 10;
    for (let k = 0; k < 5; k++) { g.beginPath(); for (let y = 0; y <= H; y += 16) { const x = W * (0.3 + k * 0.13) + Math.sin(y * 0.02 + k) * 14; if (y) g.lineTo(x, y); else g.moveTo(x, y); } g.stroke(); }
    g.beginPath(); pathOnCanvas(g, def, W, H); g.closePath(); g.lineWidth = 30; g.strokeStyle = "rgba(30,18,8,.8)"; g.stroke();
    const eyes: [number, number, number][] = wi === 0 ? [[1.55, 0.55, 46], [1.75, 0.12, 40], [1.15, 0.2, 34]] : [[1.35, -0.6, 52], [1.45, -1.1, 46], [0.95, -1.35, 40]];
    for (const e of eyes) {
      const p = toPx(e[0], e[1], W, H), r = e[2];
      for (const [col, k] of [["#e8c66a", 1], ["#1a120b", 0.78], ["#c78a3a", 0.5], ["#120c07", 0.34], ["#f4f0e6", 0.12]] as [string, number][]) {
        g.fillStyle = col; g.beginPath(); g.arc(p[0], p[1], r * k, 0, 6.3); g.fill();
      }
    }
    g.restore();
  });
  const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8; return tex;
}

export function wingMaterial(lut: THREE.DataTexture) {
  return new THREE.ShaderMaterial({
    side: THREE.DoubleSide,
    uniforms: {
      ...structUniforms(lut), uMask: { value: topMask() }, uUnder: { value: underTexture() },
      uPigment: { value: 0 }, uGlint: { value: 1 }, uBend: { value: 0 }, uTime: { value: 0 },
    },
    vertexShader: SAFE_NORMAL + /* glsl */ `
      uniform float uBend;
      varying vec3 vN; varying vec3 vW; varying vec2 vUv;
      void main(){
        vUv = uv;
        vec3 p = position;
        float ax = abs(p.x);
        p.y += uBend * 0.16 * ax * ax;
        float dydx = uBend * 0.32 * ax * sign(p.x);
        vec3 n = normalize(vec3(-dydx, 1.0, 0.0));
        vec4 w = modelMatrix * vec4(p, 1.0); vW = w.xyz;
        vN = safeNormal(mat3(modelMatrix) * n);
        gl_Position = projectionMatrix * viewMatrix * w;
      }`,
    fragmentShader: STRUCT_GLSL + /* glsl */ `
      uniform sampler2D uMask; uniform sampler2D uUnder; uniform float uPigment; uniform float uGlint; uniform float uTime;
      varying vec3 vN; varying vec3 vW; varying vec2 vUv;
      float h21(vec2 p){ return fract(sin(dot(p, vec2(12.9898,78.233))) * 43758.5453); }
      void main(){
        vec3 N = safeNormal(vN); vec3 V = normalize(cameraPosition - vW);
        if (!gl_FrontFacing) N = -N;
        vec3 L = normalize(uLight);
        // scales: overlapping rows of tiles, each tilted a little, so the wing glitters
        vec2 su = vUv * vec2(140.0, 180.0); su.x += step(1.0, mod(floor(su.y), 2.0)) * 0.5;
        vec2 cell = floor(su); vec2 f = fract(su); float r = h21(cell);
        vec3 tilt = vec3(r - 0.5, 0.0, h21(cell + 7.1) - 0.5) * 0.16 * uGlint;
        vec3 Ns = normalize(N + tilt);
        float seam = mix(1.0, smoothstep(0.0, 0.14, f.y) * (0.9 + 0.1 * f.y), 0.55);
        vec3 c;
        if (gl_FrontFacing) {
          vec4 m = texture2D(uMask, vUv);
          vec3 blue = structural(Ns, V);
          float sparkle = pow(h21(cell + floor(uTime * 2.0)), 40.0) * pow(max(dot(Ns, normalize(L + V)), 0.0), 8.0) * 3.0 * uGlint;
          vec3 pig = vec3(0.012, 0.06, 0.55) * (0.2 + 0.8 * max(dot(N, L), 0.0));
          vec3 col = mix(blue + sparkle * blue, pig, uPigment) * seam;
          vec3 dark = vec3(0.004, 0.003, 0.004) + 0.03 * pow(max(dot(N, normalize(L + V)), 0.0), 24.0);
          vec3 spot = vec3(0.85, 0.82, 0.76) * (0.3 + 0.7 * max(dot(N, L), 0.0));
          c = mix(dark, col, m.r); c = mix(c, spot, m.b);
        } else {
          vec3 u = texture2D(uUnder, vUv).rgb;
          c = u * (0.25 + 0.75 * max(dot(N, L), 0.0)) * seam;
        }
        gl_FragColor = vec4(c, 1.0);
        ${TAIL}
      }`,
  });
}

