/* global React */
// Capture → Classify → Schedule — three directions

// ============================================================
// A. THREE PANES — Brain · Triage · Calendar (drag right →)
// ============================================================
function CaptureA() {
  const rawNotes = [
    { txt: 'call dentist about crown', age: '2m' },
    { txt: 'finish Q4 strategy doc draft', age: '14m' },
    { txt: 'birthday gift for sam', age: '1h' },
    { txt: 'plant the basil before it dies', age: '3h' },
    { txt: 'tax stuff — schedule with accountant', age: '1d' },
    { txt: 'read the paper Linda sent', age: '2d' }
  ];
  return (
    <div className="sk-page sk-hand">
      <AppTop active="Capture" right={<Badge kind="red">7 unprocessed</Badge>} />
      <div style={{ display: 'grid', gridTemplateColumns: '380px 1fr 460px', height: 'calc(100% - 56px)' }}>
        {/* LEFT — brain dump column */}
        <div style={{ borderRight: '2px solid var(--ink)', padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 10, overflow: 'hidden' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <div className="sk-script" style={{ fontSize: 28, fontWeight: 700 }}>Brain dump</div>
            <span className="sk-mono-tag">raw · unclassified</span>
          </div>
          {/* capture input */}
          <div className="sk-box wob-pill" style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 14px', background: 'var(--paper-2)' }}>
            <span style={{ color: 'var(--pencil)' }}>+</span>
            <span style={{ flex: 1, color: 'var(--pencil)' }}>what's on your mind?</span>
            <span className="sk-mono-tag">↵</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 6, overflow: 'hidden' }}>
            {rawNotes.map((n, i) => (
              <div key={i} className="sk-box wob-sm" style={{
                padding: '10px 12px', cursor: 'grab',
                background: i === 1 ? 'var(--highlight-soft)' : 'var(--paper)',
                borderStyle: i === 1 ? 'solid' : 'solid',
                boxShadow: i === 1 ? '3px 4px 0 var(--ink)' : 'none',
                transform: i === 1 ? 'translateX(8px) rotate(-1deg)' : 'none'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                  <span style={{ fontSize: 16 }}>{n.txt}</span>
                  <span className="sk-mono-tag" style={{ fontSize: 10 }}>{n.age}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* MIDDLE — triage workbench */}
        <div style={{ padding: '20px 28px', overflow: 'hidden', position: 'relative', background: 'var(--paper-2)' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginBottom: 14 }}>
            <div className="sk-script" style={{ fontSize: 32, fontWeight: 700 }}>Triage</div>
            <span className="sk-mono-tag">turn one thought into one schedulable item</span>
          </div>

          <Card style={{ background: 'var(--paper)', padding: 24, boxShadow: '5px 6px 0 var(--ink)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
              <span className="sk-mono-tag">from brain dump</span>
              <SketchyArrow length={28} />
            </div>
            <div className="sk-script" style={{ fontSize: 30, fontWeight: 700, lineHeight: 1.1 }}>
              finish Q4 strategy doc draft
            </div>
            <SketchyUnderline width={300} style={{ marginTop: 2 }} />

            {/* Type chooser */}
            <div style={{ marginTop: 20, display: 'flex', gap: 10, alignItems: 'center' }}>
              <span style={{ width: 86, color: 'var(--pencil)' }}>this is a…</span>
              {[
                { k: 'task', sel: true, sub: 'scheduler picks slot' },
                { k: 'plan', sel: false, sub: 'fixed time' },
                { k: 'goal', sel: false, sub: 'holds subtasks' }
              ].map(t => (
                <div key={t.k} className={`sk-box wob-sm`} style={{
                  padding: '8px 12px', flex: 1, background: t.sel ? 'var(--ink)' : 'var(--paper)',
                  color: t.sel ? 'var(--paper)' : 'var(--ink)'
                }}>
                  <div className="sk-script" style={{ fontSize: 22, fontWeight: 700, lineHeight: 1 }}>{t.k}</div>
                  <div style={{ fontSize: 12, opacity: 0.7, marginTop: 2 }}>{t.sub}</div>
                </div>
              ))}
            </div>

            <div style={{ marginTop: 16, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div className="sk-box wob-sm tight" style={{ padding: '8px 12px' }}>
                <div className="sk-mono-tag">duration</div>
                <div style={{ fontSize: 22, fontWeight: 700 }}>2h <span style={{ fontSize: 14, color: 'var(--pencil)', fontWeight: 400 }}>30m</span></div>
              </div>
              <div className="sk-box wob-sm tight" style={{ padding: '8px 12px' }}>
                <div className="sk-mono-tag">deadline</div>
                <div style={{ fontSize: 18, fontWeight: 700 }}>Fri · Apr 12</div>
              </div>
            </div>

            <div style={{ marginTop: 14, display: 'flex', gap: 10, alignItems: 'center' }}>
              <span style={{ width: 86, color: 'var(--pencil)' }}>life area</span>
              <Badge><Swatch color="#9bb8d6" />🌅 Career</Badge>
              <Badge kind="dim">🏠 Home</Badge>
              <Badge kind="dim">+</Badge>
            </div>
            <div style={{ marginTop: 10, display: 'flex', gap: 10, alignItems: 'center' }}>
              <span style={{ width: 86, color: 'var(--pencil)' }}>where</span>
              <Badge>📍 Office <span style={{ color: 'var(--pencil)' }}> · inherited</span></Badge>
            </div>

            <div style={{ marginTop: 22, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span className="sk-mono-tag">⌥↵ schedule  ·  esc save as note  ·  ⌘⌫ delete</span>
              <div style={{ display: 'flex', gap: 8 }}>
                <div className="sk-box wob-sm tight">save draft</div>
                <div className="sk-box wob-sm tight" style={{ background: 'var(--ink)', color: 'var(--paper)' }}>schedule it →</div>
              </div>
            </div>
          </Card>

          <Anno style={{ top: 220, left: -40, transform: 'rotate(-4deg)' }} width={170}>
            drag notes from left ↑ — fields prefill from AI guess
          </Anno>
        </div>

        {/* RIGHT — calendar preview */}
        <div style={{ borderLeft: '2px solid var(--ink)', padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 10, overflow: 'hidden', position: 'relative' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <div className="sk-script" style={{ fontSize: 26, fontWeight: 700 }}>This week →</div>
            <span className="sk-mono-tag">live preview</span>
          </div>
          <MiniCalendar highlight={{ day: 2, start: 8, end: 11, label: 'Q4 strategy' }} />
          <Anno style={{ top: 240, left: 16, transform: 'rotate(2deg)' }} width={260}>
            ghost block shows where it WOULD land. release to confirm ↓
          </Anno>
        </div>
      </div>
    </div>
  );
}

// Small calendar for preview column
function MiniCalendar({ highlight }) {
  const days = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
  const hours = [7, 9, 11, 13, 15, 17, 19];
  return (
    <div className="sk-box wob" style={{ background: 'var(--paper)', padding: 8, flex: 1, display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '28px repeat(7, 1fr)', borderBottom: '1.5px solid var(--ink)', paddingBottom: 4 }}>
        <span />
        {days.map((d, i) => (
          <span key={i} className="sk-mono-tag" style={{ textAlign: 'center', fontWeight: i === 2 ? 700 : 400, color: i === 2 ? 'var(--red-ink)' : undefined }}>{d}</span>
        ))}
      </div>
      <div style={{ position: 'relative', display: 'grid', gridTemplateColumns: '28px repeat(7, 1fr)', gridTemplateRows: `repeat(${hours.length}, 1fr)`, flex: 1, marginTop: 4 }}>
        {hours.flatMap((h, ri) => [
          <span key={`l${ri}`} className="sk-mono-tag" style={{ fontSize: 9, gridColumn: 1, gridRow: ri+1 }}>{h}</span>,
          ...Array.from({ length: 7 }).map((_, ci) => (
            <div key={`c${ri}-${ci}`} style={{
              gridColumn: ci+2, gridRow: ri+1,
              borderTop: '1px dashed var(--pencil-faint)',
              borderLeft: ci === 0 ? '1px dashed var(--pencil-faint)' : 'none',
              borderRight: '1px dashed var(--pencil-faint)'
            }} />
          ))
        ])}
        {/* sample events */}
        <div style={{ gridColumn: 2, gridRow: '2 / span 2', background: 'var(--pencil-faint)', margin: 2, padding: '4px 6px', fontSize: 10, borderRadius: 4 }}>standup</div>
        <div style={{ gridColumn: 5, gridRow: '3 / span 2', background: 'var(--pencil-faint)', margin: 2, padding: '4px 6px', fontSize: 10, borderRadius: 4 }}>1:1 ana</div>
        <div style={{ gridColumn: 7, gridRow: '4 / span 3', background: 'var(--pencil-faint)', margin: 2, padding: '4px 6px', fontSize: 10, borderRadius: 4 }}>gym</div>
        {/* hatched strict window */}
        <div className="sk-hatch-soft" style={{ gridColumn: 4, gridRow: '5 / span 3', margin: 2 }} />
        {/* the highlighted ghost */}
        <div style={{
          gridColumn: highlight.day+1, gridRow: `2 / span 3`,
          background: 'var(--red-ink-faint)',
          border: '2px dashed var(--red-ink)',
          margin: 2, padding: '4px 6px', fontSize: 11, color: 'var(--red-ink)',
          borderRadius: 4,
          fontWeight: 700
        }}>
          {highlight.label} (ghost)
        </div>
      </div>
      <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginTop: 6, fontSize: 11, color: 'var(--pencil)' }}>
        <span className="sk-hatch-soft" style={{ width: 14, height: 12, border: '1px solid var(--pencil)' }} />
        <span>strict career window</span>
        <span style={{ marginLeft: 6, width: 14, height: 12, background: 'var(--red-ink-faint)', border: '1.5px dashed var(--red-ink)' }} />
        <span>preview slot</span>
      </div>
    </div>
  );
}

// ============================================================
// B. CONVERSATIONAL COMPOSER — bottom omnibar over calendar
// ============================================================
function CaptureB() {
  return (
    <div className="sk-page sk-hand" style={{ display: 'flex', flexDirection: 'column' }}>
      <AppTop active="Calendar" />

      {/* Calendar background */}
      <div style={{ flex: 1, padding: '16px 20px 220px', overflow: 'hidden', position: 'relative' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <div className="sk-script" style={{ fontSize: 28, fontWeight: 700 }}>Week of Apr 8</div>
          <div style={{ display: 'flex', gap: 8 }}>
            <Badge>‹ prev</Badge>
            <Badge>today</Badge>
            <Badge>next ›</Badge>
          </div>
        </div>
        <FullishCalendar />

        {/* Floating composer */}
        <div style={{
          position: 'absolute', bottom: 28, left: '50%', transform: 'translateX(-50%)',
          width: 'min(820px, 92%)'
        }}>
          {/* Composer card */}
          <Card style={{
            padding: 18, background: 'var(--paper)',
            boxShadow: '0 12px 0 -6px var(--ink), 0 24px 50px rgba(28,26,23,0.15)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span className="sk-script" style={{ fontSize: 24, fontWeight: 700 }}>→</span>
              <span className="sk-hand" style={{ fontSize: 20, flex: 1 }}>
                book the dentist sometime next week, around 30 min, in the afternoon
                <span style={{ borderLeft: '2px solid var(--red-ink)', marginLeft: 2, animation: 'none' }}>&nbsp;</span>
              </span>
              <span className="sk-mono-tag">⌘K · type / talk / paste</span>
            </div>

            {/* Parsed chips */}
            <div style={{ marginTop: 12, display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
              <span className="sk-mono-tag">parsed:</span>
              <Badge>type · task</Badge>
              <Badge>title · book dentist</Badge>
              <Badge>dur · 30m</Badge>
              <Badge>deadline · Fri Apr 19</Badge>
              <Badge>prefers · afternoons</Badge>
              <Badge kind="red">life area? <span style={{ marginLeft: 4, opacity: 0.7 }}>Health ▾</span></Badge>
            </div>

            {/* Preview */}
            <div style={{ marginTop: 14, display: 'flex', gap: 12, alignItems: 'center', borderTop: '1.5px dashed var(--pencil-light)', paddingTop: 12 }}>
              <span className="sk-mono-tag">would slot at</span>
              <Badge kind="dark">Wed Apr 17 · 2:30 – 3:00 pm</Badge>
              <span className="sk-mono-tag" style={{ color: 'var(--pencil)' }}>same place as 3pm meeting</span>
              <span style={{ flex: 1 }} />
              <div className="sk-box wob-sm tight">edit</div>
              <div className="sk-box wob-sm tight" style={{ background: 'var(--ink)', color: 'var(--paper)' }}>schedule ↵</div>
            </div>
          </Card>

          {/* Hint row below */}
          <div style={{ marginTop: 10, display: 'flex', gap: 12, justifyContent: 'center', color: 'var(--pencil)', fontSize: 13 }}>
            <span>tab to edit a chip</span>
            <span>·</span>
            <span>⌥↵ park in inbox instead</span>
            <span>·</span>
            <span>shift-↵ another item</span>
          </div>
        </div>

        {/* Annotation */}
        <div style={{ position: 'absolute', bottom: 200, left: 32, transform: 'rotate(-3deg)' }}>
          <Anno width={200}>capture floats over the calendar — you SEE where it lands before you accept</Anno>
        </div>
      </div>
    </div>
  );
}

function FullishCalendar() {
  const days = ['Mon 8', 'Tue 9', 'Wed 10', 'Thu 11', 'Fri 12', 'Sat 13', 'Sun 14'];
  const hours = ['7a','9a','11a','1p','3p','5p','7p'];
  return (
    <div className="sk-box wob" style={{ flex: 1, padding: 8, background: 'var(--paper)', minHeight: 380 }}>
      <div style={{ display: 'grid', gridTemplateColumns: '50px repeat(7, 1fr)', borderBottom: '1.5px solid var(--ink)', paddingBottom: 6 }}>
        <span />
        {days.map((d,i) => (
          <span key={d} className="sk-hand" style={{ textAlign: 'center', fontWeight: i === 2 ? 700 : 400, color: i === 2 ? 'var(--red-ink)' : undefined }}>{d}</span>
        ))}
      </div>
      <div style={{ position: 'relative', display: 'grid', gridTemplateColumns: '50px repeat(7, 1fr)', gridTemplateRows: `repeat(${hours.length}, 44px)`, marginTop: 6 }}>
        {hours.flatMap((h,ri) => [
          <span key={`hl${ri}`} className="sk-mono-tag" style={{ gridRow: ri+1, gridColumn: 1 }}>{h}</span>,
          ...Array.from({length: 7}).map((_,ci) => (
            <div key={`c${ri}-${ci}`} style={{
              gridRow: ri+1, gridColumn: ci+2,
              borderTop: '1px dashed var(--pencil-faint)',
              borderLeft: ci === 0 ? '1px dashed var(--pencil-faint)' : 'none',
              borderRight: '1px dashed var(--pencil-faint)'
            }} />
          ))
        ])}
        {/* Templates / events */}
        <CalEvt col={2} row="1 / span 1" label="standup" tone="tmpl" />
        <CalEvt col={3} row="2 / span 1" label="standup" tone="tmpl" />
        <CalEvt col={4} row="1 / span 1" label="standup" tone="tmpl" />
        <CalEvt col={5} row="2 / span 1" label="standup" tone="tmpl" />
        <CalEvt col={2} row="3 / span 2" label="Q4 doc · deep work" tone="task" />
        <CalEvt col={3} row="3 / span 1" label="1:1 ana" tone="plan" />
        <CalEvt col={4} row="4 / span 1" label="🚗 office→home" tone="travel" />
        <CalEvt col={6} row="3 / span 2" label="dentist" tone="ghost" />
        <CalEvt col={5} row="6 / span 1" label="gym" tone="tmpl" />
        <CalEvt col={7} row="5 / span 2" label="brunch w/ T" tone="plan" />
        {/* strict band */}
        <div className="sk-hatch-soft" style={{ gridRow: '2 / span 4', gridColumn: 3, margin: 1, opacity: 0.7 }} />
      </div>
    </div>
  );
}

function CalEvt({ col, row, label, tone }) {
  const styles = {
    tmpl:   { background: 'var(--pencil-faint)', color: 'var(--ink)' },
    task:   { background: 'var(--paper-2)', color: 'var(--ink)', border: '1.5px solid var(--ink)' },
    plan:   { background: 'var(--ink)', color: 'var(--paper)' },
    travel: { background: 'transparent', color: 'var(--pencil)', border: '1.5px dashed var(--pencil)' },
    ghost:  { background: 'var(--red-ink-faint)', color: 'var(--red-ink)', border: '2px dashed var(--red-ink)', fontWeight: 700 }
  };
  return (
    <div style={{
      gridColumn: col, gridRow: row, margin: 2, padding: '4px 6px',
      fontSize: 12, borderRadius: 4, overflow: 'hidden', whiteSpace: 'nowrap',
      ...styles[tone]
    }}>{label}</div>
  );
}

// ============================================================
// C. TRIAGE QUEUE — one card at a time, keyboard-driven
// ============================================================
function CaptureC() {
  return (
    <div className="sk-page sk-hand">
      <AppTop active="Capture" right={<Badge kind="red">7 to triage</Badge>} />
      <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr 380px', height: 'calc(100% - 56px)' }}>
        {/* Queue list */}
        <div style={{ borderRight: '2px solid var(--ink)', padding: '14px 16px', overflow: 'hidden' }}>
          <div className="sk-script" style={{ fontSize: 24, fontWeight: 700 }}>Queue</div>
          <span className="sk-mono-tag">7 left · oldest first</span>
          <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 6 }}>
            {[
              { t: 'tax stuff — schedule with accountant', age: '1d', sel: true },
              { t: 'read paper Linda sent', age: '2d' },
              { t: 'plant the basil', age: '3h' },
              { t: 'birthday gift for sam', age: '1h' },
              { t: 'finish Q4 strategy doc', age: '14m' },
              { t: 'call dentist about crown', age: '2m' },
              { t: 'check garage door', age: '8s' }
            ].map((q, i) => (
              <div key={i} className={`sk-box wob-sm`} style={{
                padding: '8px 10px',
                background: q.sel ? 'var(--ink)' : 'var(--paper)',
                color: q.sel ? 'var(--paper)' : 'var(--ink)',
                borderColor: q.sel ? 'var(--ink)' : 'var(--ink)'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 14, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>{q.t}</span>
                  <span className="sk-mono-tag" style={{ color: q.sel ? 'var(--paper)' : 'var(--pencil)', fontSize: 10 }}>{q.age}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Center — big card */}
        <div style={{ padding: '28px 36px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'var(--paper-2)' }}>
          <div className="sk-mono-tag" style={{ marginBottom: 8 }}>1 of 7 · captured 1 day ago</div>

          <Card style={{ width: '100%', maxWidth: 540, padding: 28, boxShadow: '6px 8px 0 var(--ink)', background: 'var(--paper)' }}>
            <div className="sk-script" style={{ fontSize: 38, lineHeight: 1.05, fontWeight: 700 }}>
              tax stuff — schedule with accountant
            </div>
            <SketchyUnderline width={420} style={{ marginTop: 4 }} />

            <div style={{ marginTop: 22, display: 'flex', gap: 8 }}>
              {['task','plan','goal','trash'].map((k, i) => (
                <div key={k} className={`sk-box wob-sm`} style={{
                  flex: 1, padding: '12px 10px', textAlign: 'center',
                  background: i === 0 ? 'var(--ink)' : 'var(--paper)',
                  color: i === 0 ? 'var(--paper)' : (i === 3 ? 'var(--red-ink)' : 'var(--ink)'),
                  borderColor: i === 3 ? 'var(--red-ink)' : 'var(--ink)'
                }}>
                  <div className="sk-script" style={{ fontSize: 26, fontWeight: 700, lineHeight: 1 }}>{k}</div>
                  <div className="sk-mono-tag" style={{ fontSize: 10, color: i === 0 ? 'var(--paper)' : 'var(--pencil)', marginTop: 4 }}>
                    {['1','2','3','x'][i]}
                  </div>
                </div>
              ))}
            </div>

            <div style={{ marginTop: 22, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div className="sk-box wob-sm" style={{ padding: '8px 10px' }}>
                <span className="sk-mono-tag">duration</span>
                <div className="sk-script" style={{ fontSize: 26, fontWeight: 700, lineHeight: 1 }}>1h 0m</div>
              </div>
              <div className="sk-box wob-sm" style={{ padding: '8px 10px' }}>
                <span className="sk-mono-tag">deadline</span>
                <div className="sk-script" style={{ fontSize: 26, fontWeight: 700, lineHeight: 1 }}>Apr 15</div>
              </div>
            </div>

            <div style={{ marginTop: 14, display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
              <span style={{ color: 'var(--pencil)' }}>area</span>
              <Badge>💰 Finance</Badge>
              <Badge kind="dim">📍 Home</Badge>
              <Badge kind="dim">priority 7</Badge>
            </div>
          </Card>

          <div style={{ marginTop: 20, display: 'flex', gap: 14, alignItems: 'center' }}>
            <div className="sk-box wob-sm tight" style={{ padding: '6px 14px' }}>← skip</div>
            <div className="sk-box wob-sm tight" style={{ padding: '6px 14px', background: 'var(--ink)', color: 'var(--paper)' }}>schedule  →</div>
            <span className="sk-mono-tag">enter to confirm · ⌘← to undo · esc to exit</span>
          </div>
        </div>

        {/* Right — context */}
        <div style={{ borderLeft: '2px solid var(--ink)', padding: '14px 16px', overflow: 'hidden' }}>
          <div className="sk-script" style={{ fontSize: 24, fontWeight: 700 }}>If you schedule this…</div>
          <div className="sk-mono-tag">how it would fit</div>

          <div style={{ marginTop: 14 }}>
            <MiniCalendar highlight={{ day: 1, start: 9, end: 10, label: 'tax · accountant' }} />
          </div>

          <div style={{ marginTop: 16 }}>
            <div className="sk-mono-tag" style={{ marginBottom: 6 }}>scheduler says</div>
            <Card style={{ background: 'var(--paper-2)', padding: 10, fontSize: 14, lineHeight: 1.35 }}>
              best slot: <b>Tue 9–10am</b>. Inside your Finance window, far from your dentist appt across town. Travel-time clean.
            </Card>
          </div>

          <Anno style={{ position: 'static', marginTop: 16, transform: 'rotate(-1deg)' }} width={300}>
            triage feels like inbox-zero. one keystroke per card — fly through the backlog.
          </Anno>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { CaptureA, CaptureB, CaptureC });
