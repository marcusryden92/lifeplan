/* global React, TODAY */
// Bureau — cool architectural · Geist Mono protagonist · drafting red · wireframe dashboard layout

const bureauTokens = (dark) => dark ? {
  bg: 'radial-gradient(800px 500px at 6% 10%, rgba(120,150,210,0.07), transparent 60%), radial-gradient(700px 600px at 95% 95%, rgba(120,150,210,0.05), transparent 60%), #12141d',
  bgFlat: '#12141d',
  bg2: '#1a1d28',
  bezel: '#06080d',
  text: '#d6dae2',
  text2: 'rgba(214,218,226,0.62)',
  text3: 'rgba(214,218,226,0.38)',
  ink: '#d6dae2',
  ink40: 'rgba(214,218,226,0.40)',
  ink20: 'rgba(214,218,226,0.18)',
  ink10: 'rgba(214,218,226,0.08)',
  accent: '#e85a4f',
  grid: 'rgba(214,218,226,0.04)',
  area: { career: '#8aa0d6', health: '#a2c294', home: '#d49565', growth: '#b495c4', rel: '#d48484', finance: '#d4a868' },
  paneGlass: 'rgba(214,218,226,0.025)'
} : {
  bg: 'radial-gradient(800px 500px at 6% 10%, rgba(60,90,150,0.05), transparent 60%), radial-gradient(700px 600px at 95% 95%, rgba(60,90,150,0.04), transparent 60%), #e3e5ea',
  bgFlat: '#e3e5ea',
  bg2: '#d2d4d9',
  bezel: '#b3b6bc',
  text: '#14161d',
  text2: 'rgba(20,22,29,0.62)',
  text3: 'rgba(20,22,29,0.38)',
  ink: '#14161d',
  ink40: 'rgba(20,22,29,0.40)',
  ink20: 'rgba(20,22,29,0.18)',
  ink10: 'rgba(20,22,29,0.08)',
  accent: '#c33028',
  grid: 'rgba(20,22,29,0.04)',
  area: { career: '#3a5e98', health: '#587638', home: '#a55518', growth: '#6e3a78', rel: '#a83838', finance: '#a06820' },
  paneGlass: 'rgba(20,22,29,0.025)'
};

const BGS = "'Geist', sans-serif";
const BGM = "'Geist Mono', monospace";

function BTag({ t, children, accent, style = {} }) {
  return <span style={{
    fontFamily: BGM, fontSize: 10, letterSpacing: 1.2, textTransform: 'uppercase',
    color: accent ? t.accent : t.text2, ...style
  }}>{children}</span>;
}

function BCard({ t, children, title, sub, badge, glass, style = {} }) {
  return (
    <div style={{
      border: `1px solid ${t.ink}`,
      background: glass ? t.paneGlass : 'transparent',
      backdropFilter: glass ? 'blur(20px) saturate(140%)' : 'none',
      WebkitBackdropFilter: glass ? 'blur(20px) saturate(140%)' : 'none',
      display: 'flex', flexDirection: 'column',
      minHeight: 0,
      ...style
    }}>
      {(title || sub) && (
        <div style={{ padding: '10px 16px', borderBottom: `1px solid ${t.ink40}`, display: 'flex', alignItems: 'baseline', gap: 12 }}>
          {title && <span style={{ fontFamily: BGS, fontSize: 14, fontWeight: 600, letterSpacing: -0.2, color: t.text }}>{title}</span>}
          {sub && <BTag t={t}>{sub}</BTag>}
          <span style={{ flex: 1 }} />
          {badge && <BTag t={t}>{badge}</BTag>}
        </div>
      )}
      <div style={{ flex: 1, minHeight: 0 }}>{children}</div>
    </div>
  );
}

