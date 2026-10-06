"use client";
import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { STRUCT_GLSL } from "@/lib/scene/materials";

export const NOTE_W = 6.6, NOTE_H = 2.9, STRIPE_X = 0.95, STRIPE_W = 0.46;

/* A fictional specimen note. Clearly marked SPECIMEN; it imitates no real currency. */
function noteTexture() {
  const W = 2048, H = Math.round((2048 * NOTE_H) / NOTE_W), cv = document.createElement("canvas"); cv.width = W; cv.height = H;
  const g = cv.getContext("2d")!;
  const bg = g.createLinearGradient(0, 0, W, H); bg.addColorStop(0, "#d8d6c4"); bg.addColorStop(0.5, "#cfd3c4"); bg.addColorStop(1, "#c7c4b6");
  g.fillStyle = bg; g.fillRect(0, 0, W, H);
  // guilloche rosettes
  const rosette = (cx: number, cy: number, R: number, k: number, col: string) => {
    g.strokeStyle = col; g.lineWidth = 1.2;
    for (let j = 0; j < 18; j++) {
      g.beginPath();
      for (let i = 0; i <= 720; i++) {
        const t = (i / 720) * Math.PI * 2, r = R * (0.62 + 0.38 * Math.cos(k * t + j * 0.35));
        const x = cx + r * Math.cos(t + j * 0.02), y = cy + r * Math.sin(t + j * 0.02);
        if (i) g.lineTo(x, y); else g.moveTo(x, y);
      }
      g.stroke();
    }
  };
  rosette(W * 0.2, H * 0.52, H * 0.36, 9, "rgba(46,90,96,.28)");
  rosette(W * 0.82, H * 0.5, H * 0.3, 12, "rgba(92,62,110,.24)");
  // wave lines across the note
  g.strokeStyle = "rgba(40,70,80,.18)"; g.lineWidth = 1;
  for (let k = 0; k < 60; k++) { g.beginPath(); for (let x = 0; x <= W; x += 8) { const y = k * (H / 60) + 6 * Math.sin(x * 0.01 + k * 0.4); if (x) g.lineTo(x, y); else g.moveTo(x, y); } g.stroke(); }
  // frame
  g.strokeStyle = "rgba(30,50,60,.55)"; g.lineWidth = 6; g.strokeRect(26, 26, W - 52, H - 52);
  g.lineWidth = 1.5; g.strokeRect(44, 44, W - 88, H - 88);
  // text
  g.fillStyle = "#23383d"; g.font = "800 72px Georgia, serif"; g.textBaseline = "top"; g.fillText("MORPHO RESERVE", 90, 80);
  g.font = "600 30px Georgia, serif"; g.fillStyle = "#3b4d50"; g.fillText("FIVE HUNDRED LAB CREDITS", 92, 168);
  g.font = "900 240px Georgia, serif"; g.fillStyle = "rgba(35,56,61,.9)"; g.fillText("500", 90, H - 330);
  g.font = "600 34px 'Courier New', monospace"; g.fillStyle = "#9b2a2a"; g.fillText("MR 0042 1665", W - 400, H - 110);
  g.font = "500 13px 'Courier New', monospace"; g.fillStyle = "rgba(35,56,61,.7)";
  for (let x = 90; x < W * 0.52; x += 132) g.fillText("MORPHOLAB·", x, 228);
  // emblem: a butterfly drawn in engraved lines
  const ex = W * 0.4, ey = H * 0.55;
  g.strokeStyle = "rgba(35,56,61,.75)";
  for (let s = 0; s < 14; s++) {
    g.lineWidth = 1.4; const k = 1 - s * 0.055;
    for (const sx of [1, -1]) {
      g.beginPath(); g.moveTo(ex, ey);
      g.bezierCurveTo(ex + sx * 120 * k, ey - 260 * k, ex + sx * 330 * k, ey - 230 * k, ex + sx * 300 * k, ey - 60 * k);
      g.bezierCurveTo(ex + sx * 280 * k, ey + 40 * k, ex + sx * 160 * k, ey + 30 * k, ex, ey);
      g.bezierCurveTo(ex + sx * 160 * k, ey + 60 * k, ex + sx * 240 * k, ey + 220 * k, ex + sx * 120 * k, ey + 230 * k);
      g.bezierCurveTo(ex + sx * 60 * k, ey + 230 * k, ex + sx * 20 * k, ey + 120 * k, ex, ey);
      g.stroke();
    }
  }
  // watermark window
  const wx = W * 0.83, wy = H * 0.48;
  const wg = g.createRadialGradient(wx, wy, 10, wx, wy, 190); wg.addColorStop(0, "rgba(255,255,250,.55)"); wg.addColorStop(1, "rgba(255,255,250,0)");
  g.fillStyle = wg; g.beginPath(); g.ellipse(wx, wy, 170, 210, 0, 0, Math.PI * 2); g.fill();
  // specimen overprint
  g.save(); g.translate(W * 0.52, H * 0.55); g.rotate(-0.16);
  g.font = "800 92px Georgia, serif"; g.fillStyle = "rgba(160,40,40,.22)"; g.textAlign = "center"; g.fillText("SPECIMEN · NOT TENDER", 0, 0);
  g.restore();
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t;
}

