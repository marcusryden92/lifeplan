/* global React */
// Templates editor — recurring weekly blocks (sleep, work, gym)

function TemplatesEditor() {
  const days = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
  const hours = Array.from({length: 18}).map((_, i) => i + 6); // 6a → 11p
  const templates = [
    { day: 0, start: 6, end: 7, label: 'morning routine', col: '#d6cea2' },
    { day: 1, start: 6, end: 7, label: 'morning routine', col: '#d6cea2' },
    { day: 2, start: 6, end: 7, label: 'morning routine', col: '#d6cea2' },
    { day: 3, start: 6, end: 7, label: 'morning routine', col: '#d6cea2' },
    { day: 4, start: 6, end: 7, label: 'morning routine', col: '#d6cea2' },
    // Standup
    { day: 0, start: 9, end: 9.5, label: 'standup', col: '#9bb8d6' },
    { day: 1, start: 9, end: 9.5, label: 'standup', col: '#9bb8d6' },
    { day: 2, start: 9, end: 9.5, label: 'standup', col: '#9bb8d6' },
    { day: 3, start: 9, end: 9.5, label: 'standup', col: '#9bb8d6' },
    { day: 4, start: 9, end: 9.5, label: 'standup', col: '#9bb8d6' },
    // Lunch
    { day: 0, start: 12, end: 13, label: 'lunch', col: '#d6b9a2' },
    { day: 1, start: 12, end: 13, label: 'lunch', col: '#d6b9a2' },
    { day: 2, start: 12, end: 13, label: 'lunch', col: '#d6b9a2' },
    { day: 3, start: 12, end: 13, label: 'lunch', col: '#d6b9a2' },
    { day: 4, start: 12, end: 13, label: 'lunch', col: '#d6b9a2' },
    // Gym
    { day: 0, start: 18, end: 19, label: 'gym', col: '#b6cfa7', sel: true },
    { day: 2, start: 18, end: 19, label: 'gym', col: '#b6cfa7' },
    { day: 4, start: 18, end: 19, label: 'gym', col: '#b6cfa7' },
    // Dinner family
    { day: 0, start: 19.5, end: 21, label: 'family dinner', col: '#d6a2b9' },
    { day: 1, start: 19.5, end: 21, label: 'family dinner', col: '#d6a2b9' },
    { day: 2, start: 19.5, end: 21, label: 'family dinner', col: '#d6a2b9' },
    { day: 3, start: 19.5, end: 21, label: 'family dinner', col: '#d6a2b9' },
    { day: 4, start: 19.5, end: 21, label: 'family dinner', col: '#d6a2b9' },
    // Weekend brunch
    { day: 5, start: 9, end: 11, label: 'weekend brunch', col: '#d6a2b9' },
    { day: 6, start: 9, end: 11, label: 'weekend brunch', col: '#d6a2b9' },
    // Sleep wind-down (Sat, Sun)
    { day: 5, start: 22, end: 23, label: 'wind down', col: '#cccccc' },
    { day: 6, start: 22, end: 23, label: 'wind down', col: '#cccccc' }
  ];
  return (
    <Shell active="Calendar">
      {/* Editing-mode banner */}
      <div style={{
        padding: '8px 22px',
        background: 'var(--ink)', color: 'var(--paper)',
        display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0
      }}>
        <span className="sk-script" style={{ fontSize: 20, fontWeight: 700, lineHeight: 1 }}>editing templates</span>
        <span style={{ fontSize: 13, opacity: 0.8 }}>recurring weekly blocks · apply to every generated week · drag on grid to draw new</span>
        <span style={{ flex: 1 }} />
        <div className="sk-box wob-sm tight" style={{ fontSize: 12, background: 'var(--paper)', color: 'var(--ink)' }}>cancel</div>
        <div className="sk-box wob-sm tight" style={{ fontSize: 12, background: 'var(--highlight)', color: 'var(--ink)', borderColor: 'var(--paper)' }}>save · 12 changes</div>
      </div>

      <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 320px', minHeight: 0 }}>
        {/* Templates grid */}
        <div style={{ padding: '14px 18px', display: 'flex', flexDirection: 'column', overflow: 'hidden', borderRight: '2px solid var(--ink)' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 6 }}>
            <span className="sk-script" style={{ fontSize: 24, fontWeight: 700 }}>Your typical week</span>
            <span className="sk-mono-tag">9 templates · 28 occurrences</span>
            <span style={{ flex: 1 }} />
            <Badge style={{ fontSize: 11 }}>show area windows · off ▾</Badge>
          </div>

          <div style={{ flex: 1, overflow: 'auto' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '46px repeat(7, 1fr)', borderBottom: '2px solid var(--ink)', paddingBottom: 4 }}>
              <span />
              {days.map((d, i) => (
                <div key={d} className="sk-mono-tag" style={{ textAlign: 'center', padding: '4px 0', fontWeight: i < 5 ? 700 : 400 }}>{d}</div>
              ))}
            </div>

            <div style={{
              position: 'relative',
              display: 'grid',
              gridTemplateColumns: '46px repeat(7, 1fr)',
              gridTemplateRows: `repeat(${hours.length}, 36px)`
            }}>
              {hours.flatMap((h, ri) => [
                <span key={`hl${ri}`} className="sk-mono-tag" style={{ gridRow: ri+1, gridColumn: 1, fontSize: 10, paddingTop: 2 }}>{h <= 12 ? `${h}a` : `${h-12}p`}</span>,
                ...Array.from({length: 7}).map((_, ci) => (
                  <div key={`c${ri}-${ci}`} style={{
                    gridRow: ri+1, gridColumn: ci+2,
                    borderTop: '1px dashed var(--pencil-faint)',
                    borderLeft: ci === 0 ? '1px dashed var(--pencil-faint)' : 'none',
                    borderRight: '1px dashed var(--pencil-faint)'
                  }} />
                ))
              ])}

              {/* template blocks */}
              {templates.map((t, i) => {
                const rowStart = Math.round((t.start - 6) * 2) / 2 + 1;
                const rowSpan = Math.max(1, Math.round((t.end - t.start) * 2) / 2);
                return (
                  <div key={i} style={{
                    gridColumn: t.day + 2,
                    gridRow: `${Math.floor(rowStart)} / span ${Math.ceil(rowSpan)}`,
                    margin: 2,
                    background: t.col,
                    border: t.sel ? '2.5px solid var(--ink)' : '1.5px solid var(--ink)',
                    boxShadow: t.sel ? '3px 3px 0 var(--ink)' : 'none',
                    borderRadius: 4,
                    fontSize: 11, padding: '2px 5px',
                    lineHeight: 1.1,
                    overflow: 'hidden', whiteSpace: 'nowrap',
                    fontWeight: t.sel ? 700 : 400
                  }}>{t.label}</div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right rail */}
        <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {/* Selected template editor */}
          <div style={{ padding: '14px 16px', borderBottom: '2px solid var(--ink)', background: 'var(--highlight-soft)' }}>
            <div className="sk-mono-tag">editing template</div>
            <div className="sk-script" style={{ fontSize: 26, fontWeight: 700, lineHeight: 1, marginTop: 2 }}>Gym · Mon</div>
            <SketchyUnderline width={140} style={{ marginTop: 0 }} />

            <div style={{ marginTop: 12, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <FieldRow label="start"><Badge>6:00 pm ▾</Badge></FieldRow>
              <FieldRow label="dur"><Badge>1h 0m ▾</Badge></FieldRow>
            </div>
            <FieldRow label="repeat"><Badge>Mon · Wed · Fri ▾</Badge></FieldRow>
            <FieldRow label="where"><Badge>📍 Gym ▾</Badge></FieldRow>
            <FieldRow label="color">
              <div style={{ display: 'flex', gap: 4 }}>
                {['#b6cfa7','#9bb8d6','#d6b9a2','#d6a2b9','#a2c8d6','#cccccc'].map(c => (
                  <span key={c} style={{ width: 22, height: 22, background: c, border: c === '#b6cfa7' ? '2.5px solid var(--ink)' : '1.5px solid var(--pencil-light)', borderRadius: 4 }} />
                ))}
              </div>
            </FieldRow>

            <div style={{ marginTop: 10, display: 'flex', gap: 6 }}>
              <div className="sk-box wob-sm tight" style={{ fontSize: 12 }}>duplicate</div>
              <div className="sk-box wob-sm tight" style={{ fontSize: 12, color: 'var(--red-ink)', borderColor: 'var(--red-ink)' }}>delete all gyms</div>
              <span style={{ flex: 1 }} />
              <div className="sk-box wob-sm tight" style={{ fontSize: 12, background: 'var(--ink)', color: 'var(--paper)' }}>apply</div>
            </div>
          </div>

          {/* All templates list */}
          <div style={{ flex: 1, overflow: 'auto', padding: '14px 16px' }}>
            <div className="sk-mono-tag" style={{ marginBottom: 6 }}>all templates</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
              {[
                { n: 'morning routine', sub: '6:00–7:00 · Mon–Fri', col: '#d6cea2', count: 5 },
                { n: 'standup', sub: '9:00–9:30 · Mon–Fri', col: '#9bb8d6', count: 5 },
                { n: 'lunch', sub: '12:00–1:00 · Mon–Fri', col: '#d6b9a2', count: 5 },
                { n: 'gym', sub: '6:00–7:00 pm · M·W·F', col: '#b6cfa7', count: 3, sel: true },
                { n: 'family dinner', sub: '7:30–9:00 · Mon–Fri', col: '#d6a2b9', count: 5 },
                { n: 'weekend brunch', sub: '9–11 · Sat·Sun', col: '#d6a2b9', count: 2 },
                { n: 'wind down', sub: '10–11 pm · Sat·Sun', col: '#cccccc', count: 2 }
              ].map((t, i) => (
                <div key={i} className="sk-box wob-sm" style={{
                  padding: '6px 10px', display: 'flex', alignItems: 'center', gap: 8,
                  background: t.sel ? 'var(--ink)' : 'var(--paper)',
                  color: t.sel ? 'var(--paper)' : 'var(--ink)',
                  borderColor: 'var(--ink)'
                }}>
                  <Swatch color={t.col} />
                  <div style={{ flex: 1, lineHeight: 1.15 }}>
                    <div style={{ fontWeight: 700, fontSize: 14 }}>{t.n}</div>
                    <div className="sk-mono-tag" style={{ fontSize: 10, color: t.sel ? 'rgba(245,241,232,0.7)' : 'var(--pencil)' }}>{t.sub}</div>
                  </div>
                  <span className="sk-mono-tag" style={{ fontSize: 10 }}>×{t.count}</span>
                </div>
              ))}
              <div style={{ padding: '6px 10px', fontSize: 13, color: 'var(--pencil)', border: '1.5px dashed var(--pencil-light)', borderRadius: 6, textAlign: 'center' }}>
                + draw new template on grid
              </div>
            </div>
          </div>
        </div>
      </div>
    </Shell>
  );
}

window.TemplatesEditor = TemplatesEditor;
