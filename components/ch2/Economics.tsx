"use client";
import { Pill, Smartphone, SprayCan, Watch, Banknote } from "lucide-react";
import { useState } from "react";
import { Range, Readouts } from "../ui";

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
      <div className="econ">
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
          <Readouts items={[
            ["Product price", inr(p.price)],
            ["Tag adds", pctTag < 0.01 ? "<0.01" : pctTag.toFixed(pctTag < 1 ? 3 : 1), "%"],
            ["Dye label adds", pctDye < 0.01 ? "<0.01" : pctDye.toFixed(pctDye < 1 ? 3 : 1), "%"],
          ]} />
        </div>
      </div>
    </div>
  );
}
