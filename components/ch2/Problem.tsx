"use client";
import { motion } from "motion/react";
import { useState } from "react";
import { Seg } from "../ui";

/* Values read off OECD Figure 2.3 (global customs seizures, 2020-21); approximate to ±0.5 points. */
const DATA: [string, number, number][] = [
  ["Clothing, knitted", 21.5, 12.5],
  ["Footwear", 21.3, 14.5],
  ["Leather goods & handbags", 19.0, 12.3],
  ["Electrical machinery & electronics", 7.0, 10.2],
  ["Watches", 5.9, 23.0],
  ["Clothing, not knitted", 4.4, 0.5],
  ["Perfume & cosmetics", 3.9, 3.9],
  ["Jewellery", 3.9, 3.3],
  ["Toys & games", 2.9, 2.0],
  ["Optical & medical apparatus", 2.3, 6.5],
  ["Pharmaceutical products", 0.6, 0.4],
];

export default function Problem() {
  const [by, setBy] = useState<"seizures" | "value">("seizures");
  const k = by === "seizures" ? 1 : 2;
  const rows = [...DATA].sort((a, b) => b[k] - a[k]);
  const max = 25;
  return (
    <div className="split">
      <div className="panel stack" style={{ gap: 14 }}>
        <div className="row" style={{ justifyContent: "space-between" }}>
          <div><p className="eyebrow">What gets faked</p><h3 style={{ marginTop: 6 }}>Top product categories in customs seizures</h3></div>
          <Seg label="Measure" value={by} onChange={setBy} options={[["seizures", "Share of seizures"], ["value", "Share of value"]]} />
        </div>
        <div className="bars" role="list">
          {rows.map(([name, s, v]) => {
            const val = by === "seizures" ? s : v;
            return (
              <motion.div layout key={name} className="bar" role="listitem" transition={{ type: "spring", stiffness: 260, damping: 30 }}>
                <span className="bar-name">{name}</span>
                <span className="bar-track">
                  <motion.i initial={{ width: 0 }} animate={{ width: (val / max) * 100 + "%" }} transition={{ duration: 0.7, ease: [0.2, 0.8, 0.2, 1] }}
                    style={{ background: by === "seizures" ? "linear-gradient(90deg,#2f7d5b,#39d98a)" : "linear-gradient(90deg,#1559c9,#3fa9ff)" }} />
                </span>
                <span className="bar-val num">{val.toFixed(1)}%</span>
              </motion.div>
            );
          })}
        </div>
        <p className="faint" style={{ fontSize: "var(--t-xs)" }}>Source: OECD global customs seizures data, Figure 2.3 (2020&ndash;21). Values read from the published chart.</p>
      </div>
      <div className="stack">
        <div className="bignum"><b className="num">$470B</b><span>global trade in counterfeit goods, about <strong>2.3%</strong> of all world imports (OECD &amp; EUIPO)</span></div>
        <div className="bignum"><b className="num">1 in 10</b><span>medical products in low and middle income countries is substandard or falsified (WHO)</span></div>
        <div className="panel">
          <p className="eyebrow">Who pays</p>
          <ul className="paylist">
            <li><b>Revenue</b> lost by brands and by governments through unpaid tax</li>
            <li><b>Jobs</b> lost in the industries being copied</li>
            <li><b>Safety</b>: fake medicines, brake pads and electrical parts</li>
            <li><b>Prices</b> rise as genuine makers absorb the cost of protection</li>
          </ul>
        </div>
        <div className="callout"><b>Watches</b> are only 6% of seizures by count but 23% by value. Small, expensive objects are where a security tag pays for itself.</div>
      </div>
    </div>
  );
}
