/* global React */
// Engine drawer — advanced scheduler tuning, opens over Calendar

function EngineDrawer() {
  return (
    <Shell active="Calendar">
      <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 480px', minHeight: 0 }}>
        {/* dimmed calendar behind */}
        <div style={{ padding: '14px 18px', opacity: 0.35, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          <FullWeekCalendar />
        </div>

        {/* Drawer */}
        <div style={{
          borderLeft: '2px solid var(--ink)',
          background: 'var(--paper)',
          boxShadow: '-18px 0 40px rgba(28,26,23,0.18)',
          display: 'flex', flexDirection: 'column',
          overflow: 'hidden'
        }}>
          <div style={{ padding: '12px 18px', borderBottom: '2px solid var(--ink)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <span className="sk-script" style={{ fontSize: 26, fontWeight: 700, lineHeight: 1 }}>⚙ Engine</span>
            <Badge kind="dim" style={{ fontSize: 11 }}>advanced</Badge>
            <span style={{ flex: 1 }} />
            <Glyph>×</Glyph>
          </div>

          <div style={{ flex: 1, overflow: 'auto', padding: '16px 18px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Quick toggles */}
            <Section title="basics">
              <FieldRow label="buffer time">
                <SliderSk value={10} min={0} max={30} unit="min" />
              </FieldRow>
              <FieldRow label="travel events">
                <ToggleSketchy on />
                <span style={{ fontSize: 13, color: 'var(--pencil)' }}>render as own events</span>
              </FieldRow>
              <FieldRow label="auto-regenerate">
                <ToggleSketchy on={false} />
                <span style={{ fontSize: 13, color: 'var(--pencil)' }}>after every edit · slower</span>
              </FieldRow>
            </Section>

            {/* Strategy weights */}
            <Section title="strategy weights">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <WeightSlider label="earliest slot" value={70} desc="do things sooner rather than later" />
                <WeightSlider label="location grouping" value={30} desc="cluster items at the same place" />
              </div>
              <div style={{ marginTop: 8, padding: '6px 10px', background: 'var(--paper-2)', borderRadius: 5, fontSize: 12, color: 'var(--ink-soft)' }}>
                weights sum to 100. drag to rebalance. current bias: <b>earliest-leaning</b>.
              </div>
            </Section>

            {/* Location grouping scoring */}
            <Section title="location grouping · scoring">
              <FieldRow label="both sides match"><NumStep value={10} /></FieldRow>
              <FieldRow label="one side match"><NumStep value={3} /></FieldRow>
              <FieldRow label="one open · one match"><NumStep value={5} /></FieldRow>
              <FieldRow label="neither match"><NumStep value={-2} /></FieldRow>
              <div style={{ fontSize: 12, color: 'var(--pencil)', marginTop: 4, lineHeight: 1.35 }}>
                higher = stronger preference for that situation.
              </div>
            </Section>

            {/* Travel penalty */}
            <Section title="travel penalty">
              <FieldRow label="penalty divisor">
                <SliderSk value={20} min={5} max={60} unit="" />
              </FieldRow>
              <FieldRow label="min penalty min">
                <NumStep value={5} />
              </FieldRow>
              <div style={{ fontSize: 12, color: 'var(--pencil)', marginTop: 4, lineHeight: 1.35 }}>
                <code>score -= travelMinutes / divisor</code> · lower divisor = stronger penalty.
              </div>
            </Section>

            {/* Debug */}
            <Section title="debug">
              <FieldRow label="debug dashboard">
                <ToggleSketchy on={true} />
                <span style={{ fontSize: 13, color: 'var(--pencil)' }}>shows scoring per slot</span>
              </FieldRow>
              <FieldRow label="explain mode">
                <ToggleSketchy on={false} />
                <span style={{ fontSize: 13, color: 'var(--pencil)' }}>hover event for reasoning</span>
              </FieldRow>
              <div style={{ marginTop: 8 }}>
                <div className="sk-box wob-sm" style={{ padding: 10, background: 'var(--paper-2)', fontFamily: 'Special Elite, monospace', fontSize: 11, lineHeight: 1.5, color: 'var(--ink-soft)' }}>
                  <div>last gen · 2m ago · 412ms · 28d horizon</div>
                  <div>placed 42 / 44 · 2 failures · 11 travel events</div>
                  <div>avg slot search · 7.4 candidates · best score 73</div>
                </div>
              </div>
            </Section>

            {/* Actions */}
            <div style={{ display: 'flex', gap: 8, marginTop: 'auto' }}>
              <div className="sk-box wob-sm tight" style={{ fontSize: 12, color: 'var(--red-ink)', borderColor: 'var(--red-ink)' }}>reset to defaults</div>
              <span style={{ flex: 1 }} />
              <div className="sk-box wob-sm tight" style={{ fontSize: 12 }}>cancel</div>
              <div className="sk-box wob-sm tight" style={{ fontSize: 12, background: 'var(--ink)', color: 'var(--paper)' }}>apply & regenerate</div>
            </div>
          </div>
        </div>
      </div>
    </Shell>
  );
}

function SliderSk({ value, min, max, unit = '' }) {
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1 }}>
      <div style={{ flex: 1, height: 10, border: '1.5px solid var(--ink)', borderRadius: 5, position: 'relative', background: 'var(--paper-2)' }}>
        <div style={{ position: 'absolute', top: -1, bottom: -1, left: 0, width: `${pct}%`, background: 'var(--ink)', borderRadius: '5px 0 0 5px' }} />
        <div style={{
          position: 'absolute', top: -6, left: `calc(${pct}% - 9px)`,
          width: 18, height: 18, background: 'var(--paper)',
          border: '2px solid var(--ink)', borderRadius: '50%'
        }} />
      </div>
      <span className="sk-mono-tag" style={{ minWidth: 50, textAlign: 'right' }}>{value}{unit && ' ' + unit}</span>
    </div>
  );
}

function NumStep({ value }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 0 }}>
      <span style={{
        width: 24, height: 26, border: '1.5px solid var(--ink)',
        borderRadius: '5px 0 0 5px', display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'var(--paper)', fontSize: 14
      }}>−</span>
      <span style={{
        minWidth: 40, height: 26, borderTop: '1.5px solid var(--ink)', borderBottom: '1.5px solid var(--ink)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontFamily: 'Patrick Hand, cursive', fontSize: 15, fontWeight: 700,
        background: 'var(--paper-2)'
      }}>{value}</span>
      <span style={{
        width: 24, height: 26, border: '1.5px solid var(--ink)',
        borderRadius: '0 5px 5px 0', display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'var(--paper)', fontSize: 14
      }}>+</span>
    </div>
  );
}

function WeightSlider({ label, value, desc }) {
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 4 }}>
        <span style={{ fontWeight: 700, fontSize: 15 }}>{label}</span>
        <span className="sk-mono-tag">{value}%</span>
        <span style={{ flex: 1 }} />
        <span style={{ fontSize: 12, color: 'var(--pencil)' }}>{desc}</span>
      </div>
      <div style={{ height: 14, border: '2px solid var(--ink)', borderRadius: 7, position: 'relative', background: 'var(--paper-2)', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', inset: 0, width: `${value}%`, background: 'var(--ink)' }} />
      </div>
    </div>
  );
}

window.EngineDrawer = EngineDrawer;
