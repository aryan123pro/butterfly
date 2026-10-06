"use client";
import { useFrame } from "@react-three/fiber";
import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef } from "react";
import * as THREE from "three";
import { FORE, HIND, wingGeometry, wingMaterial } from "@/lib/scene/materials";

export interface ButterflyHandle { group: THREE.Group; material: THREE.ShaderMaterial }
export interface ButterflyProps {
  lut: THREE.DataTexture; flap?: boolean; speed?: number; amp?: number; pigment?: number; glint?: number; gain?: number;
  light?: THREE.Vector3; position?: [number, number, number]; rotation?: [number, number, number]; scale?: number;
}

function abdomenGeometry() {
  // segmented abdomen profile, revolved
  const pts: THREE.Vector2[] = [];
  const len = 1.25, segs = 7;
  for (let i = 0; i <= 80; i++) {
    const t = i / 80;
    const base = 0.11 * Math.sin(Math.PI * Math.pow(t, 0.7)) + 0.014;
    const ridge = 0.008 * Math.pow(Math.sin(t * segs * Math.PI), 2);
    pts.push(new THREE.Vector2(Math.max(0.002, base - ridge), t * len));
  }
  const g = new THREE.LatheGeometry(pts, 28);
  g.rotateX(Math.PI / 2); // along +z
  return g;
}

function legGeometry(side: number, k: number) {
  const z = -0.2 + k * 0.12;
  const pts = [
    new THREE.Vector3(0.05 * side, -0.06, z),
    new THREE.Vector3(0.2 * side, -0.12, z + (k - 1) * 0.08),
    new THREE.Vector3(0.3 * side, -0.32, z + (k - 1) * 0.16),
    new THREE.Vector3(0.34 * side, -0.48, z + (k - 1) * 0.22),
  ];
  return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 20, 0.008, 5, false);
}

const Butterfly = forwardRef<ButterflyHandle, ButterflyProps>(function Butterfly(
  { lut, flap = true, speed = 0.6, amp = 0.5, pigment = 0, glint = 1, gain = 1, light, position, rotation, scale = 1 }, ref,
) {
  const group = useRef<THREE.Group>(null!);
  const pivR = useRef<THREE.Group>(null!), pivL = useRef<THREE.Group>(null!);
  const hindR = useRef<THREE.Group>(null!), hindL = useRef<THREE.Group>(null!);
  const mat = useMemo(() => wingMaterial(lut), [lut]);
  const geos = useMemo(() => ({
    foreR: wingGeometry(FORE, 1), hindR: wingGeometry(HIND, 1), foreL: wingGeometry(FORE, -1), hindL: wingGeometry(HIND, -1),
    abd: abdomenGeometry(), legs: [1, -1].flatMap((s) => [0, 1, 2].map((k) => legGeometry(s, k))),
    ant: [1, -1].map((s) => new THREE.TubeGeometry(new THREE.CatmullRomCurve3([
      new THREE.Vector3(0.035 * s, 0.06, -0.5), new THREE.Vector3(0.16 * s, 0.2, -0.95), new THREE.Vector3(0.4 * s, 0.32, -1.42),
    ]), 32, 0.011, 6, false)),
  }), []);
  const body = useMemo(() => new THREE.MeshPhysicalMaterial({ color: "#2a2018", roughness: 0.8, sheen: 1, sheenColor: new THREE.Color("#b49a78"), sheenRoughness: 0.4 }), []);
  const thorax = useMemo(() => new THREE.MeshPhysicalMaterial({ color: "#33271c", roughness: 1, sheen: 1, sheenColor: new THREE.Color("#c9ad86"), sheenRoughness: 0.3 }), []);
  const eye = useMemo(() => new THREE.MeshPhysicalMaterial({ color: "#1a120a", roughness: 0.15, clearcoat: 1, clearcoatRoughness: 0.05 }), []);
  useImperativeHandle(ref, () => ({ group: group.current, material: mat }), [mat]);
  useEffect(() => () => { mat.dispose(); Object.values(geos).flat().forEach((g) => (g as THREE.BufferGeometry).dispose()); }, [mat, geos]);

  const phase = useRef(0);
  useFrame((_s, dt) => {
    const d = Math.min(dt, 0.05);
    if (flap) phase.current += d * speed * Math.PI * 2;
    const a = Math.sin(phase.current);
    const ang = flap ? 0.1 + amp * (0.5 + 0.5 * a) : 0.14;
    pivR.current.rotation.z = ang; pivL.current.rotation.z = -ang;
    const lag = flap ? 0.1 * Math.sin(phase.current - 0.9) : 0;
    hindR.current.rotation.z = -lag * 0.7; hindL.current.rotation.z = lag * 0.7;
    // wings flex against the air: cupped on the downstroke
    mat.uniforms.uBend.value = flap ? -0.35 * Math.cos(phase.current) : 0.05;
    mat.uniforms.uPigment.value = pigment;
    mat.uniforms.uGlint.value = glint;
    mat.uniforms.uGain.value = gain;
    mat.uniforms.uTime.value += d;
    if (light) (mat.uniforms.uLight.value as THREE.Vector3).copy(light);
    group.current.position.y = (position?.[1] ?? 0) + (flap ? -0.06 * a : 0);
  });

  return (
    <group ref={group} position={position} rotation={rotation} scale={scale}>
      <group ref={pivR} position={[0.05, 0.02, 0]}>
        <mesh geometry={geos.foreR} material={mat} position={[-0.05, 0, 0]} />
        <group ref={hindR}><mesh geometry={geos.hindR} material={mat} position={[-0.05, -0.006, 0]} /></group>
      </group>
      <group ref={pivL} position={[-0.05, 0.02, 0]}>
        <mesh geometry={geos.foreL} material={mat} position={[0.05, 0, 0]} />
        <group ref={hindL}><mesh geometry={geos.hindL} material={mat} position={[0.05, -0.006, 0]} /></group>
      </group>
      <mesh material={thorax} position={[0, 0.01, -0.12]} scale={[0.17, 0.16, 0.34]}><sphereGeometry args={[1, 32, 20]} /></mesh>
      <mesh material={body} position={[0, 0.01, -0.46]} scale={0.12}><sphereGeometry args={[1, 28, 18]} /></mesh>
      <mesh material={body} geometry={geos.abd} position={[0, 0.0, 0.14]} />
      {[1, -1].map((s) => <mesh key={s} material={eye} position={[0.085 * s, 0.035, -0.5]} scale={0.065}><sphereGeometry args={[1, 20, 14]} /></mesh>)}
      {geos.ant.map((g, i) => <mesh key={i} geometry={g} material={body} />)}
      {[1, -1].map((s) => <mesh key={"c" + s} material={body} position={[0.4 * s, 0.32, -1.42]} scale={[0.028, 0.028, 0.06]}><sphereGeometry args={[1, 12, 8]} /></mesh>)}
      {geos.legs.map((g, i) => <mesh key={"l" + i} geometry={g} material={body} />)}
    </group>
  );
});

export default Butterfly;
