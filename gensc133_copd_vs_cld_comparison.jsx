import { useState, useMemo, useEffect } from "react";
import {
  ComposedChart,
  Line,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  ReferenceArea,
  ErrorBar,
} from "recharts";

/* ═══════════════════════════════════════════════════════════
   DATA
   ═══════════════════════════════════════════════════════════ */

const COPD_PASSAGES = [0, 10, 20, 30, 40, 50, 60];
const COPD_LABELS = ["MCB", "P10", "P20", "P30", "P40", "P50", "P60"];
const COPD_RATIOS = {
  "5": [2.32, 2.33, 1.83, 1.71, 1.51, 1.62, 1.49],
  H: [1.60, 1.50, 1.27, 1.05, 0.96, 0.91, 0.87],
  L: [2.22, 2.01, 1.61, 1.33, 1.15, 1.21, 1.07],
};
const COPD_RSD = { "5": 0.016, H: 0.037, L: 0.065 };

const CLD_TARGET_TRIPS = {
  "5": {
    RCB: [524227.53, 543613.88, 542661.38],
    P17: [522049.31, 523342.97, 541699.13],
    P31: [366765.97, 363793.72, 372998.72],
    P45: [441592.34, 446420.44, 439341.53],
    P63: [363682.03, 360911.94, 345303.75],
    AM168: [436980.13, 446643.25, 423789.84],
  },
  H: {
    RCB: [381704.56, 384550.16, 386784.09],
    P17: [369724.88, 359916.25, 386580.0],
    P31: [248639.02, 267440.44, 276285.69],
    P45: [261911.11, 293493.5, 317016.88],
    P63: [207284.72, 217807.34, 233527.67],
    AM168: [276046.44, 278520.72, 275740.97],
  },
  L: {
    RCB: [436979.28, 440806.13, 461833.09],
    P17: [429556.13, 419381.59, 456918.75],
    P31: [310451.25, 311255.44, 325778.31],
    P45: [330949.06, 341108.94, 361653.38],
    P63: [271172.91, 285903.78, 321403.09],
    AM168: [350180.69, 363291.63, 361986.88],
  },
};
const CLD_B2M_TRIPS = {
  RCB: [204352.75, 217610.39, 213031.22],
  P17: [222593.92, 218428.84, 221029.45],
  P31: [170593.77, 165575.66, 164581.98],
  P45: [209824.67, 204518.27, 204467.31],
  P63: [184694.39, 194265.47, 185411.05],
  AM168: [215663.09, 218585.88, 212158.28],
};
const CLD_PASSAGE_NUMS = { RCB: 0, P17: 16.9, P31: 31.1, P45: 45.0, P63: 63.2, AM168: 61.8 };
const CLD_SAMPLE_ORDER = ["RCB", "P17", "P31", "P45", "P63", "AM168"];

function computeCLDStats() {
  const results = {};
  ["5", "H", "L"].forEach((t) => {
    results[t] = {};
    CLD_SAMPLE_ORDER.forEach((s) => {
      const tgt = CLD_TARGET_TRIPS[t][s];
      const b2m = CLD_B2M_TRIPS[s];
      const ratios = tgt.map((v, i) => v / b2m[i]);
      const mean = ratios.reduce((a, b) => a + b, 0) / 3;
      const sd = Math.sqrt(ratios.reduce((sum, r) => sum + (r - mean) ** 2, 0) / 2);
      results[t][s] = { mean, sd, ratios };
    });
  });
  return results;
}

/* ═══════════════════════════════════════════════════════════
   DESIGN TOKENS
   ═══════════════════════════════════════════════════════════ */

const T = {
  "5": { label: "133-5-1 Peptide", short: "133-5-1", color: "#4EADFF", dim: "#2A7BC4" },
  H: { label: "133-H-1 Heavy Chain", short: "133-H-1", color: "#FF6B6B", dim: "#C44A4A" },
  L: { label: "133-L-1 Light Chain", short: "133-L-1", color: "#51D88A", dim: "#3AAF6B" },
};

