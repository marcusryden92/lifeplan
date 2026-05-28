/* global React, TODAY, WEEK, GOAL */
// Lumen dashboard — frosted glass over saturated pastel mesh
// Clash Display + Hubot Sans · color-tinted glass events · 10px bezel

// Tech-bright, tight palette: cool blue → indigo → violet for everything
// decorative; green/amber/red survive only as functional status colors.
const lumenLight = {
  peach: '#6366f1', lavender: '#3b82f6', sky: '#3b82f6',
  mint: '#8b5cf6', butter: '#6366f1', coral: '#6366f1',
  success: '#22c55e', warning: '#f59e0b', error: '#ef4444', info: '#3b82f6', accent: '#6366f1',
  paper: '#fdfaf8', ink: '#16142a', inkSoft: '#3c3a52', muted: '#7a7890',
  rule: 'rgba(22,20,42,0.12)',
  glassBg: 'rgba(255,255,255,0.42)',
  glassBgDeep: 'rgba(255,255,255,0.58)',
  glassBgSoft: 'rgba(255,255,255,0.25)',
  glassStroke: 'rgba(255,255,255,0.72)',
  glassHi: 'rgba(255,255,255,0.85)',
  shadow: '0 14px 40px rgba(40,30,60,0.10), inset 0 1px 0 rgba(255,255,255,0.85)',
  shadowSm: '0 6px 20px rgba(40,30,60,0.08), inset 0 1px 0 rgba(255,255,255,0.7)',
  noiseOpacity: 0.18, noiseBlend: 'overlay', blobOpacity: 0.55,
  bezel: '#e4dad0', isDark: false
};

const lumenDark = {
  peach: '#818cf8', lavender: '#60a5fa', sky: '#60a5fa',
  mint: '#a78bfa', butter: '#818cf8', coral: '#818cf8',
  success: '#34d399', warning: '#fbbf24', error: '#f87171', info: '#60a5fa', accent: '#818cf8',
  paper: '#12141a', ink: '#e6e8ec',
  inkSoft: 'rgba(230,232,236,0.65)',
  muted: 'rgba(230,232,236,0.42)',
  rule: 'rgba(230,232,236,0.10)',
  glassBg: 'rgba(230,232,236,0.05)',
  glassBgDeep: 'rgba(230,232,236,0.09)',
  glassBgSoft: 'rgba(230,232,236,0.025)',
  glassStroke: 'rgba(230,232,236,0.16)',
  glassHi: 'rgba(230,232,236,0.20)',
  shadow: '0 14px 40px rgba(0,0,0,0.45), inset 0 1px 0 rgba(230,232,236,0.14)',
  shadowSm: '0 6px 20px rgba(0,0,0,0.40), inset 0 1px 0 rgba(230,232,236,0.12)',
  noiseOpacity: 0.22, noiseBlend: 'soft-light', blobOpacity: 0.48,
  bezel: '#06080b', isDark: true
};

// Colored areas again — base blue/indigo/violet lead, with green/cyan/amber
// for variety so the six areas (and calendar events) stay distinguishable.
const lumenArea = (t) => t.isDark ? ({
  career: '#60a5fa', health: '#34d399', home: '#a78bfa',
  growth: '#818cf8', rel: '#22d3ee', finance: '#fbbf24'
}) : ({
  career: '#3b82f6', health: '#22c55e', home: '#8b5cf6',
  growth: '#6366f1', rel: '#06b6d4', finance: '#f59e0b'
});

const CD = "'Clash Display', sans-serif";
const HS = "'Hubot Sans', system-ui, sans-serif";

const makeGlass = (t, deep) => ({
  background: deep ? t.glassBgDeep : t.glassBg,
  backdropFilter: 'blur(28px) saturate(180%)',
  WebkitBackdropFilter: 'blur(28px) saturate(180%)',
  border: `1px solid ${t.glassStroke}`,
  boxShadow: t.shadow
});

function LMesh({ t }) {
  const blobs = [
    { x: '-14%', y: '-6%', size: 720, color: t.lavender, opacity: t.blobOpacity },
    { x: '58%',  y: '4%',  size: 700, color: t.peach,    opacity: t.blobOpacity * 0.85 },
    { x: '38%',  y: '54%', size: 760, color: t.mint,     opacity: t.blobOpacity * 0.7 }
  ];
  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}>
      {blobs.map((b, i) => (
        <div key={i} style={{
          position: 'absolute', left: b.x, top: b.y,
          width: b.size, height: b.size,
          background: b.color, opacity: b.opacity,
          borderRadius: '50%', filter: 'blur(110px)'
        }} />
      ))}
    </div>
  );
}

function LGrain({ t }) {
  return (
    <div style={{
      position: 'absolute', inset: 0, pointerEvents: 'none',
      opacity: t.noiseOpacity, mixBlendMode: t.noiseBlend,
      backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2'/%3E%3CfeColorMatrix values='0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.4 0'/%3E%3C/filter%3E%3Crect width='200' height='200' filter='url(%23n)'/%3E%3C/svg%3E")`
    }} />
  );
}

