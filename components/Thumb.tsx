"use client";
import * as O from "@/lib/optics";
import { useCanvas } from "./ui";

/* Small card illustrations, all drawn from the optics engine. */
export default function Thumb({ kind, className }: { kind: string; className?: string }) {
  const ref = useCanvas((cv) => {
    const { ctx: g, w, h } = O.setupCanvas(cv);
    const stack = O.morphoStack();
    g.fillStyle = "#06080c"; g.fillRect(0, 0, w, h);
    const tagStack = O.morphoStack({ dc: 95, da: 160, N: 6 });
    if (kind === "stack") {
      const n = 8, top = 24, gap = (h - 40) / n;
      for (let i = 0; i < n; i++) { g.fillStyle = `rgba(216,180,110,${0.75 - i * 0.05})`; g.fillRect(w * 0.12, top + i * gap, w * 0.76, gap * 0.38); }
      for (let r = 0; r < n; r++) {
        g.strokeStyle = O.wlColor(460, 0.8 - r * 0.08); g.lineWidth = 2;
        const x0 = w * 0.22 + r * w * 0.07, y0 = top + r * gap;
        g.beginPath(); g.moveTo(x0 - 40, 0); g.lineTo(x0, y0); g.lineTo(x0 + 40, 0); g.stroke();
      }
    } else if (kind === "tag") {
      for (let x = 0; x < w; x += 2) { g.fillStyle = O.color(O.spectrum(tagStack, (x / w) * 60), 1.3).css; g.fillRect(x, 0, 2, h); }
      g.fillStyle = "rgba(6,8,12,.55)"; g.font = '800 54px "Bricolage Grotesque", sans-serif'; g.textAlign = "center"; g.textBaseline = "middle";
      g.fillText("₹500", w / 2, h / 2);
    } else if (kind === "beyond") {
      const bw = w / 4;
      [O.morphoStack(), O.morphoStack({ nf: 1.377 }), O.periodic([{ n: 1.63, d: 70 }, { n: 1.53, d: 70 }], 30), O.morphoStack({ da: 150 })].forEach((stk, k) => {
        for (let y = 0; y < h; y += 3) { g.fillStyle = O.color(O.spectrum(stk, (y / h) * 50), 1.2).css; g.fillRect(k * bw + 3, y, bw - 6, 3); }
      });
    } else if (kind === "wing") {
      const grd = g.createRadialGradient(w * 0.5, h * 0.5, 4, w * 0.5, h * 0.5, w * 0.6);
      grd.addColorStop(0, O.color(O.spectrum(stack, 0)).css); grd.addColorStop(0.6, O.color(O.spectrum(stack, 40)).css); grd.addColorStop(1, "#06080c");
      g.fillStyle = grd; g.beginPath();
      g.ellipse(w * 0.32, h * 0.45, w * 0.26, h * 0.3, -0.5, 0, 6.3); g.ellipse(w * 0.68, h * 0.45, w * 0.26, h * 0.3, 0.5, 0, 6.3); g.fill();
      g.fillStyle = "#1c1712"; g.fillRect(w * 0.49, h * 0.2, w * 0.02, h * 0.6);
    } else if (kind === "fake") {
      const cw = (w - 25) / 4;
      for (let c = 0; c < 4; c++) for (let y = 0; y < h - 20; y += 2) {
        const a = c !== 2 ? 15 + (y / h) * 40 : 20;
        g.fillStyle = O.color(O.spectrum(tagStack, a), 1.3).css; g.fillRect(5 + c * (cw + 5), 10 + y, cw, 2);
      }
    } else if (kind === "vapour") {
      const line = (s: Float32Array, col: string) => {
        g.strokeStyle = col; g.lineWidth = 2; g.beginPath();
        s.forEach((v, i) => { const X = (i / s.length) * w, Y = h - 10 - v * (h - 20); if (i) g.lineTo(X, Y); else g.moveTo(X, Y); }); g.stroke();
      };
      line(O.spectrum(stack, 0), "#3fa9ff"); line(O.spectrum(O.morphoStack({ nf: 1.2 }), 0), "#39d98a");
    } else if (kind === "forge") {
      const px = 10, a1 = O.color(O.spectrum(O.morphoStack(), 0)).css, a2 = O.color(O.spectrum(O.morphoStack({ da: 140 }), 0)).css;
      const pat = ["000000000000", "011101110110", "010001010101", "011001110101", "010001010110", "011101010101", "000000000000"];
      const ox = (w - 12 * px) / 2, oy = (h - 7 * px) / 2;
      pat.forEach((row, y) => { for (let x = 0; x < row.length; x++) { g.fillStyle = row[x] === "1" ? a2 : a1; g.fillRect(ox + x * px, oy + y * px, px - 1, px - 1); } });
    }
  }, [kind]);
  return <canvas ref={ref} className={className} aria-hidden="true" />;
}
