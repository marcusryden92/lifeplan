/* global React */
// Life Areas editor — manages categories tree + per-area settings + time windows

function LifeAreasPage() {
  return (
    <Shell active="Life Areas">
      <div style={{ padding: '14px 22px', borderBottom: '1.5px dashed var(--pencil-light)', display: 'flex', alignItems: 'flex-end', gap: 14, flexShrink: 0 }}>
        <div>
          <div className="sk-script" style={{ fontSize: 30, fontWeight: 700, lineHeight: 1 }}>Life Areas</div>
          <div className="sk-mono-tag" style={{ marginTop: 2 }}>categories · sub-areas · time windows · strict vs soft</div>
        </div>
        <span style={{ flex: 1 }} />
        <div className="sk-box wob-sm tight" style={{ fontSize: 12 }}>reorder</div>
        <div className="sk-box wob-sm tight" style={{ fontSize: 12, background: 'var(--ink)', color: 'var(--paper)' }}>+ new area</div>
      </div>

      <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '300px 1fr', minHeight: 0 }}>
        {/* Tree of areas */}
        <div style={{ borderRight: '2px solid var(--ink)', padding: '12px 10px', overflow: 'auto', display: 'flex', flexDirection: 'column', gap: 4 }}>
          <Tree items={[
            { icon: '🌅', name: 'Career', color: '#9bb8d6', count: 14, open: true, sel: true, children: [
              { icon: '◆', name: 'Deep work', kind: 'folder', count: 6 },
              { icon: '◆', name: 'Meetings', kind: 'folder', count: 5 },
              { icon: '◆', name: 'Admin', kind: 'folder', count: 3 }
            ]},
            { icon: '🧘', name: 'Health', color: '#b6cfa7', count: 9, open: true, children: [
              { icon: '◆', name: 'Exercise', kind: 'folder', count: 6 },
              { icon: '◆', name: 'Medical', kind: 'folder', count: 2 },
              { icon: '◆', name: 'Mind', kind: 'folder', count: 1 }
            ]},
            { icon: '🏠', name: 'Home', color: '#d6b9a2', count: 5 },
            { icon: '❤️', name: 'Relationships', color: '#d6a2b9', count: 4 },
            { icon: '💰', name: 'Finance', color: '#d6cea2', count: 3 },
            { icon: '🌱', name: 'Growth', color: '#a2c8d6', count: 7, children: [
              { icon: '◆', name: 'Languages', kind: 'folder', count: 30 },
              { icon: '◆', name: 'Reading', kind: 'folder', count: 2 }
            ]}
          ]} />

          <div style={{ marginTop: 12, padding: '6px 10px', fontSize: 13, color: 'var(--pencil)', borderTop: '1px dashed var(--pencil-light)' }}>
            + new top-level area
          </div>

          {/* Quick-start */}
          <div style={{ marginTop: 18, padding: 10, border: '1.5px dashed var(--pencil-light)', borderRadius: 6 }}>
            <div className="sk-mono-tag">quick-start</div>
            <div style={{ fontSize: 12, color: 'var(--pencil)', marginTop: 4, lineHeight: 1.3 }}>
              starter set for new users — pre-filled icon + color
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 6 }}>
              {['🌅 Career', '🧘 Health', '❤️ Relations', '💰 Finance', '🌱 Growth', '🏠 Home'].map(n => (
                <span key={n} className="sk-badge" style={{ fontSize: 10, padding: '2px 6px' }}>{n}</span>
              ))}
            </div>
          </div>
        </div>

        {/* Editor panel for selected area */}
        <div style={{ overflow: 'auto', padding: '20px 28px 28px', display: 'flex', flexDirection: 'column', gap: 18 }}>
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 56, height: 56, border: '2px solid var(--ink)', borderRadius: 12, background: '#9bb8d6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28 }}>🌅</div>
            <div style={{ flex: 1 }}>
              <div className="sk-script" style={{ fontSize: 42, fontWeight: 700, lineHeight: 1 }}>Career</div>
              <div style={{ fontSize: 14, color: 'var(--pencil)', marginTop: 2 }}>14 items · 3 sub-areas · strict window</div>
            </div>
            <div className="sk-box wob-sm tight" style={{ fontSize: 12, color: 'var(--red-ink)', borderColor: 'var(--red-ink)' }}>delete area</div>
          </div>

          {/* Identity */}
          <Section title="Identity">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <FieldRow label="name">
                <div className="sk-box wob-sm tight" style={{ padding: '6px 10px', minWidth: 200, background: 'var(--paper-2)' }}>Career</div>
              </FieldRow>
              <FieldRow label="icon">
                <div style={{ display: 'flex', gap: 4 }}>
                  {['🌅','🏢','📈','💼','🎯','📚','🧠','⚙️','✦'].map(e => (
                    <span key={e} style={{
                      width: 30, height: 30,
                      border: e === '🌅' ? '2px solid var(--ink)' : '1.5px solid var(--pencil-light)',
                      borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16,
                      background: e === '🌅' ? 'var(--paper-2)' : 'var(--paper)'
                    }}>{e}</span>
                  ))}
                </div>
              </FieldRow>
              <FieldRow label="color">
                <div style={{ display: 'flex', gap: 4 }}>
                  {['#9bb8d6','#b6cfa7','#d6b9a2','#d6a2b9','#d6cea2','#a2c8d6','#bba2d6','#cccccc'].map(c => (
                    <span key={c} style={{
                      width: 24, height: 24, background: c,
                      border: c === '#9bb8d6' ? '2.5px solid var(--ink)' : '1.5px solid var(--pencil-light)',
                      borderRadius: 5
                    }} />
                  ))}
                </div>
              </FieldRow>
              <FieldRow label="parent">
                <Badge>(top-level) ▾</Badge>
                <span className="sk-mono-tag">move to a parent area</span>
              </FieldRow>
            </div>
          </Section>

          {/* Default location + strict */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <Section title="Default location">
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Badge>📍 Office ▾</Badge>
              </div>
              <div style={{ marginTop: 8, fontSize: 13, color: 'var(--pencil)' }}>
                items in this area inherit Office unless overridden. travel time to/from Office auto-added.
              </div>
            </Section>
            <Section title="Strict mode">
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <ToggleSketchy on />
                <span style={{ fontWeight: 700 }}>Strict</span>
                <span className="sk-mono-tag">on</span>
              </div>
              <div style={{ marginTop: 8, fontSize: 13, color: 'var(--pencil)', lineHeight: 1.35 }}>
                only Career items can be scheduled inside Career time windows. other items must find space elsewhere.
              </div>
            </Section>
          </div>

          {/* Time windows */}
          <Section title="Time windows">
            <div style={{ fontSize: 13, color: 'var(--pencil)', marginBottom: 8 }}>
              drag on the grid to draw windows. windows can span days. multiple per area allowed.
            </div>
            <WindowsGrid
              windows={[
                { day: 0, start: 9, end: 17, label: '9–5 Mon' },
                { day: 1, start: 9, end: 12, label: '9–12' },
                { day: 2, start: 9, end: 17, label: '9–5 Wed' },
                { day: 3, start: 9, end: 12, label: '9–12' },
                { day: 4, start: 9, end: 14, label: '9–2 Fri' }
              ]}
            />
            <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--pencil)' }}>
              <span className="sk-hatch-soft" style={{ width: 26, height: 14, border: '1px solid var(--pencil)' }} />
              <span>strict (no other items)</span>
              <span style={{ marginLeft: 10, width: 26, height: 14, background: '#9bb8d6', opacity: 0.4, border: '1px solid var(--pencil)' }} />
              <span>soft (suggested but not enforced)</span>
              <span style={{ flex: 1 }} />
              <Badge style={{ fontSize: 11 }}>+ window</Badge>
            </div>
          </Section>

          {/* Sub-areas */}
          <Section title="Sub-areas · 3">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {[
                { name: 'Deep work', count: 6, defLoc: 'Office', inherit: true },
                { name: 'Meetings', count: 5, defLoc: 'Office', inherit: true },
                { name: 'Admin', count: 3, defLoc: '—', inherit: false }
              ].map((s, i) => (
                <div key={i} style={{
                  display: 'grid', gridTemplateColumns: '14px 1fr 110px 120px 30px',
                  alignItems: 'center', gap: 8, padding: '6px 10px',
                  border: '1px dashed var(--pencil-faint)', borderRadius: 6
                }}>
                  <span>◆</span>
                  <span style={{ fontWeight: 700 }}>{s.name}</span>
                  <Badge style={{ fontSize: 11 }}>📍 {s.defLoc} {s.inherit && <span style={{ color: 'var(--pencil)', marginLeft: 4 }}>↑</span>}</Badge>
                  <span className="sk-mono-tag">{s.count} items</span>
                  <span className="sk-mono-tag" style={{ color: 'var(--pencil)' }}>···</span>
                </div>
              ))}
              <div style={{ padding: '6px 10px', fontSize: 13, color: 'var(--pencil)' }}>+ add sub-area</div>
            </div>
          </Section>
        </div>
      </div>
    </Shell>
  );
}

