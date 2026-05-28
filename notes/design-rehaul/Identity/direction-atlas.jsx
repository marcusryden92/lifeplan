// Direction 2 — Atlas · Engineered Precision
// Dark canvas, technical mono accents, signal lime. Space Grotesk + JetBrains Mono.
// Vibe: Linear/Arc/Cron — for the operator who treats their week like a system.

const atlasTokens = {
  bg: '#0a0d10',
  surface: '#14181d',
  surface2: '#1c2026',
  edge: '#2a2f37',
  edgeHi: '#3a4049',
  fg: '#f0f2f0',
  fg2: '#a8afb5',
  fg3: '#6c747c',
  lime: '#c8ff33',
  limeDim: '#85a91d',
};

function Atlas() {
  const t = atlasTokens;
  return (
    <div className="ab" style={{
      width: '100%', height: '100%',
      background: t.bg,
      color: t.fg,
      fontFamily: '"Space Grotesk", system-ui, sans-serif',
      padding: '56px 64px',
      overflow: 'hidden',
      position: 'relative',
    }}>
      {/* Faint grid texture */}
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none', opacity: 0.4,
        backgroundImage: `linear-gradient(${t.edge} 1px, transparent 1px), linear-gradient(90deg, ${t.edge} 1px, transparent 1px)`,
        backgroundSize: '48px 48px',
        maskImage: 'radial-gradient(circle at 80% 0%, rgba(0,0,0,0.6), transparent 60%)',
      }} />

      <div style={{ position: 'relative' }}>
        <AtlasPlate t={t} />
        <AtlasWordmark t={t} />

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 48, marginTop: 56 }}>
          <AtlasPalette t={t} />
          <AtlasType t={t} />
        </div>

        <AtlasAppChrome t={t} />
        <AtlasMarketing t={t} />
        <AtlasVoice t={t} />
      </div>
    </div>
  );
}

function AtlasPlate({ t }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: `1px solid ${t.edge}`, paddingBottom: 24 }}>
      <div>
        <div style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: 11, letterSpacing: '0.18em', color: t.lime, marginBottom: 14 }}>
          02 · ENGINEERED
        </div>
        <div style={{ fontSize: 44, lineHeight: 1, fontWeight: 600, letterSpacing: '-0.03em' }}>
          Atlas
        </div>
        <div style={{ marginTop: 10, color: t.fg2, fontSize: 14, maxWidth: 580, lineHeight: 1.5 }}>
          A constraint solver that wears its precision proudly. Charts, hotkeys, monospace timestamps. For the operator who shipped twice this morning before email.
        </div>
      </div>
      <div style={{ textAlign: 'right', fontFamily: '"JetBrains Mono", monospace', fontSize: 10, lineHeight: 1.8, color: t.fg3, letterSpacing: '0.08em' }}>
        <div>SPACE_GROTESK</div>
        <div>JETBRAINS_MONO</div>
        <div>SIGNAL_LIME 200_50</div>
      </div>
    </div>
  );
}

function AtlasWordmark({ t }) {
  return (
    <div style={{ padding: '52px 0 40px', position: 'relative' }}>
      <div style={{
        fontFamily: '"Space Grotesk", sans-serif',
        fontWeight: 600,
        fontSize: 188,
        lineHeight: 0.9,
        letterSpacing: '-0.06em',
        color: t.fg,
        display: 'flex',
        alignItems: 'baseline',
      }}>
        <span>circadium</span>
        <span style={{
          display: 'inline-block', width: 22, height: 22, background: t.lime,
          marginLeft: 4, transform: 'translateY(-4px)', borderRadius: 3,
        }} />
      </div>

      {/* Tech meta strip */}
      <div style={{
        marginTop: 24, display: 'flex', gap: 18,
        fontFamily: '"JetBrains Mono", monospace', fontSize: 11, letterSpacing: '0.06em', color: t.fg3,
      }}>
        <span>v2026.05</span>
        <span style={{ color: t.edgeHi }}>·</span>
        <span>SOLVER · ACTIVE</span>
        <span style={{ color: t.edgeHi }}>·</span>
        <span style={{ color: t.lime }}>● synced 2s ago</span>
      </div>
    </div>
  );
}

