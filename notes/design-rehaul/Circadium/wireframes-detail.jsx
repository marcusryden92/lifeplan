/* global React */
// Item detail editor — three directions

// ============================================================
// A. PEEK PANEL — slides from right, library still visible
// ============================================================
function DetailA() {
  return (
    <div className="sk-page sk-hand">
      <AppTop active="Library" />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 480px', height: 'calc(100% - 56px)' }}>
        {/* faded library behind */}
        <div style={{ padding: '16px 22px', overflow: 'hidden', opacity: 0.55, position: 'relative' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <span className="sk-script" style={{ fontSize: 30, fontWeight: 700 }}>Library</span>
            <Badge>area · Career</Badge>
          </div>
          <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 6 }}>
            {[
              { t: 'Q4 strategy doc draft', sel: true },
              { t: 'Hiring panel — back-end role' },
              { t: '1:1 with Ana' },
              { t: 'Submit expenses' },
              { t: 'Renew prescription' },
              { t: 'Dentist — crown follow-up' },
              { t: '10k training plan' },
              { t: 'Plant basil before it dies' },
              { t: 'Schedule plumber' }
            ].map((r, i) => (
              <div key={i} className="sk-box wob-sm" style={{
                padding: '8px 12px', display: 'flex', justifyContent: 'space-between',
                background: r.sel ? 'var(--paper-2)' : 'transparent',
                borderColor: r.sel ? 'var(--ink)' : 'var(--pencil-light)',
                borderWidth: r.sel ? 2 : 1.5
              }}>
                <span>{r.t}</span>
                <span className="sk-mono-tag">···</span>
              </div>
            ))}
          </div>
          {/* Dim overlay handled by opacity */}
        </div>

        {/* Peek panel */}
        <div style={{
          borderLeft: '2px solid var(--ink)',
          background: 'var(--paper)',
          boxShadow: '-18px 0 40px rgba(28,26,23,0.18)',
          padding: '18px 22px',
          overflow: 'auto',
          display: 'flex', flexDirection: 'column', gap: 14,
          position: 'relative'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span className="sk-mono-tag">peek · Career · task</span>
            <div style={{ display: 'flex', gap: 6 }}>
              <Glyph>↖</Glyph>
              <Glyph>×</Glyph>
            </div>
          </div>

          {/* Title */}
          <div>
            <div className="sk-script" style={{ fontSize: 36, fontWeight: 700, lineHeight: 1.05 }}>
              Q4 strategy doc draft
            </div>
            <SketchyUnderline width={320} style={{ marginTop: 2 }} />
            <div className="sk-mono-tag" style={{ marginTop: 6 }}>created 14m ago · last edit 2m ago</div>
          </div>

          {/* Type pills */}
          <div style={{ display: 'flex', gap: 6 }}>
            {[['task', true], ['plan', false], ['goal', false]].map(([k, sel]) => (
              <div key={k} className="sk-box wob-sm" style={{
                padding: '6px 12px', flex: 1, textAlign: 'center',
                background: sel ? 'var(--ink)' : 'var(--paper)',
                color: sel ? 'var(--paper)' : 'var(--ink)'
              }}>{k}</div>
            ))}
          </div>

          {/* Key fields */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <FieldBox label="duration" value="2h 30m" />
            <FieldBox label="deadline" value="Fri Apr 12" />
            <FieldBox label="priority" value="●●●●●●●○○○" subValue="7 / 10" />
            <FieldBox label="ready" value="✓ yes" />
          </div>

          {/* Area + location */}
          <div className="sk-box wob" style={{ padding: 12 }}>
            <div className="sk-mono-tag">life area & place</div>
            <div style={{ marginTop: 6, display: 'flex', gap: 6, alignItems: 'center' }}>
              <Badge><Swatch color="#9bb8d6" />🌅 Career</Badge>
              <span className="sk-mono-tag">change ▾</span>
            </div>
            <div style={{ marginTop: 8, display: 'flex', gap: 6, alignItems: 'center' }}>
              <Badge>📍 Office</Badge>
              <span className="sk-mono-tag" style={{ color: 'var(--pencil)' }}>inherited from Career</span>
            </div>
            <div style={{ marginTop: 6, fontSize: 13, color: 'var(--pencil)', display: 'flex', alignItems: 'center', gap: 6 }}>
              <Check on /> use area's default location
            </div>
          </div>

          {/* Scheduling */}
          <div className="sk-box wob" style={{ padding: 12, background: 'var(--paper-2)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <span className="sk-mono-tag">scheduled</span>
              <span className="sk-mono-tag" style={{ color: 'var(--pencil)' }}>by engine</span>
            </div>
            <div className="sk-script" style={{ fontSize: 22, fontWeight: 700, marginTop: 4, lineHeight: 1 }}>
              Tue Apr 9 · 9:00 – 11:30 am
            </div>
            <div style={{ marginTop: 8, display: 'flex', gap: 6 }}>
              <div className="sk-box wob-sm tight" style={{ fontSize: 12 }}>reschedule</div>
              <div className="sk-box wob-sm tight" style={{ fontSize: 12 }}>pin to time</div>
              <div className="sk-box wob-sm tight" style={{ fontSize: 12 }}>view on calendar →</div>
            </div>
          </div>

          {/* Danger */}
          <div style={{ display: 'flex', gap: 8, marginTop: 'auto' }}>
            <span style={{ flex: 1 }} />
            <div className="sk-box wob-sm tight" style={{ fontSize: 13, color: 'var(--red-ink)', borderColor: 'var(--red-ink)' }}>delete</div>
            <div className="sk-box wob-sm tight" style={{ fontSize: 13, background: 'var(--ink)', color: 'var(--paper)' }}>save</div>
          </div>

          <Anno style={{ position: 'absolute', top: 18, left: -240, transform: 'rotate(-2deg)' }} width={210}>
            quick edits w/o losing context — esc to close, j/k to next item
          </Anno>
        </div>
      </div>
    </div>
  );
}

function FieldBox({ label, value, subValue }) {
  return (
    <div className="sk-box wob-sm" style={{ padding: '8px 10px' }}>
      <div className="sk-mono-tag">{label}</div>
      <div style={{ fontSize: 18, fontWeight: 700, marginTop: 2 }}>{value}</div>
      {subValue && <div style={{ fontSize: 12, color: 'var(--pencil)' }}>{subValue}</div>}
    </div>
  );
}

// ============================================================
// B. FULL PAGE — calm, sections expand. Tasks AND goals.
// ============================================================
function DetailB() {
  return (
    <div className="sk-page sk-hand" style={{ overflow: 'auto' }}>
      <AppTop active="Library" />
      <div style={{ padding: '20px 60px 40px', maxWidth: 1100, margin: '0 auto' }}>
        {/* breadcrumb */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 14, color: 'var(--pencil)' }}>
          <span>Library</span>
          <span>›</span>
          <Badge><Swatch color="#b6cfa7" />🧘 Health</Badge>
          <span>›</span>
          <span style={{ color: 'var(--ink)' }}>10k training plan</span>
        </div>

        {/* Title block */}
        <div style={{ marginTop: 14, display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 16 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Badge kind="dark">goal</Badge>
              <Badge>ready</Badge>
              <span className="sk-mono-tag">created 14 days ago</span>
            </div>
            <div className="sk-script" style={{ fontSize: 56, fontWeight: 700, lineHeight: 1, marginTop: 6 }}>
              10k training plan
            </div>
            <SketchyUnderline width={460} style={{ marginTop: 2 }} />
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <div className="sk-box wob-sm tight">duplicate</div>
            <div className="sk-box wob-sm tight">delete</div>
            <div className="sk-box wob-sm tight" style={{ background: 'var(--ink)', color: 'var(--paper)' }}>save</div>
          </div>
        </div>

        {/* Top stats */}
        <div style={{ marginTop: 18, display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
          <Stat label="progress" value="7 / 12" sub="58%" />
          <Stat label="rolled-up duration" value="18h" sub="∑ all subtasks" />
          <Stat label="target by" value="May 25" sub="4 wks left" />
          <Stat label="next on calendar" value="Wed · 6:30 am" sub="long run · 1h" />
        </div>

        {/* Two columns */}
        <div style={{ marginTop: 22, display: 'grid', gridTemplateColumns: '1fr 320px', gap: 20 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <Section title="Identity">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <FieldRow label="type">
                  <div style={{ display: 'flex', gap: 6 }}>
                    {[['task', false], ['plan', false], ['goal', true]].map(([k, s]) => (
                      <div key={k} className="sk-box wob-sm tight" style={{
                        padding: '4px 12px',
                        background: s ? 'var(--ink)' : 'var(--paper)',
                        color: s ? 'var(--paper)' : 'var(--ink)'
                      }}>{k}</div>
                    ))}
                  </div>
                </FieldRow>
                <FieldRow label="life area">
                  <Badge><Swatch color="#b6cfa7" />🧘 Health ▾</Badge>
                </FieldRow>
                <FieldRow label="priority">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ flex: 1, height: 8, background: 'var(--paper-2)', border: '1.5px solid var(--ink)', borderRadius: 4, position: 'relative' }}>
                      <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: '70%', background: 'var(--ink)' }} />
                    </div>
                    <span style={{ fontWeight: 700 }}>7</span>
                  </div>
                </FieldRow>
                <FieldRow label="color">
                  <div style={{ display: 'flex', gap: 4 }}>
                    {['#b6cfa7','#9bb8d6','#d6b9a2','#d6a2b9','#a2c8d6','#cccccc'].map(c => (
                      <span key={c} style={{ width: 22, height: 22, background: c, border: c === '#b6cfa7' ? '2.5px solid var(--ink)' : '1.5px solid var(--pencil)', borderRadius: 4 }} />
                    ))}
                  </div>
                </FieldRow>
              </div>
            </Section>

            <Section title="Schedule constraints">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <FieldRow label="target deadline"><Badge>May 25 ▾</Badge></FieldRow>
                <FieldRow label="energy"><Badge>high ▾</Badge></FieldRow>
                <FieldRow label="prefers"><Badge>mornings ▾</Badge><Badge>Mon · Wed · Fri ▾</Badge></FieldRow>
                <FieldRow label="avoid"><Badge>Sun ▾</Badge></FieldRow>
              </div>
              <div style={{ marginTop: 10, padding: '8px 12px', borderRadius: 6, background: 'var(--paper-2)', fontSize: 13, color: 'var(--ink-soft)' }}>
                <span className="sk-mono-tag">flex</span> &nbsp; <Check on /> let scheduler bend prefs if needed
              </div>
            </Section>

            <Section title="Subtasks · 12">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {[
                  { t: '3-mile easy', done: true, dur: '30m', sched: 'Mon 6:30a' },
                  { t: 'intervals · 400m × 6', done: true, dur: '45m', sched: 'Wed 6:30a' },
                  { t: 'long run · 5mi', done: true, dur: '1h', sched: 'Sat 7:00a' },
                  { t: '3-mile easy', done: true, dur: '30m', sched: 'Mon' },
                  { t: 'tempo · 20min', done: true, dur: '45m', sched: 'Wed' },
                  { t: 'long run · 6mi', done: true, dur: '1h 10m', sched: 'Sat' },
                  { t: '4-mile easy', done: true, dur: '40m', sched: 'Mon' },
                  { t: 'intervals · 800m × 4', done: false, dur: '50m', sched: 'Wed', upcoming: true },
                  { t: 'long run · 7mi', done: false, dur: '1h 20m', sched: 'Sat' },
                  { t: 'tempo · 25min', done: false, dur: '50m', sched: 'Wed' },
                  { t: 'long run · 8mi', done: false, dur: '1h 30m', sched: 'Sat' },
                  { t: 'taper · race day', done: false, dur: '1h', sched: 'May 25' }
                ].map((s, i) => (
                  <div key={i} style={{
                    display: 'grid',
                    gridTemplateColumns: '24px 1fr 80px 110px 32px',
                    alignItems: 'center', gap: 8,
                    padding: '6px 10px',
                    border: s.upcoming ? '2px solid var(--ink)' : '1px dashed var(--pencil-faint)',
                    borderRadius: 6,
                    background: s.upcoming ? 'var(--highlight-soft)' : 'transparent',
                    fontSize: 15
                  }}>
                    <Check on={s.done} />
                    <span style={{ textDecoration: s.done ? 'line-through' : 'none', color: s.done ? 'var(--pencil)' : 'var(--ink)' }}>{s.t}</span>
                    <span className="sk-mono-tag">{s.dur}</span>
                    <span style={{ fontSize: 13, color: 'var(--pencil)' }}>{s.sched}</span>
                    <span className="sk-mono-tag" style={{ color: 'var(--pencil)' }}>⋮⋮</span>
                  </div>
                ))}
              </div>
              <div style={{ marginTop: 8, padding: '6px 10px', fontSize: 14, color: 'var(--pencil)', border: '1.5px dashed var(--pencil-light)', borderRadius: 6 }}>+ add subtask</div>
            </Section>
          </div>

          {/* Right rail */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <Section title="Place" tight>
              <Badge>📍 Park · default</Badge>
              <div style={{ marginTop: 8, fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}>
                <Check on /> cascade to all 12 subtasks
              </div>
              <div style={{ marginTop: 6, fontSize: 12, color: 'var(--pencil)' }}>
                Travel from <i>home</i> auto-added before runs.
              </div>
            </Section>

            <Section title="Engine" tight>
              <div style={{ fontSize: 13, lineHeight: 1.4 }}>
                Next 5 subtasks fit cleanly in the next 5 weeks.
              </div>
              <div className="sk-box wob-sm tight" style={{ marginTop: 6, padding: '6px 10px', fontSize: 12, background: 'var(--paper-2)' }}>
                💡 Sat 8mi is tight with brunch — engine bumped brunch by 30m. <u style={{ color: 'var(--red-ink)' }}>review</u>
              </div>
            </Section>

            <Section title="Activity" tight>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 13 }}>
                <div>· you · created · 14d ago</div>
                <div>· engine · scheduled 7 runs · 14d</div>
                <div>· you · checked off "tempo 20m" · 4d</div>
                <div>· engine · postponed 1 run · 2d</div>
              </div>
            </Section>
          </div>
        </div>
      </div>
    </div>
  );
}

function Section({ title, tight, children }) {
  return (
    <div className="sk-box wob" style={{ padding: tight ? 12 : 16 }}>
      <div className="sk-mono-tag" style={{ marginBottom: tight ? 6 : 10 }}>{title}</div>
      {children}
    </div>
  );
}

function FieldRow({ label, children }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '4px 0' }}>
      <span style={{ width: 90, fontSize: 13, color: 'var(--pencil)' }}>{label}</span>
      <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap', flex: 1 }}>{children}</div>
    </div>
  );
}

function Stat({ label, value, sub }) {
  return (
    <div className="sk-box wob" style={{ padding: '10px 14px', background: 'var(--paper-2)' }}>
      <div className="sk-mono-tag">{label}</div>
      <div className="sk-script" style={{ fontSize: 28, fontWeight: 700, lineHeight: 1, marginTop: 2 }}>{value}</div>
      <div style={{ fontSize: 12, color: 'var(--pencil)' }}>{sub}</div>
    </div>
  );
}

// ============================================================
// C. GOAL AS BOARD — kanban of subtasks; for big goals
// ============================================================
function DetailC() {
  const cols = [
    { name: 'Backlog', items: [
      { t: 'taper · race day', dur: '1h', dl: 'May 25' },
      { t: 'long run · 9mi', dur: '1h 40m', dl: 'May 18' }
    ]},
    { name: 'Up next', items: [
      { t: 'long run · 8mi', dur: '1h 30m', dl: 'May 11', sched: 'Sat 7a' },
      { t: 'tempo · 25min', dur: '50m', dl: 'May 8', sched: 'Wed 6:30a' },
      { t: 'long run · 7mi', dur: '1h 20m', dl: 'May 4', sched: 'Sat 7a' }
    ]},
    { name: 'This week', items: [
      { t: 'intervals · 800m × 4', dur: '50m', sched: 'Wed 6:30a · today', highlight: true },
      { t: '4-mile easy', dur: '40m', sched: 'Fri 6:30a' }
    ]},
    { name: 'Done', items: [
      { t: '3-mile easy', dur: '30m', done: true },
      { t: 'tempo · 20min', dur: '45m', done: true },
      { t: 'long run · 6mi', dur: '1h 10m', done: true },
      { t: 'intervals · 400m × 6', dur: '45m', done: true },
      { t: 'long run · 5mi', dur: '1h', done: true },
      { t: '+4 more', subtle: true }
    ]}
  ];
  return (
    <div className="sk-page sk-hand">
      <AppTop active="Library" />
      <div style={{ padding: '16px 28px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Badge kind="dark">goal</Badge>
            <Badge><Swatch color="#b6cfa7" />🧘 Health</Badge>
            <Badge>ready</Badge>
          </div>
          <div className="sk-script" style={{ fontSize: 44, fontWeight: 700, lineHeight: 1, marginTop: 4 }}>
            10k training plan
          </div>
          <div style={{ display: 'flex', gap: 12, marginTop: 6, fontSize: 14, color: 'var(--pencil)' }}>
            <span>📍 Park</span>
            <span>·</span>
            <span>7 / 12 done</span>
            <span>·</span>
            <span>4 wks to May 25</span>
            <span>·</span>
            <span>∑ 18h</span>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ display: 'flex', gap: 4 }}>
            {[['details', false], ['board', true], ['timeline', false]].map(([v, sel]) => (
              <div key={v} className="sk-box wob-sm" style={{
                padding: '4px 14px', fontSize: 13,
                background: sel ? 'var(--ink)' : 'var(--paper)',
                color: sel ? 'var(--paper)' : 'var(--ink)'
              }}>{v}</div>
            ))}
          </div>
        </div>
      </div>

      {/* Progress bar */}
      <div style={{ padding: '14px 28px 0' }}>
        <div className="sk-box wob" style={{ padding: 0, height: 22, position: 'relative', overflow: 'hidden', background: 'var(--paper-2)' }}>
          <div style={{ position: 'absolute', inset: 0, width: '58%', background: 'var(--ink)' }} />
          <span className="sk-mono-tag" style={{ position: 'absolute', top: 2, right: 8, color: 'var(--ink-soft)', fontSize: 11 }}>7 / 12 · 58%</span>
        </div>
      </div>

      {/* Kanban */}
      <div style={{ padding: '18px 28px 28px', overflow: 'auto', height: 'calc(100% - 218px)' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, height: '100%' }}>
          {cols.map((c, ci) => (
            <div key={ci} className="sk-box wob" style={{
              padding: 12, background: ci === 3 ? 'var(--paper-2)' : 'var(--paper)',
              display: 'flex', flexDirection: 'column', gap: 8,
              maxHeight: '100%', overflow: 'hidden'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span className="sk-script" style={{ fontSize: 22, fontWeight: 700, lineHeight: 1 }}>{c.name}</span>
                <span className="sk-mono-tag">{c.items.filter(i => !i.subtle).length}</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, overflow: 'auto', paddingRight: 2 }}>
                {c.items.map((it, i) => (
                  it.subtle
                    ? <div key={i} style={{ fontSize: 13, color: 'var(--pencil)', textAlign: 'center', padding: 6 }}>{it.t}</div>
                    : (
                    <Card key={i} style={{
                      padding: 10,
                      background: it.highlight ? 'var(--highlight-soft)' : (it.done ? 'var(--paper-2)' : 'var(--paper)'),
                      boxShadow: it.highlight ? '3px 4px 0 var(--ink)' : 'none',
                      opacity: it.done ? 0.7 : 1
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <Check on={it.done} />
                          <span style={{
                            fontSize: 15, fontWeight: 600,
                            textDecoration: it.done ? 'line-through' : 'none',
                            color: it.done ? 'var(--pencil)' : 'var(--ink)'
                          }}>{it.t}</span>
                        </div>
                        <span className="sk-mono-tag">⋮⋮</span>
                      </div>
                      <div style={{ marginTop: 6, display: 'flex', gap: 6, alignItems: 'center' }}>
                        <Badge style={{ fontSize: 11 }}>{it.dur}</Badge>
                        {it.dl && <Badge kind="dim" style={{ fontSize: 11 }}>by {it.dl}</Badge>}
                      </div>
                      {it.sched && (
                        <div style={{ marginTop: 6, fontSize: 12, color: 'var(--red-ink)', display: 'flex', alignItems: 'center', gap: 4 }}>
                          📅 {it.sched}
                        </div>
                      )}
                    </Card>
                  )
                ))}
                {ci !== 3 && (
                  <div style={{ padding: '8px 10px', fontSize: 13, color: 'var(--pencil)', border: '1.5px dashed var(--pencil-light)', borderRadius: 6, textAlign: 'center' }}>
                    + add subtask
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ position: 'absolute', bottom: 16, right: 30 }}>
        <Anno width={260}>
          for goals with lots of subtasks (a sprint, a training plan, a renovation) — feels like a project board.
        </Anno>
      </div>
    </div>
  );
}

Object.assign(window, { DetailA, DetailB, DetailC });
