/* global React, TODAY, WEEK, GOAL */
// Atlas — Linear/terminal brutalist · Inter + JetBrains Mono · dense

const atlasTokens = (dark) => dark ? {
  bg: '#0a0a0a',
  surface: '#111111',
  surface2: '#161617',
  border: '#1d1d20',
  borderHi: '#2a2a2e',
  text: '#ededed',
  text2: '#a6a6a8',
  text3: '#6a6a6e',
  text4: '#48484c',
  accent: '#38c554',
  accentText: '#38c554',
  accentBg: 'rgba(56,197,84,0.14)',
  area: { career: '#3690e8', health: '#38c554', home: '#e88a1a', growth: '#a64ad9', rel: '#e3346b', finance: '#e6ad15' },
  danger: '#e33734', warn: '#e88a1a', success: '#38c554',
  hl: '#1a1a1c'
} : {
  bg: '#fafafa',
  surface: '#ffffff',
  surface2: '#f4f4f5',
  border: '#e7e7ea',
  borderHi: '#c9c9ce',
  text: '#0a0a0a',
  text2: '#52525b',
  text3: '#8e8e93',
  text4: '#c0c0c5',
  accent: '#2eaa46',
  accentText: '#2eaa46',
  accentBg: 'rgba(46,170,70,0.12)',
  area: { career: '#1e6fd1', health: '#2eaa46', home: '#d4730a', growth: '#8c3fcc', rel: '#cc2960', finance: '#cc961a' },
  danger: '#cc2926', warn: '#d4730a', success: '#2eaa46',
  hl: '#f4f4f5'
};

const ATLAS_UI = "Inter, -apple-system, sans-serif";
const ATLAS_MONO = "'JetBrains Mono', 'Geist Mono', monospace";

function XNav({ t, active }) {
  const items = [
    { k: 'today',    icon: '▣', sec: 'T' },
    { k: 'library',  icon: '▤', sec: 'L' },
    { k: 'calendar', icon: '▦', sec: 'C' },
    { k: 'areas',    icon: '✦', sec: 'A' },
    { k: 'places',   icon: '◉', sec: 'P' },
    { k: 'engine',   icon: '⌗', sec: 'E' }
  ];
  return (
    <div style={{
      width: 196, flexShrink: 0,
      borderRight: `1px solid ${t.border}`,
      background: t.surface,
      display: 'flex', flexDirection: 'column',
      fontFamily: ATLAS_UI
    }}>
      <div style={{
        padding: '14px 14px 16px',
        borderBottom: `1px solid ${t.border}`,
        display: 'flex', alignItems: 'center', gap: 8
      }}>
        <div style={{
          width: 22, height: 22, borderRadius: 4,
          background: t.accent,
          color: '#000', fontSize: 13, fontWeight: 700,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontFamily: ATLAS_MONO
        }}>C</div>
        <div style={{ fontWeight: 600, fontSize: 14, color: t.text, letterSpacing: -0.3 }}>Circadium</div>
        <span style={{ marginLeft: 'auto', fontSize: 10, color: t.text3, fontFamily: ATLAS_MONO }}>v0.4</span>
      </div>
      <div style={{ padding: '8px 6px', display: 'flex', flexDirection: 'column', gap: 1 }}>
        {items.map(it => {
          const sel = it.k === active;
          return (
            <div key={it.k} style={{
              padding: '6px 10px',
              display: 'flex', alignItems: 'center', gap: 10,
              borderRadius: 4,
              background: sel ? t.hl : 'transparent',
              color: sel ? t.text : t.text2,
              fontSize: 13, fontWeight: 500
            }}>
              <span style={{ fontSize: 12, color: sel ? t.accent : t.text3, width: 12 }}>{it.icon}</span>
              <span style={{ flex: 1, letterSpacing: -0.1 }}>{it.k}</span>
              <span style={{ fontSize: 10, color: t.text4, fontFamily: ATLAS_MONO }}>{it.sec}</span>
            </div>
          );
        })}
      </div>
      <div style={{ marginTop: 'auto', borderTop: `1px solid ${t.border}`, padding: '10px 12px', fontFamily: ATLAS_MONO, fontSize: 11, color: t.text3, display: 'flex', flexDirection: 'column', gap: 4 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>capture</span><span>⌘K</span></div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>search</span><span>⌘/</span></div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>regen</span><span>⇧R</span></div>
      </div>
    </div>
  );
}

function XPill({ t, children, accent, danger, style = {} }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      padding: '2px 7px',
      borderRadius: 3,
      background: accent ? t.accentBg : (danger ? `${t.danger}15` : t.hl),
      color: accent ? t.accentText : (danger ? t.danger : t.text2),
      fontSize: 11,
      fontFamily: ATLAS_MONO,
      letterSpacing: 0.2,
      border: `1px solid ${accent ? `${t.accent}33` : (danger ? `${t.danger}33` : t.border)}`,
      ...style
    }}>{children}</span>
  );
}

