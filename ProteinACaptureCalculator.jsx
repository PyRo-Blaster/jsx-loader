import React, { useState, useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, ReferenceDot, Area, AreaChart, ComposedChart } from 'recharts';

// Resin presets — DBC saturation parameters (Michaelis-Menten-like form: DBC = DBC_max * RT / (K + RT))
const RESINS = {
  'MabSelect SuRe LX': { dbcMax: 75, kRt: 1.5, vMax: 500, defaultRt: 6, color: '#1F3A5F' },
  'MabSelect PrismA':  { dbcMax: 85, kRt: 1.0, vMax: 700, defaultRt: 4, color: '#2D5F8B' },
  'MabSelect SuRe':    { dbcMax: 50, kRt: 1.8, vMax: 500, defaultRt: 6, color: '#3E6B92' },
};

const FEEDS = {
  'Stable pool / clarified': { derate: 0.95, label: 'CHO stable, well-clarified' },
  'Transient (CHO-T)':       { derate: 0.85, label: 'Transient CHO, depth-filtered' },
  'Crude / cell-laden':      { derate: 0.75, label: 'Cell debris carryover' },
};

const ProteinACaptureCalculator = () => {
  // Inputs
  const [resinKey, setResinKey] = useState('MabSelect SuRe LX');
  const [feedKey, setFeedKey] = useState('Stable pool / clarified');
  const [titer, setTiter] = useState(5.0);
  const [hccfVolume, setHccfVolume] = useState(3.0);
  const [residenceTime, setResidenceTime] = useState(6.0);
  const [loadingFraction, setLoadingFraction] = useState(0.70);
  const [columnDiameter, setColumnDiameter] = useState(5.0);

  const resin = RESINS[resinKey];
  const feed = FEEDS[feedKey];

  // Process model constants
  const ELUTION_CV = 2.0;
  const PROCESS_OVERHEAD_CV = 16; // EQ(5) + Wash(5) + Strip(3) + Sanitize(3)
  const STEP_YIELD = 0.92;

  const calc = useMemo(() => {
    const derate = feed.derate;
    const totalMass = titer * hccfVolume; // g

    // DBC saturation
    const dbcAtRt = resin.dbcMax * residenceTime / (resin.kRt + residenceTime);
    const effectiveDbc = dbcAtRt * derate;

    // Sizing
    const loadCapacity = effectiveDbc * loadingFraction; // g/L
    const cv_mL = (totalMass / loadCapacity) * 1000; // mL
    const csa = Math.PI * Math.pow(columnDiameter / 2, 2); // cm²
    const bedHeight = cv_mL / csa; // cm

    // Flow
    const volumetricFlow = cv_mL / residenceTime; // mL/min
    const linearVelocity = (bedHeight / residenceTime) * 60; // cm/h

    // Times (min)
    const loadTime = (hccfVolume * 1000) / volumetricFlow;
    const elutionTime = ELUTION_CV * residenceTime;
    const overheadTime = PROCESS_OVERHEAD_CV * residenceTime;
    const totalCycle = loadTime + elutionTime + overheadTime;

    // Eluate
    const eluteVolume_mL = ELUTION_CV * cv_mL;
    const eluteMass = totalMass * STEP_YIELD;
    const eluteConc = eluteMass / (eluteVolume_mL / 1000); // g/L

    // Productivity (g eluate per L resin per hour)
    const productivity = eluteMass / ((cv_mL / 1000) * (totalCycle / 60));

    // Buffer
    const bufferVolume = (PROCESS_OVERHEAD_CV + ELUTION_CV) * cv_mL / 1000;

    // Warnings
    const warnings = [];
    if (linearVelocity > resin.vMax) warnings.push(`Linear velocity ${linearVelocity.toFixed(0)} cm/h exceeds resin max ${resin.vMax} cm/h`);
    if (bedHeight < 10) warnings.push(`Bed height ${bedHeight.toFixed(1)} cm is low — consider larger diameter or higher loading`);
    if (bedHeight > 30) warnings.push(`Bed height ${bedHeight.toFixed(1)} cm is tall — pressure drop risk`);
    if (loadingFraction > 0.85) warnings.push(`Loading at ${(loadingFraction * 100).toFixed(0)}% DBC — breakthrough risk`);

    return {
      derate, totalMass, dbcAtRt, effectiveDbc, loadCapacity,
      cv_mL, bedHeight, csa, volumetricFlow, linearVelocity,
      loadTime, elutionTime, overheadTime, totalCycle,
      eluteVolume_mL, eluteMass, eluteConc, productivity, bufferVolume,
      warnings,
    };
  }, [resin, feed, titer, hccfVolume, residenceTime, loadingFraction, columnDiameter]);

  // Sweep RT for trade-off curves
  const sweepData = useMemo(() => {
    const data = [];
    const derate = feed.derate;
    const totalMass = titer * hccfVolume;
    for (let rt = 1; rt <= 14; rt += 0.25) {
      const dbc = resin.dbcMax * rt / (resin.kRt + rt) * derate;
      const loadCap = dbc * loadingFraction;
      const cv_mL = (totalMass / loadCap) * 1000;
      const flow = cv_mL / rt;
      const loadT = (hccfVolume * 1000) / flow;
      const cycleT = loadT + (ELUTION_CV + PROCESS_OVERHEAD_CV) * rt;
      const prod = (totalMass * STEP_YIELD) / (cv_mL / 1000 * cycleT / 60);
      data.push({
        rt: Math.round(rt * 100) / 100,
        dbc: Math.round(dbc * 100) / 100,
        cv: Math.round(cv_mL),
        cycle: Math.round(cycleT),
        productivity: Math.round(prod * 100) / 100,
      });
    }
    return data;
  }, [resin, feed, titer, hccfVolume, loadingFraction]);

  // Find productivity optimum
  const optimum = useMemo(() => {
    let max = sweepData[0];
    for (const d of sweepData) if (d.productivity > max.productivity) max = d;
    return max;
  }, [sweepData]);

  // Format helpers
  const fmt = (v, d = 1) => Number.isFinite(v) ? v.toFixed(d) : '—';
  const fmtMin = (m) => {
    const h = Math.floor(m / 60);
    const min = Math.round(m % 60);
    return h > 0 ? `${h}h ${min}m` : `${min}m`;
  };

  return (
    <div style={{
      fontFamily: "'IBM Plex Sans', -apple-system, BlinkMacSystemFont, sans-serif",
      backgroundColor: '#FAF7F2',
      color: '#1A1A1A',
      minHeight: '100vh',
      padding: '32px 24px',
    }}>
      <link href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,600;9..144,700&family=IBM+Plex+Mono:wght@400;500;600&family=IBM+Plex+Sans:wght@300;400;500;600&display=swap" rel="stylesheet" />

      <div style={{ maxWidth: '1280px', margin: '0 auto' }}>

        {/* Header */}
        <header style={{ borderBottom: '0.5px solid #1A1A1A', paddingBottom: '20px', marginBottom: '32px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '11px', letterSpacing: '0.15em', color: '#7A7A7A', margin: '0 0 8px', textTransform: 'uppercase' }}>
                Process Development Tool · Capture Step Sizing
              </p>
              <h1 style={{ fontFamily: "'Fraunces', serif", fontWeight: 600, fontSize: '36px', lineHeight: 1.05, margin: 0, letterSpacing: '-0.01em' }}>
                Protein A Capture Calculator
              </h1>
              <p style={{ fontSize: '14px', color: '#5A5A5A', margin: '8px 0 0', maxWidth: '640px' }}>
                Adjust residence time against loading capacity. Identify where higher DBC stops paying for itself in cycle time.
              </p>
            </div>
            <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '11px', color: '#7A7A7A', textAlign: 'right' }}>
              <div>v.1 · {new Date().toISOString().split('T')[0]}</div>
              <div>DBC = DBC<sub>max</sub> · RT / (K + RT)</div>
            </div>
          </div>
        </header>

        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(280px, 320px) 1fr', gap: '32px', alignItems: 'flex-start' }}>

          {/* INPUTS PANEL */}
          <aside style={{ position: 'sticky', top: '24px' }}>
            <h2 style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '11px', letterSpacing: '0.15em', color: '#7A7A7A', margin: '0 0 16px', textTransform: 'uppercase', fontWeight: 500 }}>
              ─ Inputs
            </h2>

            <Group label="Resin">
              <select value={resinKey} onChange={(e) => { setResinKey(e.target.value); setResidenceTime(RESINS[e.target.value].defaultRt); }}
                style={selectStyle}>
                {Object.keys(RESINS).map(k => <option key={k} value={k}>{k}</option>)}
              </select>
              <Hint>{`DBC_max ${resin.dbcMax} g/L · K ${resin.kRt} min · v_max ${resin.vMax} cm/h`}</Hint>
            </Group>

            <Group label="HCCF quality">
              <select value={feedKey} onChange={(e) => setFeedKey(e.target.value)} style={selectStyle}>
                {Object.keys(FEEDS).map(k => <option key={k} value={k}>{k}</option>)}
              </select>
              <Hint>{`Derate × ${feed.derate} — ${feed.label}`}</Hint>
            </Group>

            <Group label="Titer">
              <NumberInput value={titer} onChange={setTiter} step={0.1} min={0.1} max={20} unit="g/L" />
            </Group>

            <Group label="HCCF volume">
              <NumberInput value={hccfVolume} onChange={setHccfVolume} step={0.5} min={0.5} max={500} unit="L" />
              <Hint>{`Total mass: ${fmt(titer * hccfVolume)} g`}</Hint>
            </Group>

            <Group label="Residence time" highlight>
              <SliderInput value={residenceTime} onChange={setResidenceTime} step={0.25} min={1} max={14} unit="min" />
            </Group>

            <Group label="Loading fraction">
              <SliderInput value={loadingFraction * 100} onChange={(v) => setLoadingFraction(v / 100)} step={1} min={50} max={90} unit="% of DBC" />
            </Group>

            <Group label="Column diameter">
              <NumberInput value={columnDiameter} onChange={setColumnDiameter} step={0.5} min={1} max={45} unit="cm" />
            </Group>

            {calc.warnings.length > 0 && (
              <div style={{ marginTop: '20px', padding: '12px', borderLeft: '2px solid #C2410C', backgroundColor: '#FFF7ED', fontSize: '12px', lineHeight: 1.5 }}>
                {calc.warnings.map((w, i) => <div key={i} style={{ color: '#7C2D12' }}>⚠ {w}</div>)}
              </div>
            )}
          </aside>

          {/* OUTPUTS */}
          <main>
            {/* Headline metrics */}
            <section style={{ marginBottom: '32px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '0', borderTop: '0.5px solid #1A1A1A', borderLeft: '0.5px solid #1A1A1A' }}>
                <Metric label="Effective DBC" value={fmt(calc.effectiveDbc)} unit="g/L resin" />
                <Metric label="Column volume" value={fmt(calc.cv_mL, 0)} unit="mL" />
                <Metric label="Bed height" value={fmt(calc.bedHeight)} unit="cm" />
                <Metric label="Volumetric flow" value={fmt(calc.volumetricFlow, 0)} unit="mL/min" />
                <Metric label="Load time" value={fmtMin(calc.loadTime)} unit="" />
                <Metric label="Cycle time" value={fmtMin(calc.totalCycle)} unit="" />
                <Metric label="Eluate concentration" value={fmt(calc.eluteConc)} unit="g/L" highlight />
                <Metric label="Productivity" value={fmt(calc.productivity)} unit="g/L resin/h" highlight />
              </div>
            </section>

            {/* Trade-off chart */}
            <section style={{ marginBottom: '32px' }}>
              <h2 style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '11px', letterSpacing: '0.15em', color: '#7A7A7A', margin: '0 0 4px', textTransform: 'uppercase', fontWeight: 500 }}>
                ─ Trade-off curve
              </h2>
              <p style={{ fontFamily: "'Fraunces', serif", fontSize: '20px', fontWeight: 600, margin: '0 0 4px', letterSpacing: '-0.01em' }}>
                Where higher DBC stops paying off
              </p>
              <p style={{ fontSize: '13px', color: '#5A5A5A', margin: '0 0 20px', maxWidth: '640px' }}>
                Productivity peaks at the residence time where DBC gain and cycle-time penalty balance. Below the peak, capacity is the limit; above it, time is.
              </p>

              <div style={{ backgroundColor: '#FFFFFF', border: '0.5px solid #1A1A1A', padding: '16px' }}>
                <ResponsiveContainer width="100%" height={320}>
                  <ComposedChart data={sweepData} margin={{ top: 16, right: 56, bottom: 32, left: 8 }}>
                    <CartesianGrid stroke="#E5E0D8" strokeDasharray="0" vertical={false} />
                    <XAxis
                      dataKey="rt"
                      type="number"
                      domain={[1, 14]}
                      ticks={[1, 2, 4, 6, 8, 10, 12, 14]}
                      tick={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, fill: '#5A5A5A' }}
                      axisLine={{ stroke: '#1A1A1A' }}
                      tickLine={{ stroke: '#1A1A1A' }}
                      label={{ value: 'Residence time (min)', position: 'insideBottom', offset: -16, style: { fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, fill: '#5A5A5A' } }}
                    />
                    <YAxis
                      yAxisId="left"
                      tick={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, fill: '#5A5A5A' }}
                      axisLine={{ stroke: '#1A1A1A' }}
                      tickLine={{ stroke: '#1A1A1A' }}
                      label={{ value: 'Productivity (g/L/h)', angle: -90, position: 'insideLeft', style: { fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, fill: '#5A5A5A', textAnchor: 'middle' } }}
                    />
                    <YAxis
                      yAxisId="right"
                      orientation="right"
                      tick={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, fill: '#5A5A5A' }}
                      axisLine={{ stroke: '#1A1A1A' }}
                      tickLine={{ stroke: '#1A1A1A' }}
                      label={{ value: 'DBC (g/L resin)', angle: 90, position: 'insideRight', style: { fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, fill: '#5A5A5A', textAnchor: 'middle' } }}
                    />
                    <Tooltip
                      contentStyle={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, backgroundColor: '#FAF7F2', border: '0.5px solid #1A1A1A', borderRadius: 0, padding: '8px 12px' }}
                      labelFormatter={(v) => `RT = ${v} min`}
                      formatter={(v, name) => {
                        if (name === 'Productivity') return [`${v} g/L/h`, name];
                        if (name === 'Effective DBC') return [`${v} g/L`, name];
                        return [v, name];
                      }}
                    />
                    <Line yAxisId="left" type="monotone" dataKey="productivity" stroke="#B8860B" strokeWidth={2} dot={false} name="Productivity" />
                    <Line yAxisId="right" type="monotone" dataKey="dbc" stroke={resin.color} strokeWidth={2} strokeDasharray="3 3" dot={false} name="Effective DBC" />
                    <ReferenceLine yAxisId="left" x={residenceTime} stroke="#1A1A1A" strokeWidth={1} label={{ value: 'Current', position: 'top', fill: '#1A1A1A', fontFamily: "'IBM Plex Mono', monospace", fontSize: 10 }} />
                    <ReferenceDot yAxisId="left" x={optimum.rt} y={optimum.productivity} r={5} fill="#B8860B" stroke="#FAF7F2" strokeWidth={2} />
                  </ComposedChart>
                </ResponsiveContainer>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '12px', fontFamily: "'IBM Plex Mono', monospace", fontSize: '11px', color: '#5A5A5A' }}>
                  <div>
                    <span style={{ display: 'inline-block', width: '20px', height: '2px', backgroundColor: '#B8860B', marginRight: '6px', verticalAlign: 'middle' }} />
                    Productivity (g eluate / L resin / h)
                    <span style={{ marginLeft: '20px', display: 'inline-block', width: '20px', borderTop: `2px dashed ${resin.color}`, marginRight: '6px', verticalAlign: 'middle' }} />
                    Effective DBC
                  </div>
                  <div>● Productivity peak: <strong style={{ color: '#1A1A1A' }}>{optimum.rt} min → {optimum.productivity} g/L/h</strong></div>
                </div>
              </div>
            </section>

            {/* CV vs cycle chart */}
            <section style={{ marginBottom: '32px' }}>
              <h2 style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '11px', letterSpacing: '0.15em', color: '#7A7A7A', margin: '0 0 4px', textTransform: 'uppercase', fontWeight: 500 }}>
                ─ Resource curves
              </h2>
              <p style={{ fontFamily: "'Fraunces', serif", fontSize: '20px', fontWeight: 600, margin: '0 0 20px', letterSpacing: '-0.01em' }}>
                Column footprint vs cycle time
              </p>

              <div style={{ backgroundColor: '#FFFFFF', border: '0.5px solid #1A1A1A', padding: '16px' }}>
                <ResponsiveContainer width="100%" height={260}>
                  <ComposedChart data={sweepData} margin={{ top: 16, right: 56, bottom: 32, left: 8 }}>
                    <CartesianGrid stroke="#E5E0D8" strokeDasharray="0" vertical={false} />
                    <XAxis
                      dataKey="rt"
                      type="number"
                      domain={[1, 14]}
                      ticks={[1, 2, 4, 6, 8, 10, 12, 14]}
                      tick={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, fill: '#5A5A5A' }}
                      axisLine={{ stroke: '#1A1A1A' }}
                      tickLine={{ stroke: '#1A1A1A' }}
                      label={{ value: 'Residence time (min)', position: 'insideBottom', offset: -16, style: { fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, fill: '#5A5A5A' } }}
                    />
                    <YAxis
                      yAxisId="left"
                      tick={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, fill: '#5A5A5A' }}
                      axisLine={{ stroke: '#1A1A1A' }}
                      tickLine={{ stroke: '#1A1A1A' }}
                      label={{ value: 'CV (mL)', angle: -90, position: 'insideLeft', style: { fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, fill: '#5A5A5A', textAnchor: 'middle' } }}
                    />
                    <YAxis
                      yAxisId="right"
                      orientation="right"
                      tick={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, fill: '#5A5A5A' }}
                      axisLine={{ stroke: '#1A1A1A' }}
                      tickLine={{ stroke: '#1A1A1A' }}
                      label={{ value: 'Cycle time (min)', angle: 90, position: 'insideRight', style: { fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, fill: '#5A5A5A', textAnchor: 'middle' } }}
                    />
                    <Tooltip
                      contentStyle={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, backgroundColor: '#FAF7F2', border: '0.5px solid #1A1A1A', borderRadius: 0, padding: '8px 12px' }}
                      labelFormatter={(v) => `RT = ${v} min`}
                    />
                    <Line yAxisId="left" type="monotone" dataKey="cv" stroke="#1F3A5F" strokeWidth={2} dot={false} name="Column volume" />
                    <Line yAxisId="right" type="monotone" dataKey="cycle" stroke="#7C2D12" strokeWidth={2} strokeDasharray="3 3" dot={false} name="Cycle time" />
                    <ReferenceLine yAxisId="left" x={residenceTime} stroke="#1A1A1A" strokeWidth={1} />
                  </ComposedChart>
                </ResponsiveContainer>
                <div style={{ marginTop: '12px', fontFamily: "'IBM Plex Mono', monospace", fontSize: '11px', color: '#5A5A5A' }}>
                  <span style={{ display: 'inline-block', width: '20px', height: '2px', backgroundColor: '#1F3A5F', marginRight: '6px', verticalAlign: 'middle' }} />
                  Column volume
                  <span style={{ marginLeft: '20px', display: 'inline-block', width: '20px', borderTop: `2px dashed #7C2D12`, marginRight: '6px', verticalAlign: 'middle' }} />
                  Cycle time
                </div>
              </div>
            </section>

            {/* Detailed breakdown */}
            <section>
              <h2 style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '11px', letterSpacing: '0.15em', color: '#7A7A7A', margin: '0 0 4px', textTransform: 'uppercase', fontWeight: 500 }}>
                ─ Process detail
              </h2>
              <p style={{ fontFamily: "'Fraunces', serif", fontSize: '20px', fontWeight: 600, margin: '0 0 20px', letterSpacing: '-0.01em' }}>
                Step-by-step breakdown
              </p>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <DetailBlock title="Capacity model">
                  <Row label="DBC at infinite RT" value={`${fmt(resin.dbcMax)} g/L`} />
                  <Row label={`DBC at ${fmt(residenceTime)} min RT`} value={`${fmt(calc.dbcAtRt)} g/L`} />
                  <Row label="HCCF derate" value={`× ${fmt(feed.derate, 2)}`} />
                  <Row label="Effective DBC" value={`${fmt(calc.effectiveDbc)} g/L`} bold />
                  <Row label={`Loading fraction (${(loadingFraction * 100).toFixed(0)}%)`} value={`× ${fmt(loadingFraction, 2)}`} />
                  <Row label="Operating load" value={`${fmt(calc.loadCapacity)} g/L`} bold />
                </DetailBlock>

                <DetailBlock title="Column geometry">
                  <Row label="Total mass" value={`${fmt(calc.totalMass)} g`} />
                  <Row label="Column volume" value={`${fmt(calc.cv_mL, 0)} mL`} bold />
                  <Row label="Diameter (fixed)" value={`${fmt(columnDiameter)} cm`} />
                  <Row label="Cross-section" value={`${fmt(calc.csa)} cm²`} />
                  <Row label="Bed height" value={`${fmt(calc.bedHeight)} cm`} bold />
                  <Row label="Linear velocity" value={`${fmt(calc.linearVelocity, 0)} cm/h`} />
                </DetailBlock>

                <DetailBlock title="Time budget">
                  <Row label="Equilibration (5 CV)" value={fmtMin(5 * residenceTime)} />
                  <Row label="Load" value={fmtMin(calc.loadTime)} bold />
                  <Row label="Wash (5 CV)" value={fmtMin(5 * residenceTime)} />
                  <Row label="Elution (2 CV)" value={fmtMin(calc.elutionTime)} />
                  <Row label="Strip + sanitize (6 CV)" value={fmtMin(6 * residenceTime)} />
                  <Row label="Total cycle" value={fmtMin(calc.totalCycle)} bold />
                </DetailBlock>

                <DetailBlock title="Eluate & resources">
                  <Row label="Step yield (assumed)" value={`${(STEP_YIELD * 100).toFixed(0)}%`} />
                  <Row label="Eluate mass" value={`${fmt(calc.eluteMass)} g`} bold />
                  <Row label="Eluate volume" value={`${fmt(calc.eluteVolume_mL, 0)} mL`} />
                  <Row label="Eluate concentration" value={`${fmt(calc.eluteConc)} g/L`} bold />
                  <Row label="Buffer consumption" value={`${fmt(calc.bufferVolume)} L`} />
                  <Row label="Productivity" value={`${fmt(calc.productivity)} g/L/h`} bold />
                </DetailBlock>
              </div>
            </section>

            {/* Footer */}
            <footer style={{ marginTop: '40px', paddingTop: '20px', borderTop: '0.5px solid #D5CFC4', fontFamily: "'IBM Plex Mono', monospace", fontSize: '10px', color: '#7A7A7A', lineHeight: 1.6 }}>
              <p style={{ margin: 0 }}>
                Assumptions — DBC saturation curve fit to manufacturer data (DBC<sub>max</sub>, K<sub>RT</sub> per resin). 
                Cycle time = load + 18 CV at operating RT. Step yield 92%. Elution at 2 CV. 
                Linear velocity check against vendor max. Single column, single cycle (no carousel/multi-column).
              </p>
              <p style={{ margin: '8px 0 0' }}>
                For senior CMC use — verify all parameters against your specific resin lot, HCCF analytics, and equipment constraints before applying to GMP design.
              </p>
            </footer>

          </main>
        </div>
      </div>
    </div>
  );
};