function AtlasPalette({ t }) {
  const sw = [
    { name: 'BG', hex: '#0A0D10', bg: t.bg, fg: t.fg, border: true },
    { name: 'Surface', hex: '#14181D', bg: t.surface, fg: t.fg, border: true },
    { name: 'Surface 2', hex: '#1C2026', bg: t.surface2, fg: t.fg },
    { name: 'Lime', hex: '#C8FF33', bg: t.lime, fg: t.bg },
    { name: 'FG', hex: '#F0F2F0', bg: t.fg, fg: t.bg },
    { name: 'FG · 2', hex: '#A8AFB5', bg: t.fg2, fg: t.bg },
  ];
  return (
    <div>
      <AtlasSectionLabel t={t} num="01" title="PALETTE" />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 18 }}>
        {sw.map((s) => (
          <div key={s.name} style={{
            background: s.bg, color: s.fg,
            padding: '16px 14px', height: 92,
            display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
            border: s.border ? `1px solid ${t.edge}` : 'none',
            borderRadius: 6,
          }}>
            <div style={{ fontSize: 15, fontWeight: 500, letterSpacing: '-0.01em' }}>{s.name}</div>
            <div style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: 10, letterSpacing: '0.08em', opacity: 0.85 }}>
              {s.hex}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function AtlasType({ t }) {
  return (
    <div>
      <AtlasSectionLabel t={t} num="02" title="TYPOGRAPHY" />
      <div style={{ marginTop: 18, display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={{ borderTop: `1px solid ${t.edge}`, paddingTop: 14 }}>
          <AtlasCaption t={t}>DISPLAY · Space Grotesk 600</AtlasCaption>
          <div style={{ fontSize: 44, fontWeight: 600, marginTop: 4, lineHeight: 1, letterSpacing: '-0.03em' }}>
            Time, solved.
          </div>
        </div>
        <div style={{ borderTop: `1px solid ${t.edge}`, paddingTop: 14 }}>
          <AtlasCaption t={t}>UI · Space Grotesk 400/500</AtlasCaption>
          <div style={{ fontSize: 15, marginTop: 4, lineHeight: 1.45, color: t.fg }}>
            Scheduled <span style={{ color: t.lime }}>14 items</span> across 4 categories. Saved you <span style={{ color: t.lime }}>2h 18m</span> of travel.
          </div>
        </div>
        <div style={{ borderTop: `1px solid ${t.edge}`, paddingTop: 14 }}>
          <AtlasCaption t={t}>MONO · JetBrains Mono</AtlasCaption>
          <div style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: 14, marginTop: 4, lineHeight: 1.5, color: t.fg2, fontVariantNumeric: 'tabular-nums' }}>
            {'> solve(week=22) → 14/14 placed in 187ms'}
          </div>
        </div>
      </div>
    </div>
  );
}

function AtlasAppChrome({ t }) {
  return (
    <div style={{ marginTop: 56 }}>
      <AtlasSectionLabel t={t} num="03" title="IN THE PRODUCT" />
      <div style={{
        marginTop: 18, background: t.surface, border: `1px solid ${t.edge}`,
        borderRadius: 10, overflow: 'hidden',
      }}>
        {/* Top bar */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '14px 20px', borderBottom: `1px solid ${t.edge}`, background: t.bg,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 18, height: 18, background: t.lime, borderRadius: 3 }} />
              <div style={{ fontWeight: 600, fontSize: 16, letterSpacing: '-0.02em' }}>circadium</div>
            </div>
            <div style={{ display: 'flex', gap: 4, fontSize: 12.5, color: t.fg2, fontFamily: '"JetBrains Mono", monospace' }}>
              {['CAL', 'INBOX', 'ITEMS', 'CATS', 'LOCS'].map((n, i) => (
                <span key={n} style={{
                  padding: '6px 10px', borderRadius: 5,
                  background: i === 0 ? t.surface2 : 'transparent',
                  color: i === 0 ? t.fg : t.fg2,
                  letterSpacing: '0.06em',
                }}>{n}</span>
              ))}
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              fontFamily: '"JetBrains Mono", monospace', fontSize: 11, color: t.fg2,
              padding: '4px 10px', border: `1px solid ${t.edge}`, borderRadius: 4,
            }}>⌘K</div>
            <div style={{ width: 24, height: 24, borderRadius: 5, background: t.lime, color: t.bg, display: 'grid', placeItems: 'center', fontSize: 11, fontWeight: 600 }}>M</div>
          </div>
        </div>

        {/* Calendar grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '64px 1fr 1fr 1fr 1fr', minHeight: 240 }}>
          <div style={{ borderRight: `1px solid ${t.edge}`, padding: '14px 10px', fontFamily: '"JetBrains Mono", monospace', fontSize: 10, color: t.fg3, lineHeight: 2.4 }}>
            <div>09:00</div><div>10:00</div><div>11:00</div><div>12:00</div>
          </div>
          {['MON 03', 'TUE 04', 'WED 05', 'THU 06'].map((d, i) => (
            <div key={d} style={{ borderRight: i < 3 ? `1px solid ${t.edge}` : 'none', position: 'relative', padding: '8px 6px 0' }}>
              <div style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: 10, color: t.fg3, marginBottom: 8, letterSpacing: '0.1em' }}>{d}</div>
              {i === 0 && (
                <>
                  <AtlasEvent t={t} top={4} h={56} cat="DEEP" title="Spec review" time="09:00 → 10:00" sig />
                  <AtlasEvent t={t} top={68} h={42} cat="MEET" title="1:1 · Jamie" time="10:15 → 10:45" />
                </>
              )}
              {i === 1 && <AtlasEvent t={t} top={20} h={90} cat="DEEP" title="Solver tuning" time="09:30 → 12:00" sig />}
              {i === 2 && (
                <>
                  <AtlasEvent t={t} top={4} h={32} cat="HEALTH" title="Run · 5k" time="08:30 → 09:00" />
                  <AtlasEvent t={t} top={42} h={64} cat="ADMIN" title="Inbox zero" time="09:30 → 10:30" />
                </>
              )}
              {i === 3 && <AtlasEvent t={t} top={56} h={70} cat="CREATIVE" title="Brand pass" time="10:00 → 11:30" sig />}
            </div>
          ))}
        </div>
        {/* Status bar */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 16,
          padding: '8px 20px', borderTop: `1px solid ${t.edge}`,
          background: t.bg, fontFamily: '"JetBrains Mono", monospace', fontSize: 10.5, letterSpacing: '0.06em', color: t.fg3,
        }}>
          <span style={{ color: t.lime }}>● SOLVED</span>
          <span>14/14 placed</span>
          <span>·</span>
          <span>187ms</span>
          <span style={{ flex: 1 }} />
          <span>WEEK 22 · MAY 03 — MAY 09</span>
        </div>
      </div>
    </div>
  );
}

