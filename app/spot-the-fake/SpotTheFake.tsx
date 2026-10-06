"use client";
import { RoundedBox } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { AnimatePresence, motion } from "motion/react";
import { Check, Gauge, Pause, Play, RotateCcw, ShieldAlert, Trophy, Wind, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import Backdrop from "@/components/three/Backdrop";
import Label3D from "@/components/three/Label3D";
import Stage3D from "@/components/three/Stage3D";
import { Plot, Range, useRaf } from "@/components/ui";
import * as O from "@/lib/optics";
import { cardMaterial, cardSpectrum, KIND_INFO, type Kind } from "./cards";

const ROUNDS: Kind[][] = [
  ["printed", "genuine", "genuine", "genuine"],
  ["hologram", "genuine", "genuine", "genuine"],
  ["printed", "hologram", "genuine", "genuine"],
  ["wrong", "genuine", "genuine", "genuine"],
  ["wrong", "printed", "genuine", "genuine"],
];
const HINTS = [
  "Tilt the cards. Which one ignores you?",
  "Something shimmers, but is it the right shimmer?",
  "Two forgers this time.",
  "This forger used a real nanostructure. Tilting may not be enough: try the spectrometer.",
  "Final round. Use every tool.",
];
function shuffle<T>(a: T[]) { const b = [...a]; for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [b[i], b[j]] = [b[j], b[i]]; } return b; }

function Card({ kind, x, tilt, wet, picked, revealed, onPick, idx }: { kind: Kind; x: number; tilt: number; wet: number; picked: boolean; revealed: boolean; onPick: () => void; idx: number }) {
  const g = useRef<THREE.Group>(null!);
  const mat = useMemo(() => cardMaterial(kind), [kind]);
  const ring = useMemo(() => new THREE.MeshBasicMaterial({ color: new THREE.Color(3, 0.4, 0.5), toneMapped: false }), []);
  const ok = useMemo(() => new THREE.MeshBasicMaterial({ color: new THREE.Color(0.4, 2.4, 1.2), toneMapped: false }), []);
  const [hover, setHover] = useState(false);
  useFrame(() => {
    const r = -(tilt * Math.PI) / 180;
    g.current.rotation.x += (r - g.current.rotation.x) * 0.15;
    const s = hover ? 1.04 : 1; g.current.scale.lerp(new THREE.Vector3(s, s, s), 0.2);
    mat.uniforms.uWet.value = wet;
  });
  useEffect(() => () => mat.dispose(), [mat]);
  const fake = kind !== "genuine";
  return (
    <group position={[x, 0, 0]}>
      <group ref={g}>
        {(picked || (revealed && fake)) && <RoundedBox args={[1.72, 2.26, 0.04]} radius={0.1} position={[0, 0, -0.03]} material={revealed && !fake ? ok : ring} />}
        {revealed && !fake && !picked && <RoundedBox args={[1.72, 2.26, 0.04]} radius={0.1} position={[0, 0, -0.03]} material={ok} />}
        <RoundedBox args={[1.62, 2.12, 0.05]} radius={0.08} smoothness={4} position={[0, 0, -0.005]}><meshPhysicalMaterial color="#0d1118" roughness={0.4} clearcoat={0.6} /></RoundedBox>
        <mesh position={[0, 0, 0.022]} material={mat}
          onClick={(e) => { e.stopPropagation(); onPick(); }}
          onPointerOver={(e) => { e.stopPropagation(); setHover(true); document.body.style.cursor = "pointer"; }}
          onPointerOut={() => { setHover(false); document.body.style.cursor = ""; }}><planeGeometry args={[1.52, 2.02]} /></mesh>
      </group>
      <Label3D position={[0, 1.55, 0]} size={0.14} color="#8796aa">{`SPECIMEN 0${idx + 1}`}</Label3D>
      {revealed && <Label3D position={[0, -1.5, 0.2]} size={0.13} color={fake ? "#ff7a8a" : "#5ce6a0"}>{fake ? KIND_INFO[kind].name.toUpperCase() : "GENUINE"}</Label3D>}
    </group>
  );
}