function BNav({ t }) {
  const items = [
    ['today', '▣', 'T', true], ['library', '☤', 'L'], ['calendar', '▦', 'C'],
    ['areas', '✦', 'A'], ['places', '◉', 'P'], ['engine', '⌗', 'E']
  ];
  return (
    <div style={{
      width: 196, flexShrink: 0,
      borderRight: `1px solid ${t.ink}`,
      background: t.paneGlass,
      backdropFilter: 'blur(22px) saturate(140%)',
      WebkitBackdropFilter: 'blur(22px) saturate(140%)',
      display: 'flex', flexDirection: 'column'
    }}>
      <div style={{ padding: '14px 14px 14px', borderBottom: `1px solid ${t.ink40}`, display: 'flex', alignItems: 'baseline', gap: 8 }}>
        <span style={{ fontFamily: BGS, fontSize: 14, fontWeight: 600, letterSpacing: 1.2 }}>CIRCADIUM</span>
        <span style={{ flex: 1 }} />
        <BTag t={t}>v0.4</BTag>
      </div>
      <div style={{ padding: '10px 8px', display: 'flex', flexDirection: 'column', gap: 2 }}>
        {items.map(([k, icon, key, sel]) => (
          <div key={k} style={{
            padding: '7px 10px', display: 'flex', alignItems: 'center', gap: 10,
            background: sel ? t.ink10 : 'transparent',
            color: sel ? t.text : t.text2,
            fontSize: 12.5, fontWeight: 500
          }}>
            <span style={{ fontSize: 12, color: sel ? t.accent : t.text3, width: 12 }}>{icon}</span>
            <span style={{ flex: 1, fontFamily: BGS, letterSpacing: -0.1 }}>{k}</span>
            <span style={{ fontSize: 10, color: t.ink40 }}>{key}</span>
          </div>
        ))}
      </div>
      <div style={{ flex: 1 }} />
      <div style={{ padding: '10px 14px', borderTop: `1px solid ${t.ink40}`, fontSize: 10, letterSpacing: 1.2, color: t.text3, display: 'flex', flexDirection: 'column', gap: 4 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>CAPTURE</span><span>⌘K</span></div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>SEARCH</span><span>⌘/</span></div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>REGEN</span><span>⇧R</span></div>
      </div>
    </div>
  );
}

function BureauToday({ dark = false }) {
  const t = bureauTokens(dark);
  const ev = TODAY.events;
  const goals = TODAY.goals.slice(0, 3);
  const sStats = TODAY.stats.slice(1);
  const gridBg = `
    linear-gradient(${t.grid} 1px, transparent 1px) 0 0 / 100% 32px,
    linear-gradient(90deg, ${t.grid} 1px, transparent 1px) 0 0 / 32px 100%
  `;

  return (
    <div style={{ width: '100%', height: '100%', boxSizing: 'border-box', padding: 10, background: t.bezel, display: 'flex' }}>
      <div className="tc" style={{
        background: t.bg, color: t.text, fontFamily: BGM,
        fontFeatureSettings: '"tnum","cv11"',
        backgroundImage: gridBg, borderRadius: 30,
        flexDirection: 'row',
        overflow: 'hidden',
        isolation: 'isolate'
      }}>
        <BNav t={t} />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, overflow: 'hidden' }}>
        {/* Sheet header */}
        <div style={{
          padding: '11px 28px', borderBottom: `1.5px solid ${t.ink}`, flexShrink: 0,
          display: 'flex', alignItems: 'baseline', gap: 12,
          fontSize: 10.5, letterSpacing: 1.5, textTransform: 'uppercase'
        }}>
          <span style={{ fontFamily: BGS, fontSize: 13, fontWeight: 600, letterSpacing: 1.5 }}>CIRCADIUM</span>
          <span style={{ color: t.ink40 }}>//</span>
          <span style={{ color: t.text2 }}>BUREAU</span>
          <span style={{ color: t.ink40 }}>//</span>
          <span className="tnum" style={{ color: t.text2 }}>2026.05.28</span>
          <span style={{ color: t.ink40 }}>//</span>
          <span style={{ color: t.text2 }}>THU</span>
          <span style={{ flex: 1 }} />
          <span style={{ color: t.text2 }}>SHEET 01/04 · TODAY</span>
          <span style={{ color: t.ink40 }}>·</span>
          <span style={{ color: t.text2 }}>⌘K CAPTURE</span>
        </div>

        {/* Hero */}
        <div style={{
          padding: '24px 28px 22px',
          borderBottom: `1px solid ${t.ink40}`,
          display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 24,
          flexShrink: 0
        }}>
          <div>
            <BTag t={t} style={{ color: t.accent }}>● 2026.05.28 — Thursday</BTag>
            <div style={{ fontFamily: BGS, fontSize: 38, fontWeight: 600, letterSpacing: -1, marginTop: 6, lineHeight: 1 }}>
              Good morning, Alex.
            </div>
            <div style={{ fontFamily: BGM, fontSize: 11.5, color: t.text2, marginTop: 8, letterSpacing: 0.4 }}>
              <span className="tnum">6</span> items · <span className="tnum">4h 40m</span> planned ·{' '}
              <span style={{ color: t.accent }}>1 OVERDUE</span> · 1 LATE
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button style={btnB(t)}>TRIAGE 4 →</button>
            <button style={btnB(t, true)}>OPEN CALENDAR</button>
          </div>
        </div>

        {/* Body */}
        <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1.4fr 1fr', minHeight: 0 }}>
          {/* LEFT — schedule */}
          <div style={{ padding: '18px 28px 22px', overflow: 'auto', display: 'flex', flexDirection: 'column', borderRight: `1px solid ${t.ink40}` }} className="noscroll">
            <BCard t={t} title="What to do today" sub="row a · scheduler order" badge={`${ev.length} items · 4h 40m`}>
              {/* table header */}
              <div style={{
                display: 'grid', gridTemplateColumns: '40px 60px 12px 1fr 60px 90px 80px',
                gap: 10, padding: '6px 16px',
                fontFamily: BGM, fontSize: 9, letterSpacing: 1.5, textTransform: 'uppercase',
                color: t.text3, borderBottom: `1px dashed ${t.ink20}`
              }}>
                <span>NO</span><span>TIME</span><span /><span>ITEM</span><span>DUR</span><span>AREA</span><span style={{ textAlign: 'right' }}>STATE</span>
              </div>
              {ev.map((e, i) => (
                <div key={i} style={{
                  display: 'grid', gridTemplateColumns: '40px 60px 12px 1fr 60px 90px 80px',
                  gap: 10, padding: '10px 16px',
                  borderTop: i ? `1px dashed ${t.ink10}` : 'none',
                  alignItems: 'center',
                  fontSize: 11, letterSpacing: 0.3,
                  background: e.now ? `${t.accent}10` : 'transparent'
                }}>
                  <span className="tnum" style={{ color: t.ink40 }}>{(i+1).toString().padStart(2,'0')}</span>
                  <span className="tnum" style={{ color: e.now ? t.accent : t.text2, fontWeight: e.now ? 600 : 400 }}>{e.now ? 'NOW' : e.time}</span>
                  <span style={{
                    width: 8, height: 8, borderRadius: 1.5,
                    background: e.travel ? 'transparent' : t.area[e.col],
                    border: e.travel ? `1px dashed ${t.ink40}` : 'none'
                  }} />
                  <span style={{ fontFamily: BGS, fontSize: 14, fontWeight: e.now ? 600 : 500, letterSpacing: -0.2, color: e.travel ? t.text3 : t.text, fontStyle: e.travel ? 'italic' : 'normal' }}>
                    {e.title}
                  </span>
                  <span className="tnum" style={{ color: t.text2 }}>{e.dur}</span>
                  <span style={{ color: t.text2, textTransform: 'uppercase', fontSize: 10 }}>{e.travel ? 'TRANSIT' : e.area}</span>
                  <span style={{ fontSize: 9.5, color: e.warn || e.overdue ? t.accent : t.text3, textAlign: 'right', letterSpacing: 1 }}>
                    {e.overdue ? '! OVERDUE' : e.warn ? '! LATE' : e.now ? '● NOW' : e.kind === 'plan' ? '■ FIXED' : '— OK'}
                  </span>
                </div>
              ))}
              <div style={{ padding: '8px 16px', borderTop: `1px solid ${t.ink40}`, display: 'flex', justifyContent: 'space-between' }}>
                <BTag t={t}>+ ADD</BTag>
                <BTag t={t}>FULL WEEK →</BTag>
              </div>
            </BCard>
          </div>

          {/* RIGHT — goals + stats + engine */}
          <div style={{
            padding: '18px 28px 22px', overflow: 'auto',
            display: 'flex', flexDirection: 'column', gap: 14,
            background: t.paneGlass,
            backdropFilter: 'blur(22px) saturate(140%)',
            WebkitBackdropFilter: 'blur(22px) saturate(140%)'
          }} className="noscroll">
            <BCard t={t} title="Priority goals" sub="row b · in play" badge={`${goals.length} active`}>
              {goals.map((g, i) => (
                <div key={i} style={{ padding: '12px 16px', borderTop: i ? `1px dashed ${t.ink10}` : 'none' }}>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
                    <span style={{ width: 8, height: 8, background: t.area[g.col], borderRadius: 1.5, transform: 'translateY(1px)' }} />
                    <span style={{ fontFamily: BGS, fontSize: 14, fontWeight: 600, letterSpacing: -0.2, flex: 1 }}>{g.name}</span>
                    <span className="tnum" style={{ fontSize: 10.5, color: t.text2 }}>{g.sub}</span>
                    <span className="tnum" style={{ fontSize: 11, color: t.text, fontWeight: 600 }}>{g.pct}%</span>
                  </div>
                  {/* elevation bar with ticks */}
                  <div style={{ marginTop: 6, height: 10, position: 'relative', border: `1px solid ${t.ink}` }}>
                    <div style={{ position: 'absolute', inset: 0, width: `${g.pct}%`, background: t.area[g.col] }} />
                    {[25, 50, 75].map(p => (
                      <span key={p} style={{ position: 'absolute', top: -2, bottom: -2, left: `${p}%`, width: 0.5, background: t.ink40 }} />
                    ))}
                  </div>
                  <div style={{ marginTop: 6, display: 'flex', alignItems: 'baseline', gap: 8 }}>
                    <BTag t={t}>NEXT</BTag>
                    <span style={{ fontSize: 12, color: t.text2, flex: 1, fontFamily: BGS }}>{g.next}</span>
                    <BTag t={t}>by {g.dl}</BTag>
                  </div>
                </div>
              ))}
            </BCard>

            {/* Stats strip */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
              {sStats.map(s => (
                <div key={s.label} style={{ border: `1px solid ${t.ink40}`, padding: '12px 14px' }}>
                  <BTag t={t}>{s.label}</BTag>
                  <div className="tnum" style={{ fontFamily: BGS, fontSize: 22, fontWeight: 600, letterSpacing: -0.6, marginTop: 4, lineHeight: 1 }}>{s.value}</div>
                  <div style={{ fontFamily: BGM, fontSize: 10, color: t.text3, marginTop: 3, letterSpacing: 0.5 }}>{s.sub}</div>
                </div>
              ))}
            </div>

            {/* Engine */}
            <div style={{ border: `1px solid ${t.ink40}`, borderLeft: `2px solid ${t.accent}`, padding: '10px 14px', background: t.paneGlass }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                <BTag t={t} accent>● ENGINE</BTag>
                <BTag t={t}>last gen · 2m ago · 412ms</BTag>
              </div>
              <div style={{ fontFamily: BGM, fontSize: 11, color: t.text2, marginTop: 5, letterSpacing: 0.3 }}>
                42 placed · 38 ok · <span style={{ color: t.accent }}>1 FAIL</span> · 2 WARN — view console →
              </div>
            </div>
          </div>
        </div>

        {/* Bottom legend */}
        <div style={{ padding: '10px 28px', borderTop: `1.5px solid ${t.ink}`, display: 'flex', alignItems: 'baseline', gap: 20, flexShrink: 0, fontSize: 9.5, letterSpacing: 1.5, textTransform: 'uppercase' }}>
          <BTag t={t}>KEY</BTag>
          <BTag t={t}><span style={{ color: t.accent }}>━</span> ACCENT · NOW</BTag>
          <BTag t={t}>■ FIXED</BTag>
          <BTag t={t}>┄ TRANSIT</BTag>
          <span style={{ flex: 1 }} />
          <BTag t={t}>LAST GEN · 2M</BTag>
          <BTag t={t} accent>· 1 FAIL</BTag>
          <BTag t={t}>· 2 WARN</BTag>
        </div>
        </div>
      </div>
    </div>
  );
}

function btnB(t, primary) {
  return {
    padding: '8px 14px',
    fontFamily: BGM, fontSize: 10.5, fontWeight: 500,
    letterSpacing: 1.2, textTransform: 'uppercase',
    border: `1px solid ${primary ? t.accent : t.ink40}`,
    background: primary ? t.accent : 'transparent',
    color: primary ? '#fff' : t.text,
    cursor: 'pointer'
  };
}

window.BureauToday = BureauToday;
