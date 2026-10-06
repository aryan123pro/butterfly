import * as THREE from "three";
import { TAG_A } from "@/lib/designs";
import * as O from "@/lib/optics";
import { lutTexture, STRUCT_GLSL } from "@/lib/scene/materials";

export type Kind = "genuine" | "printed" | "hologram" | "wrong";
export const KIND_INFO: Record<Kind, { name: string; tell: string }> = {
  genuine: { name: "Genuine nanostructure", tell: "Shifts magenta → green as you tilt, turns green when breathed on, and shows the narrow reflection peaks of a multilayer." },
  printed: { name: "Printed copy", tell: "Ink frozen at one angle: no colour shift on tilting, no response to breath, and a broad pigment spectrum." },
  hologram: { name: "Holographic foil", tell: "Shimmers, but as a full rainbow that streaks across the card. It ignores breath, and its spectrum is the wrong shape." },
  wrong: { name: "Wrong nanostructure", tell: "A real multilayer, but with the wrong spacing: it shifts through blues instead of magenta to green. Only the spectrometer is decisive." },
};

const WRONG = { dc: 95, da: 160, N: 6 };
export const stacks = {
  genuine: (nf = 1) => O.morphoStack({ ...TAG_A, nf }),
  wrong: (nf = 1) => O.morphoStack({ ...WRONG, nf }),
};

let cache: null | Record<string, THREE.DataTexture> = null;
export function luts() {
  if (cache) return cache;
  cache = {
    gDry: lutTexture(O.angleLUT(stacks.genuine(1), 96, 80, 1.25).data),
    gWet: lutTexture(O.angleLUT(stacks.genuine(1.33), 96, 80, 1.25).data),
    wDry: lutTexture(O.angleLUT(stacks.wrong(1), 96, 80, 1.25).data),
    wWet: lutTexture(O.angleLUT(stacks.wrong(1.33), 96, 80, 1.25).data),
  };
  return cache;
}

/* Spectrum each card would show under the spectrometer. */
export function cardSpectrum(kind: Kind, tilt: number, wet: number) {
  if (kind === "genuine") return O.spectrum(stacks.genuine(1 + 0.33 * wet), tilt);
  if (kind === "wrong") return O.spectrum(stacks.wrong(1 + 0.33 * wet), tilt);
  if (kind === "printed") {
    // a pigment mix that matches the genuine colour head-on, but with smooth broad bands
    return new Float32Array(O.WL.map((l) => 0.08 + 0.55 * Math.exp(-(((l - 440) / 55) ** 2)) + 0.6 * Math.exp(-(((l - 660) / 70) ** 2))));
  }
  // hologram: a sweeping narrow band from diffraction, the whole rainbow as you tilt
  const centre = 420 + ((tilt * 6) % 300);
  return new Float32Array(O.WL.map((l) => 0.15 + 0.7 * Math.exp(-(((l - centre) / 25) ** 2))));
}

export function cardMaterial(kind: Kind) {
  const L = luts();
  const k = { genuine: 0, printed: 1, hologram: 2, wrong: 3 }[kind];
  return new THREE.ShaderMaterial({
    uniforms: {
      uLut: { value: kind === "wrong" ? L.wDry : L.gDry }, uLutWet: { value: kind === "wrong" ? L.wWet : L.gWet },
      uMaxAng: { value: (80 * Math.PI) / 180 }, uLight: { value: new THREE.Vector3(0, 3, 9) }, uSpread: { value: 2.5 }, uGain: { value: 0.9 },
      uKind: { value: k }, uWet: { value: 0 },
    },
    vertexShader: /* glsl */ `
      varying vec3 vN; varying vec3 vW; varying vec2 vUv; varying vec3 vT;
      void main(){ vUv = uv; vec4 w = modelMatrix * vec4(position,1.0); vW = w.xyz; vN = normalize(mat3(modelMatrix) * normal);
        vT = normalize(mat3(modelMatrix) * vec3(1.0,0.0,0.0)); gl_Position = projectionMatrix * viewMatrix * w; }`,
    fragmentShader: STRUCT_GLSL + /* glsl */ `
      uniform sampler2D uLutWet; uniform float uKind; uniform float uWet;
      varying vec3 vN; varying vec3 vW; varying vec2 vUv; varying vec3 vT;
      vec3 lutWet(float th){ vec3 c = texture2D(uLutWet, vec2(clamp(th / uMaxAng, 0.0, 1.0), 0.5)).rgb; return pow(c, vec3(2.2)); }
      vec3 hsv(float h){ vec3 p = abs(fract(h + vec3(0.0, 2.0/3.0, 1.0/3.0)) * 6.0 - 3.0); return clamp(p - 1.0, 0.0, 1.0); }
      void main(){
        vec3 N = normalize(vN); if (!gl_FrontFacing) N = -N;
        vec3 V = normalize(cameraPosition - vW); vec3 L = normalize(uLight); vec3 H = normalize(L + V);
        float th = acos(clamp(dot(V, H), 0.0, 1.0));
        float lobe = pow(max(dot(N, H), 0.0), uSpread);
        float diff = 0.35 + 0.65 * max(dot(N, L), 0.0);
        // a gentle gradient across the card, as on the activity slide: each point sees a slightly different angle
        float thp = th + (vUv.x - 0.5) * 0.25 + (vUv.y - 0.5) * 0.15;
        vec3 c;
        if (uKind < 0.5 || uKind > 2.5) {
          vec3 dry = lutAt(thp), wet = lutWet(thp);
          c = mix(dry, wet, uWet) * (0.25 + 1.25 * lobe);
        } else if (uKind < 1.5) {
          float thf = 0.14 + (vUv.x - 0.5) * 0.25 + (vUv.y - 0.5) * 0.15; // frozen at the angle it was scanned
          c = lutAt(thf) * diff * 0.95;
        } else {
          float h = fract(dot(V, vT) * 1.6 + vUv.x * 1.2 + vUv.y * 0.6);
          c = pow(hsv(h), vec3(2.2)) * (0.25 + 1.4 * lobe) + 0.08;
        }
        float edge = smoothstep(0.0, 0.03, vUv.x) * (1.0 - smoothstep(0.97, 1.0, vUv.x)) * smoothstep(0.0, 0.03, vUv.y) * (1.0 - smoothstep(0.97, 1.0, vUv.y));
        c *= 0.6 + 0.4 * edge;
        gl_FragColor = vec4(c, 1.0);
        if (!(gl_FragColor.r >= 0.0 && gl_FragColor.g >= 0.0 && gl_FragColor.b >= 0.0)) gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
  });
}
