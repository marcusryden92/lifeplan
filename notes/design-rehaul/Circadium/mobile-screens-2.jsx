/* global React */
// Additional mobile screens — fills the gaps + row-based gallery

// =========================================================
// LIFE AREAS editor
// =========================================================
function MobileLifeAreas() {
  return (
    <MobileScreen active="More" hideNav>
      <MTop title="Life Areas" sub="6 areas · tap to edit" onBack right={<span style={{ fontFamily: 'Caveat, cursive', fontSize: 22, fontWeight: 700 }}>+</span>} />
      <div style={{ flex: 1, overflow: 'auto', padding: '10px 12px 14px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {[
            { icon: '🌅', n: 'Career', col: '#9bb8d6', count: 14, sub: 'strict · 9–5 M-F · 📍 Office', open: true },
            { icon: '🧘', n: 'Health', col: '#b6cfa7', count: 9, sub: 'strict · mornings · 📍 Park' },
            { icon: '🏠', n: 'Home', col: '#d6b9a2', count: 5, sub: 'soft · evenings · 📍 Home' },
            { icon: '❤️', n: 'Relationships', col: '#d6a2b9', count: 4 },
            { icon: '💰', n: 'Finance', col: '#d6cea2', count: 3 },
            { icon: '🌱', n: 'Growth', col: '#a2c8d6', count: 7 }
          ].map((a, i) => (
            <div key={i} className="sk-box wob-sm" style={{
              padding: 10,
              borderColor: a.open ? 'var(--ink)' : 'var(--pencil-light)',
              borderWidth: a.open ? 2 : 1.5,
              background: a.open ? 'var(--paper-2)' : 'var(--paper)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 32, height: 32, background: a.col, border: '1.5px solid var(--ink)', borderRadius: 7, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>{a.icon}</div>
                <div style={{ flex: 1, lineHeight: 1.1 }}>
                  <div style={{ fontSize: 14, fontWeight: 700 }}>{a.n}</div>
                  <div className="sk-mono-tag" style={{ fontSize: 9 }}>{a.count} items {a.sub ? '· ' + a.sub : ''}</div>
                </div>
                <span className="sk-mono-tag">{a.open ? '▾' : '›'}</span>
              </div>
              {a.open && (
                <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {/* mini windows preview */}
                  <div className="sk-mono-tag" style={{ fontSize: 9 }}>time windows · strict</div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2, height: 36 }}>
                    {['M','T','W','T','F','S','S'].map((d, di) => (
                      <div key={di} style={{ position: 'relative', border: '1px dashed var(--pencil-faint)' }}>
                        <span style={{ position: 'absolute', top: -10, left: 2, fontSize: 8, fontFamily: 'Patrick Hand, cursive' }}>{d}</span>
                        {di < 5 && (
                          <div className="sk-hatch-soft" style={{
                            position: 'absolute', top: 6, bottom: 4, left: 1, right: 1,
                            border: '1px solid var(--ink)'
                          }} />
                        )}
                      </div>
                    ))}
                  </div>
                  <div className="sk-mono-tag" style={{ fontSize: 9, marginTop: 4 }}>sub-areas · 3</div>
                  <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                    {['◆ Deep work', '◆ Meetings', '◆ Admin'].map(s => (
                      <Badge key={s} kind="dim" style={{ fontSize: 10 }}>{s}</Badge>
                    ))}
                  </div>
                  <div style={{ marginTop: 6, display: 'flex', gap: 5 }}>
                    <div className="sk-box wob-sm tight" style={{ flex: 1, textAlign: 'center', fontSize: 11, padding: '4px 6px' }}>edit windows</div>
                    <div className="sk-box wob-sm tight" style={{ flex: 1, textAlign: 'center', fontSize: 11, padding: '4px 6px' }}>+ sub-area</div>
                    <div className="sk-box wob-sm tight" style={{ fontSize: 11, padding: '4px 6px', color: 'var(--red-ink)', borderColor: 'var(--red-ink)' }}>🗑</div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </MobileScreen>
  );
}

// =========================================================
// TEMPLATES editor
// =========================================================
function MobileTemplates() {
  const days = ['M','T','W','T','F','S','S'];
  const blocks = [
    { d: 0, s: 0, h: 1, l: 'sleep', c: '#cccccc' },
    { d: 0, s: 3, h: 4, l: 'work', c: '#9bb8d6' },
    { d: 0, s: 8, h: 1, l: 'gym', c: '#b6cfa7', sel: true },
    { d: 1, s: 0, h: 1, l: '', c: '#cccccc' },
    { d: 1, s: 3, h: 4, l: 'work', c: '#9bb8d6' },
    { d: 2, s: 3, h: 4, l: '', c: '#9bb8d6' },
    { d: 2, s: 8, h: 1, l: 'gym', c: '#b6cfa7' },
    { d: 3, s: 3, h: 4, l: '', c: '#9bb8d6' },
    { d: 4, s: 3, h: 4, l: '', c: '#9bb8d6' },
    { d: 4, s: 8, h: 1, l: 'gym', c: '#b6cfa7' },
    { d: 5, s: 2, h: 2, l: 'brunch', c: '#d6a2b9' },
    { d: 6, s: 2, h: 2, l: '', c: '#d6a2b9' }
  ];
  return (
    <MobileScreen active="Calendar" hideNav>
      <div style={{ padding: '8px 14px', background: 'var(--ink)', color: 'var(--paper)', display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
        <span className="sk-script" style={{ fontSize: 18, fontWeight: 700, lineHeight: 1 }}>editing templates</span>
        <span style={{ flex: 1 }} />
        <span className="sk-mono-tag" style={{ color: 'var(--highlight)', fontSize: 10 }}>save</span>
      </div>
      <div style={{ flex: 1, overflow: 'auto', padding: '10px 12px 14px' }}>
        <div className="sk-mono-tag" style={{ marginBottom: 4 }}>your typical week</div>
        <div className="sk-box wob" style={{ padding: 6, background: 'var(--paper-2)' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2 }}>
            {days.map((d, di) => (
              <div key={di} style={{ position: 'relative', border: '1px dashed var(--pencil-faint)', height: 180 }}>
                <span style={{ position: 'absolute', top: 2, left: 3, fontSize: 9, fontFamily: 'Patrick Hand, cursive' }}>{d}</span>
                {blocks.filter(b => b.d === di).map((b, i) => (
                  <div key={i} style={{
                    position: 'absolute', left: 1, right: 1,
                    top: 14 + b.s * 12,
                    height: b.h * 12,
                    background: b.c,
                    border: b.sel ? '2px solid var(--ink)' : '1px solid var(--ink)',
                    fontSize: 8, padding: '1px 2px', lineHeight: 1,
                    boxShadow: b.sel ? '2px 2px 0 var(--ink)' : 'none'
                  }}>{b.l}</div>
                ))}
              </div>
            ))}
          </div>
        </div>

        <div className="sk-mono-tag" style={{ marginTop: 14, marginBottom: 4 }}>all templates · 7</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
          {[
            { c: '#cccccc', n: 'sleep', sub: '11p–7a · M–F', x: '×5' },
            { c: '#9bb8d6', n: 'work', sub: '9a–5p · M–F', x: '×5' },
            { c: '#b6cfa7', n: 'gym', sub: '6p–7p · M·W·F', x: '×3', sel: true },
            { c: '#d6a2b9', n: 'family dinner', sub: '7:30p · M–F', x: '×5' },
            { c: '#d6a2b9', n: 'weekend brunch', sub: '9a–11a · S·S', x: '×2' }
          ].map((t, i) => (
            <div key={i} className="sk-box wob-sm" style={{
              padding: '8px 10px', display: 'flex', alignItems: 'center', gap: 8,
              background: t.sel ? 'var(--ink)' : 'var(--paper)',
              color: t.sel ? 'var(--paper)' : 'var(--ink)'
            }}>
              <Swatch color={t.c} />
              <div style={{ flex: 1, lineHeight: 1.1 }}>
                <div style={{ fontSize: 13, fontWeight: 700 }}>{t.n}</div>
                <div className="sk-mono-tag" style={{ fontSize: 9, color: t.sel ? 'rgba(245,241,232,0.7)' : 'var(--pencil)' }}>{t.sub}</div>
              </div>
              <span className="sk-mono-tag" style={{ fontSize: 9 }}>{t.x}</span>
            </div>
          ))}
          <div style={{ padding: '6px 10px', fontSize: 12, color: 'var(--pencil)', border: '1.5px dashed var(--pencil-light)', borderRadius: 5, textAlign: 'center' }}>+ draw new on grid</div>
        </div>
      </div>
    </MobileScreen>
  );
}

// =========================================================
// PLACES
// =========================================================
function MobilePlaces() {
  return (
    <MobileScreen active="More" hideNav>
      <MTop title="Places" sub="6 / 10 · 🚗 driving" onBack right={<span style={{ fontFamily: 'Caveat, cursive', fontSize: 22, fontWeight: 700 }}>+</span>} />
      <div style={{ padding: '8px 12px', flexShrink: 0, borderBottom: '1.5px dashed var(--pencil-light)' }}>
        <div className="sk-box wob-pill" style={{ padding: '6px 12px', display: 'flex', alignItems: 'center', gap: 6, background: 'var(--paper-2)' }}>
          <span style={{ color: 'var(--pencil)' }}>⌕</span>
          <span style={{ flex: 1, fontSize: 12, color: 'var(--pencil)' }}>search a place via Google…</span>
        </div>
      </div>
      <div style={{ flex: 1, overflow: 'auto', padding: '10px 12px 14px', display: 'flex', flexDirection: 'column', gap: 6 }}>
        {[
          { n: 'Home', addr: '142 Linden St · Brooklyn', defaultFor: ['Home', 'Finance'], primary: true },
          { n: 'Office', addr: '380 Lafayette · Manhattan', defaultFor: ['Career'], sel: true },
          { n: 'Park', addr: 'Prospect Park', defaultFor: ['Health'] },
          { n: 'Gym', addr: 'Equinox · Court St' },
          { n: 'Dentist', addr: '155 W 57th St' },
          { n: "Mom's", addr: 'Yonkers, NY', defaultFor: ['Relationships'] }
        ].map((p, i) => (
          <div key={i} className="sk-box wob-sm" style={{
            padding: '8px 10px',
            background: p.sel ? 'var(--ink)' : 'var(--paper)',
            color: p.sel ? 'var(--paper)' : 'var(--ink)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span>📍</span>
              <span style={{ fontSize: 14, fontWeight: 700, flex: 1 }}>{p.n}</span>
              {p.primary && <Badge style={{ fontSize: 9 }}>home</Badge>}
            </div>
            <div className="sk-mono-tag" style={{ fontSize: 9, color: p.sel ? 'rgba(245,241,232,0.7)' : 'var(--pencil)', marginTop: 2 }}>{p.addr}</div>
            {p.defaultFor && (
              <div style={{ display: 'flex', gap: 3, marginTop: 4, flexWrap: 'wrap' }}>
                {p.defaultFor.map(a => (
                  <span key={a} className="sk-mono-tag" style={{
                    fontSize: 8, padding: '1px 4px',
                    background: p.sel ? 'rgba(245,241,232,0.15)' : 'var(--paper-2)',
                    color: p.sel ? 'var(--paper)' : 'var(--ink-soft)',
                    borderRadius: 2
                  }}>default · {a}</span>
                ))}
              </div>
            )}
          </div>
        ))}
        <div style={{ marginTop: 8, padding: '8px 10px', fontSize: 12, color: 'var(--pencil)', textAlign: 'center' }}>
          tap a place to see travel times →
        </div>
      </div>
    </MobileScreen>
  );
}

function MobileTravelMatrix() {
  return (
    <MobileScreen active="More" hideNav>
      <MTop title="Office" sub="travel to other places" onBack right={<span className="sk-mono-tag">↻</span>} />
      <div style={{ padding: '8px 12px', flexShrink: 0 }}>
        <div style={{ display: 'flex', gap: 0 }}>
          {[['🚗', 'driving', true], ['🚆', 'transit'], ['🚲', 'bike'], ['🚶', 'walk']].map(([icon, mode, sel], i) => (
            <div key={mode} className="sk-box wob-sm" style={{
              padding: '5px 0', flex: 1, textAlign: 'center', borderRadius: 0,
              background: sel ? 'var(--ink)' : 'var(--paper)',
              color: sel ? 'var(--paper)' : 'var(--ink)', fontSize: 12
            }}>
              {icon} {mode}
            </div>
          ))}
        </div>
      </div>
      <div style={{ flex: 1, overflow: 'auto', padding: '8px 12px 14px', display: 'flex', flexDirection: 'column', gap: 6 }}>
        {[
          { to: 'Home', rush: 35, reg: 22, night: 18 },
          { to: 'Park', rush: 18, reg: 12, night: 9 },
          { to: 'Gym', rush: 28, reg: 16, night: 12, custom: true },
          { to: 'Dentist', rush: 14, reg: 8, night: 6 },
          { to: "Mom's", rush: 65, reg: 48, night: 38, missing: true }
        ].map((r, i) => (
          <div key={i} className="sk-box wob-sm" style={{ padding: '8px 10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span>📍</span>
              <span style={{ fontSize: 13, fontWeight: 700, flex: 1 }}>→ {r.to}</span>
              {r.custom && <Badge kind="yel" style={{ fontSize: 9 }}>custom</Badge>}
            </div>
            {r.missing ? (
              <div style={{ marginTop: 6, fontSize: 11, color: 'var(--red-ink)' }}>
                no travel times yet · <span style={{ textDecoration: 'underline' }}>fetch ↻</span>
              </div>
            ) : (
              <div style={{ marginTop: 6, display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 5 }}>
                <Cell label="rush" value={r.rush} color="var(--red-ink)" />
                <Cell label="reg" value={r.reg} />
                <Cell label="night" value={r.night} color="var(--pencil)" />
              </div>
            )}
          </div>
        ))}
      </div>
    </MobileScreen>
  );
}

function Cell({ label, value, color = 'var(--ink)' }) {
  return (
    <div style={{ textAlign: 'center', padding: '4px 0', border: '1px dashed var(--pencil-faint)', borderRadius: 4 }}>
      <div style={{ fontFamily: 'Caveat, cursive', fontSize: 18, fontWeight: 700, lineHeight: 1, color }}>{value}m</div>
      <div className="sk-mono-tag" style={{ fontSize: 8 }}>{label}</div>
    </div>
  );
}

// =========================================================
// EVENT POPOVER as bottom sheet
// =========================================================
function MobileEventSheet() {
  return (
    <MobileScreen active="Calendar" hideNav>
      {/* dimmed calendar behind */}
      <div style={{ flex: 1, padding: '8px 12px', opacity: 0.3, overflow: 'hidden' }}>
        <div className="sk-box wob" style={{ height: 50, marginBottom: 6 }} />
        <div className="sk-box wob" style={{ height: 70, marginBottom: 6 }} />
        <div className="sk-box wob" style={{ height: 60, marginBottom: 6 }} />
        <div className="sk-box wob" style={{ height: 50 }} />
      </div>

      <div style={{
        background: 'var(--paper)',
        borderTop: '2px solid var(--ink)',
        borderTopLeftRadius: 22, borderTopRightRadius: 22,
        boxShadow: '0 -8px 24px rgba(28,26,23,0.18)',
        padding: '8px 14px 14px',
        flexShrink: 0
      }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 6 }}>
          <span style={{ width: 36, height: 4, borderRadius: 2, background: 'var(--pencil-light)' }} />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <Badge style={{ fontSize: 9 }}>task</Badge>
          <Badge style={{ fontSize: 9 }}><Swatch color="#9bb8d6" /> Career</Badge>
          <span style={{ flex: 1 }} />
          <Glyph>×</Glyph>
        </div>
        <div className="sk-script" style={{ fontSize: 22, fontWeight: 700, lineHeight: 1.05, marginTop: 4 }}>Q4 strategy · deep work</div>
        <div style={{ fontSize: 12, color: 'var(--pencil)', marginTop: 2 }}>Tue Apr 9 · 9:00 – 11:30a · 📍 Office</div>

        <div style={{ marginTop: 10, display: 'flex', gap: 6 }}>
          <div className="sk-box wob-sm" style={{ flex: 1, padding: '8px 10px', textAlign: 'center', background: 'var(--ink)', color: 'var(--paper)', fontWeight: 700 }}>✓ complete</div>
          <div className="sk-box wob-sm" style={{ flex: 1, padding: '8px 10px', textAlign: 'center' }}>postpone</div>
        </div>

        <div style={{ marginTop: 8, borderTop: '1px dashed var(--pencil-light)', paddingTop: 6 }}>
          {[
            ['✎', 'edit title'],
            ['📍', 'override location'],
            ['🌅', 'reassign area'],
            ['❏', 'duplicate'],
            ['↗', 'open full editor'],
            ['🗑', 'delete', true]
          ].map(([icon, label, danger]) => (
            <div key={label} style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '7px 6px', fontSize: 13,
              color: danger ? 'var(--red-ink)' : 'var(--ink)'
            }}>
              <span style={{ width: 18, textAlign: 'center' }}>{icon}</span>
              <span>{label}</span>
            </div>
          ))}
        </div>
      </div>
    </MobileScreen>
  );
}

// =========================================================
// SETTINGS · scheduling
// =========================================================
function MobileSchedulingSettings() {
  return (
    <MobileScreen active="More" hideNav>
      <MTop title="Scheduling" sub="how the engine plans" onBack />
      <div style={{ flex: 1, overflow: 'auto', padding: '12px 14px 14px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        {/* buffer */}
        <Section title="buffer" tight>
          <div style={{ fontSize: 12, color: 'var(--pencil)', marginBottom: 6 }}>minutes between scheduled events</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontFamily: 'Caveat, cursive', fontSize: 26, fontWeight: 700 }}>10m</span>
            <div style={{ flex: 1, height: 10, border: '1.5px solid var(--ink)', borderRadius: 5, position: 'relative', background: 'var(--paper-2)' }}>
              <div style={{ position: 'absolute', inset: 0, width: '33%', background: 'var(--ink)', borderRadius: '5px 0 0 5px' }} />
              <div style={{ position: 'absolute', top: -6, left: 'calc(33% - 9px)', width: 18, height: 18, background: 'var(--paper)', border: '2px solid var(--ink)', borderRadius: '50%' }} />
            </div>
          </div>
        </Section>

        <Section title="default transport" tight>
          <div style={{ display: 'flex', gap: 0 }}>
            {[['🚗', 'driving', true], ['🚆', 'transit'], ['🚲', 'bike'], ['🚶', 'walk']].map(([icon, mode, sel]) => (
              <div key={mode} className="sk-box wob-sm" style={{
                padding: '6px 0', flex: 1, textAlign: 'center', borderRadius: 0,
                background: sel ? 'var(--ink)' : 'var(--paper)',
                color: sel ? 'var(--paper)' : 'var(--ink)', fontSize: 12
              }}>{icon} {mode}</div>
            ))}
          </div>
        </Section>

        <Section title="behaviour" tight>
          <ToggleRow label="render travel as events" sub="show 🚗 office → home blocks" on />
          <ToggleRow label="auto-regenerate" sub="after every edit · slower" on={false} />
          <ToggleRow label="show 'now' line on calendar" on />
        </Section>

        <Section title="engine" tight>
          <div style={{ fontSize: 12, color: 'var(--pencil)', marginBottom: 6 }}>advanced tuning · power-user only</div>
          <div className="sk-box wob-sm" style={{ padding: '8px 10px', display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 14 }}>⚙</span>
            <span style={{ flex: 1, fontSize: 13 }}>Engine · advanced</span>
            <span className="sk-mono-tag">›</span>
          </div>
        </Section>
      </div>
    </MobileScreen>
  );
}

function ToggleRow({ label, sub, on }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: '1px dashed var(--pencil-faint)' }}>
      <div style={{ flex: 1, lineHeight: 1.1 }}>
        <div style={{ fontSize: 13, fontWeight: 600 }}>{label}</div>
        {sub && <div className="sk-mono-tag" style={{ fontSize: 9 }}>{sub}</div>}
      </div>
      <ToggleSketchy on={on} />
    </div>
  );
}

// =========================================================
// BULK ACTIONS on Library
// =========================================================
function MobileBulk() {
  return (
    <MobileScreen active="Library" hideNav>
      <div style={{ padding: '8px 14px', background: 'var(--ink)', color: 'var(--paper)', display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
        <span className="sk-script" style={{ fontSize: 20, fontWeight: 700, lineHeight: 1 }}>3 selected</span>
        <span style={{ flex: 1 }} />
        <span className="sk-mono-tag" style={{ color: 'var(--highlight)' }}>done</span>
      </div>
      <div style={{ flex: 1, overflow: 'auto', padding: '8px 12px 100px', display: 'flex', flexDirection: 'column', gap: 5 }}>
        {[
          { t: 'Q4 strategy doc draft', area: 'Career', col: '#9bb8d6', dur: '2h', dl: 'Fri', sel: true },
          { t: 'Hiring panel · back-end', area: 'Career', col: '#9bb8d6', dur: '∑ 4h', dl: 'sprint', sel: true },
          { t: '1:1 with Ana', area: 'Career', col: '#9bb8d6', dur: '45m', dl: 'Tue' },
          { t: 'Submit expenses', area: 'Career', col: '#9bb8d6', dur: '20m', dl: 'overdue', sel: true, warn: true },
          { t: 'Dentist follow-up', area: 'Health', col: '#b6cfa7', dur: '30m', dl: 'this mo' },
          { t: 'Plant basil', area: 'Home', col: '#d6b9a2', dur: '15m', dl: 'today' },
          { t: 'Schedule plumber', area: 'Home', col: '#d6b9a2', dur: '10m', dl: 'this wk' }
        ].map((r, i) => (
          <div key={i} style={{
            display: 'grid', gridTemplateColumns: '22px 1fr auto', alignItems: 'center', gap: 8,
            padding: '8px 10px',
            border: '1px dashed var(--pencil-light)', borderRadius: 5,
            background: r.sel ? 'rgba(240,226,90,0.18)' : 'transparent'
          }}>
            <Check on={r.sel} />
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 600 }}>{r.t}</div>
              <div style={{ marginTop: 2, display: 'flex', gap: 4, alignItems: 'center', flexWrap: 'wrap' }}>
                <Swatch color={r.col} />
                <span className="sk-mono-tag" style={{ fontSize: 9 }}>{r.area} · {r.dur} · {r.dl}</span>
                {r.warn && <Badge kind="red" style={{ fontSize: 9 }}>over</Badge>}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* floating bulk bar */}
      <div style={{
        position: 'absolute', bottom: 16, left: 14, right: 14,
        background: 'var(--ink)', color: 'var(--paper)',
        border: '2px solid var(--ink)',
        borderRadius: 14,
        padding: '8px 8px',
        boxShadow: '4px 6px 0 var(--red-ink)',
        display: 'flex', justifyContent: 'space-around', gap: 4
      }}>
        {[['🌅', 'area'], ['📍', 'place'], ['↑', 'prio'], ['📅', 'redo'], ['🗑', 'del', 'red']].map(([icon, label, tone]) => (
          <div key={label} style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1,
            padding: '4px 8px', fontSize: 10,
            color: tone === 'red' ? '#ff8a7a' : 'var(--paper)'
          }}>
            <span style={{ fontSize: 14 }}>{icon}</span>
            <span>{label}</span>
          </div>
        ))}
      </div>
    </MobileScreen>
  );
}

// =========================================================
// GLOBAL SEARCH full-screen
// =========================================================
function MobileSearch() {
  return (
    <MobileScreen active="Today" hideNav>
      <div style={{ padding: '8px 14px', borderBottom: '2px solid var(--ink)', display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
        <span style={{ fontFamily: 'Caveat, cursive', fontSize: 20, lineHeight: 1, fontWeight: 700 }}>‹</span>
        <div className="sk-box wob-pill" style={{ flex: 1, padding: '5px 12px', display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ color: 'var(--pencil)' }}>⌕</span>
          <span style={{ flex: 1, fontSize: 14 }}>
            <i>plant</i>
            <span style={{ display: 'inline-block', width: 2, height: 16, background: 'var(--red-ink)', marginLeft: 1, verticalAlign: 'middle' }} />
          </span>
          <span style={{ color: 'var(--pencil)' }}>×</span>
        </div>
      </div>
      <div style={{ flex: 1, overflow: 'auto' }}>
        <ResultGroup label="items · 3">
          <Result icon="✓" name="Plant basil before it dies" sub="Task · Home · 15m · today" sel />
          <Result icon="🎯" name="Garden plan" sub="Goal · Home · 4 subtasks" />
          <Result icon="✓" name="Plant tulip bulbs" sub="Task · Home · 30m · last Oct" />
        </ResultGroup>
        <ResultGroup label="places · 1">
          <Result icon="📍" name="Plant Shop · Hill Road" sub="2 mi from home · 8m driving" />
        </ResultGroup>
        <ResultGroup label="actions · 2">
          <Result icon="+" name="Capture · 'plant'" sub="quick add to inbox" />
          <Result icon="↗" name="Open Today" sub="navigate" />
        </ResultGroup>
      </div>
    </MobileScreen>
  );
}

// =========================================================
// ENGINE FIX — expanded message with proposed actions
// =========================================================
function MobileEngineFix() {
  return (
    <MobileScreen active="Calendar" hideNav>
      <MTop title="Engine · fix" sub="‘refactor billing’ couldn't fit" onBack />
      <div style={{ flex: 1, overflow: 'auto', padding: '12px 14px 16px' }}>
        <div className="sk-box wob" style={{ padding: 12, background: 'var(--red-ink-faint)', borderColor: 'var(--red-ink)', borderWidth: 2 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontFamily: 'Special Elite, monospace', fontSize: 9, padding: '2px 6px', background: 'var(--red-ink)', color: 'var(--paper)', borderRadius: 2 }}>FAIL</span>
            <span style={{ fontSize: 13, fontWeight: 700 }}>can't place — no 6h gap</span>
          </div>
          <div style={{ marginTop: 5, fontSize: 12, lineHeight: 1.35 }}>
            6h block needed. strict Career window + 2 plans leave no slot of that size this week.
          </div>
        </div>

        <div className="sk-mono-tag" style={{ marginTop: 14, marginBottom: 5 }}>proposed actions</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {[
            { icon: '✂', label: 'split into 2 × 3h sessions', sub: 'fits Tue + Thu cleanly', primary: true },
            { icon: '⚙', label: 'relax Career window to 9–6', sub: 'creates 1 extra hour daily' },
            { icon: '⏩', label: 'push deadline by 1 week', sub: 'opens 5 new candidate slots' },
            { icon: '👁', label: 'show me the conflicts on calendar' }
          ].map((a, i) => (
            <div key={i} className="sk-box wob-sm" style={{
              padding: '8px 10px', display: 'flex', alignItems: 'center', gap: 8,
              borderColor: a.primary ? 'var(--ink)' : 'var(--pencil-light)',
              borderWidth: a.primary ? 2 : 1.5,
              background: a.primary ? 'var(--highlight-soft)' : 'var(--paper)'
            }}>
              <span style={{ width: 18, textAlign: 'center', fontSize: 14 }}>{a.icon}</span>
              <div style={{ flex: 1, lineHeight: 1.15 }}>
                <div style={{ fontSize: 13, fontWeight: a.primary ? 700 : 500 }}>{a.label}</div>
                {a.sub && <div className="sk-mono-tag" style={{ fontSize: 9, color: 'var(--pencil)' }}>{a.sub}</div>}
              </div>
              {a.primary && <span className="sk-mono-tag" style={{ color: 'var(--red-ink)', fontSize: 10 }}>apply</span>}
            </div>
          ))}
        </div>
      </div>
    </MobileScreen>
  );
}

// =========================================================
// ITEM DETAIL · task variant (overdue)
// =========================================================
function MobileItemDetailTask() {
  return (
    <MobileScreen active="Library" hideNav>
      <MTop title="Task" onBack right={<span className="sk-mono-tag">⋯</span>} />
      <div style={{ flex: 1, overflow: 'auto', padding: '12px 16px 20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Badge style={{ fontSize: 10 }}>task</Badge>
          <Badge style={{ fontSize: 10 }}><Swatch color="#9bb8d6" />🌅 Career</Badge>
        </div>
        <div className="sk-script" style={{ fontSize: 28, fontWeight: 700, lineHeight: 1.05, marginTop: 4 }}>Submit Q4 expenses</div>
        <SketchyUnderline width={180} style={{ marginTop: 0 }} />

        {/* overdue banner instead of progress */}
        <div className="sk-box wob" style={{ marginTop: 10, padding: 10, background: 'var(--red-ink-faint)', borderColor: 'var(--red-ink)', borderWidth: 2 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Badge kind="red" style={{ fontSize: 10 }}>overdue</Badge>
            <span className="sk-mono-tag" style={{ color: 'var(--red-ink)' }}>Apr 7 passed</span>
          </div>
          <div style={{ fontSize: 12, color: 'var(--red-ink)', marginTop: 5, lineHeight: 1.3 }}>
            engine couldn't fit before deadline. proposed: today 5:00 pm.
          </div>
          <div className="sk-box wob-sm tight" style={{ marginTop: 8, padding: '6px 10px', background: 'var(--ink)', color: 'var(--paper)', textAlign: 'center', fontSize: 12, fontWeight: 700 }}>accept slot</div>
        </div>

        {/* tabs — subtasks disabled */}
        <div style={{ marginTop: 14, display: 'flex', gap: 4, borderBottom: '2px solid var(--ink)' }}>
          {[['Overview', true], ['Schedule', false], ['Subtasks', false, true], ['Activity', false]].map(([n, sel, dis]) => (
            <div key={n} style={{
              padding: '6px 8px 4px',
              fontWeight: sel ? 700 : 400, fontSize: 12,
              borderBottom: sel ? '3px solid var(--red-ink)' : 'none',
              color: dis ? 'var(--pencil-light)' : (sel ? 'var(--ink)' : 'var(--pencil)')
            }}>
              {n}{dis && ' ·'}
              {dis && <span className="sk-mono-tag" style={{ fontSize: 8, marginLeft: 2 }}>n/a</span>}
            </div>
          ))}
        </div>

        <div style={{ marginTop: 14 }}>
          <div className="sk-mono-tag">identity</div>
          <FieldRow label="dur"><span style={{ fontWeight: 700 }}>20m</span></FieldRow>
          <FieldRow label="prio">
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ flex: 1, height: 6, background: 'var(--paper-2)', border: '1.5px solid var(--ink)', borderRadius: 3, position: 'relative' }}>
                <div style={{ position: 'absolute', inset: 0, width: '40%', background: 'var(--ink)' }} />
              </div>
              <span style={{ fontWeight: 700 }}>4</span>
            </div>
          </FieldRow>
          <FieldRow label="where"><Badge>📍 — anywhere</Badge></FieldRow>
        </div>
      </div>
    </MobileScreen>
  );
}

// =========================================================
// SUBTASKS · board (mobile = horizontal swipe)
// =========================================================
function MobileSubtasksBoard() {
  const cols = [
    { name: 'Up next', items: [
      { t: 'long run · 8mi', dur: '1h 30m', sched: 'Sat 7a' },
      { t: 'tempo · 25min', dur: '50m', sched: 'Wed 6:30a' }
    ]},
    { name: 'This wk', items: [
      { t: 'intervals · 800m × 4', dur: '50m', sched: 'today 2:30p', highlight: true },
      { t: '4-mile easy', dur: '40m', sched: 'Fri 6:30a' }
    ]}
  ];
  return (
    <MobileScreen active="Library" hideNav>
      <MTop title="Subtasks" sub="10k training plan · 12 items" onBack right={<Badge style={{ fontSize: 10 }}>board ▾</Badge>} />

      {/* tab pill row */}
      <div style={{ padding: '6px 14px', display: 'flex', gap: 6, flexShrink: 0, borderBottom: '1.5px dashed var(--pencil-light)' }}>
        {['Backlog · 2', 'Up next · 3', 'This wk · 2', 'Done · 7'].map((n, i) => (
          <span key={n} className="sk-badge" style={{
            fontSize: 10, padding: '3px 8px',
            background: i === 1 ? 'var(--ink)' : 'var(--paper)',
            color: i === 1 ? 'var(--paper)' : 'var(--ink)'
          }}>{n}</span>
        ))}
      </div>

      <div style={{ flex: 1, overflow: 'auto', padding: '10px 14px 14px' }}>
        {cols.map((c, ci) => (
          <div key={ci} style={{ marginBottom: 14 }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 6 }}>
              <span className="sk-script" style={{ fontSize: 20, fontWeight: 700, lineHeight: 1 }}>{c.name}</span>
              <span className="sk-mono-tag">{c.items.length}</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {c.items.map((it, i) => (
                <div key={i} className="sk-box wob-sm" style={{
                  padding: 10,
                  background: it.highlight ? 'var(--highlight-soft)' : 'var(--paper)',
                  boxShadow: it.highlight ? '2px 3px 0 var(--ink)' : 'none'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Check />
                    <span style={{ fontSize: 13, fontWeight: 600, flex: 1 }}>{it.t}</span>
                  </div>
                  <div style={{ marginTop: 4, display: 'flex', gap: 4, alignItems: 'center', flexWrap: 'wrap' }}>
                    <Badge style={{ fontSize: 9 }}>{it.dur}</Badge>
                    {it.sched && <Badge style={{ fontSize: 9, color: 'var(--red-ink)', borderColor: 'var(--red-ink)' }}>📅 {it.sched}</Badge>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
        <div className="sk-mono-tag" style={{ textAlign: 'center', color: 'var(--pencil)' }}>‹ swipe between columns ›</div>
      </div>
    </MobileScreen>
  );
}

// =========================================================
// Extra onboarding steps + empty Today
// =========================================================
function MobileOnboardWelcome() {
  return (
    <MobileScreen active="Today" hideNav>
      <div style={{ flex: 1, padding: '40px 22px 24px', display: 'flex', flexDirection: 'column' }}>
        <div className="sk-script" style={{ fontSize: 60, fontWeight: 700, lineHeight: 1 }}>circadium</div>
        <SketchyUnderline width={200} />
        <div style={{ marginTop: 20, fontSize: 18, lineHeight: 1.4 }}>
          a calendar that plans <i>around</i> your life.
        </div>
        <div style={{ marginTop: 14, fontSize: 14, color: 'var(--pencil)', lineHeight: 1.4 }}>
          you say what matters · we weave it through the week.
        </div>
        <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div className="sk-box wob-sm" style={{ padding: '11px 12px', textAlign: 'center', fontWeight: 700, background: 'var(--ink)', color: 'var(--paper)' }}>get started →</div>
          <div style={{ textAlign: 'center', fontSize: 13, color: 'var(--pencil)' }}>I have an account · <span style={{ color: 'var(--red-ink)' }}>sign in</span></div>
        </div>
      </div>
    </MobileScreen>
  );
}

function MobileOnboardPlaces() {
  return (
    <MobileScreen active="Today" hideNav>
      <div style={{ flex: 1, padding: '24px 18px 16px', display: 'flex', flexDirection: 'column' }}>
        <div className="sk-mono-tag">step 3 of 6</div>
        <div style={{ display: 'flex', gap: 3, marginTop: 6 }}>
          {Array.from({ length: 6 }).map((_, i) => (
            <span key={i} style={{ flex: 1, height: 4, borderRadius: 2, background: i <= 2 ? 'var(--ink)' : 'var(--pencil-light)' }} />
          ))}
        </div>
        <div className="sk-script" style={{ fontSize: 26, fontWeight: 700, lineHeight: 1.05, marginTop: 14 }}>Where do you live & work?</div>
        <div style={{ fontSize: 12, color: 'var(--pencil)', marginTop: 4 }}>so we know travel time. add more in Places.</div>
        <div style={{ marginTop: 18, display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div>
            <div className="sk-mono-tag" style={{ fontSize: 10, marginBottom: 3 }}>🏠 home</div>
            <div className="sk-box wob-pill" style={{ padding: '8px 12px' }}>142 Linden St, Brooklyn ✓</div>
          </div>
          <div>
            <div className="sk-mono-tag" style={{ fontSize: 10, marginBottom: 3 }}>💼 work</div>
            <div className="sk-box wob-pill" style={{ padding: '8px 12px', color: 'var(--pencil)' }}>search address…</div>
          </div>
          <FieldRow label="🚗 default"><Badge>driving ▾</Badge></FieldRow>
        </div>
        <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div className="sk-box wob-sm" style={{ padding: '10px 12px', textAlign: 'center', fontWeight: 700, background: 'var(--ink)', color: 'var(--paper)' }}>continue →</div>
          <div style={{ textAlign: 'center', fontSize: 12, color: 'var(--pencil)' }}>skip · I'll add later</div>
        </div>
      </div>
    </MobileScreen>
  );
}

function MobileOnboardAI() {
  return (
    <MobileScreen active="Today" hideNav>
      <div style={{ flex: 1, padding: '24px 18px 16px', display: 'flex', flexDirection: 'column' }}>
        <div className="sk-mono-tag">step 5 of 6</div>
        <div style={{ display: 'flex', gap: 3, marginTop: 6 }}>
          {Array.from({ length: 6 }).map((_, i) => (
            <span key={i} style={{ flex: 1, height: 4, borderRadius: 2, background: i <= 4 ? 'var(--ink)' : 'var(--pencil-light)' }} />
          ))}
        </div>
        <div className="sk-script" style={{ fontSize: 28, fontWeight: 700, lineHeight: 1.05, marginTop: 14 }}>✦ Plan with AI?</div>
        <div style={{ marginTop: 8, fontSize: 13, color: 'var(--ink-soft)', lineHeight: 1.4 }}>
          A few minutes of intake, and we propose goals across your areas.
        </div>
        <div className="sk-box wob" style={{ marginTop: 12, padding: 12, background: 'var(--highlight-soft)' }}>
          <div className="sk-mono-tag" style={{ marginBottom: 4 }}>what it does</div>
          <div style={{ fontSize: 12, lineHeight: 1.45 }}>
            ✦ asks about your season<br />
            ✦ drafts goals per area<br />
            ✦ proposes subtasks<br />
            ✦ nothing added without ok
          </div>
        </div>
        <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div className="sk-box wob-sm" style={{ padding: '10px 12px', textAlign: 'center', fontWeight: 700, background: 'var(--ink)', color: 'var(--paper)' }}>start session →</div>
          <div style={{ textAlign: 'center', fontSize: 12, color: 'var(--pencil)' }}>no thanks · I'll add my own</div>
        </div>
      </div>
    </MobileScreen>
  );
}

function MobileEmptyToday() {
  return (
    <MobileScreen active="Today">
      <MTop title="Today" sub="wed apr 10 · all clear" right={<Glyph>A</Glyph>} />
      <div style={{ flex: 1, padding: '16px 14px', display: 'flex', flexDirection: 'column' }}>
        <div className="sk-box wob" style={{ padding: 16, background: 'var(--paper-2)' }}>
          <div className="sk-script" style={{ fontSize: 24, fontWeight: 700, lineHeight: 1.05 }}>You're set ✦</div>
          <div style={{ marginTop: 6, fontSize: 13, color: 'var(--pencil)' }}>your calendar is empty — capture anything and we'll place it.</div>
          <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 5, fontSize: 13 }}>
            <div>✓ 4 life areas set up</div>
            <div>✓ 1 place added</div>
            <div>✓ 2 templates sketched</div>
            <div style={{ color: 'var(--pencil)' }}>○ capture your first item</div>
            <div style={{ color: 'var(--pencil)' }}>○ run AI coach (optional)</div>
          </div>
        </div>

        <div style={{ marginTop: 'auto', textAlign: 'center', color: 'var(--pencil)' }}>
          <div style={{ fontFamily: 'Caveat, cursive', fontSize: 30, lineHeight: 1 }}>↓</div>
          <div className="sk-mono-tag">tap + to capture</div>
        </div>
      </div>
    </MobileScreen>
  );
}

// =========================================================
// ROW-BASED GALLERY ARTBOARDS
// =========================================================
function PhoneRow({ title, sub, phones }) {
  return (
    <div style={{ height: '100%', padding: '24px 28px', overflow: 'auto', background: 'var(--paper-2)' }}>
      <div style={{ marginBottom: 16, display: 'flex', alignItems: 'baseline', gap: 12 }}>
        <div className="sk-script" style={{ fontSize: 30, fontWeight: 700, lineHeight: 1 }}>{title}</div>
        <div className="sk-mono-tag" style={{ flex: 1 }}>{sub}</div>
        <Anno width={180} style={{ position: 'static', transform: 'rotate(-1deg)' }}>parent on left · derived screens cascade right</Anno>
      </div>
      <div style={{ display: 'flex', gap: 30, alignItems: 'flex-start', position: 'relative' }}>
        {phones.map((p, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 14, flexShrink: 0 }}>
            <SketchPhone label={p.label}>{p.body}</SketchPhone>
            {i < phones.length - 1 && (
              <div style={{
                paddingTop: 360,
                fontFamily: 'Caveat, cursive', fontSize: 32, color: 'var(--red-ink)',
                fontWeight: 700
              }}>→</div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function MobileRowAuth() {
  return (
    <PhoneRow
      title="A · Auth + onboarding"
      sub="welcome → sign in → pick areas → places → AI offer → empty Today"
      phones={[
        { label: 'Welcome', body: <MobileOnboardWelcome /> },
        { label: 'Sign in', body: <MobileSignIn /> },
        { label: 'Onb · pick areas', body: <MobileOnboard /> },
        { label: 'Onb · places', body: <MobileOnboardPlaces /> },
        { label: 'Onb · AI offer', body: <MobileOnboardAI /> },
        { label: 'Empty Today', body: <MobileEmptyToday /> }
      ]}
    />
  );
}

function MobileRowDaily() {
  return (
    <PhoneRow
      title="B · Daily flow"
      sub="Today is home base · everything else opens from here"
      phones={[
        { label: 'Today (home)', body: <MobileToday /> },
        { label: '+ Capture sheet', body: <MobileCapture /> },
        { label: 'Triage card', body: <MobileTriage /> },
        { label: '⌕ Search', body: <MobileSearch /> },
        { label: '✦ AI coach', body: <MobileAICoach /> }
      ]}
    />
  );
}

function MobileRowLibrary() {
  return (
    <PhoneRow
      title="C · Library + item detail"
      sub="areas tree → item → subtasks board / task variant · bulk-select mode"
      phones={[
        { label: 'Library (home)', body: <MobileLibrary /> },
        { label: 'Item · goal', body: <MobileItemDetail /> },
        { label: 'Subtasks board', body: <MobileSubtasksBoard /> },
        { label: 'Item · task (overdue)', body: <MobileItemDetailTask /> },
        { label: 'Bulk select mode', body: <MobileBulk /> }
      ]}
    />
  );
}

function MobileRowCalendar() {
  return (
    <PhoneRow
      title="D · Calendar + engine"
      sub="agenda → day grid → tap event → engine console → fix details"
      phones={[
        { label: 'Calendar (agenda)', body: <MobileCalendarAgenda /> },
        { label: 'Day grid', body: <MobileCalendarDay /> },
        { label: 'Event · sheet', body: <MobileEventSheet /> },
        { label: 'Engine messages', body: <MobileEngineMessages /> },
        { label: 'Fix · proposed actions', body: <MobileEngineFix /> }
      ]}
    />
  );
}

function MobileRowAdmin() {
  return (
    <PhoneRow
      title="E · Settings hub + admin"
      sub="More → scheduling · life areas · templates · places · travel matrix"
      phones={[
        { label: 'More (home)', body: <MobileMore /> },
        { label: 'Scheduling', body: <MobileSchedulingSettings /> },
        { label: 'Life Areas', body: <MobileLifeAreas /> },
        { label: 'Templates', body: <MobileTemplates /> },
        { label: 'Places', body: <MobilePlaces /> },
        { label: 'Travel matrix', body: <MobileTravelMatrix /> }
      ]}
    />
  );
}

Object.assign(window, {
  MobileLifeAreas, MobileTemplates, MobilePlaces, MobileTravelMatrix,
  MobileEventSheet, MobileSchedulingSettings, MobileBulk, MobileSearch,
  MobileEngineFix, MobileItemDetailTask, MobileSubtasksBoard,
  MobileOnboardWelcome, MobileOnboardPlaces, MobileOnboardAI, MobileEmptyToday,
  MobileRowAuth, MobileRowDaily, MobileRowLibrary, MobileRowCalendar, MobileRowAdmin
});
