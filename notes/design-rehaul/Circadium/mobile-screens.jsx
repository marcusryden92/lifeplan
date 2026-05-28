/* global React */
// Mobile screens — Today, Library, Calendar, Item detail, Capture, Triage, AI, Engine, More, Onboarding

// =========================================================
// TODAY
// =========================================================
function MobileToday() {
  return (
    <MobileScreen active="Today">
      <MTop title="Good morning" sub="wed apr 10 · 6 things today" right={<Glyph>A</Glyph>} />
      <div style={{ flex: 1, overflow: 'auto', padding: '10px 14px 16px' }}>
        {/* Now */}
        <div className="sk-box wob" style={{ padding: 10, background: 'var(--highlight-soft)', boxShadow: '3px 3px 0 var(--ink)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span className="sk-mono-tag" style={{ color: 'var(--red-ink)', fontWeight: 700 }}>NOW · 9–11:30</span>
            <span style={{ flex: 1 }} />
            <Badge style={{ fontSize: 9 }}><Swatch color="#9bb8d6" /> Career</Badge>
          </div>
          <div className="sk-script" style={{ fontSize: 22, fontWeight: 700, lineHeight: 1.05, marginTop: 4 }}>Q4 strategy · deep work</div>
          <div style={{ fontSize: 12, color: 'var(--pencil)', marginTop: 4 }}>2h 30m · 📍 Office</div>
        </div>

        <div className="sk-mono-tag" style={{ margin: '14px 0 4px' }}>up next today</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {[
            { t: '1:1 with Ana', time: '11:45', dur: '45m', col: '#9bb8d6', kind: 'plan' },
            { t: '🚗 office → home', time: '12:45', dur: '20m', travel: true },
            { t: 'Plant basil', time: '14:00', dur: '15m', col: '#d6b9a2', warn: true },
            { t: 'intervals · 800m × 4', time: '14:30', dur: '50m', col: '#b6cfa7' },
            { t: 'Submit expenses', time: '17:00', dur: '20m', col: '#9bb8d6', overdue: true }
          ].map((t, i) => (
            <div key={i} style={{
              display: 'grid', gridTemplateColumns: '40px 1fr auto', alignItems: 'center', gap: 8,
              padding: '7px 10px',
              border: '1px dashed var(--pencil-light)', borderRadius: 6,
              opacity: t.travel ? 0.65 : 1
            }}>
              <div className="sk-mono-tag" style={{ fontSize: 10, lineHeight: 1.2 }}>
                <div>{t.time}</div>
                <div style={{ color: 'var(--pencil)' }}>{t.dur}</div>
              </div>
              <div style={{ fontSize: 13, fontWeight: 600 }}>{t.t}</div>
              {t.warn && <Badge kind="red" style={{ fontSize: 9 }}>late</Badge>}
              {t.overdue && <Badge kind="red" style={{ fontSize: 9 }}>over</Badge>}
              {!t.warn && !t.overdue && t.col && <Swatch color={t.col} />}
            </div>
          ))}
        </div>

        <div className="sk-mono-tag" style={{ margin: '14px 0 4px' }}>priority goals</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {[
            { n: '10k training plan', pct: 58, sub: '7/12', col: '#b6cfa7', next: 'intervals · 2:30p today' },
            { n: 'Hiring · back-end', pct: 40, sub: '2/5', col: '#9bb8d6', next: 'screen 3 cands · Thu' },
            { n: 'Spanish · 30d', pct: 40, sub: '12/30', col: '#a2c8d6', next: '15m drill · tonight' }
          ].map((g, i) => (
            <div key={i} className="sk-box wob-sm" style={{ padding: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Swatch color={g.col} />
                <span style={{ fontSize: 14, fontWeight: 700, flex: 1 }}>{g.n}</span>
                <span className="sk-mono-tag" style={{ fontSize: 10 }}>{g.sub}</span>
              </div>
              <div style={{ marginTop: 6, height: 8, border: '1.5px solid var(--ink)', borderRadius: 4, overflow: 'hidden', background: 'var(--paper-2)', position: 'relative' }}>
                <div style={{ position: 'absolute', inset: 0, width: `${g.pct}%`, background: 'var(--ink)' }} />
              </div>
              <div style={{ fontSize: 11, color: 'var(--pencil)', marginTop: 4 }}>→ {g.next}</div>
            </div>
          ))}
        </div>
      </div>
    </MobileScreen>
  );
}

// =========================================================
// LIBRARY (tree of areas)
// =========================================================
function MobileLibrary() {
  return (
    <MobileScreen active="Library">
      <MTop title="Library" sub="42 items · 6 areas" right={<Glyph>⌕</Glyph>} />

      {/* Smart views chip row */}
      <div style={{ padding: '8px 12px', display: 'flex', gap: 6, overflow: 'auto', flexShrink: 0, borderBottom: '1.5px dashed var(--pencil-light)' }}>
        <Badge kind="red" style={{ fontSize: 11 }}>📥 inbox · 7</Badge>
        <Badge style={{ fontSize: 11 }}>🔥 today · 4</Badge>
        <Badge style={{ fontSize: 11 }}>📆 week · 12</Badge>
        <Badge kind="red" style={{ fontSize: 11 }}>⏰ overdue · 2</Badge>
        <Badge style={{ fontSize: 11 }}>🎯 goals</Badge>
      </div>

      <div style={{ flex: 1, overflow: 'auto', padding: '10px 12px 14px' }}>
        <div className="sk-mono-tag" style={{ marginBottom: 6 }}>life areas</div>
        <Tree items={[
          { icon: '🌅', name: 'Career', color: '#9bb8d6', count: 14, open: true, children: [
            { name: 'Q4 strategy', kind: 'goal', count: 6, open: true, children: [
              { name: 'draft outline', kind: 'task', count: 1 },
              { name: 'data review', kind: 'task', count: 1 }
            ] },
            { name: 'Hiring', kind: 'goal', count: 5, sel: true },
            { name: 'Admin', kind: 'folder', count: 3 }
          ]},
          { icon: '🧘', name: 'Health', color: '#b6cfa7', count: 9, open: true, children: [
            { name: '10k training', kind: 'goal', count: 12 },
            { name: 'Medical', kind: 'folder', count: 2 }
          ]},
          { icon: '🏠', name: 'Home', color: '#d6b9a2', count: 5 },
          { icon: '❤️', name: 'Relationships', color: '#d6a2b9', count: 4 },
          { icon: '💰', name: 'Finance', color: '#d6cea2', count: 3 },
          { icon: '🌱', name: 'Growth', color: '#a2c8d6', count: 7 }
        ]} />
      </div>
    </MobileScreen>
  );
}

// =========================================================
// CALENDAR · agenda + day
// =========================================================
function MobileCalendarAgenda() {
  const items = [
    { time: '9:00', t: 'Q4 strategy · deep work', dur: '2h 30m', col: '#9bb8d6', now: true },
    { time: '11:45', t: '1:1 with Ana', dur: '45m', col: '#9bb8d6', kind: 'plan' },
    { time: '12:45', t: '🚗 office → home', dur: '20m', travel: true },
    { time: '14:00', t: 'Plant basil', dur: '15m', col: '#d6b9a2', warn: true },
    { time: '14:30', t: 'intervals · 800m × 4', dur: '50m', col: '#b6cfa7' },
    { time: '17:00', t: 'Submit expenses', dur: '20m', col: '#9bb8d6', overdue: true },
    { time: '19:30', t: 'family dinner', dur: '1h 30m', col: '#d6a2b9', kind: 'tmpl' }
  ];
  return (
    <MobileScreen active="Calendar">
      <MTop title="Wed Apr 10" sub="6 events · 1 warning" right={<Badge style={{ fontSize: 10 }}>agenda ▾</Badge>} />
      <div style={{ display: 'flex', gap: 4, padding: '8px 14px', flexShrink: 0, borderBottom: '1.5px dashed var(--pencil-light)' }}>
        {['M 8','T 9','W 10','T 11','F 12','S 13','S 14'].map((d, i) => (
          <div key={d} style={{
            flex: 1, textAlign: 'center', padding: '5px 0',
            borderRadius: 6,
            background: i === 2 ? 'var(--ink)' : 'transparent',
            color: i === 2 ? 'var(--paper)' : 'var(--ink)',
            fontFamily: 'Patrick Hand, cursive', fontSize: 11
          }}>{d}</div>
        ))}
      </div>
      <div style={{ flex: 1, overflow: 'auto', padding: '10px 14px 14px', display: 'flex', flexDirection: 'column', gap: 6 }}>
        {items.map((it, i) => (
          <div key={i} style={{
            display: 'grid', gridTemplateColumns: '52px 1fr', gap: 10,
            padding: '8px 10px',
            background: it.now ? 'var(--highlight-soft)' : 'var(--paper)',
            border: it.now ? '2px solid var(--ink)' : '1px dashed var(--pencil-light)',
            borderRadius: 6
          }}>
            <div className="sk-mono-tag" style={{ fontSize: 10, lineHeight: 1.2 }}>
              <div style={{ color: it.now ? 'var(--red-ink)' : 'var(--ink)', fontWeight: it.now ? 700 : 400 }}>{it.now ? 'NOW' : it.time}</div>
              <div style={{ color: 'var(--pencil)' }}>{it.dur}</div>
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: it.now ? 700 : 500, lineHeight: 1.15 }}>{it.t}</div>
              <div style={{ marginTop: 3, display: 'flex', gap: 4, alignItems: 'center', flexWrap: 'wrap' }}>
                {it.col && <Swatch color={it.col} />}
                {it.kind === 'plan' && <Badge style={{ fontSize: 9 }}>plan</Badge>}
                {it.kind === 'tmpl' && <Badge kind="dim" style={{ fontSize: 9 }}>template</Badge>}
                {it.warn && <Badge kind="red" style={{ fontSize: 9 }}>late</Badge>}
                {it.overdue && <Badge kind="red" style={{ fontSize: 9 }}>overdue</Badge>}
              </div>
            </div>
          </div>
        ))}
      </div>
    </MobileScreen>
  );
}

function MobileCalendarDay() {
  const hours = [7,8,9,10,11,12,13,14,15,16,17,18,19];
  return (
    <MobileScreen active="Calendar">
      <MTop title="Wed Apr 10" sub="vertical day view" right={<Badge style={{ fontSize: 10 }}>day ▾</Badge>} />
      <div style={{ flex: 1, overflow: 'auto', padding: '8px 8px' }}>
        <div style={{ position: 'relative', display: 'grid', gridTemplateColumns: '34px 1fr', gridTemplateRows: `repeat(${hours.length}, 50px)` }}>
          {hours.flatMap((h, ri) => [
            <span key={`hl${ri}`} className="sk-mono-tag" style={{ gridRow: ri+1, gridColumn: 1, fontSize: 9, paddingTop: 2 }}>{h <= 12 ? `${h}a` : `${h-12}p`}</span>,
            <div key={`c${ri}`} style={{
              gridRow: ri+1, gridColumn: 2,
              borderTop: '1px dashed var(--pencil-faint)',
              borderLeft: '1px dashed var(--pencil-faint)',
              borderRight: '1px dashed var(--pencil-faint)'
            }} />
          ])}
          {/* events */}
          <div style={{ gridColumn: 2, gridRow: '3 / span 3', margin: 2, padding: '4px 6px', background: '#9bb8d6', border: '1.5px solid var(--ink)', borderRadius: 4, fontSize: 11 }}>
            Q4 strategy · deep work
          </div>
          <div style={{ gridColumn: 2, gridRow: '5 / span 1', margin: 2, padding: '4px 6px', background: 'var(--ink)', color: 'var(--paper)', borderRadius: 4, fontSize: 11 }}>
            1:1 ana
          </div>
          <div style={{ gridColumn: 2, gridRow: '8 / span 1', margin: 2, padding: '4px 6px', background: '#d6b9a2', border: '2px solid var(--red-ink)', borderRadius: 4, fontSize: 11 }}>
            plant basil · late
          </div>
          <div style={{ gridColumn: 2, gridRow: '9 / span 1', margin: 2, padding: '4px 6px', background: '#b6cfa7', border: '1.5px solid var(--ink)', borderRadius: 4, fontSize: 11 }}>
            intervals 800×4
          </div>
          <div style={{ gridColumn: 2, gridRow: '11 / span 1', margin: 2, padding: '4px 6px', background: '#9bb8d6', border: '2px solid var(--red-ink)', borderRadius: 4, fontSize: 11 }}>
            expenses · overdue
          </div>
          {/* now line */}
          <div style={{
            position: 'absolute', left: 30, right: 4,
            top: `${(2 + 0.6) * 50}px`,
            borderTop: '2px dashed var(--red-ink)', zIndex: 5
          }}>
            <span style={{
              position: 'absolute', left: -28, top: -10,
              background: 'var(--red-ink)', color: 'var(--paper)',
              padding: '1px 5px', fontFamily: 'Special Elite, monospace', fontSize: 9, borderRadius: 3
            }}>9:36</span>
          </div>
        </div>
      </div>
    </MobileScreen>
  );
}

// =========================================================
// ITEM DETAIL (goal)
// =========================================================
function MobileItemDetail() {
  return (
    <MobileScreen active="Library" hideNav>
      <MTop title="Goal" onBack right={<span className="sk-mono-tag">⋯</span>} />
      <div style={{ flex: 1, overflow: 'auto', padding: '12px 16px 20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Badge kind="dark" style={{ fontSize: 10 }}>goal</Badge>
          <Badge style={{ fontSize: 10 }}><Swatch color="#b6cfa7" />🧘 Health</Badge>
        </div>
        <div className="sk-script" style={{ fontSize: 28, fontWeight: 700, lineHeight: 1.05, marginTop: 4 }}>10k training plan</div>
        <SketchyUnderline width={180} style={{ marginTop: 0 }} />

        {/* progress */}
        <div style={{ marginTop: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--pencil)', marginBottom: 3 }}>
            <span>7 / 12 · 58%</span>
            <span>by May 25 · 4w</span>
          </div>
          <div style={{ height: 14, border: '2px solid var(--ink)', borderRadius: 7, overflow: 'hidden', background: 'var(--paper-2)', position: 'relative' }}>
            <div style={{ position: 'absolute', inset: 0, width: '58%', background: 'var(--ink)' }} />
          </div>
        </div>

        {/* tabs */}
        <div style={{ marginTop: 14, display: 'flex', gap: 4, borderBottom: '2px solid var(--ink)' }}>
          {[['Overview', false], ['Schedule', false], ['Subtasks · 12', true], ['Activity', false]].map(([n, sel]) => (
            <div key={n} style={{
              padding: '6px 8px 4px',
              fontWeight: sel ? 700 : 400,
              fontSize: 12,
              borderBottom: sel ? '3px solid var(--red-ink)' : 'none',
              color: sel ? 'var(--ink)' : 'var(--pencil)'
            }}>{n}</div>
          ))}
        </div>

        {/* Next subtask */}
        <div className="sk-box wob" style={{ marginTop: 12, padding: 10, background: 'var(--highlight-soft)' }}>
          <div className="sk-mono-tag">next on calendar</div>
          <div className="sk-script" style={{ fontSize: 20, fontWeight: 700, lineHeight: 1, marginTop: 3 }}>Wed · 6:30 am</div>
          <div style={{ fontSize: 12, marginTop: 2 }}>intervals 800 × 4 · 50m</div>
        </div>

        {/* Subtasks (collapsed sections) */}
        <div className="sk-mono-tag" style={{ marginTop: 14 }}>subtasks · 12</div>
        <div style={{ marginTop: 4, display: 'flex', flexDirection: 'column', gap: 4 }}>
          {[
            { t: '3-mile easy', done: true },
            { t: 'intervals 400m × 6', done: true },
            { t: 'long run · 6mi', done: true },
            { t: '3-mile easy', done: true },
            { t: 'intervals 800m × 4', current: true },
            { t: 'long run · 8mi' },
            { t: 'taper · race', dim: true }
          ].map((s, i) => (
            <div key={i} style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '6px 8px',
              border: s.current ? '2px solid var(--ink)' : '1px dashed var(--pencil-faint)',
              borderRadius: 5,
              background: s.current ? 'var(--highlight-soft)' : 'transparent'
            }}>
              <Check on={s.done} />
              <span style={{ fontSize: 13, flex: 1, textDecoration: s.done ? 'line-through' : 'none', color: s.done ? 'var(--pencil)' : 'var(--ink)' }}>{s.t}</span>
              {s.current && <Badge style={{ fontSize: 9 }}>today</Badge>}
            </div>
          ))}
          <div style={{ padding: '6px 8px', fontSize: 12, color: 'var(--pencil)', border: '1px dashed var(--pencil-light)', borderRadius: 5, textAlign: 'center' }}>+ add subtask</div>
        </div>

        {/* AI ribbon */}
        <div className="sk-box wob" style={{ marginTop: 14, padding: 10, background: 'var(--highlight-soft)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span className="sk-script" style={{ fontSize: 16, fontWeight: 700, lineHeight: 1 }}>✦ AI helper</span>
            <span style={{ flex: 1 }} />
            <span className="sk-mono-tag" style={{ fontSize: 9 }}>scoped to this goal</span>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 6 }}>
            <Badge style={{ fontSize: 10 }}>✦ split this</Badge>
            <Badge style={{ fontSize: 10 }}>✦ estimate</Badge>
            <Badge style={{ fontSize: 10 }}>✦ rewrite</Badge>
          </div>
        </div>
      </div>
    </MobileScreen>
  );
}

// =========================================================
// CAPTURE bottom sheet
// =========================================================
function MobileCapture() {
  return (
    <MobileScreen active="Capture" hideNav>
      {/* dimmed today behind */}
      <div style={{ flex: 1, padding: '8px 14px', opacity: 0.3, overflow: 'hidden' }}>
        <Lines count={2} style={{ marginTop: 6 }} />
        <div className="sk-box wob" style={{ marginTop: 14, padding: 10, height: 80 }} />
        <div className="sk-box wob" style={{ marginTop: 10, padding: 10, height: 80 }} />
      </div>

      {/* Sheet anchored to bottom */}
      <div style={{
        background: 'var(--paper)',
        borderTop: '2px solid var(--ink)',
        borderTopLeftRadius: 22, borderTopRightRadius: 22,
        boxShadow: '0 -8px 24px rgba(28,26,23,0.18)',
        padding: '10px 14px 16px',
        flexShrink: 0
      }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 6 }}>
          <span style={{ width: 36, height: 4, borderRadius: 2, background: 'var(--pencil-light)' }} />
        </div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
          <span className="sk-script" style={{ fontSize: 22, fontWeight: 700, lineHeight: 1 }}>Capture</span>
          <span className="sk-mono-tag">jot · classify later</span>
        </div>
        <div className="sk-box wob-pill" style={{ marginTop: 10, padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 8, background: 'var(--paper-2)' }}>
          <span style={{ flex: 1, fontSize: 14 }}>
            <i>book the dentist next week</i>
            <span style={{ display: 'inline-block', width: 2, height: 16, background: 'var(--red-ink)', marginLeft: 1 }} />
          </span>
        </div>
        <div style={{ marginTop: 8, display: 'flex', flexWrap: 'wrap', gap: 5 }}>
          <Badge style={{ fontSize: 10 }}>type · task</Badge>
          <Badge style={{ fontSize: 10 }}>dur · 30m</Badge>
          <Badge style={{ fontSize: 10 }}>by Fri</Badge>
          <Badge kind="red" style={{ fontSize: 10 }}>area? Health ▾</Badge>
        </div>
        <div style={{ marginTop: 10, display: 'flex', gap: 6 }}>
          <div className="sk-box wob-sm tight" style={{ flex: 1, textAlign: 'center', fontSize: 12 }}>save to inbox</div>
          <div className="sk-box wob-sm tight" style={{ flex: 1, textAlign: 'center', fontSize: 12, background: 'var(--ink)', color: 'var(--paper)' }}>schedule</div>
        </div>
      </div>
    </MobileScreen>
  );
}

// =========================================================
// TRIAGE card
// =========================================================
function MobileTriage() {
  return (
    <MobileScreen active="Capture" hideNav>
      <MTop title="Triage" sub="1 of 7 · 1d old" onBack right={<span className="sk-mono-tag">skip</span>} />
      <div style={{ flex: 1, overflow: 'auto', padding: '14px 16px', background: 'var(--paper-2)' }}>
        <div className="sk-box wob" style={{ padding: 16, background: 'var(--paper)', boxShadow: '4px 5px 0 var(--ink)' }}>
          <div className="sk-script" style={{ fontSize: 26, fontWeight: 700, lineHeight: 1.05 }}>tax stuff — schedule w/ accountant</div>
          <SketchyUnderline width={200} style={{ marginTop: 2 }} />

          <div style={{ marginTop: 12, display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 4 }}>
            {[['task', true],['plan'],['goal'],['🗑', false, true]].map(([k, sel, danger], i) => (
              <div key={i} className="sk-box wob-sm" style={{
                padding: '8px 4px', textAlign: 'center',
                background: sel ? 'var(--ink)' : 'var(--paper)',
                color: sel ? 'var(--paper)' : (danger ? 'var(--red-ink)' : 'var(--ink)'),
                borderColor: danger ? 'var(--red-ink)' : 'var(--ink)'
              }}>
                <div className="sk-script" style={{ fontSize: 16, fontWeight: 700, lineHeight: 1 }}>{k}</div>
              </div>
            ))}
          </div>

          <div style={{ marginTop: 12, display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6 }}>
            <div className="sk-box wob-sm tight" style={{ padding: '6px 8px' }}>
              <div className="sk-mono-tag" style={{ fontSize: 9 }}>dur</div>
              <div className="sk-script" style={{ fontSize: 18, fontWeight: 700, lineHeight: 1 }}>1h</div>
            </div>
            <div className="sk-box wob-sm tight" style={{ padding: '6px 8px' }}>
              <div className="sk-mono-tag" style={{ fontSize: 9 }}>deadline</div>
              <div className="sk-script" style={{ fontSize: 18, fontWeight: 700, lineHeight: 1 }}>Apr 15</div>
            </div>
            <div className="sk-box wob-sm tight" style={{ padding: '6px 8px' }}>
              <div className="sk-mono-tag" style={{ fontSize: 9 }}>prio</div>
              <div className="sk-script" style={{ fontSize: 18, fontWeight: 700, lineHeight: 1 }}>7</div>
            </div>
          </div>

          <div style={{ marginTop: 10, display: 'flex', gap: 5, alignItems: 'center', flexWrap: 'wrap' }}>
            <Badge style={{ fontSize: 10 }}><Swatch color="#d6cea2" />💰 Finance</Badge>
            <Badge style={{ fontSize: 10 }}>📍 Home</Badge>
          </div>

          <div style={{ marginTop: 12, padding: '8px 10px', background: 'var(--paper-2)', borderRadius: 6, fontSize: 11, color: 'var(--ink-soft)' }}>
            rules: Finance window · Mon–Fri 6–9 pm · strict
          </div>
        </div>
      </div>
      <div style={{ padding: '8px 14px', flexShrink: 0, display: 'flex', gap: 6, borderTop: '2px solid var(--ink)', background: 'var(--paper)' }}>
        <div className="sk-box wob-sm tight" style={{ flex: 1, textAlign: 'center', fontSize: 12 }}>← skip</div>
        <div className="sk-box wob-sm tight" style={{ flex: 1, textAlign: 'center', fontSize: 12 }}>save only</div>
        <div className="sk-box wob-sm tight" style={{ flex: 1, textAlign: 'center', fontSize: 12, background: 'var(--ink)', color: 'var(--paper)' }}>schedule →</div>
      </div>
    </MobileScreen>
  );
}

// =========================================================
// AI Coach bottom sheet
// =========================================================
function MobileAICoach() {
  return (
    <MobileScreen active="Today" hideNav>
      <MTop title="✦ Plan with AI" sub="session · 4 min" onBack right={<Glyph>×</Glyph>} />
      <div style={{ flex: 1, overflow: 'auto', padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        <Msg3 ai>I'd like to understand what you're working on this season.</Msg3>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
          {['Career', 'Habit', 'Project', 'Health', 'Skill', 'Mend'].map((o, i) => (
            <span key={o} className="sk-badge" style={{
              fontSize: 11, padding: '3px 8px',
              background: (i === 0 || i === 3) ? 'var(--ink)' : 'var(--paper)',
              color: (i === 0 || i === 3) ? 'var(--paper)' : 'var(--ink)'
            }}>{(i === 0 || i === 3) ? '✓ ' : ''}{o}</span>
          ))}
        </div>

        <Msg3>ship billing service, hire 1 eng, run a 10k</Msg3>

        <Msg3 ai>4 drafts coming.</Msg3>

        <div className="sk-box wob" style={{ background: 'var(--highlight-soft)', padding: 8 }}>
          <div className="sk-mono-tag" style={{ marginBottom: 4 }}>drafted · 4</div>
          {[
            { t: 'Ship billing v1', sub: '🌅 by Jun 30 · 6 subs' },
            { t: 'Hire back-end eng', sub: '🌅 by May 20 · 5 subs' },
            { t: 'Run a 10k', sub: '🧘 by May 25 · 12 subs', ok: true }
          ].map((g, i) => (
            <div key={i} className="sk-box wob-sm" style={{
              padding: '6px 8px', background: 'var(--paper)', marginBottom: 4,
              boxShadow: g.ok ? '2px 2px 0 var(--ink)' : 'none'
            }}>
              <div style={{ fontSize: 12, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4 }}>
                <span style={{ flex: 1 }}>{g.t}</span>
                {g.ok && <Badge style={{ fontSize: 9 }}>✓</Badge>}
              </div>
              <div className="sk-mono-tag" style={{ fontSize: 9 }}>{g.sub}</div>
            </div>
          ))}
          <div className="sk-box wob-sm tight" style={{ marginTop: 4, padding: '5px 8px', background: 'var(--ink)', color: 'var(--paper)', fontSize: 12, textAlign: 'center' }}>add 3 remaining</div>
        </div>
      </div>
      <div style={{ padding: '8px 12px', borderTop: '2px solid var(--ink)', flexShrink: 0, background: 'var(--paper-2)' }}>
        <div className="sk-box wob-pill" style={{ padding: '7px 12px', background: 'var(--paper)', display: 'flex', alignItems: 'center', gap: 6 }}>
          <span className="sk-script" style={{ fontSize: 16 }}>✦</span>
          <span style={{ flex: 1, fontSize: 12, color: 'var(--pencil)' }}>say more, or revise…</span>
          <span className="sk-mono-tag">↵</span>
        </div>
      </div>
    </MobileScreen>
  );
}

function Msg3({ ai, children }) {
  if (ai) {
    return (
      <div style={{ display: 'flex', gap: 6 }}>
        <span style={{
          width: 22, height: 22, borderRadius: '50%',
          border: '1.5px solid var(--ink)', background: 'var(--paper-2)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontFamily: 'Caveat, cursive', fontSize: 13, fontWeight: 700, flexShrink: 0
        }}>✦</span>
        <div style={{
          flex: 1, padding: '6px 10px',
          background: 'var(--paper-2)', border: '1.5px solid var(--ink)',
          borderRadius: '4px 12px 12px 12px', fontSize: 12.5, lineHeight: 1.4
        }}>{children}</div>
      </div>
    );
  }
  return (
    <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
      <div style={{
        maxWidth: '85%', padding: '6px 10px',
        background: 'var(--ink)', color: 'var(--paper)',
        borderRadius: '12px 12px 4px 12px', fontSize: 12.5, lineHeight: 1.4
      }}>{children}</div>
    </div>
  );
}

// =========================================================
// ENGINE MESSAGES screen
// =========================================================
function MobileEngineMessages() {
  return (
    <MobileScreen active="Calendar" hideNav>
      <MTop title="Engine" sub="3 warnings · 1 fail · 2m ago" onBack right={<span className="sk-mono-tag">↻</span>} />
      <div style={{ flex: 1, overflow: 'auto', padding: '10px 12px 14px', display: 'flex', flexDirection: 'column', gap: 8 }}>
        <MMsg tone="fail" tag="FAIL" title="Couldn't place: ‘refactor billing’" body="No 6h gap fits. Try split, or relax Career window." />
        <MMsg tone="warn" tag="LATE" title="‘Plant basil’ 3 days late" body="Earliest Home slot: today 2:00 pm." />
        <MMsg tone="warn" tag="TRAVEL" title="Insufficient travel · Tue 12:30" body="Office → home is 20m. Only 10m left." />
        <MMsg tone="warn" tag="TRESPASS" title="Expenses sit in strict Health window" body="Wed 5 pm. Reassign or relax window." />
      </div>
    </MobileScreen>
  );
}

function MMsg({ tone, tag, title, body }) {
  const tones = {
    fail: { border: 'var(--red-ink)', bg: 'var(--red-ink-faint)', tagBg: 'var(--red-ink)', tagFg: 'var(--paper)' },
    warn: { border: 'var(--ink)', bg: 'var(--highlight-soft)', tagBg: 'var(--ink)', tagFg: 'var(--highlight)' }
  }[tone];
  return (
    <div className="sk-box wob-sm" style={{ padding: 8, background: tones.bg, borderColor: tones.border, borderWidth: tone === 'fail' ? 2 : 1.5 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
        <span style={{ fontFamily: 'Special Elite, monospace', fontSize: 9, padding: '1px 5px', background: tones.tagBg, color: tones.tagFg, borderRadius: 2 }}>{tag}</span>
        <span style={{ fontSize: 12.5, fontWeight: 700, flex: 1, lineHeight: 1.15 }}>{title}</span>
      </div>
      <div style={{ marginTop: 3, fontSize: 11.5, lineHeight: 1.3, color: 'var(--ink-soft)' }}>{body}</div>
      <div style={{ marginTop: 5, display: 'flex', gap: 5 }}>
        <div className="sk-box wob-sm tight" style={{ flex: 1, textAlign: 'center', fontSize: 10, padding: '3px 6px' }}>see fixes →</div>
      </div>
    </div>
  );
}

// =========================================================
// MORE / settings hub
// =========================================================
function MobileMore() {
  return (
    <MobileScreen active="More">
      <MTop title="More" sub="settings · areas · places" right={<Glyph>A</Glyph>} />
      <div style={{ flex: 1, overflow: 'auto', padding: '10px 14px 14px' }}>
        <div className="sk-box wob" style={{ padding: 10, display: 'flex', alignItems: 'center', gap: 10 }}>
          <Glyph>A</Glyph>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, fontSize: 14 }}>Alex Patel</div>
            <div className="sk-mono-tag" style={{ fontSize: 10 }}>alex@hyperisland.se · USER</div>
          </div>
          <span className="sk-mono-tag">›</span>
        </div>
        <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 4 }}>
          {[
            ['✦', 'Life Areas', '6 areas'],
            ['📍', 'Places', '6 / 10'],
            ['📅', 'Templates', '9 blocks'],
            ['⚙', 'Scheduling', 'buffer 10m · driving'],
            ['🤖', 'Engine · advanced'],
            ['🔔', 'Notifications'],
            ['🔌', 'Integrations'],
            ['📦', 'Data & export']
          ].map(([icon, name, sub]) => (
            <div key={name} style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '10px 10px',
              border: '1px dashed var(--pencil-light)', borderRadius: 6
            }}>
              <span style={{ fontFamily: 'Caveat, cursive', fontSize: 20, width: 22, textAlign: 'center' }}>{icon}</span>
              <div style={{ flex: 1, lineHeight: 1.1 }}>
                <div style={{ fontSize: 14, fontWeight: 600 }}>{name}</div>
                {sub && <div className="sk-mono-tag" style={{ fontSize: 10 }}>{sub}</div>}
              </div>
              <span className="sk-mono-tag">›</span>
            </div>
          ))}
        </div>
        <div style={{ marginTop: 16, padding: '8px 10px', textAlign: 'center', border: '1.5px dashed var(--red-ink)', borderRadius: 6, fontSize: 13, color: 'var(--red-ink)' }}>
          sign out
        </div>
      </div>
    </MobileScreen>
  );
}

