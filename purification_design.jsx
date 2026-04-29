import { useState, useMemo } from "react";

// ─── PROCESS PARAMETERS ──────────────────────────────────
const HARVEST_VOL = 1800; // L after cell removal
const TITER = 7; // g/L
const TOTAL_MASS = HARVEST_VOL * TITER / 1000; // kg = 12.6 kg crude

const STEPS = [
  {
    id: "CLAR",
    name: "Clarification",
    fullName: "Centrifugation + Depth Filtration + 0.2µm",
    yield: 0.95,
    equipment: "Disc-stack centrifuge + Millistak+ D0HC (6 m²) + 0.2µm Opticap (3 m²)",
    colSpec: null,
    inputVol: 2000,
    outputVol: 1800,
    notes: "Cell removal via disc-stack centrifuge at ~600 L/hr. Depth filtration removes cell debris, colloids. Bioburden reduction via 0.2µm.",
    duration: 5,
    color: "#6366f1",
  },
  {
    id: "AC",
    name: "Protein A Capture",
    fullName: "MabSelect PrismA — Bind/Elute — 2 Cycles",
    yield: 0.93,
    equipment: "Chromaflow 100 cm ID × 20 cm BH = 157 L",
    colSpec: {
      resin: "MabSelect PrismA",
      diameter: 100,
      bedHeight: 20,
      volume: 157,
      dbc: 50,
      capacityPerCycle: 7850,
      cycles: 2,
      loadPerCycle: "6.3 kg in ~900 L",
      rt: "6 min (200 cm/hr)",
      flowRate: "1,571 L/hr (26 L/min)",
      eluatePerCycle: "~400 L (2.5 CV)",
    },
    inputVol: 1800,
    outputVol: 800,
    notes: "2 × bind-elute cycles. Eluate at pH ~3.5, ~16 g/L. Pool into jacketed tank for immediate VI. CIP with 0.1M NaOH between cycles.",
    duration: 8,
    color: "#2563eb",
  },
  {
    id: "VI",
    name: "Low-pH Viral Inactivation",
    fullName: "pH 3.5, 60 min hold, 15–25°C",
    yield: 0.98,
    equipment: "1,000 L jacketed SS tank with pH/temp monitoring",
    colSpec: null,
    inputVol: 800,
    outputVol: 850,
    notes: "AC eluate already at low pH. Verify pH 3.5 ± 0.1, hold ≥60 min. Neutralize to pH 6.0 with 2M Tris base. Volume increases ~50 L from base addition. Depth-filter VI pool (Millistak+ X0SP, 1 m²) to remove precipitates before conditioning.",
    duration: 2,
    color: "#dc2626",
  },
  {
    id: "IDF",
    name: "Intermediate Conditioning",
    fullName: "In-line dilution + pH adjustment to MMA load conditions",
    yield: 0.97,
    equipment: "In-line static mixer + 0.2µm filter; or 10 m² Pellicon 3 (30 kDa) TFF for buffer exchange",
    colSpec: null,
    inputVol: 850,
    outputVol: 1100,
    notes: "Condition VI pool for MMA loading: pH 7.5–8.0, conductivity ≤5 mS/cm. Option A: 1:0.3 dilution with 50 mM Tris pH 8.0 (fast, simple). Option B: 4 DV diafiltration into MMA equilibration buffer (slower but tighter control). Prefer Option A for cycle time.",
    duration: 1.5,
    color: "#f59e0b",
  },
  {
    id: "MMA",
    name: "Mixed-Mode A (FT)",
    fullName: "Capto Adhere ImpRes — Flow-Through — 1 Cycle",
    yield: 0.93,
    equipment: "BPG 300/500 — 80 cm ID × 20 cm BH = 100 L",
    colSpec: {
      resin: "Capto Adhere ImpRes",
      diameter: 80,
      bedHeight: 20,
      volume: 100,
      dbc: null,
      capacityPerCycle: null,
      loadChallenge: "115 g/L",
      cycles: 1,
      loadPerCycle: "11.5 kg in ~1,100 L",
      rt: "4 min (300 cm/hr)",
      flowRate: "1,508 L/hr (25 L/min)",
      eluatePerCycle: "FT + wash pool ~1,400 L",
    },
    inputVol: 1100,
    outputVol: 1400,
    notes: "Flow-through mode: product passes through, HCP/DNA/aggregates bind. Load challenge ~115 g/L resin is well within FT capacity (typically 150–300 g/L for Capto Adhere). Collect FT + chase wash (3 CV). Strip with 1M NaCl + 0.5M NaOH.",
    duration: 3,
    color: "#16a34a",
  },
  {
    id: "MMC",
    name: "Mixed-Mode C (B/E)",
    fullName: "Capto MMC ImpRes — Bind/Elute — 2 Cycles",
    yield: 0.85,
    equipment: "Chromaflow 100 cm ID × 20 cm BH = 157 L",
    colSpec: {
      resin: "Capto MMC ImpRes",
      diameter: 100,
      bedHeight: 20,
      volume: 157,
      dbc: 35,
      capacityPerCycle: 5495,
      cycles: 2,
      loadPerCycle: "5.4 kg in ~700 L",
      rt: "6 min (200 cm/hr)",
      flowRate: "1,571 L/hr (26 L/min)",
      eluatePerCycle: "~470 L (3 CV)",
    },
    inputVol: 1400,
    outputVol: 940,
    notes: "Bind-elute polishing. Key for BsAb — separates mispaired species, residual aggregates, charge variants. Load at pH 5.0, low conductivity. Elute with salt + pH gradient. 2 cycles required due to mass load. Expect 85% step yield (most selective step). Pool elution peak by UV/conductivity.",
    duration: 8,
    color: "#7c3aed",
  },
  {
    id: "NF",
    name: "Virus Filtration",
    fullName: "Planova 20N or Virosart CPV — 20 nm rated",
    yield: 0.98,
    equipment: "4 × Planova 20N (0.12 m² each) or 2 × Virosart CPV (0.5 m² each)",
    colSpec: null,
    inputVol: 940,
    outputVol: 960,
    notes: "Dead-end NF at ≤2 bar, ~50–100 L/m²/hr. Pre-filter with 0.1µm. Post-filter with 0.2µm integrity-tested. Volume increases slightly from buffer flush. Flux monitored for filter fouling. Pre-use/post-use integrity testing (forward-flow or bubble point) required.",
    duration: 3,
    color: "#0891b2",
  },
  {
    id: "UFDF",
    name: "UF/DF + Bulk Fill",
    fullName: "30 kDa Pellicon 3 TFF → 0.2µm → Bulk Fill",
    yield: 0.92,
    equipment: "15 m² Pellicon 3 Ultracel 30 kDa + 0.2µm Opticap XL",
    colSpec: null,
    inputVol: 960,
    outputVol: 53,
    outputConc: 150,
    notes: "UF1: concentrate from ~9 g/L to ~40 g/L. DF: 8 diafiltration volumes into formulation buffer. UF2: concentrate to ~150 g/L (assuming 150 mg/mL BDS target for a BsAb). 0.2µm bioburden reduction filtration. Bulk fill into 2L PETG bottles. Final volume: ~53 L at 150 mg/mL = 8.0 kg BDS.",
    duration: 5,
    color: "#be185d",
  },
];

