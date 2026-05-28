/* global React, TODAY, WEEK, GOAL */
// Aurora — dark glass + premium light pair · Apple-leaning · Geist Sans

const auroraTokens = (dark) => dark ? {
  // dark bg has soft neutral light blobs so the glass actually has *something* to blur — no colored tints
  bg: 'radial-gradient(900px 600px at 12% -10%, rgba(255,255,255,0.05), transparent 65%), radial-gradient(700px 500px at 92% 110%, rgba(255,255,255,0.035), transparent 65%), #0c0c0e',
  bgFlat: '#0c0c0e',
  surface: 'rgba(255,255,255,0.04)',
  surfaceHi: 'rgba(255,255,255,0.06)',
  surfaceBorder: 'rgba(255,255,255,0.08)',
  surfaceBorderHi: 'rgba(255,255,255,0.14)',
  text: 'rgba(255,255,255,0.94)',
  text2: 'rgba(255,255,255,0.62)',
  text3: 'rgba(255,255,255,0.36)',
  divider: 'rgba(255,255,255,0.06)',
  accent: '#3690e8',
  accentBg: 'rgba(54,144,232,0.18)',
  accentGlow: 'none',
  area: { career: '#3690e8', health: '#38c554', home: '#e88a1a', growth: '#a64ad9', rel: '#e3346b', finance: '#e6ad15' },
  danger: '#e33734', warn: '#e88a1a', success: '#38c554',
  chip: 'rgba(255,255,255,0.05)',
  chipText: 'rgba(255,255,255,0.85)',
  glassShadow: '0 1px 0 rgba(255,255,255,0.04) inset',
  highlight: 'rgba(255,255,255,0.04)'
} : {
  bg: 'radial-gradient(900px 600px at 12% -10%, rgba(0,0,0,0.025), transparent 65%), radial-gradient(700px 500px at 92% 110%, rgba(0,0,0,0.02), transparent 65%), #f7f6f3',
  bgFlat: '#f7f6f3',
  surface: 'rgba(255,255,255,0.55)',
  surfaceHi: 'rgba(255,255,255,0.85)',
  surfaceBorder: 'rgba(0,0,0,0.06)',
  surfaceBorderHi: 'rgba(0,0,0,0.12)',
  text: '#141416',
  text2: '#5f5f63',
  text3: '#9b9ba0',
  divider: 'rgba(0,0,0,0.06)',
  accent: '#1e6fd1',
  accentBg: 'rgba(30,111,209,0.12)',
  accentGlow: 'none',
  area: { career: '#1e6fd1', health: '#2eaa46', home: '#d4730a', growth: '#8c3fcc', rel: '#cc2960', finance: '#cc961a' },
  danger: '#cc2926', warn: '#d4730a', success: '#2eaa46',
  chip: 'rgba(0,0,0,0.04)',
  chipText: '#3a3a3c',
  glassShadow: '0 1px 0 rgba(255,255,255,0.5) inset, 0 16px 36px rgba(28,28,30,0.06)',
  highlight: 'rgba(0,0,0,0.025)'
};

// ─────────────────────────────────────────────────────────────
// Reusable glass primitives
// ─────────────────────────────────────────────────────────────
function AGlass({ t, children, style = {}, padding = 24, ...rest }) {
  return (
    <div style={{
      background: t.surface,
      backdropFilter: 'blur(40px) saturate(180%)',
      WebkitBackdropFilter: 'blur(40px) saturate(180%)',
      border: `0.5px solid ${t.surfaceBorder}`,
      borderRadius: 18,
      padding,
      boxShadow: t.glassShadow,
      ...style
    }} {...rest}>{children}</div>
  );
}

function AChip({ t, children, accent, style = {} }) {
  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: 6,
      padding: '4px 10px',
      borderRadius: 999,
      background: accent ? t.accentBg : t.chip,
      color: accent ? t.accent : t.chipText,
      fontSize: 12,
      fontWeight: 500,
      letterSpacing: -0.05,
      ...style
    }}>{children}</span>
  );
}