// =========================================================
// ONBOARDING (single mobile frame example)
// =========================================================
function MobileOnboard() {
  return (
    <MobileScreen active="Today" hideNav>
      <div style={{ flex: 1, padding: '24px 18px', display: 'flex', flexDirection: 'column' }}>
        <div className="sk-mono-tag">step 2 of 6</div>
        <div style={{ display: 'flex', gap: 3, marginTop: 6 }}>
          {Array.from({ length: 6 }).map((_, i) => (
            <span key={i} style={{
              flex: 1, height: 4, borderRadius: 2,
              background: i <= 1 ? 'var(--ink)' : 'var(--pencil-light)'
            }} />
          ))}
        </div>
        <div className="sk-script" style={{ fontSize: 26, fontWeight: 700, lineHeight: 1.05, marginTop: 14 }}>What matters?</div>
        <div style={{ fontSize: 12, color: 'var(--pencil)', marginTop: 4 }}>pick areas of life · skip any · edit later</div>
        <div style={{ marginTop: 16, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {[
            ['🌅 Career', true], ['🧘 Health', true], ['❤️ Relationships'],
            ['💰 Finance', true], ['🌱 Growth'], ['🏠 Home', true],
            ['🎨 Creative'], ['👶 Family'], ['🛐 Faith']
          ].map(([n, sel]) => (
            <span key={n} className="sk-badge" style={{
              fontSize: 13, padding: '5px 12px',
              background: sel ? 'var(--ink)' : 'var(--paper)',
              color: sel ? 'var(--paper)' : 'var(--ink)',
              borderColor: 'var(--ink)'
            }}>{sel ? '✓ ' : '+ '}{n}</span>
          ))}
        </div>

        <div style={{ marginTop: 'auto' }}>
          <div className="sk-mono-tag" style={{ marginBottom: 8 }}>4 selected</div>
          <div className="sk-box wob-sm" style={{ padding: '10px 14px', background: 'var(--ink)', color: 'var(--paper)', textAlign: 'center', fontSize: 14, fontWeight: 700 }}>
            continue →
          </div>
          <div style={{ marginTop: 8, textAlign: 'center', fontSize: 12, color: 'var(--pencil)' }}>skip this step</div>
        </div>
      </div>
    </MobileScreen>
  );
}

// =========================================================
// AUTH · sign-in mobile
// =========================================================
function MobileSignIn() {
  return (
    <MobileScreen active="Today" hideNav>
      <div style={{ flex: 1, padding: '40px 22px 16px', display: 'flex', flexDirection: 'column' }}>
        <div className="sk-script" style={{ fontSize: 36, fontWeight: 700, lineHeight: 1 }}>circadium</div>
        <SketchyUnderline width={160} />
        <div className="sk-mono-tag" style={{ marginTop: 4 }}>welcome back</div>

        <div style={{ marginTop: 28, display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div>
            <div className="sk-mono-tag" style={{ fontSize: 10, marginBottom: 3 }}>email</div>
            <div className="sk-box wob-sm tight" style={{ padding: '10px 12px', background: 'var(--paper-2)', color: 'var(--pencil)' }}>you@email.com</div>
          </div>
          <div>
            <div className="sk-mono-tag" style={{ fontSize: 10, marginBottom: 3 }}>password</div>
            <div className="sk-box wob-sm tight" style={{ padding: '10px 12px', background: 'var(--paper-2)', color: 'var(--pencil)' }}>••••••••</div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}><Check on /> remember me</span>
            <span style={{ color: 'var(--red-ink)' }}>forgot?</span>
          </div>
          <div className="sk-box wob-sm" style={{ padding: '10px 12px', background: 'var(--ink)', color: 'var(--paper)', textAlign: 'center', fontWeight: 700 }}>sign in</div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '20px 0' }}>
          <span style={{ flex: 1, height: 1.5, background: 'var(--pencil-light)' }} />
          <span className="sk-mono-tag">or</span>
          <span style={{ flex: 1, height: 1.5, background: 'var(--pencil-light)' }} />
        </div>
        {[['G', 'continue with Google'], ['⌥', 'continue with GitHub']].map(([icon, label]) => (
          <div key={label} className="sk-box wob-sm" style={{ padding: '9px 12px', display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
            <Glyph>{icon}</Glyph>
            <span style={{ fontSize: 13 }}>{label}</span>
          </div>
        ))}
        <div style={{ marginTop: 'auto', textAlign: 'center', fontSize: 12, color: 'var(--pencil)' }}>
          new here? <span style={{ color: 'var(--red-ink)' }}>create account ↗</span>
        </div>
      </div>
    </MobileScreen>
  );
}

// =========================================================
// MOBILE GALLERY ARTBOARD
// =========================================================
function MobileGallery() {
  return (
    <div className="sk-page sk-hand" style={{ padding: '28px 32px 32px', background: 'var(--paper-2)', overflow: 'auto', height: '100%' }}>
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 22 }}>
        <div>
          <div className="sk-script" style={{ fontSize: 38, fontWeight: 700, lineHeight: 1 }}>Mobile · responsive parallel</div>
          <div className="sk-mono-tag" style={{ marginTop: 4 }}>same product · bottom tab nav · sheets instead of side panels · agenda-style calendar by default</div>
        </div>
        <Anno width={240} style={{ position: 'static', transform: 'rotate(-1deg)' }}>
          Capture is the raised center tab — always one tap away from anywhere.
        </Anno>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: `repeat(4, ${PHONE_W}px)`, gap: 36, justifyContent: 'center' }}>
        <SketchPhone label="Today"><MobileToday /></SketchPhone>
        <SketchPhone label="Library · areas tree"><MobileLibrary /></SketchPhone>
        <SketchPhone label="Calendar · agenda"><MobileCalendarAgenda /></SketchPhone>
        <SketchPhone label="Calendar · day grid"><MobileCalendarDay /></SketchPhone>

        <SketchPhone label="Capture · bottom sheet"><MobileCapture /></SketchPhone>
        <SketchPhone label="Triage · full screen"><MobileTriage /></SketchPhone>
        <SketchPhone label="Item detail (goal)"><MobileItemDetail /></SketchPhone>
        <SketchPhone label="AI coach · sheet"><MobileAICoach /></SketchPhone>

        <SketchPhone label="Engine messages"><MobileEngineMessages /></SketchPhone>
        <SketchPhone label="More / settings hub"><MobileMore /></SketchPhone>
        <SketchPhone label="Onboarding · step 2"><MobileOnboard /></SketchPhone>
        <SketchPhone label="Sign in"><MobileSignIn /></SketchPhone>
      </div>
    </div>
  );
}

window.MobileGallery = MobileGallery;