const MCB = { "5": 2.32, H: 1.6, L: 2.22 };

/* ═══════════════════════════════════════════════════════════
   COMPONENT
   ═══════════════════════════════════════════════════════════ */

export default function App() {
  const [sel, setSel] = useState("all");
  const [zone, setZone] = useState(true);
  const [showCOPD, setShowCOPD] = useState(true);
  const [showCLD, setShowCLD] = useState(true);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 60);
    return () => clearTimeout(t);
  }, []);

  const cld = useMemo(() => computeCLDStats(), []);
  const targets = sel === "all" ? ["5", "H", "L"] : [sel];

  const copdData = COPD_PASSAGES.map((p, i) => {
    const r = { x: p, label: COPD_LABELS[i] };
    ["5", "H", "L"].forEach((t) => {
      r[`c_${t}`] = COPD_RATIOS[t][i];
      r[`c_${t}_e`] = COPD_RATIOS[t][i] * COPD_RSD[t];
    });
    return r;
  });

  const cldMain = CLD_SAMPLE_ORDER.filter((s) => s !== "AM168").map((s) => {
    const r = { x: CLD_PASSAGE_NUMS[s], label: s === "RCB" ? "RCB" : `P${CLD_PASSAGE_NUMS[s]}` };
    ["5", "H", "L"].forEach((t) => {
      r[`d_${t}`] = cld[t][s].mean;
      r[`d_${t}_e`] = cld[t][s].sd;
    });
    return r;
  });

  const am168 = (() => {
    const r = { x: CLD_PASSAGE_NUMS.AM168, label: "AM168" };
    ["5", "H", "L"].forEach((t) => {
      r[`a_${t}`] = cld[t].AM168.mean;
      r[`a_${t}_e`] = cld[t].AM168.sd;
    });
    return r;
  })();

  const Tip = ({ active, payload }) => {
    if (!active || !payload?.length) return null;
    const d = payload[0]?.payload;
    if (!d) return null;
    const items = [];
    payload.forEach((p) => {
      if (p.value == null) return;
      const k = p.dataKey;
      let tK, src;
      if (k.startsWith("c_")) { tK = k.slice(2); src = "COPD"; }
      else if (k.startsWith("d_")) { tK = k.slice(2); src = "CLD"; }
      else if (k.startsWith("a_")) { tK = k.slice(2); src = "AM168"; }
      else return;
      if (!T[tK]) return;
      items.push({ tK, src, val: p.value, err: d[k + "_e"] });
    });
    if (!items.length) return null;
    return (
      <div style={{
        background: "rgba(8,10,18,0.96)", backdropFilter: "blur(12px)",
        border: "1px solid rgba(255,255,255,0.08)", borderRadius: 6,
        padding: "10px 14px", fontSize: 11, lineHeight: 1.8,
        boxShadow: "0 12px 40px rgba(0,0,0,0.5)",
      }}>
        <div style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontWeight: 600, color: "#fff", fontSize: 13, marginBottom: 2, letterSpacing: "0.02em" }}>
          {d.label || `P${d.x}`}
        </div>
        {items.map((e, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ width: 7, height: 7, borderRadius: 2, background: T[e.tK].color, flexShrink: 0 }} />
            <span style={{ fontFamily: "'Fira Code', monospace", color: "rgba(255,255,255,0.35)", width: 38, fontSize: 10 }}>{e.src}</span>
            <span style={{ color: T[e.tK].color, fontWeight: 600, width: 52, fontFamily: "'Fira Code', monospace", fontSize: 10 }}>{T[e.tK].short}</span>
            <span style={{ fontFamily: "'Fira Code', monospace", color: "rgba(255,255,255,0.8)" }}>
              {e.val.toFixed(2)}{e.err != null && <span style={{ color: "rgba(255,255,255,0.35)" }}> ± {e.err.toFixed(3)}</span>}
            </span>
          </div>
        ))}
      </div>
    );
  };

  const Pill = ({ active, onClick, children, color }) => (
    <button onClick={onClick} style={{
      padding: "5px 14px", borderRadius: 4, cursor: "pointer",
      transition: "all 0.25s ease",
      border: active ? `1px solid ${color || "rgba(255,255,255,0.4)"}` : "1px solid rgba(255,255,255,0.06)",
      background: active ? `${color || "rgba(255,255,255,0.1)"}11` : "transparent",
      color: active ? "#fff" : "rgba(255,255,255,0.35)",
      fontSize: 10, fontFamily: "'Fira Code', monospace", fontWeight: active ? 600 : 400,
      letterSpacing: "0.04em", textTransform: "uppercase",
    }}>{children}</button>
  );

  return (
    <div style={{
      background: "#060810",
      minHeight: "100vh",
      position: "relative",
      overflow: "hidden",
    }}>
      {/* Google Fonts */}
      <link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;500;600;700&family=Libre+Franklin:wght@300;400;500;600&family=Fira+Code:wght@400;500;600&display=swap" rel="stylesheet" />

      {/* Atmospheric grain */}
      <div style={{
        position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0, opacity: 0.35,
        backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.04'/%3E%3C/svg%3E")`,
      }} />

      {/* Radial accent glow */}
      <div style={{
        position: "fixed", top: "-20%", left: "60%", width: "50%", height: "50%",
        background: "radial-gradient(ellipse, rgba(78,173,255,0.025) 0%, transparent 70%)",
        pointerEvents: "none", zIndex: 0,
      }} />
      <div style={{
        position: "fixed", bottom: "-10%", left: "-10%", width: "40%", height: "40%",
        background: "radial-gradient(ellipse, rgba(255,107,107,0.015) 0%, transparent 70%)",
        pointerEvents: "none", zIndex: 0,
      }} />

      <div style={{ position: "relative", zIndex: 1, padding: "36px 24px 48px", maxWidth: 980, margin: "0 auto" }}>

        {/* ── HEADER ── */}
        <div style={{
          opacity: mounted ? 1 : 0, transform: mounted ? "none" : "translateY(14px)",
          transition: "all 0.8s cubic-bezier(0.16,1,0.3,1)",
          marginBottom: 36,
        }}>
          <div style={{
            fontFamily: "'Fira Code', monospace", fontSize: 9, letterSpacing: "0.2em",
            textTransform: "uppercase", color: "rgba(255,255,255,0.18)", marginBottom: 10,
          }}>
            GenSci133 · Cell Line Characterization · qPCR Copy Number
          </div>
          <h1 style={{
            fontFamily: "'Cormorant Garamond', Georgia, serif",
            fontSize: 36, fontWeight: 500, color: "#fff", margin: 0,
            lineHeight: 1.15, letterSpacing: "-0.01em",
          }}>
            Transgene Copy Number Stability
          </h1>
          <div style={{
            fontFamily: "'Cormorant Garamond', Georgia, serif",
            fontSize: 22, fontWeight: 400, color: "rgba(255,255,255,0.35)",
            marginTop: 2, letterSpacing: "0.02em",
          }}>
            COPD vs CLD Passage Trend
          </div>
          <div style={{
            marginTop: 16, fontFamily: "'Libre Franklin', sans-serif", fontSize: 12,
            color: "rgba(255,255,255,0.28)", lineHeight: 1.75, maxWidth: 640,
            fontWeight: 300,
          }}>
            Target / B2M ratio across serial passages. COPD error bars from intermediate
            precision (Slide 11, n=3 independent runs); CLD error bars from within-run
            triplicate standard deviation. Shaded regions indicate ±30% of MCB anchor.
          </div>
        </div>

        {/* ── CONTROLS ── */}
        <div style={{
          display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center", marginBottom: 20,
          opacity: mounted ? 1 : 0, transform: mounted ? "none" : "translateY(8px)",
          transition: "all 0.8s cubic-bezier(0.16,1,0.3,1) 0.12s",
        }}>
          <Pill active={sel === "all"} onClick={() => setSel("all")}>All</Pill>
          {["5", "H", "L"].map((t) => (
            <Pill key={t} active={sel === t} onClick={() => setSel(t)} color={T[t].color}>
              {T[t].short}
            </Pill>
          ))}
          <div style={{ width: 1, height: 18, background: "rgba(255,255,255,0.06)", margin: "0 10px" }} />
          <Pill active={showCOPD} onClick={() => setShowCOPD(!showCOPD)}>COPD</Pill>
          <Pill active={showCLD} onClick={() => setShowCLD(!showCLD)}>CLD</Pill>
          <div style={{ width: 1, height: 18, background: "rgba(255,255,255,0.06)", margin: "0 10px" }} />
          <Pill active={zone} onClick={() => setZone(!zone)}>±30% Zone</Pill>
        </div>

        {/* ── CHART ── */}
        <div style={{
          background: "rgba(255,255,255,0.015)", borderRadius: 12,
          border: "1px solid rgba(255,255,255,0.04)",
          padding: "24px 14px 14px 6px",
          opacity: mounted ? 1 : 0, transform: mounted ? "none" : "translateY(8px)",
          transition: "all 0.8s cubic-bezier(0.16,1,0.3,1) 0.25s",
        }}>
          <ResponsiveContainer width="100%" height={440}>
            <ComposedChart margin={{ top: 8, right: 28, left: 8, bottom: 16 }}>
              <CartesianGrid strokeDasharray="2 6" stroke="rgba(255,255,255,0.03)" vertical={false} />
              <XAxis
                type="number" dataKey="x" domain={[-3, 68]}
                ticks={[0, 10, 20, 30, 40, 50, 60]}
                tick={{ fill: "rgba(255,255,255,0.25)", fontSize: 10, fontFamily: "'Fira Code', monospace" }}
                axisLine={{ stroke: "rgba(255,255,255,0.06)" }} tickLine={false}
                label={{ value: "Passage Number", position: "insideBottom", offset: -6, fill: "rgba(255,255,255,0.18)", fontSize: 10, fontFamily: "'Fira Code', monospace" }}
              />
              <YAxis
                domain={[0, 3.2]}
                tick={{ fill: "rgba(255,255,255,0.25)", fontSize: 10, fontFamily: "'Fira Code', monospace" }}
                axisLine={{ stroke: "rgba(255,255,255,0.06)" }} tickLine={false}
                label={{ value: "Target / B2M", angle: -90, position: "insideLeft", offset: 12, fill: "rgba(255,255,255,0.18)", fontSize: 10, fontFamily: "'Fira Code', monospace" }}
              />
              <Tooltip content={<Tip />} />

              {zone && targets.map((t) => (
                <ReferenceArea key={`z-${t}`}
                  y1={MCB[t] * 0.7} y2={MCB[t] * 1.3}
                  fill={T[t].color} fillOpacity={0.02}
                  stroke={T[t].color} strokeOpacity={0.07} strokeDasharray="3 5"
                />
              ))}

              {targets.map((t) => (
                <ReferenceLine key={`r-${t}`} y={MCB[t]}
                  stroke={T[t].color} strokeDasharray="10 8" strokeOpacity={0.1} strokeWidth={1}
                />
              ))}

              {showCOPD && targets.map((t) => (
                <Line key={`c-${t}`} data={copdData} type="monotone" dataKey={`c_${t}`}
                  stroke={T[t].color} strokeWidth={1.5} strokeDasharray="5 4" strokeOpacity={0.55}
                  dot={{ r: 3.5, fill: "#060810", stroke: T[t].color, strokeWidth: 1.5 }}
                  activeDot={{ r: 5.5, fill: "#fff", stroke: T[t].color, strokeWidth: 2 }}
                  isAnimationActive={false} name={`c_${t}`}
                >
                  <ErrorBar dataKey={`c_${t}_e`} width={4} stroke={T[t].color} strokeWidth={1} opacity={0.35} />
                </Line>
              ))}

              {showCLD && targets.map((t) => (
                <Line key={`d-${t}`} data={cldMain} type="monotone" dataKey={`d_${t}`}
                  stroke={T[t].color} strokeWidth={2.5}
                  dot={{ r: 4.5, fill: T[t].color, stroke: "#fff", strokeWidth: 1.5 }}
                  activeDot={{ r: 6.5, fill: "#fff", stroke: T[t].color, strokeWidth: 2.5 }}
                  isAnimationActive={false} name={`d_${t}`}
                >
                  <ErrorBar dataKey={`d_${t}_e`} width={4} stroke={T[t].color} strokeWidth={1.5} opacity={0.55} />
                </Line>
              ))}

              {showCLD && targets.map((t) => (
                <Scatter key={`a-${t}`} data={[am168]}
                  dataKey={`a_${t}`} fill={T[t].color} stroke="#fff" strokeWidth={1.5}
                  shape="diamond" isAnimationActive={false} name={`a_${t}`}
                >
                  <ErrorBar dataKey={`a_${t}_e`} width={4} stroke={T[t].color} strokeWidth={1.5} opacity={0.55} />
                </Scatter>
              ))}
            </ComposedChart>
          </ResponsiveContainer>

          {/* Legend */}
          <div style={{
            display: "flex", justifyContent: "center", gap: 24, marginTop: 10, flexWrap: "wrap",
            fontFamily: "'Fira Code', monospace", fontSize: 9.5, color: "rgba(255,255,255,0.3)",
            letterSpacing: "0.03em",
          }}>
            {targets.map((t) => (
              <div key={t} style={{ display: "flex", alignItems: "center", gap: 5 }}>
                <svg width="40" height="14" style={{ overflow: "visible" }}>
                  <line x1="0" y1="7" x2="15" y2="7" stroke={T[t].color} strokeWidth="1.5" strokeDasharray="4 3" opacity="0.55" />
                  <circle cx="7" cy="7" r="3" fill="#060810" stroke={T[t].color} strokeWidth="1.5" />
                  <line x1="22" y1="7" x2="40" y2="7" stroke={T[t].color} strokeWidth="2.5" />
                  <circle cx="31" cy="7" r="3.5" fill={T[t].color} stroke="#fff" strokeWidth="1" />
                </svg>
                <span style={{ color: T[t].color, opacity: 0.75 }}>{T[t].short}</span>
              </div>
            ))}
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <span style={{ opacity: 0.5 }}>╌╌ COPD</span>
              <span style={{ opacity: 0.5 }}>── CLD</span>
              <span style={{ opacity: 0.5 }}>◆ AM168</span>
            </div>
          </div>
        </div>

        {/* ── DATA TABLE ── */}
        <div style={{
          marginTop: 28, background: "rgba(255,255,255,0.015)", borderRadius: 12,
          border: "1px solid rgba(255,255,255,0.04)", padding: "22px 20px", overflowX: "auto",
          opacity: mounted ? 1 : 0, transform: mounted ? "none" : "translateY(8px)",
          transition: "all 0.8s cubic-bezier(0.16,1,0.3,1) 0.4s",
        }}>
          <div style={{
            fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: 20, fontWeight: 600,
            color: "rgba(255,255,255,0.65)", marginBottom: 16, letterSpacing: "0.01em",
          }}>
            Passage Comparison
          </div>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th style={th1}>Passage</th>
                {["5", "H", "L"].map((t) => (
                  <th key={t} colSpan={2} style={{
                    ...th1, textAlign: "center", color: T[t].color,
                    borderBottom: `2px solid ${T[t].color}22`,
                  }}>{T[t].short}</th>
                ))}
              </tr>
              <tr>
                <th style={th2} />
                {["5", "H", "L"].flatMap((t) => [
                  <th key={`${t}c`} style={th2}>COPD</th>,
                  <th key={`${t}d`} style={th2}>CLD</th>,
                ])}
              </tr>
            </thead>
            <tbody>
              {[
                { label: "Anchor", ci: 0, cs: "RCB" },
                { label: "~P15–17", ci: 1, cs: "P17" },
                { label: "~P20", ci: 2, cs: null },
                { label: "~P30–31", ci: 3, cs: "P31" },
                { label: "~P40–45", ci: 4, cs: "P45" },
                { label: "~P50", ci: 5, cs: null },
                { label: "~P60–63", ci: 6, cs: "P63" },
                { label: "AM168", ci: null, cs: "AM168" },
              ].map((row, ri) => (
                <tr key={ri} style={{
                  background: ri === 0 ? "rgba(255,255,255,0.02)" : "transparent",
                  transition: "background 0.2s",
                }}>
                  <td style={{
                    ...td,
                    fontFamily: ri === 0 ? "'Cormorant Garamond', serif" : "'Libre Franklin', sans-serif",
                    fontWeight: ri === 0 ? 600 : 400, fontSize: ri === 0 ? 13 : 11,
                    color: ri === 0 ? "#fff" : row.label === "AM168" ? "rgba(255,200,100,0.65)" : "rgba(255,255,255,0.4)",
                  }}>
                    {row.label}
                    {ri === 0 && <span style={{ fontSize: 9, color: "rgba(255,255,255,0.15)", marginLeft: 6, fontFamily: "'Fira Code', monospace" }}>REF</span>}
                  </td>
                  {["5", "H", "L"].flatMap((t) => {
                    const cv = row.ci != null ? COPD_RATIOS[t][row.ci] : null;
                    const ce = cv != null ? cv * COPD_RSD[t] : null;
                    const dv = row.cs != null ? cld[t][row.cs]?.mean : null;
                    const de = row.cs != null ? cld[t][row.cs]?.sd : null;
                    const inZ = (v) => v != null && v >= MCB[t] * 0.7 && v <= MCB[t] * 1.3;
                    return [
                      <td key={`${t}c${ri}`} style={{
                        ...td, ...mono, textAlign: "center",
                        color: cv == null ? "rgba(255,255,255,0.1)" : inZ(cv) ? "rgba(255,255,255,0.45)" : "rgba(255,120,100,0.65)",
                      }}>
                        {cv != null ? `${cv.toFixed(2)} ± ${ce.toFixed(3)}` : "—"}
                      </td>,
                      <td key={`${t}d${ri}`} style={{
                        ...td, ...mono, textAlign: "center",
                        color: dv == null ? "rgba(255,255,255,0.1)" : inZ(dv) ? "rgba(255,255,255,0.65)" : "rgba(255,200,100,0.75)",
                      }}>
                        {dv != null ? `${dv.toFixed(2)} ± ${de.toFixed(3)}` : "—"}
                      </td>,
                    ];
                  })}
                </tr>
              ))}
              <tr style={{ borderTop: "1px solid rgba(255,255,255,0.08)" }}>
                <td style={{
                  ...td, fontFamily: "'Cormorant Garamond', serif",
                  fontWeight: 600, color: "rgba(255,255,255,0.55)", fontSize: 13,
                }}>
                  Retained at ~P60
                </td>
                {["5", "H", "L"].flatMap((t) => {
                  const cp = ((COPD_RATIOS[t][6] / COPD_RATIOS[t][0]) * 100).toFixed(0);
                  const dp = ((cld[t].P63.mean / cld[t].RCB.mean) * 100).toFixed(0);
                  return [
                    <td key={`${t}cp`} style={{ ...td, ...mono, textAlign: "center", fontWeight: 700, fontSize: 12, color: "rgba(255,120,100,0.8)" }}>{cp}%</td>,
                    <td key={`${t}dp`} style={{ ...td, ...mono, textAlign: "center", fontWeight: 700, fontSize: 12, color: "rgba(255,200,100,0.85)" }}>{dp}%</td>,
                  ];
                })}
              </tr>
            </tbody>
          </table>
        </div>

        {/* ── OBSERVATIONS ── */}
        <div style={{
          marginTop: 28, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16,
          opacity: mounted ? 1 : 0, transform: mounted ? "none" : "translateY(8px)",
          transition: "all 0.8s cubic-bezier(0.16,1,0.3,1) 0.55s",
        }}>
          {[
            { n: "01", title: "CLD anchors start higher", text: "RCB ratios (CLD) exceed MCB (COPD) for 133-5 (+9.5%) and 133-H (+13.8%), while 133-L is marginally lower (−5.0%). Likely reflects cell bank prep or passage counting conventions between labs.", accent: T["5"].color },
            { n: "02", title: "Gentler CLD decline", text: "At ~P60, CLD retains more signal across all targets — 133-H: 64% (CLD) vs 54% (COPD). The slope is shallower but the direction is unmistakably identical. Both datasets confirm progressive transgene erosion.", accent: T.H.color },
            { n: "03", title: "AM168 partial recovery", text: "The AM168-treated sample (P61.8) shows ratios above untreated P63 for all three targets. This suggests process-related copy number stabilization — mechanism and reproducibility warrant follow-up with CLD.", accent: "rgba(255,200,100,0.75)" },
            { n: "04", title: "Cross-lab reproducibility", text: "Independent sample sets from different teams (COPD vs CLD) both show monotonic downward trends. This cross-validation strengthens the biological finding — method artifact alone cannot explain convergent results.", accent: T.L.color },
          ].map((card) => (
            <div key={card.n} style={{
              background: "rgba(255,255,255,0.015)", borderRadius: 10,
              border: "1px solid rgba(255,255,255,0.04)", padding: "18px 20px",
              position: "relative", overflow: "hidden",
              transition: "border-color 0.3s",
            }}>
              <div style={{
                position: "absolute", top: 12, right: 14,
                fontFamily: "'Cormorant Garamond', serif", fontSize: 42, fontWeight: 700,
                color: "rgba(255,255,255,0.02)", lineHeight: 1, userSelect: "none",
              }}>{card.n}</div>
              <div style={{
                fontFamily: "'Cormorant Garamond', serif", fontSize: 16, fontWeight: 600,
                color: card.accent, marginBottom: 8, letterSpacing: "0.01em",
              }}>{card.title}</div>
              <div style={{
                fontFamily: "'Libre Franklin', sans-serif", fontSize: 11.5,
                lineHeight: 1.7, color: "rgba(255,255,255,0.35)", fontWeight: 300,
              }}>{card.text}</div>
            </div>
          ))}
        </div>

        {/* ── FOOTER ── */}
        <div style={{
          marginTop: 36, fontFamily: "'Fira Code', monospace", fontSize: 8.5,
          color: "rgba(255,255,255,0.12)", letterSpacing: "0.08em",
          textTransform: "uppercase", lineHeight: 1.9,
          borderTop: "1px solid rgba(255,255,255,0.04)", paddingTop: 18,
          opacity: mounted ? 1 : 0,
          transition: "all 0.8s cubic-bezier(0.16,1,0.3,1) 0.7s",
        }}>
          Source: COPD small-scale passage study (Slide 12) · CLD submission (2026-04-24) ·
          Error: COPD = Slide 11 intermediate precision RSD; CLD = within-sample triplicate SD ·
          Acceptance zone: ±30% of COPD MCB anchor · April 2026
        </div>
      </div>
    </div>
  );
}

const th1 = {
  textAlign: "left", padding: "8px 10px",
  borderBottom: "1px solid rgba(255,255,255,0.08)",
  fontFamily: "'Fira Code', monospace", fontWeight: 600, fontSize: 10,
  color: "rgba(255,255,255,0.3)", letterSpacing: "0.05em",
  textTransform: "uppercase",
};
const th2 = {
  textAlign: "center", padding: "4px 10px",
  borderBottom: "1px solid rgba(255,255,255,0.04)",
  fontFamily: "'Fira Code', monospace", fontWeight: 400, fontSize: 9,
  color: "rgba(255,255,255,0.18)", letterSpacing: "0.06em",
  textTransform: "uppercase",
};
const td = { padding: "6px 10px", borderBottom: "1px solid rgba(255,255,255,0.025)", fontSize: 11 };
const mono = { fontFamily: "'Fira Code', monospace", fontSize: 10.5 };