function ADot({ color, size = 8 }) {
  return <span style={{
    width: size, height: size, borderRadius: '50%', background: color, flexShrink: 0
  }} />;
}

function ANav({ t, active }) {
  const items = [
    { k: 'Today',   icon: '◐' },
    { k: 'Library', icon: '▤' },
    { k: 'Calendar',icon: '▦' },
    { k: 'Areas',   icon: '✦' },
    { k: 'Places',  icon: '◉' },
  ];
  return (
    <div style={{
      width: 220,
      flexShrink: 0,
      borderRight: `0.5px solid ${t.surfaceBorder}`,
      padding: '20px 14px',
      display: 'flex', flexDirection: 'column',
      gap: 4,
      background: t.surface,
      backdropFilter: 'blur(30px) saturate(180%)',
      WebkitBackdropFilter: 'blur(30px) saturate(180%)',
    }}>
      <div style={{ padding: '6px 10px 16px', display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{
          width: 26, height: 26, borderRadius: 8,
          background: `linear-gradient(135deg, ${t.accent}, ${t.area.growth})`
        }} />
        <div style={{ fontWeight: 600, fontSize: 16, letterSpacing: -0.3, color: t.text }}>Circadium</div>
      </div>
      {items.map(it => {
        const sel = it.k === active;
        return (
          <div key={it.k} style={{
            padding: '8px 12px',
            display: 'flex', alignItems: 'center', gap: 12,
            borderRadius: 10,
            background: sel ? t.surfaceHi : 'transparent',
            border: sel ? `0.5px solid ${t.surfaceBorderHi}` : '0.5px solid transparent',
            color: sel ? t.text : t.text2,
            fontWeight: sel ? 500 : 400,
            fontSize: 14,
            cursor: 'pointer'
          }}>
            <span style={{ width: 16, textAlign: 'center', fontSize: 14, opacity: sel ? 1 : 0.7 }}>{it.icon}</span>
            <span>{it.k}</span>
          </div>
        );
      })}
      <div style={{ marginTop: 12, padding: '8px 12px', display: 'flex', alignItems: 'center', gap: 8, color: t.text3, fontSize: 12 }}>
        <span style={{ padding: '2px 8px', border: `0.5px solid ${t.surfaceBorder}`, borderRadius: 6, background: t.chip, color: t.text2 }}>⌘K</span>
        <span>capture</span>
      </div>

      <div style={{ marginTop: 'auto', padding: '12px 10px', borderTop: `0.5px solid ${t.surfaceBorder}`, display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{
          width: 30, height: 30, borderRadius: '50%',
          background: `linear-gradient(135deg, ${t.area.health}, ${t.area.career})`,
        }} />
        <div style={{ lineHeight: 1.1 }}>
          <div style={{ fontSize: 13, fontWeight: 500, color: t.text }}>Alex</div>
          <div style={{ fontSize: 11, color: t.text3 }}>alex@hyperisland.se</div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// TODAY
// ─────────────────────────────────────────────────────────────
function AuroraToday({ dark = true }) {
  const t = auroraTokens(dark);
  return (
    <div className="tc" style={{ background: t.bg, color: t.text, fontFamily: 'Geist, sans-serif' }}>
      <div style={{ flex: 1, display: 'flex', minHeight: 0 }}>
        <ANav t={t} active="Today" />
        <div style={{ flex: 1, overflow: 'auto', padding: '32px 40px 40px' }} className="noscroll">
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 28 }}>
            <div>
              <div style={{ fontSize: 12, color: t.text3, letterSpacing: 0.4, textTransform: 'uppercase', fontWeight: 500 }}>{TODAY.date}</div>
              <div style={{ fontSize: 32, fontWeight: 600, letterSpacing: -0.8, marginTop: 6, color: t.text }}>{TODAY.greeting}</div>
              <div style={{ fontSize: 14, color: t.text2, marginTop: 6 }}>
                6 things on today · 4h 40m planned · <span style={{ color: t.danger }}>1 overdue</span> · <span style={{ color: t.warn }}>1 late</span>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <AChip t={t}>⌘K capture</AChip>
              <AChip t={t} accent>open calendar →</AChip>
            </div>
          </div>

          {/* Stats */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 20 }}>
            {TODAY.stats.map(s => (
              <AGlass key={s.label} t={t} padding={16}>
                <div style={{ fontSize: 11, color: t.text3, letterSpacing: 0.4, textTransform: 'uppercase', fontWeight: 500 }}>{s.label}</div>
                <div className="tnum" style={{ fontSize: 28, fontWeight: 600, letterSpacing: -0.5, color: t.text, marginTop: 4 }}>{s.value}</div>
                <div style={{ fontSize: 12, color: t.text2, marginTop: 2 }}>{s.sub}</div>
              </AGlass>
            ))}
          </div>

          {/* Two-column body */}
          <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 20 }}>
            {/* Up next */}
            <AGlass t={t} padding={0}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: `0.5px solid ${t.divider}` }}>
                <div>
                  <div style={{ fontSize: 16, fontWeight: 600, letterSpacing: -0.3 }}>What to do today</div>
                  <div style={{ fontSize: 12, color: t.text3, marginTop: 2 }}>scheduler order · drag to reorder</div>
                </div>
                <AChip t={t}>view week</AChip>
              </div>
              <div style={{ padding: '8px 8px 12px' }}>
                {TODAY.events.map((e, i) => (
                  <div key={i} style={{
                    display: 'grid',
                    gridTemplateColumns: '64px 1fr auto',
                    alignItems: 'center', gap: 14,
                    padding: '12px 14px',
                    borderRadius: 12,
                    background: e.now ? t.accentBg : 'transparent',
                    border: e.now ? `0.5px solid ${t.accent}55` : '0.5px solid transparent',
                    opacity: e.travel ? 0.55 : 1,
                    marginBottom: 2
                  }}>
                    <div className="tnum" style={{ lineHeight: 1.15 }}>
                      <div style={{ fontSize: 14, fontWeight: 600, color: e.now ? t.accent : t.text }}>
                        {e.now ? 'NOW' : e.time}
                      </div>
                      <div style={{ fontSize: 11, color: t.text3, marginTop: 2 }}>{e.dur}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 500, color: e.travel ? t.text3 : t.text }}>{e.title}</div>
                      {!e.travel && (
                        <div style={{ display: 'flex', gap: 8, marginTop: 4, alignItems: 'center' }}>
                          <ADot color={t.area[e.col]} />
                          <span style={{ fontSize: 12, color: t.text2 }}>{e.area}</span>
                          {e.where && <span style={{ fontSize: 12, color: t.text3 }}>· {e.where}</span>}
                          {e.kind === 'plan' && <span style={{ fontSize: 11, color: t.text3, padding: '1px 6px', border: `0.5px solid ${t.surfaceBorder}`, borderRadius: 6 }}>plan</span>}
                          {e.warn && <span style={{ fontSize: 11, color: t.warn, padding: '1px 6px', background: `${t.warn}22`, borderRadius: 6 }}>scheduled past deadline</span>}
                          {e.overdue && <span style={{ fontSize: 11, color: t.danger, padding: '1px 6px', background: `${t.danger}22`, borderRadius: 6 }}>overdue</span>}
                        </div>
                      )}
                    </div>
                    <span style={{ color: t.text3, fontSize: 14 }}>›</span>
                  </div>
                ))}
              </div>
            </AGlass>

            {/* Priority goals + Engine */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <AGlass t={t} padding={0}>
                <div style={{ padding: '16px 20px 12px', borderBottom: `0.5px solid ${t.divider}` }}>
                  <div style={{ fontSize: 16, fontWeight: 600, letterSpacing: -0.3 }}>Priority goals</div>
                  <div style={{ fontSize: 12, color: t.text3, marginTop: 2 }}>{TODAY.goals.length} active</div>
                </div>
                <div style={{ padding: '6px 16px 14px' }}>
                  {TODAY.goals.map((g, i) => (
                    <div key={i} style={{ padding: '12px 0', borderBottom: i < TODAY.goals.length - 1 ? `0.5px solid ${t.divider}` : 'none' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <ADot color={t.area[g.col]} />
                        <div style={{ flex: 1, fontSize: 14, fontWeight: 500 }}>{g.name}</div>
                        <span className="tnum" style={{ fontSize: 12, color: t.text2 }}>{g.sub}</span>
                      </div>
                      <div style={{ marginTop: 8, height: 6, borderRadius: 3, background: t.chip, position: 'relative', overflow: 'hidden' }}>
                        <div style={{
                          position: 'absolute', inset: 0, width: `${g.pct}%`,
                          background: `linear-gradient(90deg, ${t.area[g.col]}, ${t.area[g.col]}cc)`,
                          borderRadius: 3
                        }} />
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8, fontSize: 12, color: t.text2 }}>
                        <span style={{ color: t.text3 }}>next</span>
                        <span style={{ color: t.text }}>{g.next}</span>
                        <span style={{ marginLeft: 'auto', color: t.text3 }}>by {g.dl}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </AGlass>

              <AGlass t={t} padding={16}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ width: 6, height: 6, borderRadius: '50%', background: t.success }} />
                  <div style={{ fontSize: 13, fontWeight: 500 }}>Engine · last run 2m ago</div>
                </div>
                <div style={{ fontSize: 12, color: t.text2, marginTop: 8, lineHeight: 1.5 }}>
                  42 items placed · 38 honored · <span style={{ color: t.warn }}>2 late</span> · <span style={{ color: t.danger }}>1 failed</span>. View console →
                </div>
              </AGlass>
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
function AuroraCalendar({ dark = true }) {
  const t = auroraTokens(dark);
  return (
    <div className="tc" style={{ background: t.bg, color: t.text, fontFamily: 'Geist, sans-serif' }}>
      <div style={{ flex: 1, display: 'flex', minHeight: 0 }}>
        <ANav t={t} active="Calendar" />

        <div style={{ flex: 1, display: 'flex', minHeight: 0 }}>
          {/* Main calendar */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '24px 28px 24px 32px', minWidth: 0 }}>
            {/* header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 18 }}>
              <div style={{ fontSize: 24, fontWeight: 600, letterSpacing: -0.5 }}>{WEEK.range}</div>
              <div style={{ display: 'flex', gap: 4, marginLeft: 4 }}>
                <NavBtn t={t}>‹</NavBtn>
                <NavBtn t={t}>Today</NavBtn>
                <NavBtn t={t}>›</NavBtn>
              </div>
              <div style={{ flex: 1 }} />
              <AChip t={t}>filters · all areas</AChip>
              <AChip t={t}>week ▾</AChip>
              <AChip t={t} accent>regenerate</AChip>
            </div>

            <CalendarGrid t={t} />
          </div>

          {/* Engine console */}
          <div style={{
            width: 320, flexShrink: 0,
            borderLeft: `0.5px solid ${t.surfaceBorder}`,
            padding: '20px 20px 24px',
            background: t.surface,
            backdropFilter: 'blur(30px)',
            WebkitBackdropFilter: 'blur(30px)',
            overflow: 'auto'
          }} className="noscroll">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 600, letterSpacing: -0.2 }}>Engine</div>
                <div style={{ fontSize: 11, color: t.text3, marginTop: 2 }}>1 fail · 2 warn · 2m ago</div>
              </div>
              <span style={{ fontSize: 11, color: t.text3 }}>↻</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 6 }}>
              {WEEK.engineMsgs.map((m, i) => (
                <EngineMsg key={i} t={t} m={m} />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function NavBtn({ t, children }) {
  return (
    <button style={{
      padding: '6px 10px',
      borderRadius: 8,
      background: t.chip,
      color: t.text,
      border: `0.5px solid ${t.surfaceBorder}`,
      fontSize: 13,
      fontWeight: 500,
      letterSpacing: -0.1
    }}>{children}</button>
  );
}

function CalendarGrid({ t }) {
  // 14 hours: 7..20
  const hourHeight = 44;
  return (
    <div style={{
      flex: 1,
      borderRadius: 16,
      border: `0.5px solid ${t.surfaceBorder}`,
      background: t.surface,
      backdropFilter: 'blur(30px)',
      WebkitBackdropFilter: 'blur(30px)',
      overflow: 'hidden',
      display: 'flex', flexDirection: 'column',
      boxShadow: t.glassShadow
    }}>
      {/* day header */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '60px repeat(7, 1fr)',
        borderBottom: `0.5px solid ${t.divider}`
      }}>
        <div />
        {WEEK.days.map(d => (
          <div key={d.n} style={{
            padding: '12px 0',
            textAlign: 'center',
            borderLeft: `0.5px solid ${t.divider}`
          }}>
            <div style={{ fontSize: 11, color: t.text3, letterSpacing: 0.4, textTransform: 'uppercase', fontWeight: 500 }}>{d.d}</div>
            <div className="tnum" style={{
              fontSize: 20, fontWeight: 600, marginTop: 4,
              color: d.today ? t.accent : t.text,
              letterSpacing: -0.3
            }}>{d.n}</div>
          </div>
        ))}
      </div>
      {/* grid body */}
      <div style={{ flex: 1, position: 'relative', overflow: 'auto' }} className="noscroll">
        <div style={{
          display: 'grid',
          gridTemplateColumns: '60px repeat(7, 1fr)',
          gridTemplateRows: `repeat(${WEEK.hours.length}, ${hourHeight}px)`,
          position: 'relative'
        }}>
          {/* hour labels + grid lines */}
          {WEEK.hours.map((h, ri) => (
            <React.Fragment key={h}>
              <div style={{
                gridRow: ri+1, gridColumn: 1,
                padding: '4px 8px',
                fontSize: 11, color: t.text3,
                borderTop: ri ? `0.5px solid ${t.divider}` : 'none'
              }} className="tnum">{h}:00</div>
              {WEEK.days.map((_, ci) => (
                <div key={ci} style={{
                  gridRow: ri+1, gridColumn: ci+2,
                  borderTop: ri ? `0.5px solid ${t.divider}` : 'none',
                  borderLeft: `0.5px solid ${t.divider}`
                }} />
              ))}
            </React.Fragment>
          ))}

          {/* strict windows */}
          {WEEK.strict.map((s, i) => {
            const top = (s.start - 7) * hourHeight;
            const height = (s.end - s.start) * hourHeight;
            return (
              <div key={i} style={{
                position: 'absolute',
                left: `calc(60px + (100% - 60px) * ${s.day} / 7)`,
                width: `calc((100% - 60px) / 7)`,
                top, height,
                background: `repeating-linear-gradient(135deg, ${t.area[s.kind]}11 0, ${t.area[s.kind]}11 8px, transparent 8px, transparent 14px)`,
                pointerEvents: 'none'
              }} />
            );
          })}

          {/* events */}
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
                borderRadius: 8,
                padding: '5px 8px',
                fontSize: 11,
                lineHeight: 1.2,
                overflow: 'hidden',
                background: e.travel ? 'transparent' : isPlan ? `${color}55` : (isTmpl ? `${color}1a` : `${color}30`),
                color: e.travel ? t.text3 : color,
                backdropFilter: e.travel ? 'none' : 'blur(14px) saturate(160%)',
                WebkitBackdropFilter: e.travel ? 'none' : 'blur(14px) saturate(160%)',
                border: e.travel ? `0.5px dashed ${t.surfaceBorderHi}` : (e.warn ? `1px solid ${t.warn}` : 'none'),
                opacity: isTmpl ? 0.65 : 1
              }}>
                <div style={{ fontWeight: 500, color: e.travel ? t.text3 : (isPlan ? '#fff' : color), opacity: isTmpl ? 0.9 : 1 }}>
                  {e.title}
                </div>
                {height > 36 && !e.travel && !isTmpl && (
                  <div style={{ fontSize: 10, marginTop: 2, opacity: 0.7 }}>
                    {fmt(e.start)}–{fmt(e.end)}
                  </div>
                )}
              </div>
            );
          })}

          {/* Now line */}
          <NowLine t={t} hourHeight={hourHeight} />
        </div>
      </div>
    </div>
  );
}