function ConicDot({ t, size = 12 }) {
  return (
    <span style={{
      display: 'inline-block', width: size, height: size, borderRadius: 999,
      background: `conic-gradient(from 210deg, ${t.lavender}, ${t.coral}, ${t.mint}, ${t.lavender})`
    }} />
  );
}

function LCaption({ t, children, style = {} }) {
  return <span style={{
    fontFamily: HS, fontSize: 10.5, fontWeight: 700,
    letterSpacing: '0.10em', textTransform: 'uppercase',
    color: t.inkSoft, opacity: 0.85, ...style
  }}>{children}</span>;
}

function LNav({ t, active = 'Today' }) {
  const items = [
    ['Today', '◐'], ['Calendar', '▦'], ['Inbox', '☰'],
    ['Items', '✦'], ['Categories', '◉'], ['Locations', '⌖']
  ];
  return (
    <div style={{
      width: 208, flexShrink: 0,
      borderRight: `1px solid ${t.rule}`,
      background: t.glassBg,
      backdropFilter: 'blur(28px) saturate(180%)',
      WebkitBackdropFilter: 'blur(28px) saturate(180%)',
      padding: '20px 14px',
      display: 'flex', flexDirection: 'column', gap: 4,
      position: 'relative', zIndex: 2
    }}>
      <div style={{ padding: '4px 10px 18px', display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ fontFamily: CD, fontSize: 19, fontWeight: 500, letterSpacing: '-0.03em', color: t.ink }}>circadium</span>
      </div>
      {items.map(([k, icon]) => {
        const sel = k === active;
        return (
        <div key={k} style={{
          padding: '8px 12px', display: 'flex', alignItems: 'center', gap: 12,
          borderRadius: 999,
          background: sel ? t.glassBgDeep : 'transparent',
          border: sel ? `1px solid ${t.glassStroke}` : '1px solid transparent',
          color: sel ? t.ink : t.inkSoft,
          fontSize: 13.5, fontWeight: sel ? 600 : 500,
          fontFamily: HS,
          boxShadow: sel ? `inset 0 1px 0 ${t.glassHi}` : 'none'
        }}>
          <span style={{ width: 14, textAlign: 'center', fontSize: 13 }}>{icon}</span>
          <span>{k}</span>
        </div>
        );
      })}
      <div style={{ flex: 1 }} />
      <div style={{ padding: '12px 12px 4px', borderTop: `1px solid ${t.rule}`, display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{
          width: 30, height: 30, borderRadius: 999,
          background: `linear-gradient(135deg, ${t.peach}, ${t.lavender})`,
          display: 'grid', placeItems: 'center', fontSize: 13, fontWeight: 700, color: '#1a1827',
          boxShadow: t.isDark
            ? `0 0 12px ${t.lavender}55, inset 0 1px 0 rgba(255,255,255,0.3)`
            : '0 2px 8px rgba(40,30,60,0.15), inset 0 1px 0 rgba(255,255,255,0.6)'
        }}>A</div>
        <div style={{ lineHeight: 1.1 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: t.ink, fontFamily: HS }}>Marcus</div>
          <LCaption t={t} style={{ fontSize: 9.5 }}>Beta member</LCaption>
        </div>
      </div>
    </div>
  );
}

function LumenToday({ dark = false }) {
  const t = dark ? lumenDark : lumenLight;
  const g = makeGlass(t);
  const area = lumenArea(t);
  const ev = TODAY.events;
  const goals = TODAY.goals.slice(0, 3);
  const sStats = TODAY.stats.slice(1);

  return (
    <div style={{ width: '100%', height: '100%', boxSizing: 'border-box', padding: 10, background: t.bezel, display: 'flex' }}>
      <div className="tc" style={{
        background: t.paper, color: t.ink,
        fontFamily: HS,
        borderRadius: 30,
        flexDirection: 'row',
        position: 'relative',
        overflow: 'hidden',
        isolation: 'isolate'
      }}>
        <LGrain t={t} />

        <div style={{ position: 'relative', zIndex: 1, display: 'flex', width: '100%', minHeight: 0 }}>
          <LNav t={t} active="Today" />

          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, overflow: 'hidden' }}>
            {/* Top masthead */}
            <div style={{
              padding: '11px 28px',
              borderBottom: `1px solid ${t.rule}`,
              display: 'flex', alignItems: 'baseline', gap: 18,
              background: t.glassBgSoft,
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
              flexShrink: 0
            }}>
              <LCaption t={t}>Vol. 2026</LCaption>
              <LCaption t={t}>Iss. 148</LCaption>
              <LCaption t={t}>Thursday, May 28</LCaption>
              <span style={{ flex: 1 }} />
              <LCaption t={t}>⌘K capture</LCaption>
              <LCaption t={t} style={{ color: t.ink }}>Marcus P.</LCaption>
            </div>

            {/* Hero */}
            <div style={{ padding: '30px 32px 22px', flexShrink: 0, display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 24 }}>
              <div>
                <div style={{
                  fontFamily: CD, fontSize: 56, fontWeight: 500,
                  letterSpacing: '-0.045em', lineHeight: 0.98, color: t.ink
                }}>
                  Good morning, Marcus.
                </div>
                <div style={{ marginTop: 10, fontSize: 14, color: t.inkSoft, fontWeight: 500, fontFamily: HS }}>
                  <span style={{ fontVariantNumeric: 'tabular-nums', fontWeight: 600, color: t.ink }}>6</span> things on today ·{' '}
                  <span style={{ fontVariantNumeric: 'tabular-nums', fontWeight: 600, color: t.ink }}>4h 40m</span> planned ·{' '}
                  <span style={{ color: t.error, fontWeight: 600 }}>1 overdue</span> · 1 scheduled past deadline
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button style={btnGlass(t)}>⌘K capture</button>
                <button style={btnSolid(t)}>Open calendar →</button>
              </div>
            </div>

            {/* Body */}
            <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 18, padding: '0 28px 24px', minHeight: 0 }}>
              {/* LEFT — agenda */}
              <div style={{ ...g, borderRadius: 22, display: 'flex', flexDirection: 'column', minHeight: 0, overflow: 'hidden' }}>
                <div style={{ padding: '16px 20px', borderBottom: `1px solid ${t.rule}`, display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ fontFamily: CD, fontSize: 22, fontWeight: 500, letterSpacing: '-0.02em', color: t.ink }}>What to do today</div>
                    <LCaption t={t} style={{ marginTop: 4, display: 'inline-block' }}>scheduler order · 6 items · 4h 40m</LCaption>
                  </div>
                  <button style={btnGlass(t)}>Full week →</button>
                </div>
                <div style={{ flex: 1, overflow: 'auto', padding: '8px 12px 12px' }} className="noscroll">
                  {ev.map((e, i) => {
                    const ac = e.col ? area[e.col] : t.muted;
                    return (
                      <div key={i} style={{
                        display: 'grid', gridTemplateColumns: '72px 1fr auto', gap: 14, alignItems: 'center',
                        padding: '10px 12px', margin: '4px 0',
                        borderRadius: 14,
                        background: e.now
                          ? (t.isDark ? `${t.coral}1a` : `${t.coral}1f`)
                          : 'transparent',
                        border: e.now ? `1px solid ${t.isDark ? `${t.coral}55` : `${t.coral}66`}` : '1px solid transparent'
                      }}>
                        <div style={{ fontFamily: HS, fontVariantNumeric: 'tabular-nums' }}>
                          <div style={{ fontSize: 13.5, fontWeight: 700, color: e.now ? t.coral : t.ink, letterSpacing: '0.02em' }}>
                            {e.now ? 'NOW' : e.time}
                          </div>
                          <div style={{ fontSize: 11, color: t.muted, marginTop: 2, fontWeight: 600 }}>{e.dur}</div>
                        </div>
                        <div>
                          <div style={{ fontFamily: CD, fontSize: 16, fontWeight: 500, letterSpacing: '-0.02em', color: e.travel ? t.muted : t.ink, fontStyle: e.travel ? 'italic' : 'normal' }}>
                            {e.title}
                          </div>
                          {!e.travel && (
                            <div style={{ marginTop: 4, display: 'flex', alignItems: 'center', gap: 8 }}>
                              <span style={{
                                display: 'inline-flex', alignItems: 'center', gap: 6,
                                padding: '2px 9px', borderRadius: 999,
                                background: ac,
                                border: 'none',
                                color: '#fff',
                                fontSize: 10.5, fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase'
                              }}>{e.area}</span>
                              {e.where && <LCaption t={t}>{e.where}</LCaption>}
                              {e.kind === 'plan' && <LCaption t={t} style={{ color: t.muted }}>· fixed</LCaption>}
                              {e.warn && <span style={{ fontSize: 10, fontWeight: 700, color: t.warning, letterSpacing: '0.08em' }}>LATE</span>}
                              {e.overdue && <span style={{ fontSize: 10, fontWeight: 700, color: t.error, letterSpacing: '0.08em' }}>OVERDUE</span>}
                            </div>
                          )}
                        </div>
                        <span style={{ color: t.muted, fontSize: 16 }}>›</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* RIGHT */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14, overflow: 'auto', minHeight: 0 }} className="noscroll">
                {/* Priority goals */}
                <div style={{ ...g, borderRadius: 22, padding: '16px 20px' }}>
                  <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 8 }}>
                    <div>
                      <div style={{ fontFamily: CD, fontSize: 19, fontWeight: 500, letterSpacing: '-0.02em', color: t.ink }}>Priority goals</div>
                      <LCaption t={t} style={{ marginTop: 3, display: 'inline-block' }}>progress · next step</LCaption>
                    </div>
                    <LCaption t={t}>3 active</LCaption>
                  </div>
                  {goals.map((g2, i) => {
                    const ac = area[g2.col];
                    return (
                      <div key={i} style={{ padding: '12px 0', borderTop: i ? `1px solid ${t.rule}` : 'none' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ width: 9, height: 9, borderRadius: 999, background: ac, boxShadow: `0 0 8px ${ac}88` }} />
                          <span style={{ fontFamily: CD, fontSize: 16, fontWeight: 500, letterSpacing: '-0.02em', flex: 1, color: t.ink }}>{g2.name}</span>
                          <span style={{ fontFamily: HS, fontSize: 11.5, fontWeight: 700, color: t.inkSoft, fontVariantNumeric: 'tabular-nums' }}>{g2.sub}</span>
                        </div>
                        <div style={{ marginTop: 8, height: 6, borderRadius: 999, background: t.isDark ? 'rgba(255,255,255,0.08)' : 'rgba(22,20,42,0.08)', position: 'relative', overflow: 'hidden' }}>
                          <div style={{
                            position: 'absolute', inset: 0, width: `${g2.pct}%`,
                            background: `linear-gradient(90deg, ${ac}, ${ac}cc)`,
                            borderRadius: 999
                          }} />
                        </div>
                        <div style={{ marginTop: 7, display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 10 }}>
                          <span style={{ fontSize: 12, color: t.inkSoft, fontFamily: HS, fontWeight: 500 }}>→ {g2.next}</span>
                          <LCaption t={t} style={{ fontSize: 9.5 }}>by {g2.dl}</LCaption>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Stats strip */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
                  {sStats.map(s => (
                    <div key={s.label} style={{ ...g, borderRadius: 16, padding: '12px 14px', boxShadow: t.shadowSm }}>
                      <LCaption t={t} style={{ fontSize: 9.5 }}>{s.label}</LCaption>
                      <div style={{ fontFamily: CD, fontSize: 26, fontWeight: 500, letterSpacing: '-0.04em', marginTop: 4, lineHeight: 1, color: t.ink, fontVariantNumeric: 'tabular-nums' }}>{s.value}</div>
                      <div style={{ fontSize: 10.5, color: t.muted, marginTop: 3, fontWeight: 600, fontFamily: HS }}>{s.sub}</div>
                    </div>
                  ))}
                </div>

                {/* Engine ribbon */}
                <div style={{ ...g, borderRadius: 16, padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 12, boxShadow: t.shadowSm }}>
                  <ConicDot t={t} size={10} />
                  <div style={{ flex: 1, fontSize: 12.5, color: t.ink, fontWeight: 500, lineHeight: 1.4, fontFamily: HS }}>
                    You have <strong style={{ fontWeight: 700 }}>2h 18m</strong> of unscheduled focus on Thursday. Hold it, or use it?
                  </div>
                  <button style={btnSolid(t, true)}>Use it →</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function btnGlass(t) {
  return {
    background: t.glassBgDeep,
    backdropFilter: 'blur(12px) saturate(140%)',
    WebkitBackdropFilter: 'blur(12px) saturate(140%)',
    border: `1px solid ${t.glassStroke}`,
    padding: '7px 14px', borderRadius: 999,
    fontSize: 12, fontWeight: 600, color: t.ink, fontFamily: HS,
    cursor: 'pointer',
    boxShadow: `inset 0 1px 0 ${t.glassHi}`
  };
}

function btnSolid(t, small) {
  return {
    background: t.ink, color: t.paper, border: 'none',
    padding: small ? '6px 14px' : '8px 16px',
    borderRadius: 999,
    fontSize: small ? 12 : 12.5, fontWeight: 600, fontFamily: HS,
    cursor: 'pointer',
    boxShadow: t.isDark
      ? `0 6px 20px ${t.lavender}33`
      : '0 6px 18px rgba(40,30,60,0.16)'
  };
}

// ============================================================
// CALENDAR
// ============================================================
function LumenCalendar({ dark = false }) {
  const t = dark ? lumenDark : lumenLight;
  const g = makeGlass(t);
  const area = lumenArea(t);

  return (
    <div style={{ width: '100%', height: '100%', boxSizing: 'border-box', padding: 10, background: t.bezel, display: 'flex' }}>
      <div className="tc" style={{
        background: t.paper, color: t.ink,
        fontFamily: HS,
        borderRadius: 30,
        flexDirection: 'row',
        position: 'relative',
        overflow: 'hidden',
        isolation: 'isolate'
      }}>
        <LGrain t={t} />

        <div style={{ position: 'relative', zIndex: 1, display: 'flex', width: '100%', minHeight: 0 }}>
          <LNav t={t} active="Calendar" />

          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, overflow: 'hidden' }}>
            <div style={{
              padding: '11px 28px', borderBottom: `1px solid ${t.rule}`,
              display: 'flex', alignItems: 'baseline', gap: 18,
              background: t.glassBgSoft, backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
              flexShrink: 0
            }}>
              <LCaption t={t}>Vol. 2026</LCaption>
              <LCaption t={t}>Iss. 148</LCaption>
              <LCaption t={t}>{WEEK.range}</LCaption>
              <span style={{ flex: 1 }} />
              <LCaption t={t}>⌘K capture</LCaption>
              <LCaption t={t} style={{ color: t.ink }}>Marcus P.</LCaption>
            </div>

            <div style={{ padding: '20px 28px 18px', display: 'flex', alignItems: 'baseline', gap: 12, flexShrink: 0 }}>
              <div style={{ fontFamily: CD, fontSize: 32, fontWeight: 500, letterSpacing: '-0.03em', color: t.ink, lineHeight: 1 }}>{WEEK.range}</div>
              <div style={{ display: 'flex', gap: 4, marginLeft: 6 }}>
                <button style={{ ...btnGlass(t), padding: '6px 10px' }}>‹</button>
                <button style={{ ...btnGlass(t), padding: '6px 12px' }}>Today</button>
                <button style={{ ...btnGlass(t), padding: '6px 10px' }}>›</button>
              </div>
              <span style={{ flex: 1 }} />
              <button style={btnGlass(t)}>Filters · all</button>
              <button style={btnGlass(t)}>Week ▾</button>
              <button style={btnSolid(t)}>↻ Regenerate</button>
            </div>

            <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 340px', gap: 16, padding: '0 28px 24px', minHeight: 0 }}>
              <div style={{ ...g, borderRadius: 22, display: 'flex', flexDirection: 'column', minHeight: 0, overflow: 'hidden' }}>
                <LumenWeek t={t} area={area} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', minHeight: 0, overflow: 'hidden' }}>
                <div style={{ ...g, borderRadius: 22, padding: '14px 18px', flexShrink: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <ConicDot t={t} size={10} />
                    <div style={{ fontFamily: CD, fontSize: 18, fontWeight: 500, letterSpacing: '-0.02em' }}>Engine</div>
                    <LCaption t={t} style={{ marginLeft: 'auto' }}>last run · 2m ago</LCaption>
                  </div>
                  <div style={{ fontSize: 11.5, color: t.inkSoft, marginTop: 5, fontWeight: 500 }}>1 fail · 2 warn · 42 placed across the week</div>
                </div>
                <div style={{ marginTop: 12, overflow: 'auto', display: 'flex', flexDirection: 'column', gap: 10 }} className="noscroll">
                  {WEEK.engineMsgs.map((m, i) => {
                    const tc = m.tone === 'fail' ? t.error : m.tone === 'warn' ? t.warning : t.success;
                    return (
                      <div key={i} style={{ ...g, borderRadius: 18, padding: '12px 14px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ padding: '2px 8px', borderRadius: 999, background: tc, color: '#fff', fontSize: 9.5, fontWeight: 700, letterSpacing: '0.08em', fontFamily: HS }}>{m.tag}</span>
                          <span style={{ fontFamily: CD, fontSize: 13.5, fontWeight: 500, letterSpacing: '-0.02em', color: t.ink, lineHeight: 1.25 }}>{m.title}</span>
                        </div>
                        <div style={{ fontSize: 11.5, color: t.inkSoft, marginTop: 6, lineHeight: 1.45, fontFamily: HS, fontWeight: 500 }}>{m.body}</div>
                        {(m.tone === 'fail' || m.tone === 'warn') && (
                          <button style={{ ...btnGlass(t), marginTop: 8, padding: '5px 11px', fontSize: 11 }}>See fixes →</button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function LumenWeek({ t, area }) {
  const hourHeight = 44;
  const hours = WEEK.hours;
  return (
    <>
      <div style={{
        display: 'grid', gridTemplateColumns: '56px repeat(7, 1fr)',
        borderBottom: `1px solid ${t.rule}`,
        background: t.glassBgSoft
      }}>
        <div />
        {WEEK.days.map(d => (
          <div key={d.n} style={{ padding: '12px 0', textAlign: 'center', borderLeft: `1px solid ${t.rule}` }}>
            <LCaption t={t} style={{ fontSize: 10 }}>{d.d}</LCaption>
            <div style={{
              fontFamily: CD, fontSize: 22, fontWeight: 500, marginTop: 3,
              color: d.today ? t.coral : t.ink,
              letterSpacing: '-0.03em', fontVariantNumeric: 'tabular-nums'
            }}>{d.n}</div>
          </div>
        ))}
      </div>
      <div style={{ flex: 1, overflow: 'auto', position: 'relative' }} className="noscroll">
        <div style={{
          display: 'grid',
          gridTemplateColumns: '56px repeat(7, 1fr)',
          gridTemplateRows: `repeat(${hours.length}, ${hourHeight}px)`,
          position: 'relative'
        }}>
          {hours.map((h, ri) => (
            <React.Fragment key={h}>
              <div style={{
                gridRow: ri+1, gridColumn: 1,
                padding: '3px 8px',
                fontSize: 10.5, color: t.muted, fontFamily: HS, fontWeight: 600,
                fontVariantNumeric: 'tabular-nums',
                borderTop: ri ? `1px solid ${t.rule}` : 'none'
              }}>{h}:00</div>
              {WEEK.days.map((_, ci) => (
                <div key={ci} style={{
                  gridRow: ri+1, gridColumn: ci+2,
                  borderTop: ri ? `1px solid ${t.rule}` : 'none',
                  borderLeft: `1px solid ${t.rule}`
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
                left: `calc(56px + (100% - 56px) * ${s.day} / 7)`,
                width: `calc((100% - 56px) / 7)`,
                top, height,
                background: t.isDark ? 'rgba(255,255,255,0.025)' : 'rgba(22,20,42,0.025)',
                pointerEvents: 'none'
              }} />
            );
          })}

          {WEEK.events.map((e, i) => {
            const top = (e.start - 7) * hourHeight + 2;
            const height = (e.end - e.start) * hourHeight - 4;
            const color = e.col ? area[e.col] : t.muted;
            const isPlan = e.kind === 'plan';
            const isTmpl = e.kind === 'tmpl';
            return (
              <div key={i} style={{
                position: 'absolute',
                left: `calc(56px + (100% - 56px) * ${e.day} / 7 + 3px)`,
                width: `calc((100% - 56px) / 7 - 6px)`,
                top, height,
                background: e.travel ? 'transparent' : (isTmpl ? `${color}33` : color),
                color: e.travel ? t.muted : (isTmpl ? color : '#fff'),
                border: e.travel ? `1px dashed ${t.glassStroke}` : (e.warn ? `2px solid ${t.coral}` : 'none'),
                borderRadius: 8,
                padding: '4px 8px',
                fontSize: 11.5,
                lineHeight: 1.2,
                overflow: 'hidden',
                fontFamily: HS, fontWeight: 600,
                opacity: isTmpl ? 0.75 : 1,
                fontStyle: e.travel ? 'italic' : 'normal',
                boxShadow: e.current ? `inset 0 1px 0 rgba(255,255,255,0.20)` : 'none'
              }}>
                <div>{e.title}</div>
                {height > 36 && !e.travel && !isTmpl && (
                  <div style={{ fontSize: 9.5, marginTop: 2, opacity: 0.8, fontVariantNumeric: 'tabular-nums', fontWeight: 600 }}>
                    {fmtL(e.start)}–{fmtL(e.end)}
                  </div>
                )}
              </div>
            );
          })}

          <div style={{
            position: 'absolute',
            left: `calc(56px + (100% - 56px) * 2 / 7)`,
            width: `calc((100% - 56px) / 7)`,
            top: (9.6 - 7) * hourHeight,
            height: 1.5,
            background: t.coral,
            zIndex: 5
          }}>
            <span style={{ position: 'absolute', left: -6, top: -4, width: 9, height: 9, borderRadius: 999, background: t.coral }} />
            <span style={{ position: 'absolute', right: 4, top: -16, fontSize: 9.5, fontFamily: HS, fontWeight: 700, color: t.coral, letterSpacing: '0.04em' }}>09:36</span>
          </div>
        </div>
      </div>
    </>
  );
}

function fmtL(h) {
  const hh = Math.floor(h);
  const mm = Math.round((h - hh) * 60);
  return `${hh}:${mm.toString().padStart(2,'0')}`;
}

// ============================================================
// GOAL DETAIL
// ============================================================
function LumenGoal({ dark = false }) {
  const t = dark ? lumenDark : lumenLight;
  const g = makeGlass(t);
  const area = lumenArea(t);
  const goal = GOAL;
  const ac = area[goal.col];

  return (
    <div style={{ width: '100%', height: '100%', boxSizing: 'border-box', padding: 10, background: t.bezel, display: 'flex' }}>
      <div className="tc" style={{
        background: t.paper, color: t.ink,
        fontFamily: HS,
        borderRadius: 30,
        flexDirection: 'row',
        position: 'relative',
        overflow: 'hidden',
        isolation: 'isolate'
      }}>
        <LGrain t={t} />

        <div style={{ position: 'relative', zIndex: 1, display: 'flex', width: '100%', minHeight: 0 }}>
          <LNav t={t} active="Items" />

          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, overflow: 'hidden' }}>
            <div style={{
              padding: '11px 28px', borderBottom: `1px solid ${t.rule}`,
              display: 'flex', alignItems: 'baseline', gap: 12,
              background: t.glassBgSoft, backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
              flexShrink: 0
            }}>
              <LCaption t={t}>Items</LCaption>
              <span style={{ color: t.muted }}>›</span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11, fontWeight: 600, color: t.inkSoft, fontFamily: HS }}>
                <span style={{ width: 8, height: 8, borderRadius: 999, background: ac }} /> {goal.area}
              </span>
              <span style={{ color: t.muted }}>›</span>
              <span style={{ fontSize: 12, fontWeight: 600, color: t.ink, fontFamily: HS }}>{goal.title}</span>
              <span style={{ flex: 1 }} />
              <LCaption t={t}>⌘K capture</LCaption>
              <LCaption t={t} style={{ color: t.ink }}>Marcus P.</LCaption>
            </div>

            <div style={{ flex: 1, overflow: 'auto', padding: '24px 32px 32px' }} className="noscroll">
              <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 24 }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ padding: '3px 10px', borderRadius: 999, background: t.ink, color: t.paper, fontSize: 10.5, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', fontFamily: HS }}>GOAL</span>
                    <span style={{ padding: '3px 10px', borderRadius: 999, background: ac, color: '#fff', fontSize: 10.5, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', fontFamily: HS }}>{goal.area}</span>
                    <LCaption t={t} style={{ marginLeft: 4 }}>{goal.status}</LCaption>
                  </div>
                  <div style={{ fontFamily: CD, fontSize: 56, fontWeight: 500, letterSpacing: '-0.045em', lineHeight: 0.98, color: t.ink, marginTop: 12 }}>{goal.title}</div>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button style={btnGlass(t)}>Duplicate</button>
                  <button style={btnGlass(t)}>Delete</button>
                  <button style={btnSolid(t)}>Save</button>
                </div>
              </div>

              <div style={{ ...g, borderRadius: 22, padding: '20px 24px', marginTop: 22 }}>
                <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 14 }}>
                    <span style={{ fontFamily: CD, fontSize: 44, fontWeight: 500, letterSpacing: '-0.045em', lineHeight: 1, color: t.ink, fontVariantNumeric: 'tabular-nums' }}>{goal.pct}<span style={{ fontSize: 24, opacity: 0.55 }}>%</span></span>
                    <span style={{ fontSize: 13, color: t.inkSoft, fontFamily: HS, fontWeight: 500 }}>{goal.done} of {goal.total} subtasks · {goal.totalDur} total</span>
                  </div>
                  <span style={{ fontSize: 13, color: t.inkSoft, fontFamily: HS, fontWeight: 500 }}>by {goal.dl} · {goal.weeksLeft} weeks left</span>
                </div>
                <div style={{ marginTop: 14, height: 8, borderRadius: 999, background: t.isDark ? 'rgba(255,255,255,0.08)' : 'rgba(22,20,42,0.08)', position: 'relative', overflow: 'hidden' }}>
                  <div style={{ position: 'absolute', inset: 0, width: `${goal.pct}%`, background: `linear-gradient(90deg, ${ac}, ${ac}cc)`, borderRadius: 999 }} />
                  {Array.from({ length: goal.total - 1 }).map((_, i) => (
                    <span key={i} style={{ position: 'absolute', top: 0, bottom: 0, left: `${((i+1)/goal.total)*100}%`, width: 1, background: t.paper, opacity: 0.8 }} />
                  ))}
                </div>
              </div>

              <div style={{ display: 'flex', gap: 6, marginTop: 22, borderBottom: `1px solid ${t.rule}` }}>
                {['Overview','Schedule','Subtasks','Activity'].map((tab, i) => (
                  <div key={tab} style={{
                    padding: '10px 16px', fontSize: 13, fontWeight: 600, fontFamily: HS,
                    color: i === 0 ? t.ink : t.inkSoft,
                    borderBottom: i === 0 ? `2px solid ${t.coral}` : '2px solid transparent',
                    marginBottom: -1
                  }}>
                    {tab}{tab === 'Subtasks' && <span style={{ marginLeft: 6, color: t.muted, fontWeight: 500 }}>{goal.total}</span>}
                  </div>
                ))}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 18, marginTop: 22 }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <div style={{ ...g, borderRadius: 20 }}>
                    <div style={{ padding: '14px 18px', borderBottom: `1px solid ${t.rule}`, display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
                      <div style={{ fontFamily: CD, fontSize: 17, fontWeight: 500, letterSpacing: '-0.02em' }}>Subtasks · preview</div>
                      <button style={{ ...btnGlass(t), padding: '4px 10px', fontSize: 11 }}>all 12 →</button>
                    </div>
                    <div style={{ padding: '6px 10px 12px' }}>
                      {goal.subtasks.slice(0, 6).map((s, i) => (
                        <div key={i} style={{
                          display: 'grid', gridTemplateColumns: '20px 1fr auto auto',
                          gap: 14, alignItems: 'center',
                          padding: '8px 10px', borderRadius: 10,
                          background: s.current ? `${t.coral}1a` : 'transparent',
                          border: s.current ? `1px solid ${t.coral}55` : '1px solid transparent'
                        }}>
                          <div style={{
                            width: 16, height: 16, borderRadius: 4,
                            border: `1.5px solid ${s.done ? t.mint : (t.isDark ? 'rgba(230,232,236,0.30)' : 'rgba(22,20,42,0.30)')}`,
                            background: s.done ? t.mint : 'transparent',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: 10, color: '#fff', fontWeight: 700
                          }}>{s.done && '✓'}</div>
                          <span style={{ fontSize: 13.5, fontFamily: HS, fontWeight: 500, color: s.done ? t.muted : t.ink, textDecoration: s.done ? 'line-through' : 'none' }}>{s.t}</span>
                          <span style={{ fontSize: 10.5, color: t.muted, fontFamily: HS, fontVariantNumeric: 'tabular-nums', fontWeight: 600 }}>{s.dur}</span>
                          <span style={{ fontSize: 10.5, color: s.current ? t.coral : t.muted, fontVariantNumeric: 'tabular-nums', fontWeight: 600, fontFamily: HS }}>{s.sched || s.dl}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div style={{ ...g, borderRadius: 20 }}>
                    <div style={{ padding: '14px 18px', borderBottom: `1px solid ${t.rule}`, fontFamily: CD, fontSize: 17, fontWeight: 500, letterSpacing: '-0.02em' }}>Identity</div>
                    <div style={{ padding: '16px 20px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px 24px' }}>
                      <LField t={t} label="Type" v={<span style={{ padding: '3px 10px', borderRadius: 999, background: t.ink, color: t.paper, fontSize: 10.5, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase' }}>GOAL</span>} />
                      <LField t={t} label="Area" v={<span style={{ padding: '3px 10px', borderRadius: 999, background: ac, color: '#fff', fontSize: 10.5, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase' }}>{goal.area}</span>} />
                      <LField t={t} label="Priority" v={
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div style={{ flex: 1, height: 4, borderRadius: 2, background: t.isDark ? 'rgba(255,255,255,0.08)' : 'rgba(22,20,42,0.08)', position: 'relative', maxWidth: 130 }}>
                            <div style={{ position: 'absolute', inset: 0, width: `${goal.priority * 10}%`, background: t.coral, borderRadius: 2 }} />
                          </div>
                          <span style={{ fontFamily: HS, fontSize: 13, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{goal.priority}</span>
                        </div>
                      } />
                      <LField t={t} label="Duration" v={<span style={{ fontFamily: HS, fontSize: 13, fontWeight: 600 }}>{goal.totalDur} <span style={{ color: t.muted, fontWeight: 500, fontSize: 11 }}>rolled-up</span></span>} />
                      <LField t={t} label="Place" v={
                        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                          <span style={{ padding: '3px 10px', borderRadius: 999, background: t.glassBgDeep, border: `1px solid ${t.glassStroke}`, fontSize: 11, fontWeight: 600, color: t.ink }}>📍 {goal.place}</span>
                          <LCaption t={t} style={{ fontSize: 10 }}>inherited</LCaption>
                        </div>
                      } />
                      <LField t={t} label="Deadline" v={<span style={{ fontFamily: HS, fontSize: 13, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{goal.dl}</span>} />
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <div style={{
                    ...g, borderRadius: 20, padding: '18px 20px',
                    background: t.isDark ? `${ac}22` : `${ac}22`,
                    border: `1px solid ${ac}55`
                  }}>
                    <LCaption t={t}>Next on calendar</LCaption>
                    <div style={{ fontFamily: CD, fontSize: 24, fontWeight: 500, letterSpacing: '-0.03em', marginTop: 6, color: t.ink }}>{goal.next.day} · {goal.next.time}</div>
                    <div style={{ fontSize: 13, color: t.inkSoft, marginTop: 4, fontFamily: HS, fontWeight: 500 }}>{goal.next.title} · {goal.next.dur}</div>
                    <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
                      <button style={{ ...btnGlass(t), padding: '7px 12px', fontSize: 11.5 }}>View calendar</button>
                      <button style={{ ...btnGlass(t), padding: '7px 12px', fontSize: 11.5 }}>Reschedule</button>
                    </div>
                  </div>

                  <div style={{ ...g, borderRadius: 20, padding: '16px 18px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <ConicDot t={t} size={14} />
                      <span style={{ fontFamily: CD, fontSize: 16, fontWeight: 500, letterSpacing: '-0.02em' }}>AI helper</span>
                      <LCaption t={t} style={{ marginLeft: 'auto', fontSize: 9.5 }}>scoped</LCaption>
                    </div>
                    <div style={{ marginTop: 10, padding: '8px 12px', borderRadius: 14, background: t.glassBgSoft, border: `1px solid ${t.rule}`, fontSize: 12.5, color: t.inkSoft, fontWeight: 500, fontFamily: HS }}>Tighten last 2 weeks · add taper</div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 10 }}>
                      {['estimate', 'split', 'tighten', 'add taper'].map(c => (
                        <span key={c} style={{ padding: '3px 10px', borderRadius: 999, background: t.glassBgDeep, border: `1px solid ${t.glassStroke}`, fontSize: 11, fontWeight: 600, color: t.ink, fontFamily: HS }}>✦ {c}</span>
                      ))}
                    </div>
                  </div>

                  <div style={{ ...g, borderRadius: 20, padding: '14px 18px' }}>
                    <LCaption t={t}>Engine notes</LCaption>
                    <div style={{ fontSize: 12.5, color: t.inkSoft, marginTop: 6, lineHeight: 1.5, fontFamily: HS, fontWeight: 500 }}>{goal.engineHint}</div>
                  </div>

                  <div style={{ ...g, borderRadius: 20, padding: '14px 18px' }}>
                    <LCaption t={t}>Why these subtasks</LCaption>
                    <div style={{ fontSize: 12.5, color: t.inkSoft, marginTop: 6, lineHeight: 1.5, fontFamily: HS, fontWeight: 500 }}>{goal.why}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function LField({ t, label, v }) {
  return (
    <div>
      <LCaption t={t} style={{ fontSize: 10 }}>{label}</LCaption>
      <div style={{ marginTop: 6 }}>{v}</div>
    </div>
  );
}

window.LumenToday = LumenToday;
window.LumenCalendar = LumenCalendar;
window.LumenGoal = LumenGoal;
