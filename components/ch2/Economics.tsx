"use client";
import { BadgeIndianRupee, Pill, Smartphone, SprayCan, Watch, Banknote } from "lucide-react";
import { useState } from "react";
import { Range } from "../ui";

const PRODUCTS = [
  { k: "med", name: "Strip of medicine", price: 45, Icon: Pill },
  { k: "note", name: "₹500 banknote", price: 500, Icon: Banknote },
  { k: "perfume", name: "Perfume", price: 2500, Icon: SprayCan },
  { k: "phone", name: "Smartphone", price: 25000, Icon: Smartphone },
  { k: "watch", name: "Luxury watch", price: 150000, Icon: Watch },
];

const inr = (v: number) => "₹" + (v >= 100 ? Math.round(v).toLocaleString("en-IN") : v.toFixed(2));

export default function Economics() {
  const [p, setP] = useState(PRODUCTS[0]);
  const [tag, setTag] = useState(6.5);
  const [dye, setDye] = useState(0.25);
  const pctTag = (tag / p.price) * 100, pctDye = (dye / p.price) * 100;
  const bar = (pct: number) => Math.min(100, Math.max(1.5, (Math.log10(pct * 100 + 1) / Math.log10(2001)) * 100));

  return (
    <div className="stack" style={{ gap: 18 }}>
      <div className="split">
        <div className="panel stack" style={{ gap: 14 }}>
          <p className="eyebrow">Protect one item</p>
          <div className="prod-row">
            {PRODUCTS.map((x) => (
              <button key={x.k} className={"prod" + (x.k === p.k ? " on" : "")} onClick={() => setP(x)} aria-pressed={x.k === p.k}>
                <x.Icon size={20} strokeWidth={1.6} /><b>{x.name}</b><small>{inr(x.price)}</small>
              </button>
            ))}
          </div>
          <Range label="Biomimetic tag cost" value={tag} min={5} max={8.5} step={0.1} onChange={setTag} fmt={(v) => inr(v)} />
          <Range label="Dye-based label cost" value={dye} min={0.08} max={0.4} step={0.01} onChange={setDye} fmt={(v) => inr(v)} />
          <div className="costbars">
            <div><span>Biomimetic tag</span><i><b style={{ width: bar(pctTag) + "%", background: pctTag > 5 ? "var(--bad)" : pctTag > 1 ? "var(--warn)" : "var(--good)" }} /></i><em className="num">{pctTag < 0.01 ? "<0.01" : pctTag.toFixed(pctTag < 1 ? 3 : 1)}% of price</em></div>
            <div><span>Dye label</span><i><b style={{ width: bar(pctDye) + "%", background: "var(--muted)" }} /></i><em className="num">{pctDye < 0.01 ? "<0.01" : pctDye.toFixed(pctDye < 1 ? 3 : 1)}% of price</em></div>
          </div>
          <p className="muted" style={{ fontSize: "var(--t-sm)" }}>
            {pctTag > 5
              ? `On a ${inr(p.price)} product the tag eats ${pctTag.toFixed(0)}% of the price. Worth it only where fakes kill people, and then it is a job for regulation, not margins.`
              : pctTag > 1
              ? `A few percent of the price. This is where the decision becomes a business case.`
              : `A rounding error on a ${inr(p.price)} product. Here the tag is an easy decision.`}
          </p>
        </div>
        <div className="stack">
          <div className="pc">
            <div className="panel"><h4 style={{ marginBottom: 12 }}>Pros</h4><ul>
              <li>Does not fade over time like a generic hologram (no photobleaching)</li>
              <li>Easy and instant to check by eye: just tilt it</li>
              <li>Very hard for counterfeiters to reproduce</li>
            </ul></div>
            <div className="panel cons"><h4 style={{ marginBottom: 12 }}>Cons</h4><ul>
              <li>Hard to produce: intricate structures need advanced fabrication</li>
              <li>The security only holds as long as fabrication stays expensive</li>
              <li>Institutional adoption is slow even when the technology is proven</li>
            </ul></div>
          </div>
          <div className="callout"><b><BadgeIndianRupee size={14} style={{ verticalAlign: -2 }} /> The uncomfortable trade-off.</b> The tag is secure because it is expensive to make. If nanofabrication gets cheap enough for every packager, it also gets cheap enough for every forger. Security features have a shelf life.</div>
        </div>
      </div>
    </div>
  );
}