// Calculate mass balance
function computeMassBalance(steps) {
  let mass = TOTAL_MASS;
  return steps.map(step => {
    const inputMass = mass;
    const outputMass = mass * step.yield;
    mass = outputMass;
    const conc = step.outputConc || (outputMass * 1000 / step.outputVol);
    return { ...step, inputMass, outputMass, outputConc: conc };
  });
}

// Gantt segments
function computeGantt(steps) {
  let t = 0;
  return steps.map(step => {
    const start = t;
    const end = t + step.duration;
    t = end;
    return { ...step, start, end };
  });
}

// ─── SUB-COMPONENTS ──────────────────────────────────────

function TabButton({ active, onClick, children }) {
  return (
    <button onClick={onClick} style={{
      padding: "8px 16px", borderRadius: 6, border: "none", cursor: "pointer",
      fontSize: 12, fontWeight: 600, fontFamily: "'IBM Plex Mono', monospace",
      background: active ? "#2563eb" : "#1e293b",
      color: active ? "#fff" : "#94a3b8",
      transition: "all 0.15s ease",
      whiteSpace: "nowrap",
    }}>{children}</button>
  );
}

function Card({ children, style }) {
  return (
    <div style={{
      background: "#fff", borderRadius: 10, padding: "20px",
      boxShadow: "0 4px 24px rgba(0,0,0,0.25)", ...style,
    }}>{children}</div>
  );
}

function DarkCard({ children, style }) {
  return (
    <div style={{
      background: "#1e293b", borderRadius: 10, padding: "18px 20px",
      boxShadow: "0 2px 12px rgba(0,0,0,0.2)", ...style,
    }}>{children}</div>
  );
}