// ─── Sub-components ──────────────────────────────────────────────────────

const selectStyle = {
  width: '100%',
  padding: '8px 10px',
  fontFamily: "'IBM Plex Sans', sans-serif",
  fontSize: '13px',
  border: '0.5px solid #1A1A1A',
  borderRadius: 0,
  backgroundColor: '#FFFFFF',
  color: '#1A1A1A',
  appearance: 'none',
  cursor: 'pointer',
};

const Group = ({ label, children, highlight }) => (
  <div style={{ marginBottom: '20px' }}>
    <label style={{
      display: 'block',
      fontFamily: "'IBM Plex Mono', monospace",
      fontSize: '10px',
      letterSpacing: '0.1em',
      textTransform: 'uppercase',
      color: highlight ? '#B8860B' : '#5A5A5A',
      marginBottom: '6px',
      fontWeight: 500,
    }}>{label}</label>
    {children}
  </div>
);

const Hint = ({ children }) => (
  <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '10px', color: '#7A7A7A', marginTop: '4px' }}>{children}</div>
);

const NumberInput = ({ value, onChange, step, min, max, unit }) => (
  <div style={{ display: 'flex', alignItems: 'center', border: '0.5px solid #1A1A1A', backgroundColor: '#FFFFFF' }}>
    <input
      type="number"
      value={value}
      step={step}
      min={min}
      max={max}
      onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
      style={{
        flex: 1,
        padding: '8px 10px',
        fontFamily: "'IBM Plex Mono', monospace",
        fontSize: '14px',
        border: 'none',
        outline: 'none',
        backgroundColor: 'transparent',
        color: '#1A1A1A',
      }}
    />
    <span style={{ padding: '0 10px', fontFamily: "'IBM Plex Mono', monospace", fontSize: '11px', color: '#7A7A7A', borderLeft: '0.5px solid #D5CFC4' }}>{unit}</span>
  </div>
);

