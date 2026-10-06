"use client";
import { AnimatePresence, motion } from "motion/react";
import { Droplet, Fingerprint, Nfc, ScanLine, Sparkles, Stamp } from "lucide-react";
import { useState } from "react";

const FEATURES = [
  {
    key: "watermark", name: "Watermark", Icon: Stamp,
    check: "Hold the paper to the light and look for the image.",
    beat: ["Print the image lightly on the back with a pale ink", "Or press a design into the paper with a wax stamp", "Under casual light the result passes"],
    note: "The check is the same every time: one image, one viewing condition.",
  },
  {
    key: "hologram", name: "Hologram", Icon: Sparkles,
    check: "Tilt it and look for a rainbow image that moves.",
    beat: ["Buy generic rainbow foil from a packaging supplier", "Emboss a similar-looking pattern with a cheap shim", "Most people only check that it shimmers, not what it shows"],
    note: "Holographic foil is a commodity product, and it fades and scratches over time.",
  },
  {
    key: "ink", name: "Special ink", Icon: Droplet,
    check: "Look for colour-shifting or UV-glowing print.",
    beat: ["Source similar pigments from the same chemical suppliers", "Screen-print or ink-jet them on", "Ink is chemistry, and chemistry can be bought"],
    note: "Pigments photobleach: over half the colour can go in 100 to 300 hours of UV.",
  },
  {
    key: "rfid", name: "RFID chip", Icon: Nfc,
    check: "Scan it with a reader and check the ID.",
    beat: ["Read a genuine tag's ID with a cheap reader", "Write that ID onto a blank tag", "Without cryptography, a clone answers like the original"],
    note: "Needs a reader and power; nobody can check it with their eyes.",
  },
];

export default function Conventional() {
  const [open, setOpen] = useState<string | null>("hologram");
  return (
    <div className="stack" style={{ gap: 18 }}>
      <div className="feat-grid">
        {FEATURES.map((f) => {
          const on = open === f.key;
          return (
            <motion.button layout key={f.key} className={"feat" + (on ? " on" : "")} onClick={() => setOpen(on ? null : f.key)} aria-expanded={on}>
              <span className="feat-ico"><f.Icon size={22} strokeWidth={1.6} /></span>
              <b>{f.name}</b>
              <span className="feat-check"><ScanLine size={13} /> {f.check}</span>
              <AnimatePresence initial={false}>
                {on && (
                  <motion.div className="feat-attack" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}>
                    <span className="eyebrow" style={{ color: "var(--bad)" }}>How a counterfeiter beats it</span>
                    <ol>{f.beat.map((s, i) => <motion.li key={s} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.12 + i * 0.12 }}>{s}</motion.li>)}</ol>
                    <span className="feat-note">{f.note}</span>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.button>
          );
        })}
      </div>
      <div className="split even">
        <div className="callout"><b>The shared weakness.</b> Every one of these gives a predefined, predictable, repeatable answer. A forger only has to reproduce that one answer well enough to fool someone who checks it once.</div>
        <div className="callout" style={{ borderColor: "var(--morpho)" }}><b style={{ color: "var(--morpho)" }}><Fingerprint size={14} style={{ verticalAlign: -2 }} /> What we want instead.</b> A feature whose answer changes with how you look at it, that anyone can check by eye, and that needs nanofabrication to copy.</div>
      </div>
    </div>
  );
}