function KPI({ label, value, sub, accent }) {
  return (
    <div style={{
      background: "#1e293b", borderRadius: 10, padding: "14px 16px",
      borderLeft: `3px solid ${accent}`, flex: "1 1 0",
    }}>
      <div style={{ fontSize: 9, color: "#94a3b8", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em" }}>{label}</div>
      <div style={{ fontSize: 24, fontWeight: 700, color: "#f1f5f9", fontFamily: "'IBM Plex Mono', monospace", margin: "3px 0 2px" }}>{value}</div>
      <div style={{ fontSize: 10, color: "#64748b" }}>{sub}</div>
    </div>
  );
}

// ─── TABS ─────────────────────────────────────────────────

function MassBalanceTab({ data }) {
  return (
    <Card>
      <h2 style={{ fontSize: 15, fontWeight: 700, color: "#0f172a", margin: "0 0 4px" }}>Process Flow — Mass Balance</h2>
      <p style={{ fontSize: 11, color: "#64748b", margin: "0 0 16px" }}>
        2,000 L bioreactor · 7 g/L · {TOTAL_MASS.toFixed(1)} kg crude → {data[data.length-1].outputMass.toFixed(1)} kg BDS ({(data[data.length-1].outputMass/TOTAL_MASS*100).toFixed(0)}% overall yield)
      </p>

      {data.map((step, i) => (
        <div key={step.id} style={{ marginBottom: i < data.length - 1 ? 12 : 0 }}>
          <div style={{
            display: "flex", alignItems: "stretch", gap: 0,
            border: "1px solid #e2e8f0", borderRadius: 8, overflow: "hidden",
          }}>
            {/* Color bar */}
            <div style={{ width: 5, background: step.color, flexShrink: 0 }} />

            {/* Step info */}
            <div style={{ flex: 1, padding: "10px 14px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 4 }}>
                <div>
                  <span style={{ fontSize: 10, fontWeight: 700, color: step.color, fontFamily: "'IBM Plex Mono', monospace" }}>{step.id}</span>
                  <span style={{ fontSize: 13, fontWeight: 600, color: "#0f172a", marginLeft: 8 }}>{step.name}</span>
                </div>
                <span style={{ fontSize: 11, color: "#16a34a", fontWeight: 700, fontFamily: "'IBM Plex Mono', monospace" }}>
                  {(step.yield * 100).toFixed(0)}% yield
                </span>
              </div>
              <div style={{ fontSize: 11, color: "#475569", marginBottom: 6 }}>{step.fullName}</div>

              {/* Mass flow bar */}
              <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 10, fontFamily: "'IBM Plex Mono', monospace" }}>
                <span style={{ color: "#64748b" }}>{step.inputMass.toFixed(1)} kg</span>
                <div style={{ flex: 1, height: 6, background: "#f1f5f9", borderRadius: 3, position: "relative", overflow: "hidden" }}>
                  <div style={{
                    height: "100%", borderRadius: 3,
                    background: `linear-gradient(90deg, ${step.color}CC, ${step.color}88)`,
                    width: `${(step.outputMass / TOTAL_MASS) * 100}%`,
                    transition: "width 0.3s ease",
                  }} />
                </div>
                <span style={{ color: "#0f172a", fontWeight: 600 }}>{step.outputMass.toFixed(1)} kg</span>
              </div>

              {/* Volume */}
              <div style={{ display: "flex", gap: 16, marginTop: 6, fontSize: 10, color: "#94a3b8" }}>
                <span>In: {step.inputVol.toLocaleString()} L</span>
                <span>→</span>
                <span>Out: {step.outputVol.toLocaleString()} L @ {step.outputConc.toFixed(1)} g/L</span>
              </div>
            </div>
          </div>

          {/* Arrow connector */}
          {i < data.length - 1 && (
            <div style={{ textAlign: "center", color: "#cbd5e1", fontSize: 12, lineHeight: "16px" }}>▼</div>
          )}
        </div>
      ))}
    </Card>
  );
}

function EquipmentTab({ data }) {
  const chromSteps = data.filter(s => s.colSpec);
  return (
    <Card>
      <h2 style={{ fontSize: 15, fontWeight: 700, color: "#0f172a", margin: "0 0 14px" }}>Column Sizing & Equipment</h2>

      {data.map(step => (
        <div key={step.id} style={{
          marginBottom: 14, border: "1px solid #e2e8f0", borderRadius: 8,
          overflow: "hidden",
        }}>
          <div style={{
            background: `${step.color}10`, padding: "8px 14px",
            borderBottom: "1px solid #e2e8f0",
            display: "flex", justifyContent: "space-between", alignItems: "center",
          }}>
            <div>
              <span style={{ fontSize: 11, fontWeight: 700, color: step.color, fontFamily: "'IBM Plex Mono', monospace" }}>{step.id}</span>
              <span style={{ fontSize: 13, fontWeight: 600, color: "#0f172a", marginLeft: 8 }}>{step.name}</span>
            </div>
            <span style={{ fontSize: 10, color: "#64748b", fontFamily: "'IBM Plex Mono', monospace" }}>
              {step.duration} hr
            </span>
          </div>
          <div style={{ padding: "10px 14px" }}>
            <div style={{ fontSize: 11, color: "#0f172a", fontWeight: 600, marginBottom: 4 }}>{step.equipment}</div>

            {step.colSpec && (
              <div style={{
                display: "grid", gridTemplateColumns: "1fr 1fr", gap: "4px 16px",
                fontSize: 10, fontFamily: "'IBM Plex Mono', monospace",
                background: "#f8fafc", padding: "8px 10px", borderRadius: 6,
                marginTop: 6,
              }}>
                {Object.entries(step.colSpec).filter(([,v]) => v !== null).map(([k, v]) => (
                  <div key={k}>
                    <span style={{ color: "#94a3b8" }}>{k}: </span>
                    <span style={{ color: "#334155" }}>{typeof v === 'number' ? v.toLocaleString() : v}</span>
                  </div>
                ))}
              </div>
            )}

            <p style={{ fontSize: 10, color: "#64748b", margin: "8px 0 0", lineHeight: 1.6 }}>
              {step.notes}
            </p>
          </div>
        </div>
      ))}
    </Card>
  );
}

function GanttTab({ data }) {
  const gantt = computeGantt(data);
  const totalHrs = gantt[gantt.length - 1].end;
  const pxPerHr = 22;
  const totalW = totalHrs * pxPerHr;

  const dayLines = [];
  for (let d = 8; d <= totalHrs; d += 8) {
    dayLines.push(d);
  }

  return (
    <Card>
      <h2 style={{ fontSize: 15, fontWeight: 700, color: "#0f172a", margin: "0 0 4px" }}>Purification Cycle Timeline</h2>
      <p style={{ fontSize: 11, color: "#64748b", margin: "0 0 16px" }}>
        Linear single-train execution · Total: {totalHrs.toFixed(1)} hr ({(totalHrs/24).toFixed(1)} days) · 8-hr shift markers shown
      </p>

      <div style={{ overflowX: "auto", paddingBottom: 8 }}>
        {gantt.map((step) => (
          <div key={step.id} style={{ display: "flex", alignItems: "center", marginBottom: 4 }}>
            <div style={{
              width: 55, minWidth: 55, fontSize: 10, fontWeight: 700,
              color: step.color, fontFamily: "'IBM Plex Mono', monospace",
              textAlign: "right", paddingRight: 8,
            }}>{step.id}</div>
            <div style={{
              position: "relative", height: 26, width: totalW,
              background: "#f8fafc", borderRadius: 3, overflow: "hidden",
            }}>
              {/* Shift lines */}
              {dayLines.map(d => (
                <div key={d} style={{
                  position: "absolute", left: d * pxPerHr, top: 0, bottom: 0,
                  width: 1, background: d % 24 === 0 ? "#94a3b8" : "#e2e8f0",
                  zIndex: 0,
                }} />
              ))}

              {/* Step bar */}
              <div style={{
                position: "absolute",
                left: step.start * pxPerHr + 1,
                width: Math.max((step.end - step.start) * pxPerHr - 2, 4),
                top: 2, bottom: 2,
                background: `linear-gradient(90deg, ${step.color}, ${step.color}CC)`,
                borderRadius: 4,
                display: "flex", alignItems: "center", justifyContent: "center",
                zIndex: 1,
              }}>
                <span style={{
                  fontSize: 9, color: "#fff", fontWeight: 600,
                  fontFamily: "'IBM Plex Mono', monospace",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                }}>{step.duration}h</span>
              </div>
            </div>
          </div>
        ))}

        {/* Time axis */}
        <div style={{ display: "flex", alignItems: "flex-start" }}>
          <div style={{ width: 55, minWidth: 55 }} />
          <div style={{ position: "relative", height: 28, width: totalW }}>
            {Array.from({ length: Math.ceil(totalHrs / 4) + 1 }, (_, i) => i * 4).filter(h => h <= totalHrs).map(h => (
              <div key={h} style={{
                position: "absolute", left: h * pxPerHr, fontSize: 8,
                color: h % 24 === 0 ? "#0f172a" : "#94a3b8",
                fontWeight: h % 24 === 0 ? 700 : 400,
                fontFamily: "'IBM Plex Mono', monospace",
                transform: "translateX(-50%)", top: 4,
              }}>
                {h}h
                {h % 24 === 0 && h > 0 && (
                  <div style={{ fontSize: 7, color: "#2563eb", fontWeight: 700 }}>Day {h / 24}</div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Shift summary */}
      <div style={{
        marginTop: 14, background: "#f8fafc", borderRadius: 8, padding: 14,
        border: "1px solid #e2e8f0",
      }}>
        <h3 style={{ fontSize: 12, fontWeight: 700, color: "#0f172a", margin: "0 0 8px" }}>Shift Breakdown (3-shift, 24/7 operation)</h3>
        <div style={{ fontSize: 11, color: "#334155", lineHeight: 1.8 }}>
          <div><strong style={{ color: "#2563eb" }}>Shift 1 (0–8 hr):</strong> Harvest clarification → Protein A Cycle 1 start</div>
          <div><strong style={{ color: "#2563eb" }}>Shift 2 (8–16 hr):</strong> Protein A Cycle 2 → Viral Inactivation → Conditioning → MMA load start</div>
          <div><strong style={{ color: "#2563eb" }}>Shift 3 (16–24 hr):</strong> MMA completion → MMC Cycle 1</div>
          <div><strong style={{ color: "#7c3aed" }}>Shift 4 (24–32 hr):</strong> MMC Cycle 2 → Nanofiltration start</div>
          <div><strong style={{ color: "#7c3aed" }}>Shift 5 (32–36 hr):</strong> UF/DF → 0.2µm filtration → Bulk fill</div>
        </div>
        <div style={{ marginTop: 10, fontSize: 11, fontWeight: 600, color: "#16a34a", fontFamily: "'IBM Plex Mono', monospace" }}>
          Compressed timeline: ~35.5 hr ≈ 1.5 days → supports 7:1 BR ratio with 24/7 ops
        </div>
      </div>
    </Card>
  );
}

function SuiteTab() {
  const rooms = [
    {
      name: "Chromatography Suite",
      area: "~120 m²",
      classification: "ISO 8 / Grade D",
      items: [
        "2 × chromatography skids (ÄKTA process / BioProcess — one dedicated to Protein A, one shared for MMA + MMC)",
        "Chromaflow 100 cm column housing × 2 (AC and MMC share same size; dedicate one each to avoid repacking)",
        "BPG 300/500 80 cm column housing × 1 (MMA)",
        "Column packing station with compression accessories",
        "4 × process tanks: 1,000 L AC eluate pool, 2,000 L MMA FT pool, 1,000 L MMC eluate pool, 500 L intermediate",
        "In-line pH, conductivity, UV sensors on all skids",
        "CIP supply connections (0.5M NaOH recirculation capable)",
      ]
    },
    {
      name: "Viral Inactivation Room",
      area: "~30 m²",
      classification: "ISO 8 / Grade D (pre-viral clearance boundary)",
      items: [
        "1 × 1,000 L jacketed SS vessel with bottom-mount magnetic mixer",
        "In-line pH probe (calibrated ± 0.05) + temperature probe",
        "Acid/base addition via peristaltic pump (2M acetic acid, 2M Tris base)",
        "1 m² depth filter housing (post-VI clarification — Millistak+ X0SP)",
        "Timer interlock: prevents drain before 60 min confirmed hold",
      ]
    },
    {
      name: "TFF / UF-DF Suite",
      area: "~50 m²",
      classification: "ISO 8 / Grade D",
      items: [
        "1 × TFF skid (Cogent µ or Sartorius Sartoflow) with up to 15 m² cassette capacity",
        "Pellicon 3 Ultracel 30 kDa cassettes (15 m² installed, ~10 m² effective)",
        "Retentate tank 200 L (jacketed, 2–8°C capable for final concentration)",
        "Diafiltration buffer feed tank 500 L",
        "In-line UV/concentration monitor (SoloVPE or FlowVPX for real-time conc.)",
        "0.2µm final filtration housing (Opticap XL5, integrity-tested)",
        "Can double for intermediate conditioning DF if scheduled sequentially",
      ]
    },
    {
      name: "Virus Filtration Suite",
      area: "~25 m²",
      classification: "ISO 7 / Grade C (post-viral clearance side)",
      items: [
        "Dedicated NF skid with pressure control (≤2.0 bar transmembrane)",
        "4 × Planova 20N filter capsules (0.12 m² each) or 2 × Virosart CPV (0.5 m²)",
        "0.1µm pre-filter + 0.2µm post-filter",
        "Forward-flow / bubble-point integrity test unit",
        "Pre-use and post-use integrity testing per SOP",
        "Unidirectional flow: product enters from Grade D side, exits to Grade C side",
      ]
    },
    {
      name: "Buffer Preparation Suite",
      area: "~150 m² (often the largest DS area)",
      classification: "ISO 8 / Grade D (CNC)",
      items: [
        "3 × 5,000 L buffer prep tanks (for AC/MMA/MMC equilibration buffers — high volume)",
        "2 × 2,000 L buffer prep tanks (elution, wash, strip buffers)",
        "2 × 1,000 L buffer prep tanks (formulation buffer, CIP solutions)",
        "WFI drop point + buffer distribution loop",
        "In-line conductivity/pH verification on each tank",
        "Powder dispensing hood with dust extraction",
        "Buffer hold time validation: typically 24–72 hr at 15–25°C",
        "CRITICAL: This suite must stage ALL buffers ≥8 hr ahead of each chromatography step",
      ]
    },
    {
      name: "Bulk Drug Substance Fill",
      area: "~40 m²",
      classification: "ISO 7 / Grade C (Grade A at point of fill if open)",
      items: [
        "Peristaltic pump + tubing for gravity/pump fill into PETG bottles",
        "2 L PETG bottles (irradiated, ready-to-use)",
        "Balance for gravimetric fill verification",
        "Label printer / barcode scanner for BDS lot ID",
        "2–8°C cold room access within 15 min of fill completion",
        "Sample pull station: retain, release testing, stability aliquots",
      ]
    },
  ];

  return (
    <DarkCard>
      <h2 style={{ fontSize: 15, fontWeight: 700, color: "#e2e8f0", margin: "0 0 6px" }}>Purification Suite Design Requirements</h2>
      <p style={{ fontSize: 11, color: "#64748b", margin: "0 0 16px" }}>
        Minimum infrastructure for single-train DS processing of BsAb at 2,000 L scale
      </p>

      {rooms.map((room, ri) => (
        <div key={ri} style={{
          background: "#0f172a", borderRadius: 8, padding: "14px 16px",
          marginBottom: 12, border: "1px solid #334155",
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 8 }}>
            <h3 style={{ fontSize: 13, fontWeight: 700, color: "#f1f5f9", margin: 0 }}>{room.name}</h3>
            <div style={{ fontSize: 10, color: "#94a3b8", fontFamily: "'IBM Plex Mono', monospace" }}>
              {room.area} · {room.classification}
            </div>
          </div>
          <ul style={{ margin: 0, paddingLeft: 16 }}>
            {room.items.map((item, ii) => (
              <li key={ii} style={{
                fontSize: 11, color: "#cbd5e1", marginBottom: 4, lineHeight: 1.5,
              }}>{item}</li>
            ))}
          </ul>
        </div>
      ))}

      {/* Critical design notes */}
      <div style={{
        background: "#7c3aed20", border: "1px solid #7c3aed44", borderRadius: 8,
        padding: "14px 16px", marginTop: 8,
      }}>
        <h3 style={{ fontSize: 12, fontWeight: 700, color: "#c4b5fd", margin: "0 0 8px" }}>Critical Suite Design Notes</h3>
        <div style={{ fontSize: 11, color: "#e2e8f0", lineHeight: 1.8 }}>
          <div>1. <strong>Viral segregation boundary</strong> — physical or procedural separation between pre-viral (AC → VI → MMA → MMC) and post-viral (NF → UF/DF → fill) areas. Unidirectional personnel and material flow.</div>
          <div>2. <strong>Tank farm sizing</strong> — the MMA flow-through pool (~1,400 L) is the largest intermediate. Ensure the MMC load tank can accommodate this volume.</div>
          <div>3. <strong>CIP return loop</strong> — all chromatography columns and TFF cassettes need 0.5M NaOH CIP capability with verified contact time. Waste neutralization before drain.</div>
          <div>4. <strong>Column storage</strong> — columns stored in 20% ethanol at 2–8°C between campaigns. Dedicated cold room or jacket circulation system required.</div>
          <div>5. <strong>Hold time validation</strong> — every intermediate hold (AC eluate, VI pool, MMA FT, MMC eluate, NF pool, pre-fill BDS) requires validated hold time data at defined temperature. Total in-process hold cannot exceed validated limits.</div>
          <div>6. <strong>Schedule-critical path</strong> — AC (8 hr) and MMC (8 hr) are the two longest steps. Parallelizing buffer prep and CIP off the critical path is essential for the 35-hr target.</div>
        </div>
      </div>
    </DarkCard>
  );
}

function OptimizationTab() {
  const scenarios = [
    {
      name: "Baseline (Linear)",
      dsTime: 35.5,
      stagger: null,
      maxRatio: null,
      batchesPerYear: null,
      notes: "All steps sequential on single train. Simple, robust, max hold time buffer.",
    },
    {
      name: "Overlapped CIP",
      dsTime: 30,
      notes: "CIP of AC column runs concurrent with VI/conditioning. CIP of MMA runs concurrent with MMC loading. Saves ~5 hr. Requires 2 chromatography skids operating simultaneously.",
    },
    {
      name: "Twin-Column Protein A",
      dsTime: 27,
      notes: "Two smaller AC columns (80 cm × 20 cm = 100 L each) alternating load/elute. One loading while other elutes + CIPs. Cuts AC step from 8 hr to ~5 hr. Capital: additional column + packing.",
    },
    {
      name: "Continuous Protein A (PCC/MCSGP)",
      dsTime: 24,
      notes: "3–4 column periodic counter-current chromatography. Near-continuous capture at 3× higher resin utilization. AC step becomes ~3–4 hr with continuous eluate flow into VI. Requires specialized skid (BioSC, Cadence, or Contichrom).",
    },
  ];

  return (
    <Card>
      <h2 style={{ fontSize: 15, fontWeight: 700, color: "#0f172a", margin: "0 0 4px" }}>Optimization Scenarios & BR Ratio Impact</h2>
      <p style={{ fontSize: 11, color: "#64748b", margin: "0 0 16px" }}>
        How downstream cycle compression translates to manufacturing throughput (16-day US cycle, 330 operating days/year)
      </p>

      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11, marginBottom: 16 }}>
        <thead>
          <tr style={{ borderBottom: "2px solid #e2e8f0" }}>
            {["Scenario", "DS Cycle", "Max BR:DS", "Batches/yr", "DS Util."].map(h => (
              <th key={h} style={{
                textAlign: "left", padding: "6px 8px", fontSize: 10,
                color: "#64748b", fontWeight: 700, textTransform: "uppercase",
                fontFamily: "'IBM Plex Mono', monospace",
              }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {scenarios.map((s, i) => {
            const dsHr = s.dsTime;
            const dsDays = dsHr / 24;
            const maxRatio = Math.floor(16 / dsDays);
            const stagger = 16 / maxRatio;
            const batches = Math.floor(330 / stagger);
            const dsUtil = Math.min((dsDays / stagger * 100), 100);
            return (
              <tr key={i} style={{ borderBottom: "1px solid #f1f5f9" }}>
                <td style={{ padding: "10px 8px", fontWeight: 600, color: "#0f172a" }}>{s.name}</td>
                <td style={{ padding: "10px 8px", fontFamily: "'IBM Plex Mono', monospace", color: "#334155" }}>
                  {dsHr} hr ({dsDays.toFixed(1)} d)
                </td>
                <td style={{ padding: "10px 8px", fontFamily: "'IBM Plex Mono', monospace", fontWeight: 700, color: "#2563eb" }}>
                  {maxRatio}:1
                </td>
                <td style={{ padding: "10px 8px", fontFamily: "'IBM Plex Mono', monospace", fontWeight: 700, color: "#16a34a" }}>
                  {batches}
                </td>
                <td style={{ padding: "10px 8px", fontFamily: "'IBM Plex Mono', monospace", color: "#334155" }}>
                  {dsUtil.toFixed(0)}%
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {/* Detailed notes */}
      {scenarios.map((s, i) => (
        <div key={i} style={{
          padding: "10px 14px", marginBottom: 8,
          background: i === 0 ? "#f1f5f9" : "#f0fdf4",
          borderRadius: 6, borderLeft: `3px solid ${i === 0 ? "#94a3b8" : "#16a34a"}`,
        }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: "#0f172a", marginBottom: 4 }}>{s.name}</div>
          <div style={{ fontSize: 11, color: "#475569", lineHeight: 1.6 }}>{s.notes}</div>
        </div>
      ))}

      {/* Key insight */}
      <div style={{
        marginTop: 16, background: "#eff6ff", border: "1px solid #bfdbfe",
        borderRadius: 8, padding: "14px 16px",
      }}>
        <h3 style={{ fontSize: 12, fontWeight: 700, color: "#1e40af", margin: "0 0 6px" }}>Key Insight</h3>
        <p style={{ fontSize: 11, color: "#1e3a5f", margin: 0, lineHeight: 1.6 }}>
          The bottleneck is the two multi-cycle bind-elute chromatography steps (Protein A and MMC), each requiring ~8 hr with a 157 L column and 2 cycles. Compressing these via twin-column or continuous chromatography is the highest-leverage optimization. Moving from a 35.5 hr baseline to a 24 hr cycle enables a jump from 10:1 theoretical max ratio to 16:1 — well beyond the practical 6–7:1 target, giving ample scheduling margin and multi-product flexibility.
        </p>
      </div>
    </Card>
  );
}

// ─── MAIN ────────────────────────────────────────────────

export default function PurificationDesign() {
  const [tab, setTab] = useState(0);
  const data = useMemo(() => computeMassBalance(STEPS), []);
  const totalHrs = STEPS.reduce((s, st) => s + st.duration, 0);
  const finalMass = data[data.length - 1].outputMass;

  const tabs = [
    { label: "Mass Balance", content: <MassBalanceTab data={data} /> },
    { label: "Equipment", content: <EquipmentTab data={data} /> },
    { label: "Timeline", content: <GanttTab data={data} /> },
    { label: "Suite Design", content: <SuiteTab /> },
    { label: "Optimization", content: <OptimizationTab /> },
  ];

  return (
    <div style={{
      minHeight: "100vh", background: "#0f172a",
      fontFamily: "'IBM Plex Sans', 'Helvetica Neue', sans-serif",
      padding: "24px 16px",
    }}>
      <link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500;600&display=swap" rel="stylesheet" />

      <div style={{ maxWidth: 900, margin: "0 auto" }}>
        {/* Header */}
        <div style={{ marginBottom: 20 }}>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: "#f1f5f9", margin: "0 0 4px", letterSpacing: "-0.02em" }}>
            BsAb Purification Process Design
          </h1>
          <p style={{ fontSize: 12, color: "#64748b", margin: 0 }}>
            2,000 L · 7 g/L · AC → VI → DF → MMA → MMC → NF → UF/DF · Target 60% overall yield
          </p>
        </div>

        {/* KPIs */}
        <div style={{ display: "flex", gap: 10, marginBottom: 20, flexWrap: "wrap" }}>
          <KPI label="Crude Input" value={`${TOTAL_MASS.toFixed(1)} kg`} sub="1,800 L clarified harvest" accent="#6366f1" />
          <KPI label="BDS Output" value={`${finalMass.toFixed(1)} kg`} sub={`${(finalMass / TOTAL_MASS * 100).toFixed(0)}% overall yield · 150 mg/mL`} accent="#16a34a" />
          <KPI label="Cycle Time" value={`${totalHrs} hr`} sub={`${(totalHrs / 24).toFixed(1)} days linear execution`} accent="#f59e0b" />
          <KPI label="Max BR Ratio" value={`${Math.floor(16 / (totalHrs / 24))}:1`} sub="at 16-day US cycle" accent="#2563eb" />
        </div>

        {/* Tab bar */}
        <div style={{ display: "flex", gap: 6, marginBottom: 16, flexWrap: "wrap" }}>
          {tabs.map((t, i) => (
            <TabButton key={i} active={tab === i} onClick={() => setTab(i)}>{t.label}</TabButton>
          ))}
        </div>

        {/* Tab content */}
        {tabs[tab].content}

        <p style={{ fontSize: 9, color: "#475569", marginTop: 14, lineHeight: 1.5 }}>
          Design basis: BsAb (easy format, e.g., knob-in-hole IgG-like) · MabSelect PrismA DBC 50 g/L at 6 min RT · Capto Adhere FT at 115 g/L challenge · Capto MMC ImpRes DBC 35 g/L · 24/7 3-shift operation · Single purification train
        </p>
      </div>
    </div>
  );
}