const SliderInput = ({ value, onChange, step, min, max, unit }) => (
  <div>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '6px' }}>
      <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '20px', color: '#1A1A1A', fontWeight: 500 }}>{value.toFixed(step < 1 ? 2 : 0)}</span>
      <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '11px', color: '#7A7A7A' }}>{unit}</span>
    </div>
    <input
      type="range"
      value={value}
      step={step}
      min={min}
      max={max}
      onChange={(e) => onChange(parseFloat(e.target.value))}
      style={{
        width: '100%',
        accentColor: '#B8860B',
      }}
    />
    <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: "'IBM Plex Mono', monospace", fontSize: '10px', color: '#7A7A7A', marginTop: '2px' }}>
      <span>{min}</span>
      <span>{max}</span>
    </div>
  </div>
);

const Metric = ({ label, value, unit, highlight }) => (
  <div style={{
    padding: '14px 16px',
    borderRight: '0.5px solid #1A1A1A',
    borderBottom: '0.5px solid #1A1A1A',
    backgroundColor: highlight ? '#FFFBED' : 'transparent',
  }}>
    <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '9px', letterSpacing: '0.1em', textTransform: 'uppercase', color: '#5A5A5A', marginBottom: '6px' }}>
      {label}
    </div>
    <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
      <span style={{ fontFamily: "'Fraunces', serif", fontSize: '24px', fontWeight: 600, lineHeight: 1, color: highlight ? '#7A5400' : '#1A1A1A' }}>
        {value}
      </span>
      <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '10px', color: '#7A7A7A' }}>{unit}</span>
    </div>
  </div>
);

const DetailBlock = ({ title, children }) => (
  <div style={{ border: '0.5px solid #1A1A1A', backgroundColor: '#FFFFFF', padding: '16px' }}>
    <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '10px', letterSpacing: '0.1em', textTransform: 'uppercase', color: '#5A5A5A', marginBottom: '10px', paddingBottom: '8px', borderBottom: '0.5px solid #E5E0D8' }}>
      {title}
    </div>
    {children}
  </div>
);

const Row = ({ label, value, bold }) => (
  <div style={{
    display: 'flex',
    justifyContent: 'space-between',
    padding: '4px 0',
    fontSize: '12px',
  }}>
    <span style={{ color: '#5A5A5A' }}>{label}</span>
    <span style={{
      fontFamily: "'IBM Plex Mono', monospace",
      fontWeight: bold ? 600 : 400,
      color: bold ? '#1A1A1A' : '#3A3A3A',
    }}>{value}</span>
  </div>
);

export default ProteinACaptureCalculator;