function fmt(h) {
  const hh = Math.floor(h);
  const mm = Math.round((h - hh) * 60);
  return `${hh}:${mm.toString().padStart(2,'0')}`;
}

function NowLine({ t, hourHeight }) {
  // 9:36 → 2.6 hours from 7
  const top = (9.6 - 7) * hourHeight;
  return (
    <div style={{
      position: 'absolute',
      left: `calc(60px + (100% - 60px) * 2 / 7)`,
      width: `calc((100% - 60px) / 7)`,
      top,
      height: 1.5,
      background: t.accent,
      zIndex: 5
    }}>
      <span style={{
        position: 'absolute',
        left: -6, top: -4,
        width: 9, height: 9, borderRadius: '50%',
        background: t.accent
      }} />
    </div>
  );
}

function EngineMsg({ t, m }) {
  const toneColor = { fail: t.danger, warn: t.warn, info: t.success }[m.tone];
  return (
    <div style={{
      padding: '10px 12px',
      borderRadius: 12,
      background: m.tone === 'fail' ? `${t.danger}11` : (m.tone === 'warn' ? `${t.warn}11` : t.chip),
      border: `0.5px solid ${toneColor}33`,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <span style={{
          fontSize: 9, padding: '2px 6px',
          background: toneColor, color: '#000',
          borderRadius: 4, fontWeight: 600, letterSpacing: 0.5,
          fontFamily: 'Geist Mono, monospace'
        }}>{m.tag}</span>
        <span style={{ fontSize: 12, fontWeight: 600, color: t.text, flex: 1 }}>{m.title}</span>
      </div>
      <div style={{ fontSize: 11.5, color: t.text2, marginTop: 4, lineHeight: 1.4 }}>{m.body}</div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// ITEM DETAIL (goal)
// ─────────────────────────────────────────────────────────────
function AuroraGoal({ dark = true }) {
  const t = auroraTokens(dark);
  const g = GOAL;
  return (
    <div className="tc" style={{ background: t.bg, color: t.text, fontFamily: 'Geist, sans-serif' }}>
      <div style={{ flex: 1, display: 'flex', minHeight: 0 }}>
        <ANav t={t} active="Library" />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {/* breadcrumb */}
          <div style={{ padding: '14px 28px', borderBottom: `0.5px solid ${t.divider}`, display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: t.text3 }}>
            <span>Library</span>
            <span>›</span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: t.text2 }}>
              <ADot color={t.area[g.col]} size={6} /> {g.area}
            </span>
            <span>›</span>
            <span style={{ color: t.text }}>{g.title}</span>
            <span style={{ flex: 1 }} />
            <span style={{ fontFamily: 'Geist Mono', fontSize: 11 }}>⌘e edit · ⌫ back</span>
          </div>

          <div style={{ flex: 1, overflow: 'auto', padding: '32px 40px 40px' }} className="noscroll">
            {/* Title block */}
            <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 24 }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <AChip t={t} accent>goal</AChip>
                  <AChip t={t}><ADot color={t.area[g.col]} size={6} /> {g.area}</AChip>
                  <AChip t={t}>{g.status}</AChip>
                </div>
                <div style={{ fontSize: 40, fontWeight: 600, letterSpacing: -1, marginTop: 12, lineHeight: 1.05 }}>
                  {g.title}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <AChip t={t}>duplicate</AChip>
                <AChip t={t}>delete</AChip>
                <AChip t={t} accent>save</AChip>
              </div>
            </div>

            {/* Progress */}
            <AGlass t={t} padding={20} style={{ marginTop: 22 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 12 }}>
                  <span className="tnum" style={{ fontSize: 32, fontWeight: 600, letterSpacing: -0.8 }}>{g.pct}%</span>
                  <span style={{ fontSize: 13, color: t.text2 }}>{g.done} of {g.total} subtasks done · {g.totalDur} total</span>
                </div>
                <div style={{ fontSize: 13, color: t.text2 }}>by {g.dl} · {g.weeksLeft} weeks left</div>
              </div>
              <div style={{ height: 8, borderRadius: 4, background: t.chip, position: 'relative', overflow: 'hidden' }}>
                <div style={{
                  position: 'absolute', inset: 0,
                  width: `${g.pct}%`,
                  background: `linear-gradient(90deg, ${t.area[g.col]}, ${t.area[g.col]}aa)`,
                  borderRadius: 4
                }} />
                {/* subtask ticks */}
                {Array.from({ length: g.total - 1 }).map((_, i) => (
                  <span key={i} style={{
                    position: 'absolute', top: 0, bottom: 0,
                    left: `${((i+1)/g.total)*100}%`,
                    width: 1, background: t.bgFlat, opacity: 0.6
                  }} />
                ))}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 10, fontSize: 12, color: t.text3 }}>
                <span>started 14 days ago</span>
                <span>+ 5 subtasks scheduled in next 4 weeks</span>
              </div>
            </AGlass>

            {/* Tabs */}
            <div style={{ display: 'flex', gap: 4, marginTop: 24, borderBottom: `0.5px solid ${t.divider}` }}>
              {['Overview','Schedule','Subtasks','Activity'].map((tab, i) => (
                <div key={tab} style={{
                  padding: '10px 16px',
                  fontSize: 13, fontWeight: 500,
                  color: i === 0 ? t.text : t.text2,
                  borderBottom: i === 0 ? `2px solid ${t.accent}` : '2px solid transparent',
                  marginBottom: -1
                }}>
                  {tab}{tab === 'Subtasks' && <span style={{ marginLeft: 6, color: t.text3, fontWeight: 400 }}>12</span>}
                </div>
              ))}
            </div>

            {/* Body */}
            <div style={{ marginTop: 22, display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 20 }}>
              {/* left: subtask preview + identity */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <AGlass t={t} padding={0}>
                  <div style={{ padding: '14px 18px', borderBottom: `0.5px solid ${t.divider}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ fontSize: 14, fontWeight: 600 }}>Subtasks · preview</div>
                    <AChip t={t}>all 12 →</AChip>
                  </div>
                  <div style={{ padding: '6px 10px 12px' }}>
                    {g.subtasks.slice(0, 6).map((s, i) => (
                      <SubtaskRow key={i} t={t} s={s} />
                    ))}
                  </div>
                </AGlass>

                <AGlass t={t} padding={0}>
                  <div style={{ padding: '14px 18px', borderBottom: `0.5px solid ${t.divider}`, fontSize: 14, fontWeight: 600 }}>Identity</div>
                  <div style={{ padding: '14px 18px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px 24px' }}>
                    <Field t={t} k="type" v={<AChip t={t} accent>goal</AChip>} />
                    <Field t={t} k="area" v={<AChip t={t}><ADot color={t.area[g.col]} size={6} /> {g.area}</AChip>} />
                    <Field t={t} k="priority" v={
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%' }}>
                        <div style={{ flex: 1, height: 4, borderRadius: 2, background: t.chip, position: 'relative' }}>
                          <div style={{ position: 'absolute', inset: 0, width: `${g.priority * 10}%`, background: t.accent, borderRadius: 2 }} />
                        </div>
                        <span className="tnum" style={{ fontSize: 13, fontWeight: 600 }}>{g.priority}</span>
                      </div>
                    } />
                    <Field t={t} k="duration" v={<span style={{ fontSize: 13 }}><span className="tnum" style={{ fontWeight: 600 }}>{g.totalDur}</span> <span style={{ color: t.text3 }}>· rolled-up</span></span>} />
                    <Field t={t} k="place" v={
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <AChip t={t}>📍 {g.place}</AChip>
                        <span style={{ fontSize: 11, color: t.text3 }}>inherited</span>
                      </div>
                    } />
                    <Field t={t} k="deadline" v={<span style={{ fontSize: 13, fontWeight: 600 }}>{g.dl}</span>} />
                  </div>
                </AGlass>
              </div>

              {/* right: schedule + AI + activity */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <AGlass t={t} padding={18} style={{
                  background: `linear-gradient(135deg, ${t.area[g.col]}1a, ${t.surface})`,
                  border: `0.5px solid ${t.area[g.col]}44`
                }}>
                  <div style={{ fontSize: 11, color: t.text3, letterSpacing: 0.4, textTransform: 'uppercase', fontWeight: 500 }}>next on calendar</div>
                  <div style={{ marginTop: 6, fontSize: 22, fontWeight: 600, letterSpacing: -0.4 }}>
                    {g.next.day} · {g.next.time}
                  </div>
                  <div style={{ fontSize: 13, color: t.text2, marginTop: 4 }}>{g.next.title} · {g.next.dur}</div>
                  <div style={{ marginTop: 12, display: 'flex', gap: 6 }}>
                    <AChip t={t}>view on calendar</AChip>
                    <AChip t={t}>reschedule</AChip>
                  </div>
                </AGlass>

                <AGlass t={t} padding={16}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{
                      width: 22, height: 22, borderRadius: 6,
                      background: `linear-gradient(135deg, ${t.accent}, ${t.area.growth})`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 12, fontWeight: 600
                    }}>✦</div>
                    <span style={{ fontSize: 13, fontWeight: 600 }}>AI helper</span>
                    <span style={{ marginLeft: 'auto', fontSize: 11, color: t.text3 }}>scoped to goal</span>
                  </div>
                  <div style={{
                    marginTop: 10,
                    padding: '8px 12px',
                    borderRadius: 10,
                    background: t.chip,
                    fontSize: 13,
                    color: t.text2
                  }}>add 2 recovery weeks before race</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
                    {['estimate durations', 'split subtask', 'tighten timeline', 'add taper'].map(c => (
                      <AChip key={c} t={t}>✦ {c}</AChip>
                    ))}
                  </div>
                </AGlass>

                <AGlass t={t} padding={16}>
                  <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>Engine notes</div>
                  <div style={{ fontSize: 12, color: t.text2, lineHeight: 1.5 }}>{g.engineHint}</div>
                </AGlass>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function SubtaskRow({ t, s }) {
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: '20px 1fr auto auto',
      alignItems: 'center', gap: 12,
      padding: '8px 10px',
      borderRadius: 10,
      background: s.current ? `${t.accent}14` : 'transparent',
      border: s.current ? `0.5px solid ${t.accent}55` : '0.5px solid transparent'
    }}>
      <div style={{
        width: 16, height: 16, borderRadius: 4,
        border: `1px solid ${s.done ? t.success : t.surfaceBorderHi}`,
        background: s.done ? t.success : 'transparent',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 10, color: '#000', fontWeight: 700
      }}>{s.done && '✓'}</div>
      <div style={{
        fontSize: 13,
        color: s.done ? t.text3 : t.text,
        textDecoration: s.done ? 'line-through' : 'none'
      }}>{s.t}</div>
      <span className="tnum" style={{ fontSize: 11, color: t.text3 }}>{s.dur}</span>
      <span style={{ fontSize: 11, color: s.current ? t.accent : t.text3 }}>{s.sched || s.dl}</span>
    </div>
  );
}

function Field({ t, k, v }) {
  return (
    <div>
      <div style={{ fontSize: 11, color: t.text3, letterSpacing: 0.4, textTransform: 'uppercase', fontWeight: 500, marginBottom: 4 }}>{k}</div>
      <div>{v}</div>
    </div>
  );
}

window.AuroraToday = AuroraToday;
window.AuroraCalendar = AuroraCalendar;
window.AuroraGoal = AuroraGoal;