function patternTexture(kind: "motif" | "dots") {
  const S = 256, cv = document.createElement("canvas"); cv.width = S; cv.height = S;
  const g = cv.getContext("2d")!;
  g.fillStyle = "#000"; g.fillRect(0, 0, S, S); g.fillStyle = "#fff"; g.strokeStyle = "#fff";
  if (kind === "motif") {
    // a butterfly and "500", alternating rows
    g.save(); g.translate(S / 2, S * 0.3);
    for (const sx of [1, -1]) { g.beginPath(); g.ellipse(sx * 34, -8, 34, 24, sx * -0.5, 0, Math.PI * 2); g.fill(); g.beginPath(); g.ellipse(sx * 24, 26, 20, 16, sx * 0.5, 0, Math.PI * 2); g.fill(); }
    g.restore();
    g.font = "900 64px Georgia, serif"; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText("500", S / 2, S * 0.78);
  } else {
    for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) { g.beginPath(); g.arc(32 + x * 64, 32 + y * 64, 9, 0, Math.PI * 2); g.fill(); }
  }
  const t = new THREE.CanvasTexture(cv); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8; return t;
}

export interface StripeFx { shift: boolean; move: boolean; depth: boolean; printed: boolean }

export default function Banknote({ lutA, lutB, tilt, fx, light }: {
  lutA: THREE.DataTexture; lutB: THREE.DataTexture; tilt: number; fx: StripeFx; light: THREE.Vector3;
}) {
  const group = useRef<THREE.Group>(null!);
  const tex = useMemo(() => noteTexture(), []);
  const paper = useMemo(() => new THREE.MeshPhysicalMaterial({ map: tex, roughness: 0.82, sheen: 0.4, sheenColor: new THREE.Color("#fffbe8") }), [tex]);
  const stripe = useMemo(() => new THREE.ShaderMaterial({
    uniforms: {
      uLut: { value: lutA }, uLutB: { value: lutB }, uMaxAng: { value: (80 * Math.PI) / 180 }, uLight: { value: light.clone() },
      uSpread: { value: 3.0 }, uGain: { value: 1 }, uPat: { value: patternTexture("motif") }, uDots: { value: patternTexture("dots") },
      uShift: { value: 1 }, uMove: { value: 1 }, uDepth: { value: 1 }, uPrinted: { value: 0 },
    },
    vertexShader: /* glsl */ `
      varying vec3 vN; varying vec3 vW; varying vec2 vUv; varying vec3 vT; varying vec3 vB;
      void main(){ vUv = uv; vec4 w = modelMatrix * vec4(position,1.0); vW = w.xyz;
        vN = normalize(mat3(modelMatrix) * normal); vT = normalize(mat3(modelMatrix) * vec3(0.0,1.0,0.0)); vB = normalize(mat3(modelMatrix) * vec3(1.0,0.0,0.0));
        gl_Position = projectionMatrix * viewMatrix * w; }`,
    fragmentShader: STRUCT_GLSL + /* glsl */ `
      uniform sampler2D uLutB; uniform sampler2D uPat; uniform sampler2D uDots;
      uniform float uShift; uniform float uMove; uniform float uDepth; uniform float uPrinted;
      varying vec3 vN; varying vec3 vW; varying vec2 vUv; varying vec3 vT; varying vec3 vB;
      vec3 lutB(float th){ vec3 c = texture2D(uLutB, vec2(clamp(th / uMaxAng, 0.0, 1.0), 0.5)).rgb; return pow(c, vec3(2.2)); }
      void main(){
        vec3 N = normalize(vN); if (!gl_FrontFacing) N = -N;
        vec3 V = normalize(cameraPosition - vW); vec3 L = normalize(uLight); vec3 H = normalize(L + V);
        float th = acos(clamp(dot(V, H), 0.0, 1.0));
        float thc = mix(0.12, th, uShift * (1.0 - uPrinted));
        float sT = dot(V, vT), sB = dot(V, vB);
        // movement: the motif rolls along the stripe as the note tilts
        vec2 uvm = vec2(vUv.x, vUv.y * 5.0 + sT * 2.2 * uMove * (1.0 - uPrinted));
        float m = texture2D(uPat, uvm).r;
        // depth: a second layer that moves the other way, so it reads as sitting deeper
        vec2 uvd = vec2(vUv.x * 1.5 - sB * 0.6 * uDepth, vUv.y * 7.5 - sT * 3.5 * uDepth) ;
        float d = texture2D(uDots, uvd).r * uDepth * (1.0 - uPrinted);
        vec3 a = lutAt(thc), b = lutB(thc);
        float lobe = pow(max(dot(N, H), 0.0), uSpread);
        float light = mix(0.12 + 1.5 * lobe, 0.55 + 0.35 * max(dot(N, L), 0.0), uPrinted);
        vec3 col = mix(a, b, m) * light;
        col += d * mix(b, a, 0.5) * 0.55 * light;
        float edge = smoothstep(0.0, 0.04, vUv.x) * (1.0 - smoothstep(0.96, 1.0, vUv.x));
        col *= 0.55 + 0.45 * edge;
        gl_FragColor = vec4(col, 1.0);
        if (!(gl_FragColor.r >= 0.0 && gl_FragColor.g >= 0.0 && gl_FragColor.b >= 0.0)) gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
  }), [lutA, lutB, light]);
  useEffect(() => () => { tex.dispose(); paper.dispose(); stripe.dispose(); }, [tex, paper, stripe]);
  useFrame(() => {
    const r = -(tilt * Math.PI) / 180;
    group.current.rotation.x += (r - group.current.rotation.x) * 0.15;
    const u = stripe.uniforms;
    u.uShift.value = fx.shift ? 1 : 0; u.uMove.value = fx.move ? 1 : 0; u.uDepth.value = fx.depth ? 1 : 0; u.uPrinted.value = fx.printed ? 1 : 0;
    (u.uLight.value as THREE.Vector3).copy(light);
  });
  return (
    <group ref={group}>
      <mesh material={paper}><boxGeometry args={[NOTE_W, NOTE_H, 0.012]} /></mesh>
      <mesh material={stripe} position={[STRIPE_X, 0, 0.0075]}><planeGeometry args={[STRIPE_W, NOTE_H, 1, 1]} /></mesh>
    </group>
  );
}
