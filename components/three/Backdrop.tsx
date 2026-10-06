"use client";
import { useMemo } from "react";
import * as THREE from "three";

/* A dark studio sky: deep blue overhead, black below, a soft halo behind the subject. */
export default function Backdrop({ top = "#0c2244", bottom = "#020306", halo = "#1d5fb8", haloDir = [0, 0.25, -1] as [number, number, number], radius = 60 }) {
  const mat = useMemo(() => new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false,
    uniforms: {
      uTop: { value: new THREE.Color(top).convertSRGBToLinear() }, uBot: { value: new THREE.Color(bottom).convertSRGBToLinear() },
      uHalo: { value: new THREE.Color(halo).convertSRGBToLinear() }, uDir: { value: new THREE.Vector3(...haloDir).normalize() },
    },
    vertexShader: "varying vec3 vD; void main(){ vD = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }",
    fragmentShader: /* glsl */ `
      uniform vec3 uTop; uniform vec3 uBot; uniform vec3 uHalo; uniform vec3 uDir; varying vec3 vD;
      void main(){
        float h = smoothstep(-0.4, 0.9, vD.y);
        vec3 c = mix(uBot, uTop, h);
        c += uHalo * pow(max(dot(vD, uDir), 0.0), 6.0) * 0.55;
        gl_FragColor = vec4(c, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
  }), [top, bottom, halo, haloDir]);
  return <mesh material={mat} renderOrder={-10}><sphereGeometry args={[radius, 48, 24]} /></mesh>;
}