function ToggleSketchy({ on }) {
  return (
    <span style={{
      display: 'inline-flex', width: 44, height: 24, border: '2px solid var(--ink)',
      borderRadius: 14, position: 'relative',
      background: on ? 'var(--ink)' : 'var(--paper)',
      padding: 2
    }}>
      <span style={{
        width: 16, height: 16, borderRadius: '50%',
        background: on ? 'var(--paper)' : 'var(--ink)',
        marginLeft: on ? 18 : 0,
        transition: 'margin .15s'
      }} />
    </span>
  );
}

// Time-window picker — 7-day x 24h grid with windows drawn on top
function WindowsGrid({ windows }) {
  const days = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
  const hours = Array.from({length: 16}).map((_, i) => i + 6); // 6a–9p
  return (
    <div className="sk-box wob" style={{ background: 'var(--paper)', padding: 8, overflow: 'hidden' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '40px repeat(7, 1fr)', gap: 0 }}>
        <span />
        {days.map(d => <div key={d} className="sk-mono-tag" style={{ textAlign: 'center', padding: '4px 0', fontSize: 11 }}>{d}</div>)}
      </div>
      <div style={{
        position: 'relative',
        display: 'grid',
        gridTemplateColumns: '40px repeat(7, 1fr)',
        gridTemplateRows: `repeat(${hours.length}, 18px)`
      }}>
        {hours.flatMap((h, ri) => [
          <span key={`hl${ri}`} className="sk-mono-tag" style={{ gridRow: ri+1, gridColumn: 1, fontSize: 9, paddingTop: 1 }}>{h <= 12 ? `${h}a` : `${h-12}p`}</span>,
          ...Array.from({length: 7}).map((_, ci) => (
            <div key={`c${ri}-${ci}`} style={{
              gridRow: ri+1, gridColumn: ci+2,
              borderTop: '1px dashed var(--pencil-faint)',
              borderLeft: ci === 0 ? '1px dashed var(--pencil-faint)' : 'none',
              borderRight: '1px dashed var(--pencil-faint)'
            }} />
          ))
        ])}
        {/* windows */}
        {windows.map((w, i) => {
          const rowStart = (w.start - 6) + 1;
          const rowSpan = w.end - w.start;
          return (
            <div key={i} className="sk-hatch-soft" style={{
              gridColumn: w.day + 2,
              gridRow: `${rowStart} / span ${rowSpan}`,
              margin: 1,
              border: '2px solid var(--ink)',
              display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
              fontSize: 10, color: 'var(--ink-soft)',
              paddingTop: 2,
              fontFamily: 'Patrick Hand, cursive'
            }}>{w.label}</div>
          );
        })}
      </div>
    </div>
  );
}

window.LifeAreasPage = LifeAreasPage;
window.WindowsGrid = WindowsGrid;
window.ToggleSketchy = ToggleSketchy;
