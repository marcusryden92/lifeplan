/* global React, TODAY, WEEK, GOAL */
// Pulse — bold graphic energetic · Geist (heavier) · vivid orange-red accent

const pulseTokens = (dark) => dark ? {
  bg: '#000000',
  surface: '#0c0c0d',
  surface2: '#161617',
  border: '#222226',
  borderHi: '#383840',
  text: '#ffffff',
  text2: '#b3b3b8',
  text3: '#76767c',
  text4: '#444448',
  accent: '#ff3e00',
  accentText: '#ff3e00',
  accentBg: 'rgba(255,62,0,0.15)',
  accentBg2: 'rgba(255,62,0,0.08)',
  area: { career: '#5b9eff', health: '#27d97b', home: '#ff9c1f', growth: '#a87cff', rel: '#ff5d8f', finance: '#ffd84d' },
  danger: '#ff3e00', warn: '#ffae00', success: '#27d97b',
  hardShadow: '4px 4px 0 #000',
  hardShadowAccent: '4px 4px 0 #ff3e00'
} : {
  bg: '#ffffff',
  surface: '#ffffff',
  surface2: '#f4f4f4',
  border: '#e7e7e7',
  borderHi: '#1a1a1a',
  text: '#0a0a0a',
  text2: '#525258',
  text3: '#8e8e93',
  text4: '#c0c0c5',
  accent: '#ff3e00',
  accentText: '#ff3e00',
  accentBg: 'rgba(255,62,0,0.10)',
  accentBg2: 'rgba(255,62,0,0.05)',
  area: { career: '#2563eb', health: '#16a34a', home: '#ea580c', growth: '#7c3aed', rel: '#db2777', finance: '#ca8a04' },
  danger: '#ff3e00', warn: '#d97706', success: '#16a34a',
  hardShadow: '4px 4px 0 #0a0a0a',
  hardShadowAccent: '4px 4px 0 #ff3e00'
};

const PULSE_UI = "Geist, -apple-system, sans-serif";