function XKey({ children, t }) {
  return <kbd style={{
    padding: '1px 5px', fontSize: 10,
    fontFamily: ATLAS_MONO,
    border: `1px solid ${t.border}`,
    borderRadius: 3, color: t.text2,
    background: t.surface2
  }}>{children}</kbd>;
}

function XDot({ color, size = 8 }) {
  return <span style={{ width: size, height: size, borderRadius: 2, background: color, flexShrink: 0 }} />;
}

// ─────────────────────────────────────────────────────────────
// TODAY
// ─────────────────────────────────────────────────────────────
function AtlasToday({ dark = true }) {
  const t = atlasTokens(dark);
  return (
    <div className="tc" style={{ background: t.bg, color: t.text, fontFamily: ATLAS_UI }}>
      <div style={{ flex: 1, display: 'flex', minHeight: 0 }}>
        <XNav t={t} active="today" />

        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
          {/* compact top bar */}
          <div style={{
            borderBottom: `1px solid ${t.border}`,
            background: t.surface,
            padding: '8px 18px',
            display: 'flex', alignItems: 'center', gap: 10,
            fontFamily: ATLAS_MONO, fontSize: 11
          }}>
            <span style={{ color: t.text3 }}>today</span>
            <span style={{ color: t.text4 }}>/</span>
            <span style={{ color: t.text }}>2026-05-28</span>
            <span style={{ flex: 1 }} />
            <span style={{ color: t.text3 }}>engine</span>
            <span style={{ color: t.accent }}>● ok</span>
            <span style={{ color: t.text4 }}>·</span>
            <span style={{ color: t.text3 }}>last gen 2m</span>
            <span style={{ color: t.text4 }}>·</span>
            <span style={{ color: t.text3 }}>42 placed / 44</span>
          </div>

          <div style={{ flex: 1, overflow: 'auto', padding: '20px 24px 28px' }} className="noscroll">
            {/* Hero header */}
            <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontSize: 22, fontWeight: 600, letterSpacing: -0.4, color: t.text }}>
                  Thursday, May 28
                </div>
                <div style={{ fontSize: 13, color: t.text2, marginTop: 4, fontFamily: ATLAS_MONO }}>
                  6 today · 4h40m planned · <span style={{ color: t.danger }}>1 overdue</span> · <span style={{ color: t.warn }}>1 late</span>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                <button style={btnStyle(t)}>capture <XKey t={t}>⌘K</XKey></button>
                <button style={btnStyle(t, true)}>open calendar</button>
              </div>
            </div>

            {/* Stats */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 0, marginTop: 20, border: `1px solid ${t.border}`, background: t.surface, borderRadius: 6 }}>
              {TODAY.stats.map((s, i) => (
                <div key={s.label} style={{
                  padding: '14px 16px',
                  borderLeft: i ? `1px solid ${t.border}` : 'none'
                }}>
                  <div style={{ fontSize: 11, color: t.text3, fontFamily: ATLAS_MONO, letterSpacing: 0.5, textTransform: 'uppercase' }}>{s.label}</div>
                  <div className="tnum" style={{ fontSize: 24, fontWeight: 600, color: t.text, marginTop: 4, letterSpacing: -0.5, fontFamily: ATLAS_MONO }}>{s.value}</div>
                  <div style={{ fontSize: 11, color: t.text3, marginTop: 2 }}>{s.sub}</div>
                </div>
              ))}
            </div>

            {/* Two columns */}
            <div style={{ display: 'grid', gridTemplateColumns: '1.45fr 1fr', gap: 18, marginTop: 18 }}>
              {/* schedule table */}
              <div style={{ border: `1px solid ${t.border}`, background: t.surface, borderRadius: 6 }}>
                <div style={{ padding: '10px 14px', borderBottom: `1px solid ${t.border}`, display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: t.text }}>Schedule</span>
                  <XPill t={t}>6 items</XPill>
                  <span style={{ flex: 1 }} />
                  <span style={{ fontSize: 11, color: t.text3, fontFamily: ATLAS_MONO }}>sort · time ↑</span>
                </div>
                <div>
                  {/* table head */}
                  <div style={tableHead(t)}>
                    <span>time</span>
                    <span>dur</span>
                    <span>title</span>
                    <span>area</span>
                    <span>place</span>
                    <span>state</span>
                  </div>
                  {TODAY.events.map((e, i) => (
                    <div key={i} style={{
                      display: 'grid',
                      gridTemplateColumns: '60px 60px 1fr 96px 96px 80px',
                      gap: 12,
                      padding: '8px 14px',
                      borderTop: `1px solid ${t.border}`,
                      alignItems: 'center',
                      background: e.now ? t.accentBg : 'transparent',
                      fontSize: 12,
                      opacity: e.travel ? 0.6 : 1
                    }}>
                      <span className="tnum" style={{ fontFamily: ATLAS_MONO, color: e.now ? t.accent : t.text, fontWeight: e.now ? 600 : 400 }}>
                        {e.now ? 'NOW' : e.time}
                      </span>
                      <span className="tnum" style={{ fontFamily: ATLAS_MONO, color: t.text2 }}>{e.dur}</span>
                      <span style={{ color: t.text, fontWeight: e.now ? 500 : 400 }}>
                        {e.title}
                        {e.kind === 'plan' && <span style={{ marginLeft: 6, fontSize: 10, color: t.text3, fontFamily: ATLAS_MONO }}>plan</span>}
                      </span>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: t.text2 }}>
                        {e.travel ? <span style={{ color: t.text4 }}>—</span> : <><XDot color={t.area[e.col]} /> {e.area}</>}
                      </span>
                      <span style={{ color: t.text3 }}>{e.where || '—'}</span>
                      <span>
                        {e.overdue && <XPill t={t} danger>OVERDUE</XPill>}
                        {e.warn && <XPill t={t} style={{ background: `${t.warn}15`, color: t.warn, borderColor: `${t.warn}33` }}>LATE</XPill>}
                        {e.now && <XPill t={t} accent>NOW</XPill>}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Goals */}
              <div style={{ border: `1px solid ${t.border}`, background: t.surface, borderRadius: 6 }}>
                <div style={{ padding: '10px 14px', borderBottom: `1px solid ${t.border}`, display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: 13, fontWeight: 600 }}>Priority goals</span>
                  <XPill t={t}>{TODAY.goals.length}</XPill>
                </div>
                <div style={{ padding: '4px 0' }}>
                  {TODAY.goals.map((g, i) => (
                    <div key={i} style={{ padding: '12px 14px', borderTop: i ? `1px solid ${t.border}` : 'none' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <XDot color={t.area[g.col]} />
                        <span style={{ fontSize: 13, fontWeight: 500, flex: 1 }}>{g.name}</span>
                        <span className="tnum" style={{ fontFamily: ATLAS_MONO, fontSize: 11, color: t.text3 }}>{g.sub}</span>
                      </div>
                      <div style={{ marginTop: 6, height: 4, background: t.hl, borderRadius: 2, position: 'relative', overflow: 'hidden' }}>
                        <div style={{ position: 'absolute', inset: 0, width: `${g.pct}%`, background: t.area[g.col], borderRadius: 2 }} />
                      </div>
                      <div style={{ fontSize: 11, color: t.text3, marginTop: 5, display: 'flex', alignItems: 'center', gap: 6, fontFamily: ATLAS_MONO }}>
                        <span>→</span>
                        <span style={{ color: t.text2, fontFamily: ATLAS_UI }}>{g.next}</span>
                        <span style={{ marginLeft: 'auto', color: t.text4 }}>by {g.dl}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Engine console */}
            <div style={{ marginTop: 16, border: `1px solid ${t.border}`, background: t.surface, borderRadius: 6 }}>
              <div style={{ padding: '8px 14px', borderBottom: `1px solid ${t.border}`, display: 'flex', alignItems: 'center', gap: 10, fontFamily: ATLAS_MONO, fontSize: 11 }}>
                <span style={{ color: t.text }}>engine console</span>
                <span style={{ color: t.text4 }}>·</span>
                <span style={{ color: t.text3 }}>1 fail · 2 warn · 2m ago</span>
                <span style={{ flex: 1 }} />
                <span style={{ color: t.text3 }}>view all →</span>
              </div>
              <div style={{ padding: '4px 0' }}>
                {WEEK.engineMsgs.slice(0, 3).map((m, i) => {
                  const c = m.tone === 'fail' ? t.danger : m.tone === 'warn' ? t.warn : t.success;
                  return (
                    <div key={i} style={{ padding: '6px 14px', borderTop: i ? `1px solid ${t.border}` : 'none', display: 'flex', alignItems: 'center', gap: 10, fontSize: 12 }}>
                      <span style={{
                        fontFamily: ATLAS_MONO, fontSize: 9, padding: '2px 5px',
                        background: c, color: '#000', borderRadius: 2,
                        fontWeight: 700, letterSpacing: 0.5
                      }}>{m.tag}</span>
                      <span style={{ color: t.text }}>{m.title}</span>
                      <span style={{ color: t.text3, flex: 1 }}>— {m.body}</span>
                    </div>
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

function tableHead(t) {
  return {
    display: 'grid',
    gridTemplateColumns: '60px 60px 1fr 96px 96px 80px',
    gap: 12,
    padding: '6px 14px',
    fontSize: 10,
    color: t.text3,
    fontFamily: ATLAS_MONO,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    background: t.surface2,
    borderBottom: `1px solid ${t.border}`
  };
}

function btnStyle(t, primary) {
  return {
    padding: '6px 12px',
    borderRadius: 5,
    background: primary ? t.accent : t.surface,
    color: primary ? '#000' : t.text,
    border: `1px solid ${primary ? t.accent : t.border}`,
    fontSize: 12, fontWeight: 500,
    fontFamily: ATLAS_UI,
    display: 'inline-flex', alignItems: 'center', gap: 6,
    cursor: 'pointer'
  };
}

// ─────────────────────────────────────────────────────────────
// CALENDAR
// ─────────────────────────────────────────────────────────────
function AtlasCalendar({ dark = true }) {
  const t = atlasTokens(dark);
  return (
    <div className="tc" style={{ background: t.bg, color: t.text, fontFamily: ATLAS_UI }}>
      <div style={{ flex: 1, display: 'flex', minHeight: 0 }}>
        <XNav t={t} active="calendar" />
        <div style={{ flex: 1, display: 'flex', minHeight: 0 }}>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
            {/* Header bar */}
            <div style={{
              padding: '10px 18px', borderBottom: `1px solid ${t.border}`, background: t.surface,
              display: 'flex', alignItems: 'center', gap: 10
            }}>
              <span style={{ fontSize: 16, fontWeight: 600, letterSpacing: -0.3 }}>{WEEK.range}</span>
              <span style={{ display: 'flex', gap: 2, marginLeft: 4 }}>
                <button style={btnStyle(t)}>‹</button>
                <button style={btnStyle(t)}>today</button>
                <button style={btnStyle(t)}>›</button>
              </span>
              <span style={{ flex: 1 }} />
              <XPill t={t}>filters · all</XPill>
              <XPill t={t}>week ▾</XPill>
              <button style={btnStyle(t)}>edit templates</button>
              <button style={btnStyle(t, true)}>regen <XKey t={t}>⇧R</XKey></button>
            </div>

            <AtlasGrid t={t} />
          </div>

          {/* Engine sidebar */}
          <div style={{
            width: 320, flexShrink: 0,
            borderLeft: `1px solid ${t.border}`,
            background: t.surface,
            display: 'flex', flexDirection: 'column'
          }}>
            <div style={{ padding: '10px 14px', borderBottom: `1px solid ${t.border}`, fontFamily: ATLAS_MONO, fontSize: 11, display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ color: t.text }}>engine</span>
              <span style={{ color: t.text4 }}>·</span>
              <span style={{ color: t.text3 }}>1 fail · 2 warn · 2m</span>
              <span style={{ flex: 1 }} />
              <span style={{ color: t.text3 }}>↻</span>
            </div>
            <div style={{ flex: 1, overflow: 'auto', padding: '10px 12px' }} className="noscroll">
              {WEEK.engineMsgs.map((m, i) => {
                const c = m.tone === 'fail' ? t.danger : m.tone === 'warn' ? t.warn : t.success;
                return (
                  <div key={i} style={{
                    border: `1px solid ${t.border}`, borderLeft: `2px solid ${c}`,
                    background: t.surface2,
                    borderRadius: 4,
                    padding: '8px 10px',
                    marginBottom: 8
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ fontFamily: ATLAS_MONO, fontSize: 9, padding: '1px 5px', background: c, color: '#000', borderRadius: 2, fontWeight: 700, letterSpacing: 0.5 }}>{m.tag}</span>
                      <span style={{ fontSize: 12, fontWeight: 600 }}>{m.title}</span>
                    </div>
                    <div style={{ fontSize: 11, color: t.text2, marginTop: 4, lineHeight: 1.4 }}>{m.body}</div>
                  </div>
                );
              })}
              <div style={{ borderTop: `1px solid ${t.border}`, marginTop: 8, paddingTop: 10, fontFamily: ATLAS_MONO, fontSize: 10, color: t.text3, lineHeight: 1.6 }}>
                <div>last_gen_ms: 412</div>
                <div>horizon_days: 28</div>
                <div>candidates_avg: 7.4</div>
                <div>best_score: 73</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function AtlasGrid({ t }) {
  const hourHeight = 40;
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div style={{
        display: 'grid', gridTemplateColumns: '52px repeat(7, 1fr)',
        background: t.surface2,
        borderBottom: `1px solid ${t.border}`
      }}>
        <div />
        {WEEK.days.map(d => (
          <div key={d.n} style={{
            padding: '8px 8px', borderLeft: `1px solid ${t.border}`,
            display: 'flex', flexDirection: 'column'
          }}>
            <span style={{ fontSize: 10, fontFamily: ATLAS_MONO, color: t.text3, letterSpacing: 0.5, textTransform: 'uppercase' }}>{d.d}</span>
            <span className="tnum" style={{
              fontSize: 16, fontWeight: 600,
              fontFamily: ATLAS_MONO,
              color: d.today ? t.accent : t.text,
              marginTop: 2,
              letterSpacing: -0.3
            }}>{d.n}</span>
          </div>
        ))}
      </div>
      <div style={{ flex: 1, overflow: 'auto', position: 'relative' }} className="noscroll">
        <div style={{
          display: 'grid',
          gridTemplateColumns: '52px repeat(7, 1fr)',
          gridTemplateRows: `repeat(${WEEK.hours.length}, ${hourHeight}px)`,
          position: 'relative',
          background: t.bg
        }}>
          {WEEK.hours.map((h, ri) => (
            <React.Fragment key={h}>
              <div style={{
                gridRow: ri+1, gridColumn: 1,
                padding: '2px 6px',
                fontSize: 10, fontFamily: ATLAS_MONO, color: t.text3,
                borderTop: ri ? `1px solid ${t.border}` : 'none'
              }}>{h.padStart(2,'0')}:00</div>
              {WEEK.days.map((_, ci) => (
                <div key={ci} style={{
                  gridRow: ri+1, gridColumn: ci+2,
                  borderTop: ri ? `1px solid ${t.border}` : 'none',
                  borderLeft: `1px solid ${t.border}`
                }} />
              ))}
            </React.Fragment>
          ))}

          {/* strict windows as a column tint */}
          {WEEK.strict.map((s, i) => {
            const top = (s.start - 7) * hourHeight;
            const height = (s.end - s.start) * hourHeight;
            return (
              <div key={i} style={{
                position: 'absolute',
                left: `calc(52px + (100% - 52px) * ${s.day} / 7)`,
                width: `calc((100% - 52px) / 7)`,
                top, height,
                background: `repeating-linear-gradient(135deg, ${t.area[s.kind]}10, ${t.area[s.kind]}10 4px, transparent 4px, transparent 10px)`,
                pointerEvents: 'none'
              }} />
            );
          })}

          {WEEK.events.map((e, i) => {
            const top = (e.start - 7) * hourHeight;
            const height = (e.end - e.start) * hourHeight;
            const color = e.col ? t.area[e.col] : t.text3;
            const isPlan = e.kind === 'plan';
            const isTmpl = e.kind === 'tmpl';
            return (
              <div key={i} style={{
                position: 'absolute',
                left: `calc(52px + (100% - 52px) * ${e.day} / 7 + 2px)`,
                width: `calc((100% - 52px) / 7 - 4px)`,
                top: top + 1, height: height - 2,
                background: e.travel ? 'transparent' : (isTmpl ? `${color}26` : color),
                color: e.travel ? t.text3 : (isTmpl ? color : '#fff'),
                border: e.travel ? `1px dashed ${t.border}` : (e.warn ? `1px solid ${t.warn}` : 'none'),
                borderLeft: e.travel ? `1px dashed ${t.border}` : (e.warn ? `1px solid ${t.warn}` : 'none'),
                borderRadius: 3,
                padding: '2px 5px',
                fontSize: 11,
                fontWeight: isPlan ? 500 : 400,
                lineHeight: 1.2,
                overflow: 'hidden',
                opacity: isTmpl ? 0.55 : 1
              }}>
                <div style={{ fontWeight: e.current ? 600 : (isPlan ? 500 : 400) }}>
                  {e.title}
                </div>
                {height > 32 && !e.travel && !isTmpl && (
                  <div className="tnum" style={{ fontSize: 9, opacity: 0.75, fontFamily: ATLAS_MONO, marginTop: 1 }}>
                    {fmtA(e.start)}–{fmtA(e.end)}
                  </div>
                )}
              </div>
            );
          })}

          {/* now line */}
          <div style={{
            position: 'absolute',
            left: `calc(52px + (100% - 52px) * 2 / 7)`,
            width: `calc((100% - 52px) / 7)`,
            top: (9.6 - 7) * hourHeight,
            height: 1,
            background: t.accent,
            zIndex: 5
          }}>
            <span style={{
              position: 'absolute', left: -8, top: -4,
              width: 8, height: 8, borderRadius: 2,
              background: t.accent
            }} />
            <span style={{
              position: 'absolute', right: 4, top: -16,
              fontSize: 9, fontFamily: ATLAS_MONO,
              color: t.accent, fontWeight: 600
            }}>09:36</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function fmtA(h) {
  const hh = Math.floor(h);
  const mm = Math.round((h - hh) * 60);
  return `${hh.toString().padStart(2,'0')}:${mm.toString().padStart(2,'0')}`;
}

// ─────────────────────────────────────────────────────────────
// GOAL DETAIL
// ─────────────────────────────────────────────────────────────
function AtlasGoal({ dark = true }) {
  const t = atlasTokens(dark);
  const g = GOAL;
  return (
    <div className="tc" style={{ background: t.bg, color: t.text, fontFamily: ATLAS_UI }}>
      <div style={{ flex: 1, display: 'flex', minHeight: 0 }}>
        <XNav t={t} active="library" />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {/* breadcrumb */}
          <div style={{ padding: '8px 18px', borderBottom: `1px solid ${t.border}`, background: t.surface, display: 'flex', alignItems: 'center', gap: 8, fontFamily: ATLAS_MONO, fontSize: 11, color: t.text3 }}>
            <span>library</span>
            <span style={{ color: t.text4 }}>/</span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              <XDot color={t.area[g.col]} size={6} /> health
            </span>
            <span style={{ color: t.text4 }}>/</span>
            <span style={{ color: t.text }}>{g.title}</span>
            <span style={{ flex: 1 }} />
            <span>id: gl_q3k4</span>
            <span style={{ color: t.text4 }}>·</span>
            <span>⌘E edit</span>
            <span style={{ color: t.text4 }}>·</span>
            <span>J/K next</span>
          </div>

          <div style={{ flex: 1, overflow: 'auto' }} className="noscroll">
            <div style={{ padding: '24px 28px 28px', display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: 24 }}>
              {/* left main */}
              <div>
                {/* meta row */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <XPill t={t} accent>goal</XPill>
                  <XPill t={t}><XDot color={t.area[g.col]} size={6} /> {g.area}</XPill>
                  <XPill t={t}>{g.status}</XPill>
                  <XPill t={t}>prio {g.priority}</XPill>
                  <span style={{ flex: 1 }} />
                  <button style={btnStyle(t)}>duplicate</button>
                  <button style={btnStyle(t)}>delete</button>
                </div>

                {/* title */}
                <div style={{ fontSize: 30, fontWeight: 600, letterSpacing: -0.7, marginTop: 14, color: t.text }}>
                  {g.title}
                </div>

                {/* progress bar */}
                <div style={{ marginTop: 18, border: `1px solid ${t.border}`, background: t.surface, borderRadius: 6, padding: '14px 16px' }}>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
                    <span className="tnum" style={{ fontSize: 24, fontWeight: 600, fontFamily: ATLAS_MONO, letterSpacing: -0.5 }}>{g.pct}%</span>
                    <span className="tnum" style={{ fontSize: 12, color: t.text2, fontFamily: ATLAS_MONO }}>{g.done}/{g.total} subtasks</span>
                    <span style={{ flex: 1 }} />
                    <span style={{ fontSize: 12, color: t.text2 }}>by {g.dl} · {g.weeksLeft}w left</span>
                  </div>
                  <div style={{ marginTop: 8, height: 6, background: t.hl, borderRadius: 3, position: 'relative', overflow: 'hidden' }}>
                    <div style={{ position: 'absolute', inset: 0, width: `${g.pct}%`, background: t.area[g.col], borderRadius: 3 }} />
                    {Array.from({ length: g.total - 1 }).map((_, i) => (
                      <span key={i} style={{ position: 'absolute', top: 0, bottom: 0, left: `${((i+1)/g.total)*100}%`, width: 1, background: t.bg, opacity: 0.7 }} />
                    ))}
                  </div>
                </div>

                {/* tabs */}
                <div style={{ display: 'flex', marginTop: 20, borderBottom: `1px solid ${t.border}` }}>
                  {[['overview', false], ['schedule', false], ['subtasks', true, 12], ['activity', false]].map(([n, sel, badge]) => (
                    <div key={n} style={{
                      padding: '10px 14px',
                      fontSize: 12, fontWeight: 500,
                      color: sel ? t.text : t.text3,
                      borderBottom: sel ? `2px solid ${t.accent}` : '2px solid transparent',
                      marginBottom: -1, display: 'flex', alignItems: 'center', gap: 6,
                      fontFamily: ATLAS_UI
                    }}>
                      <span>{n}</span>
                      {badge && <span className="tnum" style={{ fontSize: 10, fontFamily: ATLAS_MONO, color: t.text3, padding: '1px 5px', background: t.hl, borderRadius: 3 }}>{badge}</span>}
                    </div>
                  ))}
                  <span style={{ flex: 1 }} />
                  <div style={{ display: 'flex', gap: 4, padding: '6px 0' }}>
                    {['list', 'board', 'timeline'].map((v, i) => (
                      <button key={v} style={{
                        padding: '3px 9px', fontSize: 11, borderRadius: 3,
                        background: i === 0 ? t.hl : 'transparent',
                        color: i === 0 ? t.text : t.text3,
                        border: `1px solid ${i === 0 ? t.borderHi : 'transparent'}`,
                        fontFamily: ATLAS_MONO
                      }}>{v}</button>
                    ))}
                  </div>
                </div>

                {/* subtask table */}
                <div style={{ marginTop: 14, border: `1px solid ${t.border}`, background: t.surface, borderRadius: 6 }}>
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: '22px 1fr 72px 110px 70px',
                    gap: 10,
                    padding: '6px 14px',
                    background: t.surface2, borderBottom: `1px solid ${t.border}`,
                    fontSize: 10, fontFamily: ATLAS_MONO, color: t.text3,
                    letterSpacing: 0.5, textTransform: 'uppercase'
                  }}>
                    <span /><span>title</span><span>dur</span><span>sched</span><span>state</span>
                  </div>
                  {g.subtasks.map((s, i) => (
                    <div key={i} style={{
                      display: 'grid',
                      gridTemplateColumns: '22px 1fr 72px 110px 70px',
                      gap: 10,
                      padding: '8px 14px',
                      alignItems: 'center',
                      borderTop: i ? `1px solid ${t.border}` : 'none',
                      background: s.current ? t.accentBg : 'transparent',
                      fontSize: 12
                    }}>
                      <div style={{
                        width: 14, height: 14, borderRadius: 3,
                        border: `1px solid ${s.done ? t.success : t.borderHi}`,
                        background: s.done ? t.success : 'transparent',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 9, color: '#000', fontWeight: 700
                      }}>{s.done && '✓'}</div>
                      <span style={{
                        color: s.done ? t.text3 : t.text,
                        textDecoration: s.done ? 'line-through' : 'none',
                        fontWeight: s.current ? 500 : 400
                      }}>{s.t}</span>
                      <span className="tnum" style={{ fontFamily: ATLAS_MONO, fontSize: 11, color: t.text2 }}>{s.dur}</span>
                      <span className="tnum" style={{ fontFamily: ATLAS_MONO, fontSize: 11, color: s.current ? t.accent : t.text3 }}>{s.sched || s.dl}</span>
                      <span>
                        {s.done && <XPill t={t} style={{ background: `${t.success}15`, color: t.success, borderColor: `${t.success}33` }}>done</XPill>}
                        {s.current && <XPill t={t} accent>today</XPill>}
                      </span>
                    </div>
                  ))}
                  <div style={{ padding: '8px 14px', borderTop: `1px solid ${t.border}`, fontSize: 12, color: t.text3, display: 'flex', alignItems: 'center', gap: 8, fontFamily: ATLAS_MONO }}>
                    <span>+</span> add subtask
                  </div>
                </div>
              </div>

              {/* right rail */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div style={{ border: `1px solid ${t.area[g.col]}55`, background: `${t.area[g.col]}0a`, borderRadius: 6, padding: '14px 16px' }}>
                  <div style={{ fontSize: 10, fontFamily: ATLAS_MONO, color: t.text3, letterSpacing: 0.5, textTransform: 'uppercase' }}>next on calendar</div>
                  <div style={{ fontSize: 20, fontWeight: 600, marginTop: 6, letterSpacing: -0.4 }}>{g.next.day} · {g.next.time}</div>
                  <div style={{ fontSize: 12, color: t.text2, marginTop: 4 }}>{g.next.title} · {g.next.dur}</div>
                  <div style={{ marginTop: 12, display: 'flex', gap: 6 }}>
                    <button style={btnStyle(t)}>view calendar</button>
                    <button style={btnStyle(t)}>reschedule</button>
                  </div>
                </div>

                {/* AI helper */}
                <div style={{ border: `1px solid ${t.border}`, background: t.surface, borderRadius: 6, padding: '12px 14px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ width: 18, height: 18, borderRadius: 3, background: t.accent, color: '#000', fontSize: 11, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✦</span>
                    <span style={{ fontSize: 13, fontWeight: 600 }}>AI helper</span>
                    <span style={{ marginLeft: 'auto', fontFamily: ATLAS_MONO, fontSize: 10, color: t.text3 }}>scoped</span>
                  </div>
                  <div style={{
                    marginTop: 10,
                    padding: '6px 10px',
                    background: t.bg,
                    border: `1px solid ${t.border}`,
                    borderRadius: 4,
                    fontFamily: ATLAS_MONO,
                    fontSize: 11,
                    color: t.text2
                  }}>$ split this subtask into 2 sessions_</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 8 }}>
                    {['estimate', 'split', 'tighten', 'add taper'].map(c => (
                      <XPill t={t} key={c}>✦ {c}</XPill>
                    ))}
                  </div>
                </div>

                {/* engine notes */}
                <div style={{ border: `1px solid ${t.border}`, background: t.surface, borderRadius: 6, padding: '12px 14px' }}>
                  <div style={{ fontSize: 11, fontFamily: ATLAS_MONO, color: t.text3, letterSpacing: 0.5, textTransform: 'uppercase' }}>engine</div>
                  <div style={{ fontSize: 12, color: t.text2, marginTop: 6, lineHeight: 1.5 }}>{g.engineHint}</div>
                </div>

                {/* why */}
                <div style={{ border: `1px solid ${t.border}`, background: t.surface, borderRadius: 6, padding: '12px 14px' }}>
                  <div style={{ fontSize: 11, fontFamily: ATLAS_MONO, color: t.text3, letterSpacing: 0.5, textTransform: 'uppercase' }}>why these subtasks</div>
                  <div style={{ fontSize: 12, color: t.text2, marginTop: 6, lineHeight: 1.5 }}>{g.why}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

window.AtlasToday = AtlasToday;
window.AtlasCalendar = AtlasCalendar;
window.AtlasGoal = AtlasGoal;
