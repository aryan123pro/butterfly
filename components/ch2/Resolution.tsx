"use client";
import { useMemo, useState } from "react";
import { TAG_A, TAG_B } from "@/lib/designs";
import * as O from "@/lib/optics";
import { Range, useCanvas } from "../ui";

/* Units: micrometres. Field of view from 2 mm down to 2 µm. */
const FOV_MAX = 2000, FOV_MIN = 2;
const PILLAR = 0.25; // nanostructure pitch, 250 nm
const DOT_PITCH = 42; // ~600 dpi halftone

function fmt(um: number) { return um >= 1000 ? (um / 1000).toFixed(1) + " mm" : um >= 1 ? +um.toPrecision(2) + " µm" : Math.round(um * 1000) + " nm"; }

// microtext mask: the word repeats in a 120 x 24 µm tile
function makeMask() {
  const cv = document.createElement("canvas"); cv.width = 600; cv.height = 120;
  const g = cv.getContext("2d")!; g.fillStyle = "#000"; g.fillRect(0, 0, 600, 120);
  g.fillStyle = "#fff"; g.font = "800 92px Georgia, serif"; g.textBaseline = "middle"; g.fillText("MORPHO", 10, 64);
  return { cv, data: g.getImageData(0, 0, 600, 120).data };
}
const TILE_W = 120, TILE_H = 24;

export default function Resolution() {
  const [z, setZ] = useState(0.35);
  const fov = FOV_MAX * Math.pow(FOV_MIN / FOV_MAX, z);
  const mask = useMemo(() => (typeof document === "undefined" ? null : makeMask()), []);
  const colA = useMemo(() => O.color(O.spectrum(O.morphoStack(TAG_A), 0), 1.25).css, []);
  const colB = useMemo(() => O.color(O.spectrum(O.morphoStack(TAG_B), 0), 1.25).css, []);
  const inLetter = (x: number, y: number) => {
    if (!mask) return false;
    const u = (((x % TILE_W) + TILE_W) % TILE_W) / TILE_W, v = (((y % TILE_H) + TILE_H) % TILE_H) / TILE_H;
    return mask.data[(Math.floor(v * 120) * 600 + Math.floor(u * 600)) * 4] > 127;
  };

  const printRef = useCanvas((cv) => {
    const { ctx: g, w, h } = O.setupCanvas(cv);
    const s = w / fov; // px per µm
    g.fillStyle = "#f4f1e8"; g.fillRect(0, 0, w, h);
    g.globalCompositeOperation = "multiply";
    // CMYK rosette: cyan 15°, magenta 75°, yellow 0°. Tones chosen to approximate the tag's magenta.
    const chans: [string, number, number][] = [["#00b7eb", 15, 0.35], ["#e6007e", 75, 0.85], ["#ffe600", 0, 0.25]];
    for (const [col, angDeg, tone] of chans) {
      const a = (angDeg * Math.PI) / 180, ca = Math.cos(a), sa = Math.sin(a);
      const half = (fov * 0.75) / DOT_PITCH + 2;
      const r = DOT_PITCH * 0.5 * Math.sqrt(tone) * s;
      g.fillStyle = col;
      for (let i = -half; i <= half; i++) for (let j = -half; j <= half; j++) {
        const ux = i * DOT_PITCH, uy = j * DOT_PITCH;
        const x = ux * ca - uy * sa, y = ux * sa + uy * ca;
        const px = w / 2 + x * s, py = h / 2 + y * s;
        if (px < -r || px > w + r || py < -r || py > h + r) continue;
        // ink spreads into paper fibres: blurry edges (only worth drawing once dots are big on screen)
        if (r > 6) {
          const gr = g.createRadialGradient(px, py, r * 0.55, px, py, r * 1.12);
          gr.addColorStop(0, col); gr.addColorStop(1, "rgba(255,255,255,0)");
          g.fillStyle = gr; g.beginPath(); g.arc(px, py, r * 1.12, 0, 6.3); g.fill();
        } else { g.fillStyle = col; g.beginPath(); g.arc(px, py, Math.max(0.5, r), 0, 6.3); g.fill(); }
      }
    }
    g.globalCompositeOperation = "source-over";
  }, [fov]);

  const nanoRef = useCanvas((cv) => {
    const { ctx: g, w, h } = O.setupCanvas(cv);
    const s = w / fov;
    const x0 = -fov / 2, y0 = (-fov / 2) * (h / w);
    const pillarsA = Math.max(0, Math.min(1, (40 - fov) / 25));
    // far: the microtext, drawn as filled cells (1 µm cells, coarser when zoomed out)
    if (pillarsA < 1) {
      const cell = Math.max(0.5, fov / 260);
      g.globalAlpha = 1;
      for (let y = y0; y < -y0; y += cell) for (let x = x0; x < -x0; x += cell) {
        g.fillStyle = inLetter(x + 1000, y + 1000) ? colB : colA;
        g.fillRect((x - x0) * s, (y - y0) * s, cell * s + 1, cell * s + 1);
      }
    }
    // near: individual pillars, 250 nm apart
    if (pillarsA > 0) {
      g.globalAlpha = pillarsA;
      g.fillStyle = "#05070b"; g.fillRect(0, 0, w, h);
      const r = PILLAR * 0.36 * s;
      for (let y = Math.floor(y0 / PILLAR) * PILLAR; y < -y0 + PILLAR; y += PILLAR) for (let x = Math.floor(x0 / PILLAR) * PILLAR; x < -x0 + PILLAR; x += PILLAR) {
        const px = (x - x0) * s, py = (y - y0) * s;
        g.fillStyle = inLetter(x + 1000, y + 1000) ? colB : colA;
        g.beginPath(); g.arc(px, py, Math.max(0.6, r), 0, 6.3); g.fill();
      }
      g.globalAlpha = 1;
    }
  }, [fov, colA, colB]);

  const verdictPrint = fov > 400 ? "Looks like smooth magenta" : fov > 60 ? "Dots of three inks appear" : "One blurry ink blot fills the view";
  const verdictNano = fov > 400 ? "Looks like smooth magenta" : fov > 30 ? "Hidden microtext appears" : "Individual 250 nm pillars resolve";

  return (
    <div className="stack" style={{ gap: 16 }}>
      <div className="grid2">
        <figure className="scope">
          <canvas ref={printRef} className="cv" role="img" aria-label="Printed copy under the microscope" />
          <figcaption><b>Printed copy</b><span>{verdictPrint}</span></figcaption>
        </figure>
        <figure className="scope">
          <canvas ref={nanoRef} className="cv" role="img" aria-label="Nanostructured tag under the microscope" />
          <figcaption><b>Nanostructured tag</b><span>{verdictNano}</span></figcaption>
        </figure>
      </div>
      <Range label="Microscope zoom (field of view)" value={z} min={0} max={1} step={0.005} onChange={setZ} fmt={() => fmt(fov)} />
    </div>
  );
}
