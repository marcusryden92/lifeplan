/* global React */
// Today dashboard

function TodayDashboard() {
  const todays = [
    { time: '9:00', t: 'Q4 strategy doc · deep work', dur: '2h 30m', area: 'Career', col: '#9bb8d6', done: false, now: true },
    { time: '11:45', t: '1:1 with Ana', dur: '45m', area: 'Career', col: '#9bb8d6', plan: true },
    { time: '12:45', t: '🚗 office → home', dur: '20m', area: 'travel', col: '#cccccc', travel: true },
    { time: '14:00', t: 'Plant basil', dur: '15m', area: 'Home', col: '#d6b9a2', warn: true },
    { time: '14:30', t: 'intervals · 800m × 4', dur: '50m', area: 'Health', col: '#b6cfa7' },
    { time: '17:00', t: 'Submit expenses', dur: '20m', area: 'Career', col: '#9bb8d6', overdue: true }
  ];
  const goals = [
    { name: '10k training plan', area: 'Health', col: '#b6cfa7', pct: 58, sub: '7 / 12', next: 'intervals · today 2:30p', dl: 'May 25' },
    { name: 'Hiring panel — back-end', area: 'Career', col: '#9bb8d6', pct: 40, sub: '2 / 5', next: 'screen 3 candidates · Thu', dl: 'next sprint' },
    { name: 'Spanish · 30 day', area: 'Growth', col: '#a2c8d6', pct: 40, sub: '12 / 30', next: '15m drill · tonight', dl: 'May 10' },
    { name: 'Annual reflection', area: 'Growth', col: '#a2c8d6', pct: 15, sub: 'goal block', next: '—', dl: 'Apr 30' }
  ];
  return (
    <Shell active="Today">
      <div style={{ padding: '24px 32px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexShrink: 0 }}>
        <div>
          <div className="sk-mono-tag">wednesday · apr 10</div>
          <div className="sk-script" style={{ fontSize: 48, fontWeight: 700, lineHeight: 1, marginTop: 2 }}>Good morning, Alex</div>
          <div style={{ fontSize: 16, color: 'var(--pencil)', marginTop: 6 }}>
            6 things on today · 4h 40m planned work · 1 overdue ·
            <span style={{ color: 'var(--red-ink)', marginLeft: 4 }}>4 in inbox to triage</span>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <div className="sk-box wob-sm tight">⌘K capture</div>
          <div className="sk-box wob-sm tight">triage 4 →</div>
          <div className="sk-box wob-sm tight" style={{ background: 'var(--ink)', color: 'var(--paper)' }}>open calendar →</div>
        </div>
      </div>

      <div style={{ padding: '20px 32px 32px', overflow: 'hidden', display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 24, flex: 1, minHeight: 0 }}>
        {/* LEFT — today's schedule */}
        <div className="sk-box wob" style={{ padding: 18, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
            <span className="sk-script" style={{ fontSize: 28, fontWeight: 700 }}>What to do today</span>
            <span className="sk-mono-tag">in scheduler order</span>
          </div>
          <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 8, overflow: 'auto', paddingRight: 4 }}>
            {todays.map((t, i) => (
              <div key={i} style={{
                display: 'grid', gridTemplateColumns: '24px 56px 1fr auto', alignItems: 'center', gap: 10,
                padding: '10px 12px',
                border: t.now ? '2px solid var(--ink)' : '1.5px dashed var(--pencil-light)',
                borderRadius: 8,
                background: t.now ? 'var(--highlight-soft)' : (t.travel ? 'transparent' : 'var(--paper)'),
                opacity: t.travel ? 0.7 : 1
              }}>
                <Check on={t.done} />
                <div>
                  <div className="sk-mono-tag" style={{ fontSize: 11, color: t.now ? 'var(--red-ink)' : 'var(--pencil)' }}>
                    {t.now ? 'NOW' : t.time}
                  </div>
                  <div className="sk-mono-tag" style={{ fontSize: 10, color: 'var(--pencil)' }}>{t.dur}</div>
                </div>
                <div>
                  <div style={{ fontSize: 16, fontWeight: t.now ? 700 : 500, lineHeight: 1.1 }}>{t.t}</div>
                  <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
                    {!t.travel && <Badge style={{ fontSize: 10, padding: '2px 7px' }}><Swatch color={t.col} /> {t.area}</Badge>}
                    {t.plan && <Badge style={{ fontSize: 10, padding: '2px 7px' }}>plan</Badge>}
                    {t.warn && <Badge kind="red" style={{ fontSize: 10, padding: '2px 7px' }}>scheduled past deadline</Badge>}
                    {t.overdue && <Badge kind="red" style={{ fontSize: 10, padding: '2px 7px' }}>overdue</Badge>}
                  </div>
                </div>
                <span className="sk-mono-tag" style={{ color: 'var(--pencil)' }}>···</span>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 'auto', paddingTop: 10, borderTop: '1.5px dashed var(--pencil-light)', display: 'flex', justifyContent: 'space-between', fontSize: 13, color: 'var(--pencil)' }}>
            <span>+ add to today</span>
            <span>full week →</span>
          </div>
        </div>

        {/* RIGHT — priority goals & quick stats */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, overflow: 'hidden' }}>
          {/* Priority goals */}
          <div className="sk-box wob" style={{ padding: 18, display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
              <span className="sk-script" style={{ fontSize: 26, fontWeight: 700 }}>Priority goals</span>
              <span className="sk-mono-tag">progress · next step</span>
            </div>
            <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 10, overflow: 'auto', paddingRight: 4 }}>
              {goals.map((g, i) => (
                <div key={i} className="sk-box wob-sm" style={{ padding: '10px 12px', background: 'var(--paper)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Swatch color={g.col} />
                    <span style={{ fontSize: 16, fontWeight: 700, flex: 1 }}>{g.name}</span>
                    <span className="sk-mono-tag">by {g.dl}</span>
                  </div>
                  <div style={{ marginTop: 8, height: 12, border: '1.5px solid var(--ink)', borderRadius: 6, overflow: 'hidden', background: 'var(--paper-2)', position: 'relative' }}>
                    <div style={{ position: 'absolute', inset: 0, width: `${g.pct}%`, background: 'var(--ink)' }} />
                    <span className="sk-mono-tag" style={{ position: 'absolute', right: 6, top: -1, fontSize: 9, color: g.pct > 55 ? 'var(--paper)' : 'var(--ink)' }}>{g.sub} · {g.pct}%</span>
                  </div>
                  <div style={{ marginTop: 6, display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--pencil)' }}>
                    <span>→ next:</span>
                    <span style={{ color: 'var(--ink)' }}>{g.next}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Stats strip */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
            <Stat label="this week" value="22 / 31" sub="71% scheduled" />
            <Stat label="overdue" value="2" sub="across 2 areas" />
            <Stat label="streak" value="11 d" sub="goals on track" />
          </div>
        </div>
      </div>
    </Shell>
  );
}

window.TodayDashboard = TodayDashboard;