export default function SpotTheFake() {
  const [round, setRound] = useState(0);
  const [cards, setCards] = useState<Kind[]>(ROUNDS[0]);
  const [picked, setPicked] = useState<boolean[]>([false, false, false, false]);
  const [revealed, setRevealed] = useState(false);
  const [score, setScore] = useState(0);
  const [history, setHistory] = useState<number[]>([]);
  const [tilt, setTilt] = useState(10);
  const [wobble, setWobble] = useState(false);
  const [wet, setWet] = useState(0);
  const [breath, setBreath] = useState(false);
  const [probe, setProbe] = useState(0);
  const [done, setDone] = useState(false);
  const t = useRef(0), b = useRef(0);

  useEffect(() => { setCards(shuffle(ROUNDS[round])); setPicked([false, false, false, false]); setRevealed(false); }, [round]);
  useRaf((_t, dt) => { t.current += dt; setTilt(Math.round(28 + 24 * Math.sin(t.current * 0.9))); }, wobble);
  useRaf((_t, dt) => {
    b.current += dt;
    const w = b.current < 0.6 ? b.current / 0.6 : Math.max(0, 1 - (b.current - 1.6) / 3);
    setWet(w);
    if (b.current > 4.6) { setBreath(false); setWet(0); }
  }, breath);

  const spec = useMemo(() => cardSpectrum(cards[probe], tilt, wet), [cards, probe, tilt, wet]);
  const ref = useMemo(() => cardSpectrum("genuine", tilt, 0), [tilt]);
  const roundScore = cards.reduce((a, k, i) => a + ((k !== "genuine") === picked[i] ? 1 : 0), 0);

  const lock = () => { setRevealed(true); setScore((s) => s + roundScore); setHistory((h) => [...h, roundScore]); };
  const next = () => { if (round === ROUNDS.length - 1) setDone(true); else setRound((r) => r + 1); };
  const restart = () => { setDone(false); setScore(0); setHistory([]); setRound(0); setCards(shuffle(ROUNDS[0])); };
  const total = ROUNDS.length * 4;

  return (
    <main className="wrap" style={{ paddingBottom: 30 }}>
      <div className="lab-grid">
        <div className="stack" style={{ gap: 12 }}>
          <div className="row" style={{ justifyContent: "space-between" }}>
            <div className="round-pips" aria-label={`Round ${round + 1} of ${ROUNDS.length}`}>
              {ROUNDS.map((_, i) => <i key={i} className={i < history.length ? (history[i] === 4 ? "win" : "part") : i === round ? "now" : ""} />)}
              <span>Round {round + 1} of {ROUNDS.length}</span>
            </div>
            <span className="chip blue"><Trophy size={12} /> {score} / {total}</span>
          </div>
          <Stage3D style={{ height: "min(62vh, 560px)" }} label="Four specimen cards. Click the ones you think are fake." camera={{ position: [0, 0.3, 8.2], fov: 38 }} bloom={0.85}
            overlay={<>
              <div className="hud" style={{ top: 14, left: 16 }}>tilt <b>{tilt}&deg;</b>{wet > 0.05 ? <> &middot; <b>breath on the cards</b></> : null}</div>
              <div className="hud" style={{ bottom: 14, left: 16, right: 16 }}>{revealed ? `You classified ${roundScore} of 4 correctly.` : HINTS[round] + " Click a card to accuse it."}</div>
            </>}>
            <Backdrop top="#0f1a2e" halo="#2a4a7a" haloDir={[0, 0.1, -1]} />
            {cards.map((k, i) => (
              <Card key={round + "-" + i + k} kind={k} idx={i} x={(i - 1.5) * 2.05} tilt={tilt} wet={wet} picked={picked[i]} revealed={revealed}
                onPick={() => !revealed && setPicked((p) => p.map((v, j) => (j === i ? !v : v)))} />
            ))}
          </Stage3D>
          <div className="row" style={{ alignItems: "end" }}>
            <div style={{ flex: 1, minWidth: 200 }}><Range label="Tilt all specimens" value={tilt} min={0} max={60} onChange={(v) => { setWobble(false); setTilt(v); }} fmt={(v) => v + "°"} /></div>
            <button className="btn sm" aria-pressed={wobble} onClick={() => setWobble((w) => !w)}>{wobble ? <Pause size={14} /> : <Play size={14} />} Wobble</button>
            <button className="btn sm" disabled={breath} onClick={() => { b.current = 0; setBreath(true); }}><Wind size={14} /> Breathe on them</button>
          </div>
        </div>

        <aside className="stack lab-side">
          <div className="panel stack" style={{ gap: 10 }}>
            <p className="eyebrow"><Gauge size={12} style={{ verticalAlign: -1 }} /> Spectrometer</p>
            <div className="seg" role="group" aria-label="Probe specimen">
              {cards.map((_, i) => <button key={i} aria-pressed={probe === i} onClick={() => setProbe(i)}>Specimen 0{i + 1}</button>)}
            </div>
            <Plot label="Measured spectrum of the probed specimen" height={160} opts={{
              spectral: true, yticks: [0, 0.5, 1],
              series: [{ data: ref, color: O.MUTED, width: 1.2, dash: [4, 3] }, { data: spec, color: O.INK, fill: "spectral", fillAlpha: 0.5 }],
            }} />
            <p className="faint" style={{ fontSize: "var(--t-xs)" }}>Dashed: a genuine reference at the same tilt. A match in both peak positions is the strongest evidence you can get.</p>
          </div>
          <div className="panel stack" style={{ gap: 10 }}>
            <p className="eyebrow">Your verdict</p>
            <div className="verdicts">
              {cards.map((k, i) => (
                <button key={i} className={"verdict" + (picked[i] ? " fake" : "")} disabled={revealed} onClick={() => setPicked((p) => p.map((v, j) => (j === i ? !v : v)))}>
                  <span>0{i + 1}</span>{picked[i] ? <><ShieldAlert size={14} /> Fake</> : <>Genuine?</>}
                  {revealed && (((k !== "genuine") === picked[i]) ? <Check size={15} className="ok" /> : <X size={15} className="no" />)}
                </button>
              ))}
            </div>
            {!revealed
              ? <button className="btn primary" onClick={lock}>Lock in my answer</button>
              : <button className="btn primary" onClick={next}>{round === ROUNDS.length - 1 ? "See final score" : "Next round →"}</button>}
          </div>
          <AnimatePresence>
            {revealed && (
              <motion.div className="panel stack" style={{ gap: 10 }} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                <p className="eyebrow">What gave them away</p>
                {[...new Set(cards.filter((k) => k !== "genuine"))].map((k) => <p key={k} style={{ fontSize: "var(--t-sm)" }}><b style={{ color: "var(--bad)" }}>{KIND_INFO[k].name}.</b> <span className="muted">{KIND_INFO[k].tell}</span></p>)}
                <p style={{ fontSize: "var(--t-sm)" }}><b style={{ color: "var(--good)" }}>{KIND_INFO.genuine.name}.</b> <span className="muted">{KIND_INFO.genuine.tell}</span></p>
              </motion.div>
            )}
          </AnimatePresence>
        </aside>
      </div>
      <AnimatePresence>
        {done && (
          <motion.div className="modal" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <motion.div className="modal-box" initial={{ scale: 0.94, y: 10 }} animate={{ scale: 1, y: 0 }}>
              <Trophy size={34} color="#ffb547" />
              <h2>{score} / {total}</h2>
              <p className="muted">{score >= 18 ? "Customs officer material. The forgers would hate you." : score >= 13 ? "Solid. The nanostructure forger in rounds 4 and 5 is the hard one." : "The forgers won this time. Try again, and use the spectrometer."}</p>
              <button className="btn primary" onClick={restart}><RotateCcw size={15} /> Play again</button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}