function AtlasEvent({ t, top, h, cat, title, time, sig }) {
  return (
    <div style={{
      position: 'absolute', top, left: 6, right: 6, height: h,
      background: sig ? '#1f2710' : t.surface2,
      borderLeft: `2px solid ${sig ? t.lime : t.edgeHi}`,
      padding: '6px 8px',
      borderRadius: 3,
    }}>
      <div style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: 9, letterSpacing: '0.14em', color: sig ? t.lime : t.fg3 }}>{cat}</div>
      <div style={{ fontSize: 12, color: t.fg, marginTop: 2, fontWeight: 500, lineHeight: 1.15 }}>{title}</div>
      <div style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: 10, color: t.fg2, marginTop: 3 }}>{time}</div>
    </div>
  );
}

function AtlasMarketing({ t }) {
  return (
    <div style={{ marginTop: 48 }}>
      <AtlasSectionLabel t={t} num="04" title="ON THE WEB" />
      <div style={{
        marginTop: 18, background: t.bg,
        border: `1px solid ${t.edge}`, borderRadius: 10,
        padding: '52px 48px 44px', position: 'relative', overflow: 'hidden', minHeight: 280,
      }}>
        {/* Diagonal lime mark */}
        <div style={{ position: 'absolute', top: 0, right: 0, width: 220, height: 220, pointerEvents: 'none' }}>
          <svg viewBox="0 0 220 220" width="220" height="220">
            <g stroke={t.lime} strokeWidth="1" fill="none" opacity="0.5">
              {[...Array(12)].map((_, i) => (
                <line key={i} x1={i * 20} y1={0} x2={220} y2={220 - i * 20} />
              ))}
            </g>
          </svg>
        </div>

        <div style={{
          fontFamily: '"JetBrains Mono", monospace', fontSize: 10, letterSpacing: '0.28em', color: t.lime, marginBottom: 28,
        }}>
          [ CIRCADIUM // SCHEDULING ENGINE ]
        </div>
        <div style={{
          fontSize: 80, fontWeight: 600, lineHeight: 0.96, letterSpacing: '-0.04em',
          color: t.fg, maxWidth: 760,
        }}>
          Time,<br />
          <span style={{ color: t.lime }}>solved.</span>
        </div>
        <div style={{ marginTop: 22, maxWidth: 540, fontSize: 16, lineHeight: 1.5, color: t.fg2 }}>
          A constraint solver for your week. Goals in, optimal calendar out — respecting deadlines, categories, travel, and the way you actually work.
        </div>
        <div style={{ marginTop: 30, display: 'flex', alignItems: 'center', gap: 12 }}>
          <button style={{
            background: t.lime, color: t.bg, border: 'none',
            fontFamily: '"Space Grotesk", sans-serif', fontSize: 14, fontWeight: 600,
            padding: '13px 24px', cursor: 'pointer', borderRadius: 6, letterSpacing: '-0.01em',
          }}>Start solving →</button>
          <button style={{
            background: 'transparent', color: t.fg, border: `1px solid ${t.edge}`,
            fontFamily: '"JetBrains Mono", monospace', fontSize: 12, fontWeight: 500,
            padding: '13px 18px', cursor: 'pointer', borderRadius: 6, letterSpacing: '0.06em',
          }}>$ npx circadium</button>
        </div>
      </div>
    </div>
  );
}

function AtlasVoice({ t }) {
  return (
    <div style={{ marginTop: 36, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 28 }}>
      <div>
        <AtlasCaption t={t}>VOICE</AtlasCaption>
        <div style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: 14, lineHeight: 1.55, color: t.fg, marginTop: 8 }}>
          <span style={{ color: t.lime }}>{'>'}</span> 4 items couldn't fit. Move deadline or<br />
          &nbsp;&nbsp;&nbsp;relax Career window?
        </div>
      </div>
      <div>
        <AtlasCaption t={t}>NOT</AtlasCaption>
        <div style={{ fontFamily: '"Space Grotesk", sans-serif', fontSize: 14, lineHeight: 1.5, color: t.fg3, marginTop: 8, textDecoration: 'line-through' }}>
          Whoops — we couldn't quite fit everything in!
        </div>
      </div>
    </div>
  );
}

function AtlasSectionLabel({ t, num, title }) {
  return (
    <div style={{ display: 'flex', alignItems: 'baseline', gap: 14 }}>
      <div style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: 10, letterSpacing: '0.18em', color: t.lime }}>{num}</div>
      <div style={{ fontSize: 16, fontWeight: 600, letterSpacing: '0.18em', color: t.fg }}>{title}</div>
      <div style={{ flex: 1, height: 1, background: t.edge, marginLeft: 8 }} />
    </div>
  );
}

function AtlasCaption({ t, children }) {
  return (
    <div style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: 10, letterSpacing: '0.18em', color: t.fg3 }}>
      {children}
    </div>
  );
}

window.Atlas = Atlas;