function PNav({ t, active }) {
  const items = [
    ['Today', '◐'], ['Library', '▤'], ['Calendar', '▦'], ['Areas', '✦'], ['Places', '◉']
  ];
  return (
    <div style={{
      width: 80, flexShrink: 0,
      borderRight: `2px solid ${t.borderHi}`,
      background: t.bg,
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      padding: '20px 0', gap: 6,
      fontFamily: PULSE_UI
    }}>
      <div style={{
        width: 44, height: 44, borderRadius: 12,
        background: t.accent, color: '#fff',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 22, fontWeight: 700, marginBottom: 10,
        boxShadow: t.hardShadow
      }}>C</div>
      {items.map(([k, icon]) => {
        const sel = k === active;
        return (
          <div key={k} title={k} style={{
            width: 52, height: 52, borderRadius: 10,
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            background: sel ? t.text : 'transparent',
            color: sel ? t.bg : t.text2,
            border: sel ? `2px solid ${t.borderHi}` : '2px solid transparent',
            cursor: 'pointer'
          }}>
            <span style={{ fontSize: 18, lineHeight: 1 }}>{icon}</span>
            <span style={{ fontSize: 9, marginTop: 4, fontWeight: 600, letterSpacing: 0.5, textTransform: 'uppercase' }}>{k.slice(0,4)}</span>
          </div>
        );
      })}
      <div style={{ flex: 1 }} />
      <div style={{
        width: 44, height: 44, borderRadius: '50%',
        background: t.surface2, border: `2px solid ${t.borderHi}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 14, fontWeight: 700, color: t.text2
      }}>A</div>
    </div>
  );
}

function PCard({ t, children, style = {}, padding = 24, accent }) {
  return (
    <div style={{
      background: t.surface,
      border: `2px solid ${accent ? t.accent : t.borderHi}`,
      borderRadius: 14,
      padding,
      boxShadow: accent ? t.hardShadowAccent : t.hardShadow,
      ...style
    }}>{children}</div>
  );
}

function PChip({ t, children, accent, style = {} }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      padding: '4px 10px',
      borderRadius: 999,
      background: accent ? t.accent : t.surface2,
      color: accent ? '#fff' : t.text,
      border: accent ? `2px solid ${t.accent}` : `2px solid ${t.borderHi}`,
      fontSize: 11.5, fontWeight: 600,
      letterSpacing: -0.1,
      ...style
    }}>{children}</span>
  );
}

function PDot({ color, size = 10 }) {
  return <span style={{ width: size, height: size, background: color, flexShrink: 0, borderRadius: 3, border: `1.5px solid #0006` }} />;
}

function PBtn({ t, children, primary, style = {} }) {
  return (
    <button style={{
      padding: '10px 18px',
      borderRadius: 10,
      background: primary ? t.accent : t.surface,
      color: primary ? '#fff' : t.text,
      border: `2px solid ${primary ? t.accent : t.borderHi}`,
      fontSize: 13, fontWeight: 700,
      fontFamily: PULSE_UI,
      letterSpacing: -0.1,
      cursor: 'pointer',
      boxShadow: t.hardShadow,
      ...style
    }}>{children}</button>
  );
}

// ─────────────────────────────────────────────────────────────
// TODAY
// ─────────────────────────────────────────────────────────────
function PulseToday({ dark = false }) {
  const t = pulseTokens(dark);
  return (
    <div className="tc" style={{ background: t.bg, color: t.text, fontFamily: PULSE_UI }}>
      <div style={{ flex: 1, display: 'flex', minHeight: 0 }}>
        <PNav t={t} active="Today" />
        <div style={{ flex: 1, overflow: 'auto', padding: '36px 48px 48px' }} className="noscroll">
          {/* Hero */}
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 32 }}>
            <div>
              <div style={{
                display: 'inline-block',
                fontSize: 11, padding: '4px 10px',
                background: t.accent, color: '#fff',
                borderRadius: 999,
                fontWeight: 700, letterSpacing: 0.4, textTransform: 'uppercase'
              }}>{TODAY.date}</div>
              <div style={{ fontSize: 56, fontWeight: 700, letterSpacing: -2, marginTop: 12, lineHeight: 1 }}>
                Good morning,<br />Alex.
              </div>
              <div style={{ fontSize: 16, color: t.text2, marginTop: 14 }}>
                <span style={{ color: t.text, fontWeight: 600 }}>6 things</span> on today · <span style={{ color: t.text, fontWeight: 600 }}>4h 40m</span> planned · <span style={{ color: t.danger, fontWeight: 700 }}>1 OVERDUE</span>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <PBtn t={t}>⌘K capture</PBtn>
              <PBtn t={t} primary>Open calendar →</PBtn>
            </div>
          </div>

          {/* Big stats strip */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 28 }}>
            {TODAY.stats.map((s, i) => (
              <PCard key={s.label} t={t} padding={20} accent={i === 2 && s.value !== '0'}>
                <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 0.5, textTransform: 'uppercase', color: i === 2 ? t.accent : t.text3 }}>{s.label}</div>
                <div className="tnum" style={{ fontSize: 40, fontWeight: 700, letterSpacing: -1.5, marginTop: 8, lineHeight: 1, color: i === 2 ? t.accent : t.text }}>{s.value}</div>
                <div style={{ fontSize: 12, color: t.text3, marginTop: 4 }}>{s.sub}</div>
              </PCard>
            ))}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 20 }}>
            {/* schedule */}
            <PCard t={t} padding={0}>
              <div style={{ padding: '20px 24px', borderBottom: `2px solid ${t.borderHi}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ fontSize: 22, fontWeight: 700, letterSpacing: -0.5 }}>Your day</div>
                <PChip t={t}>6 items</PChip>
              </div>
              <div style={{ padding: '8px 8px 12px' }}>
                {TODAY.events.map((e, i) => (
                  <div key={i} style={{
                    display: 'grid',
                    gridTemplateColumns: '78px 1fr auto',
                    gap: 16,
                    alignItems: 'center',
                    padding: '14px 18px',
                    borderRadius: 10,
                    background: e.now ? t.accent : 'transparent',
                    color: e.now ? '#fff' : t.text,
                    opacity: e.travel ? 0.5 : 1,
                    marginBottom: 2
                  }}>
                    <div className="tnum" style={{ lineHeight: 1.05 }}>
                      <div style={{ fontSize: 22, fontWeight: 700, letterSpacing: -0.5 }}>
                        {e.now ? 'NOW' : e.time}
                      </div>
                      <div style={{ fontSize: 11, marginTop: 2, opacity: 0.65, fontWeight: 600 }}>{e.dur}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: 16, fontWeight: 600 }}>{e.title}</div>
                      {!e.travel && (
                        <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 5, opacity: e.now ? 0.85 : 1 }}>
                          <PDot color={e.now ? '#fff' : t.area[e.col]} size={8} />
                          <span style={{ fontSize: 12, fontWeight: 600, color: e.now ? '#fff' : t.text2 }}>{e.area}</span>
                          {e.kind === 'plan' && <PChip t={t} style={{ fontSize: 10, padding: '2px 8px' }}>plan</PChip>}
                          {e.warn && <PChip t={t} style={{ fontSize: 10, background: `${t.warn}22`, color: t.warn, borderColor: t.warn }}>LATE</PChip>}
                          {e.overdue && <PChip t={t} style={{ fontSize: 10, background: t.danger, color: '#fff', borderColor: t.danger }}>OVERDUE</PChip>}
                        </div>
                      )}
                    </div>
                    <span style={{ fontSize: 18, fontWeight: 700, opacity: 0.6 }}>›</span>
                  </div>
                ))}
              </div>
            </PCard>

            {/* Goals */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
              <PCard t={t} padding={0}>
                <div style={{ padding: '18px 22px', borderBottom: `2px solid ${t.borderHi}` }}>
                  <div style={{ fontSize: 20, fontWeight: 700, letterSpacing: -0.4 }}>Goals in play</div>
                </div>
                <div style={{ padding: '6px 22px 18px' }}>
                  {TODAY.goals.map((g, i) => (
                    <div key={i} style={{ padding: '16px 0', borderBottom: i < TODAY.goals.length - 1 ? `2px dashed ${t.border}` : 'none' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <PDot color={t.area[g.col]} size={8} />
                        <span style={{ fontSize: 14, fontWeight: 600, flex: 1 }}>{g.name}</span>
                        <span className="tnum" style={{ fontSize: 12, color: t.text3, fontWeight: 600 }}>{g.sub}</span>
                      </div>
                      <div style={{ marginTop: 8, height: 10, background: t.surface2, border: `2px solid ${t.borderHi}`, borderRadius: 6, position: 'relative', overflow: 'hidden' }}>
                        <div style={{
                          position: 'absolute', top: -2, bottom: -2, left: -2, width: `${g.pct}%`,
                          background: t.area[g.col],
                          borderRadius: 4
                        }} />
                      </div>
                      <div style={{ fontSize: 12, color: t.text3, marginTop: 6, fontWeight: 500 }}>
                        → <span style={{ color: t.text2 }}>{g.next}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </PCard>

              <PCard t={t} padding={18} style={{ background: t.accent, color: '#fff', borderColor: t.accent }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#fff' }} />
                  <span style={{ fontSize: 13, fontWeight: 700, letterSpacing: 0.4, textTransform: 'uppercase' }}>1 engine failure</span>
                  <span style={{ marginLeft: 'auto', fontSize: 11, opacity: 0.7 }}>2m ago</span>
                </div>
                <div style={{ fontSize: 13, marginTop: 8, lineHeight: 1.5 }}>
                  Couldn't place "refactor billing service" this week. <b>Tap to see fix.</b>
                </div>
              </PCard>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// CALENDAR
// ─────────────────────────────────────────────────────────────
function PulseCalendar({ dark = false }) {
  const t = pulseTokens(dark);
  return (
    <div className="tc" style={{ background: t.bg, color: t.text, fontFamily: PULSE_UI }}>
      <div style={{ flex: 1, display: 'flex', minHeight: 0 }}>
        <PNav t={t} active="Calendar" />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
          <div style={{
            padding: '20px 28px', borderBottom: `2px solid ${t.borderHi}`,
            display: 'flex', alignItems: 'center', gap: 14, background: t.bg
          }}>
            <div style={{ fontSize: 32, fontWeight: 700, letterSpacing: -0.8 }}>{WEEK.range}</div>
            <div style={{ display: 'flex', gap: 6, marginLeft: 4 }}>
              <PBtn t={t} style={{ padding: '6px 12px' }}>‹</PBtn>
              <PBtn t={t} style={{ padding: '6px 14px' }}>Today</PBtn>
              <PBtn t={t} style={{ padding: '6px 12px' }}>›</PBtn>
            </div>
            <span style={{ flex: 1 }} />
            <PChip t={t}>filters · all areas</PChip>
            <PBtn t={t}>Templates</PBtn>
            <PBtn t={t} primary>↻ Regenerate</PBtn>
          </div>

          <div style={{ flex: 1, display: 'flex', minHeight: 0 }}>
            <div style={{ flex: 1, padding: '20px 24px 24px 28px', overflow: 'hidden' }}>
              <PCalGrid t={t} />
            </div>
            <div style={{
              width: 320, flexShrink: 0,
              borderLeft: `2px solid ${t.borderHi}`,
              padding: '20px 18px',
              overflow: 'auto', background: t.bg
            }} className="noscroll">
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                <div style={{ width: 8, height: 8, background: t.danger, borderRadius: 2 }} />
                <span style={{ fontSize: 16, fontWeight: 700, letterSpacing: -0.3 }}>Engine</span>
                <PChip t={t}>3 issues</PChip>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {WEEK.engineMsgs.map((m, i) => {
                  const c = m.tone === 'fail' ? t.danger : m.tone === 'warn' ? t.warn : t.success;
                  const isFail = m.tone === 'fail';
                  return (
                    <PCard key={i} t={t} padding={14} style={isFail ? {
                      background: t.accent, borderColor: t.accent, color: '#fff', boxShadow: t.hardShadow
                    } : {}}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{
                          fontSize: 10, padding: '3px 7px',
                          background: isFail ? '#fff' : c, color: isFail ? t.accent : (m.tone === 'info' ? '#000' : '#000'),
                          borderRadius: 6, fontWeight: 700, letterSpacing: 0.5
                        }}>{m.tag}</span>
                        <span style={{ fontSize: 13, fontWeight: 700 }}>{m.title}</span>
                      </div>
                      <div style={{ fontSize: 12, marginTop: 6, lineHeight: 1.45, opacity: isFail ? 0.9 : 1, color: isFail ? '#fff' : t.text2 }}>{m.body}</div>
                      {(m.tone === 'fail' || m.tone === 'warn') && (
                        <div style={{ marginTop: 10, display: 'flex', gap: 6 }}>
                          <span style={{
                            padding: '4px 10px', borderRadius: 999,
                            background: isFail ? '#fff' : t.accent, color: isFail ? t.accent : '#fff',
                            fontSize: 11, fontWeight: 700
                          }}>See fixes →</span>
                        </div>
                      )}
                    </PCard>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function PCalGrid({ t }) {
  const hourHeight = 44;
  return (
    <div style={{
      height: '100%', display: 'flex', flexDirection: 'column',
      background: t.surface, border: `2px solid ${t.borderHi}`,
      borderRadius: 14, overflow: 'hidden',
      boxShadow: t.hardShadow
    }}>
      <div style={{
        display: 'grid', gridTemplateColumns: '60px repeat(7, 1fr)',
        background: t.surface2, borderBottom: `2px solid ${t.borderHi}`
      }}>
        <div />
        {WEEK.days.map(d => (
          <div key={d.n} style={{
            padding: '12px 0', textAlign: 'center',
            borderLeft: `2px solid ${t.border}`,
            background: d.today ? t.accent : 'transparent',
            color: d.today ? '#fff' : t.text
          }}>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 0.5, textTransform: 'uppercase' }}>{d.d}</div>
            <div className="tnum" style={{ fontSize: 26, fontWeight: 700, marginTop: 2, letterSpacing: -0.5 }}>{d.n}</div>
          </div>
        ))}
      </div>
      <div style={{ flex: 1, overflow: 'auto', position: 'relative' }} className="noscroll">
        <div style={{
          display: 'grid', gridTemplateColumns: '60px repeat(7, 1fr)',
          gridTemplateRows: `repeat(${WEEK.hours.length}, ${hourHeight}px)`,
          position: 'relative'
        }}>
          {WEEK.hours.map((h, ri) => (
            <React.Fragment key={h}>
              <div className="tnum" style={{
                gridRow: ri+1, gridColumn: 1,
                padding: '4px 8px',
                fontSize: 11, color: t.text3, fontWeight: 600,
                borderTop: ri ? `1px solid ${t.border}` : 'none'
              }}>{h}:00</div>
              {WEEK.days.map((_, ci) => (
                <div key={ci} style={{
                  gridRow: ri+1, gridColumn: ci+2,
                  borderTop: ri ? `1px solid ${t.border}` : 'none',
                  borderLeft: `1px solid ${t.border}`
                }} />
              ))}
            </React.Fragment>
          ))}

          {WEEK.strict.map((s, i) => {
            const top = (s.start - 7) * hourHeight;
            const height = (s.end - s.start) * hourHeight;
            return (
              <div key={i} style={{
                position: 'absolute',
                left: `calc(60px + (100% - 60px) * ${s.day} / 7)`,
                width: `calc((100% - 60px) / 7)`,
                top, height,
                background: `${t.area[s.kind]}10`,
                borderLeft: `2px solid ${t.area[s.kind]}`,
                pointerEvents: 'none'
              }} />
            );
          })}

          {WEEK.events.map((e, i) => {
            const top = (e.start - 7) * hourHeight + 2;
            const height = (e.end - e.start) * hourHeight - 4;
            const color = e.col ? t.area[e.col] : t.text3;
            const isPlan = e.kind === 'plan';
            const isTmpl = e.kind === 'tmpl';
            return (
              <div key={i} style={{
                position: 'absolute',
                left: `calc(60px + (100% - 60px) * ${e.day} / 7 + 3px)`,
                width: `calc((100% - 60px) / 7 - 6px)`,
                top, height,
                background: e.travel ? 'transparent' : (isPlan ? color : `${color}26`),
                color: e.travel ? t.text3 : (isPlan ? '#fff' : color),
                border: e.travel ? `2px dashed ${t.border}` : `2px solid ${e.warn ? t.warn : color}`,
                borderRadius: 6,
                padding: '4px 7px',
                fontSize: 12,
                fontWeight: 600,
                lineHeight: 1.2,
                overflow: 'hidden',
                opacity: isTmpl ? 0.5 : 1,
                boxShadow: e.current ? `3px 3px 0 ${color}` : 'none'
              }}>
                <div>{e.title}</div>
                {height > 36 && !e.travel && !isTmpl && (
                  <div className="tnum" style={{ fontSize: 10, marginTop: 2, opacity: 0.75, fontWeight: 600 }}>
                    {fmtP(e.start)}–{fmtP(e.end)}
                  </div>
                )}
              </div>
            );
          })}

          <div style={{
            position: 'absolute',
            left: `calc(60px + (100% - 60px) * 2 / 7)`,
            width: `calc((100% - 60px) / 7)`,
            top: (9.6 - 7) * hourHeight,
            height: 2,
            background: t.accent,
            zIndex: 5
          }}>
            <span style={{
              position: 'absolute', left: -8, top: -5,
              padding: '2px 6px',
              background: t.accent, color: '#fff',
              fontSize: 9, fontWeight: 700,
              borderRadius: 4,
              fontFamily: PULSE_UI
            }}>09:36</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function fmtP(h) {
  const hh = Math.floor(h);
  const mm = Math.round((h - hh) * 60);
  return `${hh}:${mm.toString().padStart(2,'0')}`;
}

// ─────────────────────────────────────────────────────────────
// GOAL DETAIL
// ─────────────────────────────────────────────────────────────
function PulseGoal({ dark = false }) {
  const t = pulseTokens(dark);
  const g = GOAL;
  return (
    <div className="tc" style={{ background: t.bg, color: t.text, fontFamily: PULSE_UI }}>
      <div style={{ flex: 1, display: 'flex', minHeight: 0 }}>
        <PNav t={t} active="Library" />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={{
            padding: '14px 32px', borderBottom: `2px solid ${t.borderHi}`,
            display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, color: t.text2
          }}>
            <span style={{ fontWeight: 600 }}>Library</span>
            <span style={{ color: t.text4 }}>/</span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontWeight: 600 }}>
              <PDot color={t.area[g.col]} size={8} /> {g.area}
            </span>
            <span style={{ color: t.text4 }}>/</span>
            <span style={{ color: t.text, fontWeight: 700 }}>{g.title}</span>
          </div>

          <div style={{ flex: 1, overflow: 'auto', padding: '36px 44px 44px' }} className="noscroll">
            <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 24 }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <PChip t={t} accent>GOAL</PChip>
                  <PChip t={t}><PDot color={t.area[g.col]} size={6} /> {g.area}</PChip>
                  <PChip t={t}>In progress</PChip>
                </div>
                <div style={{ fontSize: 64, fontWeight: 700, letterSpacing: -2, marginTop: 14, lineHeight: 0.98 }}>
                  10k training<br />plan.
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <PBtn t={t}>Duplicate</PBtn>
                <PBtn t={t}>Delete</PBtn>
                <PBtn t={t} primary>Save</PBtn>
              </div>
            </div>

            {/* Big progress block */}
            <div style={{
              marginTop: 28,
              background: t.text,
              color: t.bg,
              border: `2px solid ${t.borderHi}`,
              borderRadius: 14,
              padding: '28px 32px',
              boxShadow: t.hardShadowAccent,
              display: 'grid', gridTemplateColumns: 'auto 1fr auto', gap: 24, alignItems: 'center'
            }}>
              <div>
                <div className="tnum" style={{ fontSize: 80, fontWeight: 700, letterSpacing: -3.5, lineHeight: 0.95 }}>{g.pct}<span style={{ fontSize: 40, opacity: 0.7 }}>%</span></div>
                <div style={{ fontSize: 12, fontWeight: 600, marginTop: 4, opacity: 0.6, letterSpacing: 0.5, textTransform: 'uppercase' }}>complete</div>
              </div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, opacity: 0.6, letterSpacing: 0.5, textTransform: 'uppercase' }}>{g.done} of {g.total} subtasks</div>
                <div style={{ marginTop: 10, height: 14, background: 'rgba(255,255,255,0.15)', borderRadius: 8, position: 'relative', overflow: 'hidden' }}>
                  <div style={{
                    position: 'absolute', inset: 0,
                    width: `${g.pct}%`,
                    background: t.accent,
                    borderRadius: 8
                  }} />
                  {Array.from({ length: g.total - 1 }).map((_, i) => (
                    <span key={i} style={{
                      position: 'absolute', top: 0, bottom: 0,
                      left: `${((i+1)/g.total)*100}%`,
                      width: 2, background: t.text, opacity: 0.4
                    }} />
                  ))}
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 10, fontSize: 12, opacity: 0.7 }}>
                  <span>started 14 days ago</span>
                  <span>5 subtasks queued · 4 weeks left</span>
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 13, fontWeight: 600, opacity: 0.6, letterSpacing: 0.5, textTransform: 'uppercase' }}>race day</div>
                <div className="tnum" style={{ fontSize: 32, fontWeight: 700, letterSpacing: -1, marginTop: 6 }}>{g.dl}</div>
              </div>
            </div>

            {/* tabs */}
            <div style={{ display: 'flex', gap: 8, marginTop: 28 }}>
              {['Overview','Schedule','Subtasks','Activity'].map((tab, i) => (
                <div key={tab} style={{
                  padding: '10px 18px',
                  borderRadius: 999,
                  border: `2px solid ${t.borderHi}`,
                  background: i === 0 ? t.text : 'transparent',
                  color: i === 0 ? t.bg : t.text,
                  fontSize: 13, fontWeight: 700,
                  display: 'inline-flex', alignItems: 'center', gap: 6
                }}>
                  <span>{tab}</span>
                  {tab === 'Subtasks' && <span style={{ fontSize: 10, opacity: 0.6 }}>12</span>}
                </div>
              ))}
            </div>

            {/* body */}
            <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: 22, marginTop: 22 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                <PCard t={t} padding={0}>
                  <div style={{ padding: '18px 22px', borderBottom: `2px solid ${t.borderHi}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ fontSize: 18, fontWeight: 700, letterSpacing: -0.4 }}>Subtasks</div>
                    <PChip t={t}>all 12 →</PChip>
                  </div>
                  <div>
                    {g.subtasks.slice(0, 6).map((s, i) => <PSubRow t={t} s={s} key={i} />)}
                  </div>
                </PCard>

                <PCard t={t} padding={0}>
                  <div style={{ padding: '18px 22px', borderBottom: `2px solid ${t.borderHi}`, fontSize: 18, fontWeight: 700, letterSpacing: -0.4 }}>Identity</div>
                  <div style={{ padding: '18px 22px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px 28px' }}>
                    <PField t={t} k="TYPE" v={<PChip t={t} accent>GOAL</PChip>} />
                    <PField t={t} k="AREA" v={<PChip t={t}><PDot color={t.area[g.col]} size={6} /> {g.area}</PChip>} />
                    <PField t={t} k="PRIORITY" v={
                      <div className="tnum" style={{ fontSize: 32, fontWeight: 700, letterSpacing: -1 }}>{g.priority}<span style={{ fontSize: 18, opacity: 0.5 }}>/10</span></div>
                    } />
                    <PField t={t} k="DURATION" v={
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                        <span className="tnum" style={{ fontSize: 32, fontWeight: 700, letterSpacing: -1 }}>{g.totalDur}</span>
                        <span style={{ fontSize: 11, color: t.text3, fontWeight: 600 }}>rolled-up</span>
                      </div>
                    } />
                    <PField t={t} k="PLACE" v={<><PChip t={t}>📍 {g.place}</PChip><span style={{ fontSize: 10, color: t.text3, marginLeft: 6, fontWeight: 600 }}>INHERITED</span></>} />
                    <PField t={t} k="DEADLINE" v={<span className="tnum" style={{ fontSize: 22, fontWeight: 700, letterSpacing: -0.5 }}>{g.dl}</span>} />
                  </div>
                </PCard>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                <PCard t={t} padding={22} accent style={{ background: t.accentBg }}>
                  <div style={{ fontSize: 11, color: t.accent, fontWeight: 700, letterSpacing: 0.5, textTransform: 'uppercase' }}>Next up</div>
                  <div style={{ fontSize: 28, fontWeight: 700, marginTop: 8, letterSpacing: -0.7 }}>{g.next.day} · {g.next.time}</div>
                  <div style={{ fontSize: 14, color: t.text2, marginTop: 4, fontWeight: 500 }}>{g.next.title} · {g.next.dur}</div>
                  <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
                    <PBtn t={t} primary style={{ padding: '8px 14px', fontSize: 12 }}>Open in calendar</PBtn>
                    <PBtn t={t} style={{ padding: '8px 14px', fontSize: 12 }}>Reschedule</PBtn>
                  </div>
                </PCard>

                <PCard t={t} padding={18}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{
                      width: 26, height: 26, borderRadius: 8,
                      background: t.accent, color: '#fff',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 14, fontWeight: 700
                    }}>✦</span>
                    <span style={{ fontSize: 15, fontWeight: 700 }}>AI helper</span>
                  </div>
                  <div style={{
                    marginTop: 12, padding: '10px 14px',
                    background: t.surface2, border: `2px solid ${t.borderHi}`,
                    borderRadius: 10,
                    fontSize: 13, fontWeight: 500, color: t.text2
                  }}>tighten last 2 weeks · add taper</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 10 }}>
                    {['estimate', 'split', 'tighten', 'add taper'].map(c => (
                      <PChip t={t} key={c}>✦ {c}</PChip>
                    ))}
                  </div>
                </PCard>

                <PCard t={t} padding={18}>
                  <div style={{ fontSize: 11, color: t.text3, fontWeight: 700, letterSpacing: 0.5, textTransform: 'uppercase' }}>Why these subtasks</div>
                  <div style={{ fontSize: 13, color: t.text2, marginTop: 8, lineHeight: 1.5, fontWeight: 500 }}>{g.why}</div>
                </PCard>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function PSubRow({ t, s }) {
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: '24px 1fr auto auto',
      gap: 14, alignItems: 'center',
      padding: '14px 22px',
      borderTop: `1px solid ${t.border}`,
      background: s.current ? t.accentBg : 'transparent'
    }}>
      <div style={{
        width: 20, height: 20, borderRadius: 6,
        border: `2px solid ${s.done ? t.success : t.borderHi}`,
        background: s.done ? t.success : 'transparent',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 12, color: '#fff', fontWeight: 700
      }}>{s.done && '✓'}</div>
      <span style={{
        fontSize: 14.5, fontWeight: s.current ? 700 : 500,
        color: s.done ? t.text3 : t.text,
        textDecoration: s.done ? 'line-through' : 'none'
      }}>{s.t}</span>
      <span className="tnum" style={{ fontSize: 12, color: t.text3, fontWeight: 600 }}>{s.dur}</span>
      <span style={{ fontSize: 12, color: s.current ? t.accent : t.text3, fontWeight: 700 }}>{s.sched || s.dl}</span>
    </div>
  );
}

function PField({ t, k, v }) {
  return (
    <div>
      <div style={{ fontSize: 10, color: t.text3, fontWeight: 700, letterSpacing: 0.5, marginBottom: 6 }}>{k}</div>
      <div>{v}</div>
    </div>
  );
}

window.PulseToday = PulseToday;
window.PulseCalendar = PulseCalendar;
window.PulseGoal = PulseGoal;
