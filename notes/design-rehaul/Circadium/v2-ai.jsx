/* global React */
// AI integrations — high-level coach + granular item-level helper

// ============================================================
// HIGH-LEVEL · AI coach over the Today dashboard
// Multi-turn conversation that produces draft goals
// ============================================================
function AICoachOnDashboard() {
  return (
    <Shell active="Today">
      <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 480px', minHeight: 0 }}>
        {/* faded dashboard behind */}
        <div style={{ padding: '20px 28px', opacity: 0.4, overflow: 'hidden', display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div className="sk-script" style={{ fontSize: 36, fontWeight: 700, lineHeight: 1 }}>Good morning, Alex</div>
          <div className="sk-mono-tag">wednesday · apr 10</div>
          <div className="sk-box wob" style={{ padding: 14, height: 180 }}>
            <span className="sk-mono-tag">what to do today</span>
            <Lines count={5} style={{ marginTop: 10 }} />
          </div>
          <div className="sk-box wob" style={{ padding: 14, flex: 1 }}>
            <span className="sk-mono-tag">priority goals</span>
            <Lines count={6} style={{ marginTop: 10 }} />
          </div>
        </div>

        {/* AI Coach slide-over */}
        <div style={{
          borderLeft: '2px solid var(--ink)',
          background: 'var(--paper)',
          boxShadow: '-18px 0 40px rgba(28,26,23,0.18)',
          display: 'flex', flexDirection: 'column',
          overflow: 'hidden'
        }}>
          <div style={{ padding: '14px 18px', borderBottom: '2px solid var(--ink)', display: 'flex', alignItems: 'center', gap: 10 }}>
            <span className="sk-script" style={{ fontSize: 26, fontWeight: 700, lineHeight: 1 }}>✦ Plan with AI</span>
            <Badge kind="dim" style={{ fontSize: 11 }}>session · 4 min</Badge>
            <span style={{ flex: 1 }} />
            <Glyph>×</Glyph>
          </div>

          {/* conversation */}
          <div style={{ flex: 1, overflow: 'auto', padding: '14px 18px', display: 'flex', flexDirection: 'column', gap: 12 }}>
            <Msg2 who="ai">
              I'd like to understand what you're working on this season. Pick what matters most.
            </Msg2>
            <ChipPick options={['Career growth', 'Build a habit', 'Big project', 'Health/fitness', 'Learn a skill', 'Mend a relationship']} selected={['Career growth', 'Health/fitness']} />

            <Msg2 who="ai">
              Got it. For <b>career growth</b> — what would "the next 90 days went really well" look like?
            </Msg2>
            <Msg2 who="me">
              ship the new billing service, hire one back-end engineer, get to 3 reps a week of writing
            </Msg2>

            <Msg2 who="ai">
              And on health — anything specific, or just consistency?
            </Msg2>
            <Msg2 who="me">
              run a 10k by end of may. been running 3-4mi already.
            </Msg2>

            <Msg2 who="ai">
              I'll draft 4 goals. Adjust durations / deadlines, then drag any into your library.
            </Msg2>

            {/* Draft goals */}
            <div className="sk-box wob" style={{ background: 'var(--highlight-soft)', padding: 12, marginTop: 4 }}>
              <div className="sk-mono-tag" style={{ marginBottom: 6 }}>drafted goals · 4</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {[
                  { t: 'Ship billing service v1', area: '🌅 Career', dl: 'by Jun 30', sub: '6 subtasks', col: '#9bb8d6' },
                  { t: 'Hire 1 back-end engineer', area: '🌅 Career', dl: 'by May 20', sub: '5 subtasks', col: '#9bb8d6' },
                  { t: 'Writing rhythm · 3 reps/wk', area: '🌱 Growth', dl: 'rolling', sub: '12 subtasks', col: '#a2c8d6' },
                  { t: 'Run a 10k', area: '🧘 Health', dl: 'by May 25', sub: '12 subtasks', col: '#b6cfa7', accepted: true }
                ].map((g, i) => (
                  <div key={i} className="sk-box wob-sm" style={{
                    padding: '8px 10px', background: 'var(--paper)',
                    borderColor: g.accepted ? 'var(--ink)' : 'var(--ink)',
                    boxShadow: g.accepted ? '2px 2px 0 var(--ink)' : 'none'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Swatch color={g.col} />
                      <span style={{ fontSize: 14, fontWeight: 700, flex: 1 }}>{g.t}</span>
                      {g.accepted && <Badge style={{ fontSize: 10 }}>✓ added</Badge>}
                    </div>
                    <div style={{ display: 'flex', gap: 6, marginTop: 4, alignItems: 'center', flexWrap: 'wrap' }}>
                      <Badge style={{ fontSize: 10 }}>{g.area}</Badge>
                      <Badge style={{ fontSize: 10 }}>{g.dl}</Badge>
                      <Badge kind="dim" style={{ fontSize: 10 }}>{g.sub}</Badge>
                      {!g.accepted && (
                        <>
                          <span style={{ flex: 1 }} />
                          <span className="sk-mono-tag" style={{ fontSize: 10, color: 'var(--pencil)' }}>edit</span>
                          <span className="sk-mono-tag" style={{ fontSize: 10, color: 'var(--red-ink)' }}>skip</span>
                          <span className="sk-mono-tag" style={{ fontSize: 10, color: 'var(--ink)', fontWeight: 700 }}>+ add</span>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              <div style={{ marginTop: 10, display: 'flex', gap: 6 }}>
                <div className="sk-box wob-sm tight" style={{ fontSize: 12, background: 'var(--ink)', color: 'var(--paper)' }}>add all 3 remaining</div>
                <div className="sk-box wob-sm tight" style={{ fontSize: 12 }}>regenerate</div>
              </div>
            </div>
          </div>

          {/* input */}
          <div style={{ padding: '10px 14px', borderTop: '2px solid var(--ink)', background: 'var(--paper-2)' }}>
            <div className="sk-box wob-pill" style={{ padding: '8px 14px', display: 'flex', alignItems: 'center', gap: 8, background: 'var(--paper)' }}>
              <span className="sk-script" style={{ fontSize: 20 }}>✦</span>
              <span style={{ flex: 1, color: 'var(--pencil)', fontSize: 14 }}>say more, or ask for a revision…</span>
              <span className="sk-mono-tag">↵</span>
            </div>
            <div style={{ marginTop: 6, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              <Badge kind="dim" style={{ fontSize: 11 }}>add subtasks for hiring</Badge>
              <Badge kind="dim" style={{ fontSize: 11 }}>this is too much · trim</Badge>
              <Badge kind="dim" style={{ fontSize: 11 }}>set weekly rhythm</Badge>
            </div>
          </div>
        </div>
      </div>
    </Shell>
  );
}

function Msg2({ who, children }) {
  if (who === 'ai') {
    return (
      <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
        <span style={{
          width: 26, height: 26, borderRadius: '50%',
          border: '1.5px solid var(--ink)', background: 'var(--paper-2)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontFamily: 'Caveat, cursive', fontSize: 16, fontWeight: 700,
          flexShrink: 0
        }}>✦</span>
        <div style={{
          flex: 1, padding: '8px 12px',
          background: 'var(--paper-2)',
          border: '1.5px solid var(--ink)',
          borderRadius: '4px 14px 14px 14px / 4px 12px 14px 12px',
          fontSize: 14.5, lineHeight: 1.4
        }}>{children}</div>
      </div>
    );
  }
  return (
    <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
      <div style={{
        maxWidth: '85%', padding: '8px 12px',
        background: 'var(--ink)', color: 'var(--paper)',
        borderRadius: '14px 14px 4px 14px / 12px 14px 4px 12px',
        fontSize: 14.5, lineHeight: 1.4
      }}>{children}</div>
    </div>
  );
}

function ChipPick({ options, selected = [] }) {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, paddingLeft: 34 }}>
      {options.map(o => {
        const sel = selected.includes(o);
        return (
          <span key={o} className="sk-badge" style={{
            fontSize: 12,
            background: sel ? 'var(--ink)' : 'var(--paper)',
            color: sel ? 'var(--paper)' : 'var(--ink)',
            borderColor: 'var(--ink)'
          }}>{sel ? '✓ ' : ''}{o}</span>
        );
      })}
    </div>
  );
}

// ============================================================
// GRANULAR · AI subtask helper inside item detail
// ============================================================
function ItemDetailWithAI() {
  return (
    <Shell active="Library">
      <div style={{ padding: '10px 22px', borderBottom: '1.5px dashed var(--pencil-light)', display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
        <span style={{ fontSize: 13, color: 'var(--pencil)' }}>Library</span>
        <span style={{ color: 'var(--pencil-light)' }}>›</span>
        <Badge style={{ fontSize: 11 }}><Swatch color="#9bb8d6" />🌅 Career</Badge>
        <span style={{ color: 'var(--pencil-light)' }}>›</span>
        <span style={{ fontSize: 14, fontWeight: 700 }}>Ship billing service v1</span>
        <span style={{ flex: 1 }} />
        <Badge kind="dim" style={{ fontSize: 11 }}>drafted by AI · 4m ago</Badge>
      </div>

      <div style={{ flex: 1, overflow: 'auto', padding: '20px 32px 32px', display: 'grid', gridTemplateColumns: '1fr 360px', gap: 22 }}>
        <div>
          {/* Title block */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Badge kind="dark">goal</Badge>
              <Badge><Swatch color="#9bb8d6" /> 🌅 Career</Badge>
              <Badge kind="dim">not ready · 0 subtasks</Badge>
            </div>
            <div className="sk-script" style={{ fontSize: 44, fontWeight: 700, lineHeight: 1.02, marginTop: 6 }}>
              Ship billing service v1
            </div>
            <SketchyUnderline width={360} style={{ marginTop: 2 }} />
            <div style={{ marginTop: 6, fontSize: 14, color: 'var(--pencil)', lineHeight: 1.4 }}>
              A draft from the AI coach. Add subtasks and hit "ready" to let the scheduler place it.
            </div>
          </div>

          {/* AI subtask helper — the granular bit */}
          <div className="sk-box wob" style={{ marginTop: 18, padding: 14, background: 'var(--highlight-soft)', borderWidth: 2 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span className="sk-script" style={{ fontSize: 22, fontWeight: 700, lineHeight: 1 }}>✦ AI helper</span>
              <span style={{ flex: 1 }} />
              <span className="sk-mono-tag">scoped to this goal</span>
            </div>
            <div className="sk-box wob-pill" style={{ marginTop: 8, padding: '8px 14px', display: 'flex', alignItems: 'center', gap: 8, background: 'var(--paper)' }}>
              <span style={{ flex: 1, fontSize: 14 }}>break this into a 90-day plan, 2 milestones per month, 1h sessions</span>
              <span className="sk-mono-tag">↵</span>
            </div>
            <div style={{ marginTop: 8, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              <Badge style={{ fontSize: 11 }}>✦ propose subtasks</Badge>
              <Badge style={{ fontSize: 11 }}>✦ estimate durations</Badge>
              <Badge style={{ fontSize: 11 }}>✦ split this subtask</Badge>
              <Badge style={{ fontSize: 11 }}>✦ rewrite as steps</Badge>
            </div>
          </div>

          {/* Draft subtasks */}
          <div style={{ marginTop: 18 }}>
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
              <span className="sk-script" style={{ fontSize: 24, fontWeight: 700 }}>Proposed subtasks · 6</span>
              <span className="sk-mono-tag">accept individually, or all at once</span>
            </div>
            <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 6 }}>
              {[
                { t: 'Architecture review with team', dur: '1h 30m', dl: 'this week', accepted: true },
                { t: 'Spike: payment-provider client', dur: '4h', dl: 'next week' },
                { t: 'Spike: invoice-state machine', dur: '4h', dl: 'next week' },
                { t: 'Migration plan doc', dur: '2h', dl: 'Apr 30' },
                { t: 'Soft-launch w/ shadow billing', dur: '8h', dl: 'May 20' },
                { t: 'Cutover + monitor week', dur: '6h', dl: 'Jun 15' }
              ].map((s, i) => (
                <div key={i} style={{
                  display: 'grid', gridTemplateColumns: '24px 1fr 80px 110px auto', alignItems: 'center', gap: 8,
                  padding: '8px 12px',
                  borderRadius: 6,
                  background: s.accepted ? 'var(--paper)' : 'transparent',
                  border: s.accepted ? '1.5px solid var(--ink)' : '1.5px dashed var(--pencil-light)'
                }}>
                  <Check on={s.accepted} />
                  <span style={{ fontSize: 15, color: s.accepted ? 'var(--ink)' : 'var(--ink-soft)' }}>{s.t}</span>
                  <Badge style={{ fontSize: 11 }}>{s.dur}</Badge>
                  <span style={{ fontSize: 13, color: 'var(--pencil)' }}>{s.dl}</span>
                  {s.accepted
                    ? <span className="sk-mono-tag" style={{ color: 'var(--pencil)' }}>✓ kept</span>
                    : (
                      <div style={{ display: 'flex', gap: 4 }}>
                        <span className="sk-mono-tag" style={{ fontSize: 10, color: 'var(--red-ink)' }}>skip</span>
                        <span className="sk-mono-tag" style={{ fontSize: 10, color: 'var(--ink)', fontWeight: 700 }}>+ add</span>
                      </div>
                    )
                  }
                </div>
              ))}
            </div>
            <div style={{ marginTop: 10, display: 'flex', gap: 8 }}>
              <div className="sk-box wob-sm tight" style={{ background: 'var(--ink)', color: 'var(--paper)' }}>add all 5 remaining</div>
              <div className="sk-box wob-sm tight">regenerate</div>
              <span style={{ flex: 1 }} />
              <div className="sk-box wob-sm tight">+ subtask manually</div>
            </div>
          </div>
        </div>

        {/* right rail */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <Section title="Why these subtasks?" tight>
            <div style={{ fontSize: 13, lineHeight: 1.4 }}>
              Backwards from your June 30 target. Two milestones per month. Spike-then-build pattern from your past 3 goals.
            </div>
          </Section>
          <Section title="Constraints used" tight>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 13 }}>
              <div>· Career window · Mon–Fri 9–5</div>
              <div>· avg session · 1h (your prefs)</div>
              <div>· avoid Fri pm (your prefs)</div>
            </div>
          </Section>
          <Section title="Quick tweaks" tight>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {['shorten timeline', 'add a buffer week', 'merge spikes', 'add testing phase'].map(t => (
                <div key={t} className="sk-box wob-sm tight" style={{ fontSize: 12 }}>✦ {t}</div>
              ))}
            </div>
          </Section>
        </div>
      </div>
    </Shell>
  );
}

Object.assign(window, { AICoachOnDashboard, ItemDetailWithAI });
