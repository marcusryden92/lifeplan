/* global React */
// Capture · Triage queue v2 — no ghost-calendar preview (lossy & costly to simulate)

function CaptureV2() {
  return (
    <Shell active="Capture">
      <div style={{ padding: '14px 22px', borderBottom: '1.5px dashed var(--pencil-light)', display: 'flex', alignItems: 'center', gap: 14, flexShrink: 0 }}>
        <div>
          <div className="sk-script" style={{ fontSize: 30, fontWeight: 700, lineHeight: 1 }}>Triage</div>
          <div className="sk-mono-tag" style={{ marginTop: 2 }}>raw notes → schedulable items · one keystroke per card</div>
        </div>
        <span style={{ flex: 1 }} />
        <Badge kind="red">7 to triage</Badge>
        <div className="sk-box wob-sm tight">⌘K capture</div>
      </div>

      <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '300px 1fr', minHeight: 0 }}>
        {/* Queue */}
        <div style={{ borderRight: '2px solid var(--ink)', padding: '14px 14px', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
            <span className="sk-script" style={{ fontSize: 22, fontWeight: 700 }}>Queue</span>
            <span className="sk-mono-tag">oldest first</span>
          </div>
          {/* quick capture inline */}
          <div className="sk-box wob-pill" style={{ marginTop: 10, padding: '7px 12px', display: 'flex', alignItems: 'center', gap: 8, background: 'var(--paper-2)' }}>
            <span style={{ color: 'var(--pencil)' }}>+</span>
            <span style={{ flex: 1, color: 'var(--pencil)', fontSize: 14 }}>jot anything…</span>
            <span className="sk-mono-tag">↵</span>
          </div>
          <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 6, overflow: 'auto', paddingRight: 4 }}>
            {[
              { t: 'tax stuff — schedule with accountant', age: '1d', sel: true },
              { t: 'read paper Linda sent', age: '2d' },
              { t: 'plant the basil', age: '3h' },
              { t: 'birthday gift for sam', age: '1h' },
              { t: 'finish Q4 strategy doc', age: '14m' },
              { t: 'call dentist about crown', age: '2m' },
              { t: 'check garage door', age: '8s' }
            ].map((q, i) => (
              <div key={i} className="sk-box wob-sm" style={{
                padding: '8px 10px',
                background: q.sel ? 'var(--ink)' : 'var(--paper)',
                color: q.sel ? 'var(--paper)' : 'var(--ink)'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontSize: 14, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>{q.t}</span>
                  <span className="sk-mono-tag" style={{ color: q.sel ? 'var(--paper)' : 'var(--pencil)', fontSize: 10 }}>{q.age}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Triage card */}
        <div style={{ padding: '28px 56px', overflow: 'auto', background: 'var(--paper-2)' }}>
          <div className="sk-mono-tag" style={{ marginBottom: 8 }}>1 of 7 · captured 1 day ago</div>

          <Card style={{ padding: 28, boxShadow: '6px 8px 0 var(--ink)', background: 'var(--paper)' }}>
            <div className="sk-script" style={{ fontSize: 38, lineHeight: 1.05, fontWeight: 700 }}>
              tax stuff — schedule with accountant
            </div>
            <SketchyUnderline width={420} style={{ marginTop: 4 }} />

            <div style={{ marginTop: 22, display: 'flex', gap: 8 }}>
              {[
                { k: 'task', sub: 'scheduler picks slot', sel: true, hint: '1' },
                { k: 'plan', sub: 'fixed time', hint: '2' },
                { k: 'goal', sub: 'holds subtasks', hint: '3' },
                { k: 'trash', sub: 'not worth doing', hint: 'x', danger: true }
              ].map((t, i) => (
                <div key={t.k} className="sk-box wob-sm" style={{
                  flex: 1, padding: '12px 10px', textAlign: 'center',
                  background: t.sel ? 'var(--ink)' : 'var(--paper)',
                  color: t.sel ? 'var(--paper)' : (t.danger ? 'var(--red-ink)' : 'var(--ink)'),
                  borderColor: t.danger ? 'var(--red-ink)' : 'var(--ink)'
                }}>
                  <div className="sk-script" style={{ fontSize: 24, fontWeight: 700, lineHeight: 1 }}>{t.k}</div>
                  <div style={{ fontSize: 11, opacity: 0.7, marginTop: 3 }}>{t.sub}</div>
                  <div className="sk-mono-tag" style={{ fontSize: 9, marginTop: 4 }}>key · {t.hint}</div>
                </div>
              ))}
            </div>

            <div style={{ marginTop: 18, display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
              <div className="sk-box wob-sm" style={{ padding: '8px 10px' }}>
                <span className="sk-mono-tag">duration</span>
                <div className="sk-script" style={{ fontSize: 26, fontWeight: 700, lineHeight: 1 }}>1h 0m</div>
              </div>
              <div className="sk-box wob-sm" style={{ padding: '8px 10px' }}>
                <span className="sk-mono-tag">deadline</span>
                <div className="sk-script" style={{ fontSize: 26, fontWeight: 700, lineHeight: 1 }}>Apr 15</div>
              </div>
              <div className="sk-box wob-sm" style={{ padding: '8px 10px' }}>
                <span className="sk-mono-tag">priority</span>
                <div className="sk-script" style={{ fontSize: 26, fontWeight: 700, lineHeight: 1 }}>7 <span style={{ fontSize: 14, color: 'var(--pencil)', fontWeight: 400 }}>/10</span></div>
              </div>
            </div>

            <div style={{ marginTop: 14, display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
              <span style={{ color: 'var(--pencil)', width: 70 }}>area</span>
              <Badge><Swatch color="#d6cea2" /> 💰 Finance</Badge>
              <span className="sk-mono-tag">change ▾</span>
            </div>
            <div style={{ marginTop: 8, display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
              <span style={{ color: 'var(--pencil)', width: 70 }}>where</span>
              <Badge>📍 Home</Badge>
              <span className="sk-mono-tag" style={{ color: 'var(--pencil)' }}>inherited from Finance</span>
            </div>

            {/* Context — what RULES will apply (no calendar simulation needed) */}
            <div style={{ marginTop: 18, padding: '10px 14px', background: 'var(--paper-2)', borderRadius: 8, border: '1.5px dashed var(--pencil-light)' }}>
              <div className="sk-mono-tag" style={{ marginBottom: 4 }}>rules that will apply</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 4 }}>
                <Badge style={{ fontSize: 11 }}>finance window · Mon–Fri 6–9 pm</Badge>
                <Badge kind="dim" style={{ fontSize: 11 }}>strict</Badge>
                <Badge style={{ fontSize: 11 }}>buffer · 10m between events</Badge>
              </div>
              <div style={{ marginTop: 6, fontSize: 12.5, color: 'var(--pencil)', lineHeight: 1.3 }}>
                scheduler will find the earliest slot inside the Finance window before Apr 15. exact slot shown on calendar after triage.
              </div>
            </div>
          </Card>

          {/* actions */}
          <div style={{ marginTop: 18, display: 'flex', gap: 10, alignItems: 'center' }}>
            <div className="sk-box wob-sm tight" style={{ padding: '6px 14px' }}>← skip · ⌘[</div>
            <div className="sk-box wob-sm tight" style={{ padding: '6px 14px' }}>save without scheduling</div>
            <span style={{ flex: 1 }} />
            <div className="sk-box wob-sm tight" style={{ padding: '6px 14px', background: 'var(--ink)', color: 'var(--paper)' }}>schedule it · ↵</div>
          </div>
          <div className="sk-mono-tag" style={{ marginTop: 10, color: 'var(--pencil)' }}>
            ↵ enter to confirm · ⌘← undo · esc exit · 1 / 2 / 3 / x switches type
          </div>
        </div>
      </div>
    </Shell>
  );
}

window.CaptureV2 = CaptureV2;
