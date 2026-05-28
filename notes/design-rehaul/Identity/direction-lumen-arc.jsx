// Direction 5/6 — LumenArc · Cleaned
// No background blobs. No rainbow gradients. Three colors: Coral, Lavender, Sky.
// Glass surfaces over paper (or deep plum in dark mode). Clash Display + Hubot Sans.

const lumenArcLight = {
  // Three brand colors — that's it.
  coral: '#d9402b',
  lavender: '#9b86ff',
  sky: '#4dd4ff',

  // Surface neutrals.
  paper: '#fdfaf8',
  paperSoft: '#f4f0ec',
  ink: '#16142a',
  inkSoft: '#3c3a52',
  muted: '#7a7890',
  rule: 'rgba(22,20,42,0.10)',

  // Glass tokens.
  glassBg: 'rgba(255,255,255,0.55)',
  glassBgDeep: 'rgba(255,255,255,0.72)',
  glassBgSoft: 'rgba(255,255,255,0.32)',
  glassStroke: 'rgba(255,255,255,0.85)',
  glassHi: 'rgba(255,255,255,0.9)',
  shadow: '0 14px 40px rgba(40,30,60,0.08), inset 0 1px 0 rgba(255,255,255,0.85)',
  shadowSm: '0 6px 18px rgba(40,30,60,0.06), inset 0 1px 0 rgba(255,255,255,0.7)',
  isDark: false,
};

const lumenArcDark = {
  coral: '#d9402b',
  lavender: '#9b86ff',
  sky: '#4dd4ff',

  paper: '#0e0a1c',
  paperSoft: '#181229',
  ink: '#fbf6ff',
  inkSoft: '#c8bedd',
  muted: '#8a7fa0',
  rule: 'rgba(255,255,255,0.08)',

  glassBg: 'rgba(255,255,255,0.05)',
  glassBgDeep: 'rgba(255,255,255,0.09)',
  glassBgSoft: 'rgba(255,255,255,0.03)',
  glassStroke: 'rgba(255,255,255,0.14)',
  glassHi: 'rgba(255,255,255,0.18)',
  shadow: '0 14px 40px rgba(0,0,0,0.40), inset 0 1px 0 rgba(255,255,255,0.12)',
  shadowSm: '0 6px 18px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.10)',
  isDark: true,
};

const makeGlassArc = (t, deep) => ({
  background: deep ? t.glassBgDeep : t.glassBg,
  backdropFilter: 'blur(28px) saturate(180%)',
  WebkitBackdropFilter: 'blur(28px) saturate(180%)',
  border: `1px solid ${t.glassStroke}`,
  boxShadow: t.shadow,
});

function LumenArc({ dark = false }) {
  const t = dark ? lumenArcDark : lumenArcLight;
  const g = makeGlassArc(t);
  return (
    <div className="ab" style={{
      width: '100%', height: '100%',
      background: t.paper,
      color: t.ink,
      fontFamily: '"Hubot Sans", "Clash Display", system-ui, sans-serif',
      padding: '56px 64px',
      overflow: 'hidden',
      position: 'relative',
    }}>
      <LumenArcPinstripes t={t} />
      <LumenArcGrain t={t} />

      <div style={{ position: 'relative', zIndex: 1 }}>
        <LumenArcPlate t={t} g={g} />
        <LumenArcWordmark t={t} g={g} />

        <LumenArcType t={t} g={g} />

        <LumenArcAppChrome t={t} g={g} />
        <LumenArcMarketing t={t} g={g} />
        <LumenArcVoice t={t} g={g} />
      </div>
    </div>
  );
}

function LumenArcGrain({ t }) {
  return (
    <div style={{
      position: 'absolute', inset: 0, pointerEvents: 'none',
      opacity: t.isDark ? 0.22 : 0.14, mixBlendMode: t.isDark ? 'soft-light' : 'overlay',
      backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2'/%3E%3CfeColorMatrix values='0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.4 0'/%3E%3C/filter%3E%3Crect width='200' height='200' filter='url(%23n)'/%3E%3C/svg%3E")`,
    }} />
  );
}

// 3-segment dot replacing the previous rainbow conic.
function TriDotArc({ t, size = 12 }) {
  return (
    <span style={{
      display: 'inline-block', width: size, height: size, borderRadius: 999,
      background: `conic-gradient(from 90deg, ${t.coral} 0deg 120deg, ${t.lavender} 120deg 240deg, ${t.sky} 240deg 360deg)`,
    }} />
  );
}

function LumenArcPinstripes({ t }) {
  // Diagonal hairlines across the whole artboard — architect's tracing
  // paper, very subtle. The whole layer is fixed opacity, no animation.
  const stripe = t.isDark ? 'rgba(255,255,255,0.05)' : 'rgba(22,20,42,0.055)';
  return (
    <div style={{
      position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 0,
      background: `repeating-linear-gradient(45deg, transparent 0, transparent 9px, ${stripe} 9px, ${stripe} 10px)`,
    }} />
  );
}

function LumenArcConstructionLines({ t }) {
  // Three dashed hairlines crossing the wordmark card horizontally at
  // cap-height, x-height, and baseline. Tiny mono labels on the right edge.
  const line = t.isDark ? 'rgba(255,255,255,0.18)' : 'rgba(22,20,42,0.18)';
  const labelColor = t.isDark ? 'rgba(255,255,255,0.5)' : 'rgba(22,20,42,0.5)';
  const lines = [
    { top: 78, label: 'cap · 1.00em' },
    { top: 150, label: 'x-height · 0.62em' },
    { top: 244, label: 'baseline · 0.00em' },
  ];
  return (
    <>
      {lines.map((l) => (
        <React.Fragment key={l.top}>
          <div style={{
            position: 'absolute', top: l.top, left: 24, right: 150,
            height: 0, borderTop: `1px dashed ${line}`,
          }} />
          <div style={{
            position: 'absolute', top: l.top - 9, right: 24,
            fontFamily: '"Hubot Sans", monospace', fontSize: 9, fontWeight: 600,
            letterSpacing: '0.08em', color: labelColor, textTransform: 'uppercase',
            background: t.glassBgDeep, padding: '2px 9px', borderRadius: 999,
            border: `1px solid ${t.glassStroke}`,
            backdropFilter: 'blur(10px)',
          }}>
            {l.label}
          </div>
        </React.Fragment>
      ))}
    </>
  );
}

function LumenArcCrosshair({ t, pos }) {
  const c = t.isDark ? 'rgba(255,255,255,0.3)' : 'rgba(22,20,42,0.3)';
  const size = 14;
  return (
    <div style={{ position: 'absolute', width: size, height: size, ...pos, pointerEvents: 'none' }}>
      <div style={{ position: 'absolute', left: size / 2 - 0.5, top: 0, width: 1, height: size, background: c }} />
      <div style={{ position: 'absolute', top: size / 2 - 0.5, left: 0, height: 1, width: size, background: c }} />
    </div>
  );
}

function LumenArcPlate({ t, g }) {
  return (
    <div style={{ ...g, borderRadius: 20, padding: '20px 26px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
      <div>
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 10,
          background: t.glassBgDeep, backdropFilter: 'blur(10px)',
          padding: '4px 12px', borderRadius: 999,
          fontSize: 11, fontWeight: 600, letterSpacing: '0.08em',
          color: t.ink, marginBottom: 14, border: `1px solid ${t.glassStroke}`,
        }}>
          <TriDotArc t={t} />
          {t.isDark ? '06 · LumenArc Noir' : '05 · LumenArc'}
        </div>
        <div style={{ fontFamily: '"Clash Display", sans-serif', fontSize: 46, lineHeight: 0.95, color: t.ink, fontWeight: 500, letterSpacing: '-0.04em' }}>
          {t.isDark ? 'LumenArc / Noir' : 'LumenArc'}
        </div>
        <div style={{ marginTop: 12, color: t.inkSoft, fontSize: 14, maxWidth: 580, lineHeight: 1.55, fontWeight: 500 }}>
          {t.isDark
            ? 'Same Lumen, with a draftsman in the room. Three colors. Construction lines, diagonal hairline pinstripes, blueprint annotations. Luminous, but measured.'
            : 'Same Lumen, with a draftsman in the room. Three colors. Construction lines, diagonal hairline pinstripes, blueprint annotations. Luminous, but measured.'}
        </div>
      </div>
      <div style={{ textAlign: 'right', fontSize: 10.5, lineHeight: 1.9, color: t.inkSoft, fontWeight: 500, letterSpacing: '0.04em' }}>
        <div>Clash Display · 400/500</div>
        <div>Hubot Sans · 400/600</div>
        <div style={{ color: t.ink, fontWeight: 700 }}>{t.isDark ? 'Glass · 5% · blur 28' : 'Glass · 55% · blur 28'}</div>
      </div>
    </div>
  );
}

function LumenArcWordmark({ t, g }) {
  return (
    <div style={{ marginTop: 28, ...g, borderRadius: 28, padding: '60px 40px 52px', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
      <LumenArcConstructionLines t={t} />
      <LumenArcCrosshair t={t} pos={{ top: 14, left: 14 }} />
      <LumenArcCrosshair t={t} pos={{ top: 14, right: 14 }} />
      <LumenArcCrosshair t={t} pos={{ bottom: 14, left: 14 }} />
      <LumenArcCrosshair t={t} pos={{ bottom: 14, right: 14 }} />
      <div style={{
        fontFamily: '"Clash Display", sans-serif',
        fontWeight: 500,
        fontSize: 200,
        lineHeight: 0.92,
        letterSpacing: '-0.06em',
        color: t.ink,
        position: 'relative',
        display: 'inline-flex',
        alignItems: 'baseline',
      }}>
        <span>circadium</span>
        <span style={{
          display: 'inline-block', width: 22, height: 22, borderRadius: 999,
          background: t.coral,
          marginLeft: 10, transform: 'translateY(-8px)',
          boxShadow: t.isDark
            ? `0 0 24px ${t.coral}80, inset 0 1px 0 rgba(255,255,255,0.4)`
            : `0 4px 14px ${t.coral}40, inset 0 1px 0 rgba(255,255,255,0.7)`,
        }} />
      </div>
      <div style={{
        marginTop: 18, fontFamily: '"Clash Display", sans-serif', fontSize: 14, fontWeight: 400,
        color: t.inkSoft, letterSpacing: '0.02em',
      }}>
        a luminous scheduling engine — bright on purpose
      </div>

      {/* Three-color stripe — the entire palette in one line */}
      <div style={{
        marginTop: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 28,
        paddingTop: 24, borderTop: `1px solid ${t.rule}`,
      }}>
        {[
          { name: 'Coral', hex: '#D9402B', color: t.coral, role: 'signal' },
          { name: 'Lavender', hex: '#9B86FF', color: t.lavender, role: 'primary' },
          { name: 'Sky', hex: '#4DD4FF', color: t.sky, role: 'context' },
        ].map((c) => (
          <div key={c.name} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 36, height: 36, borderRadius: 10,
              background: c.color,
              border: `1px solid ${t.glassStroke}`,
              boxShadow: t.isDark
                ? `0 0 18px ${c.color}55, inset 0 1px 0 rgba(255,255,255,0.18)`
                : `0 6px 16px ${c.color}30, inset 0 1px 0 rgba(255,255,255,0.6)`,
            }} />
            <div style={{ textAlign: 'left' }}>
              <div style={{ fontFamily: '"Clash Display", sans-serif', fontSize: 16, fontWeight: 500, color: t.ink, letterSpacing: '-0.01em', lineHeight: 1 }}>{c.name}</div>
              <div style={{ fontSize: 10, color: t.muted, fontWeight: 600, letterSpacing: '0.06em', marginTop: 2, fontVariantNumeric: 'tabular-nums' }}>
                {c.hex} · {c.role}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function LumenArcType({ t, g }) {
  return (
    <div style={{ marginTop: 28, ...g, borderRadius: 24, padding: '24px 28px' }}>
      <LumenArcSectionLabel t={t} num="i" title="Typography" />
      <div style={{ marginTop: 18, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 36 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <LumenArcCaption t={t}>Display · Clash Display 500</LumenArcCaption>
            <div style={{ fontFamily: '"Clash Display", sans-serif', fontSize: 48, fontWeight: 500, marginTop: 4, lineHeight: 0.98, letterSpacing: '-0.04em' }}>
              A brighter week.
            </div>
          </div>
          <div>
            <LumenArcCaption t={t}>UI · Hubot Sans 500</LumenArcCaption>
            <div style={{ fontSize: 15, marginTop: 4, lineHeight: 1.5, color: t.ink, fontWeight: 500 }}>
              Fourteen items, gently arranged. The work still gets done — it just feels less like a fight.
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <LumenArcCaption t={t}>Numerics · Hubot Sans tnum</LumenArcCaption>
            <div style={{ fontSize: 18, marginTop: 4, color: t.ink, fontVariantNumeric: 'tabular-nums', fontWeight: 600 }}>
              09:00 → 11:30 · 2h 30m
            </div>
            <div style={{ fontSize: 14, marginTop: 6, color: t.inkSoft, fontVariantNumeric: 'tabular-nums', fontWeight: 500 }}>
              <span style={{ color: t.coral, fontWeight: 700 }}>6 of 14</span> done · <span style={{ color: t.sky, fontWeight: 700 }}>2h 18m</span> unscheduled
            </div>
          </div>
          <div>
            <LumenArcCaption t={t}>Voice</LumenArcCaption>
            <div style={{ fontFamily: '"Clash Display", sans-serif', fontSize: 17, lineHeight: 1.35, color: t.ink, marginTop: 6, fontWeight: 500, letterSpacing: '-0.01em' }}>
              "There's space on Thursday afternoon. Want to spend it on the book?"
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function LumenArcAppChrome({ t, g }) {
  return (
    <div style={{ marginTop: 28 }}>
      <div style={{ marginBottom: 12 }}>
        <LumenArcSectionLabel t={t} num="ii" title="In the product" inline />
      </div>
      <div style={{ ...g, borderRadius: 24, overflow: 'hidden', position: 'relative' }}>
        {/* Top bar */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '14px 22px', borderBottom: `1px solid ${t.rule}`,
          background: t.glassBgSoft,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 26 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{
                width: 22, height: 22, borderRadius: 999, background: t.coral,
                boxShadow: t.isDark
                  ? `0 0 12px ${t.coral}80, inset 0 1px 0 rgba(255,255,255,0.5)`
                  : `0 2px 8px ${t.coral}40, inset 0 1px 0 rgba(255,255,255,0.7)`,
              }} />
              <div style={{ fontFamily: '"Clash Display", sans-serif', fontSize: 19, fontWeight: 500, letterSpacing: '-0.03em', color: t.ink }}>circadium</div>
            </div>
            <div style={{ display: 'flex', gap: 4, fontSize: 13, color: t.inkSoft, fontWeight: 600 }}>
              {['Calendar', 'Inbox', 'Items', 'Categories', 'Locations'].map((n, i) => (
                <span key={n} style={{
                  padding: '7px 13px', borderRadius: 999,
                  background: i === 0 ? t.glassBgDeep : 'transparent',
                  color: i === 0 ? t.ink : t.inkSoft,
                  border: i === 0 ? `1px solid ${t.glassStroke}` : '1px solid transparent',
                  boxShadow: i === 0 ? `inset 0 1px 0 ${t.glassHi}` : 'none',
                }}>{n}</span>
              ))}
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              padding: '6px 12px', borderRadius: 999,
              background: t.glassBgDeep, backdropFilter: 'blur(10px)',
              border: `1px solid ${t.glassStroke}`,
              fontSize: 11.5, fontWeight: 600, color: t.ink, fontVariantNumeric: 'tabular-nums',
            }}>Week of May 3</div>
            <div style={{
              width: 30, height: 30, borderRadius: 999,
              background: t.lavender,
              color: '#16142a', display: 'grid', placeItems: 'center', fontSize: 13, fontWeight: 700,
              boxShadow: t.isDark
                ? `0 0 10px ${t.lavender}80, inset 0 1px 0 rgba(255,255,255,0.3)`
                : `0 2px 8px ${t.lavender}40, inset 0 1px 0 rgba(255,255,255,0.5)`,
            }}>M</div>
          </div>
        </div>

        {/* Calendar */}
        <div style={{ display: 'grid', gridTemplateColumns: '70px 1fr 1fr 1fr 1fr', minHeight: 260, position: 'relative' }}>
          <div style={{ borderRight: `1px solid ${t.rule}`, padding: '14px 10px', fontSize: 10, color: t.inkSoft, lineHeight: 2.4, fontWeight: 500, fontVariantNumeric: 'tabular-nums', letterSpacing: '0.04em' }}>
            <div>09:00</div><div>10:00</div><div>11:00</div><div>12:00</div>
          </div>
          {['Mon 3', 'Tue 4', 'Wed 5', 'Thu 6'].map((d, i) => (
            <div key={d} style={{ borderRight: i < 3 ? `1px solid ${t.rule}` : 'none', position: 'relative', padding: '10px 8px 0' }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: t.ink, marginBottom: 8, letterSpacing: '0.02em' }}>{d}</div>
              {i === 0 && <LumenArcEvent t={t} top={4} h={60} cat="Career" title="Quarterly review" time="09:00 — 10:15" color={t.coral} />}
              {i === 1 && (
                <>
                  <LumenArcEvent t={t} top={4} h={40} cat="Health" title="Morning swim" time="08:30 — 09:15" color={t.sky} />
                  <LumenArcEvent t={t} top={52} h={56} cat="Career" title="Deep work" time="10:00 — 11:30" color={t.lavender} />
                </>
              )}
              {i === 2 && <LumenArcEvent t={t} top={20} h={96} cat="Creative" title="Brand explorations" time="09:30 — 12:00" color={t.coral} />}
              {i === 3 && (
                <>
                  <LumenArcEvent t={t} top={4} h={40} cat="Social" title="Coffee · K" time="09:00 — 09:45" color={t.sky} />
                  <LumenArcEvent t={t} top={52} h={60} cat="Career" title="Pitch prep" time="10:00 — 11:30" color={t.lavender} />
                </>
              )}
            </div>
          ))}
        </div>
        {/* Bottom toast */}
        <div style={{
          padding: '12px 22px', borderTop: `1px solid ${t.rule}`,
          background: t.glassBgSoft,
          display: 'flex', alignItems: 'center', gap: 12,
          fontSize: 13, color: t.ink, fontWeight: 500,
        }}>
          <span style={{ width: 8, height: 8, borderRadius: 999, background: t.sky }} />
          You have <strong>2h 18m</strong> of unscheduled focus on Thursday. Hold it, or use it?
          <span style={{ flex: 1 }} />
          <button style={{
            background: t.ink, color: t.paper, border: 'none', borderRadius: 999,
            padding: '6px 14px', fontSize: 12, fontWeight: 600, cursor: 'pointer',
          }}>Use it →</button>
        </div>
      </div>
    </div>
  );
}

function LumenArcEvent({ t, top, h, cat, title, time, color }) {
  return (
    <div style={{
      position: 'absolute', top, left: 6, right: 6, height: h,
      background: t.isDark ? `${color}66` : `${color}d9`,
      backdropFilter: 'blur(16px) saturate(170%)',
      WebkitBackdropFilter: 'blur(16px) saturate(170%)',
      border: t.isDark ? `1px solid ${color}55` : `1px solid ${color}b3`,
      borderRadius: 12,
      boxShadow: t.isDark
        ? `0 0 14px ${color}28, inset 0 1px 0 rgba(255,255,255,0.10)`
        : `0 4px 14px rgba(40,30,60,0.08), inset 0 1px 0 rgba(255,255,255,0.55)`,
      padding: '6px 9px',
      color: t.isDark ? t.ink : '#16142a',
    }}>
      <div style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: '0.06em', color: t.isDark ? color : '#16142a', opacity: t.isDark ? 1 : 0.7, textTransform: 'uppercase' }}>{cat}</div>
      <div style={{ fontFamily: '"Clash Display", sans-serif', fontSize: 13, marginTop: 1, fontWeight: 500, lineHeight: 1.15, letterSpacing: '-0.02em' }}>{title}</div>
      <div style={{ fontSize: 10, opacity: 0.7, marginTop: 3, fontVariantNumeric: 'tabular-nums', fontWeight: 600 }}>{time}</div>
    </div>
  );
}

function LumenArcMarketing({ t, g }) {
  return (
    <div style={{ marginTop: 28 }}>
      <div style={{ marginBottom: 12 }}>
        <LumenArcSectionLabel t={t} num="iii" title="On the web" inline />
      </div>
      <div style={{
        ...g, borderRadius: 28, padding: '56px 48px 50px',
        position: 'relative', overflow: 'hidden', minHeight: 320,
      }}>
        <div style={{ position: 'relative' }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 10,
            background: t.glassBgDeep, backdropFilter: 'blur(12px)',
            border: `1px solid ${t.glassStroke}`,
            padding: '5px 14px', borderRadius: 999,
            fontSize: 12, fontWeight: 600, color: t.ink, marginBottom: 30,
          }}>
            <span style={{ width: 8, height: 8, borderRadius: 999, background: t.coral }} />
            New · Circadium v1 — now in public beta
          </div>
          <div style={{
            fontFamily: '"Clash Display", sans-serif', fontWeight: 500,
            fontSize: 92, lineHeight: 0.94, letterSpacing: '-0.05em',
            color: t.ink, maxWidth: 780,
          }}>
            Plan a week<br />
            <span style={{ color: t.coral }}>worth living.</span>
          </div>
          <div style={{
            marginTop: 24, maxWidth: 500, fontSize: 17, lineHeight: 1.5, color: t.inkSoft, fontWeight: 500,
          }}>
            A scheduling engine that arranges your week around what matters — then steps out of your way.
          </div>
          <div style={{ marginTop: 32, display: 'flex', alignItems: 'center', gap: 14 }}>
            <button style={{
              background: t.ink, color: t.paper, border: 'none',
              fontFamily: '"Hubot Sans", sans-serif', fontSize: 15, fontWeight: 600,
              padding: '14px 26px', cursor: 'pointer', borderRadius: 999,
              boxShadow: t.isDark
                ? `0 8px 30px ${t.lavender}40`
                : '0 8px 24px rgba(40,30,60,0.18)',
            }}>Start free →</button>
            <button style={{
              background: t.glassBgDeep, backdropFilter: 'blur(12px)',
              color: t.ink, border: `1px solid ${t.glassStroke}`,
              fontSize: 14, fontWeight: 600, padding: '14px 22px',
              cursor: 'pointer', borderRadius: 999,
            }}>Watch the tour</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function LumenArcVoice({ t, g }) {
  return (
    <div style={{ marginTop: 28, ...g, borderRadius: 20, padding: '20px 24px',
      display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 28 }}>
      <div>
        <LumenArcCaption t={t}>Voice</LumenArcCaption>
        <div style={{ fontFamily: '"Clash Display", sans-serif', fontSize: 18, lineHeight: 1.35, color: t.ink, marginTop: 6, fontWeight: 500, letterSpacing: '-0.01em' }}>
          "Two items couldn't fit. Move <span style={{ color: t.coral }}>'Investor call'</span> to Thursday?"
        </div>
      </div>
      <div>
        <LumenArcCaption t={t}>Not</LumenArcCaption>
        <div style={{ fontSize: 14, lineHeight: 1.5, color: t.muted, marginTop: 6, textDecoration: 'line-through' }}>
          Hi there! We noticed you have some free time — let our AI fill it for you!
        </div>
      </div>
    </div>
  );
}

function LumenArcSectionLabel({ t, num, title, inline }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'baseline', gap: 12,
      ...(inline ? {
        background: t.glassBgDeep, backdropFilter: 'blur(10px)',
        border: `1px solid ${t.glassStroke}`,
        padding: '6px 14px', borderRadius: 999, width: 'fit-content',
      } : {}),
    }}>
      <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', color: t.inkSoft, textTransform: 'uppercase' }}>{num}.</div>
      <div style={{ fontFamily: '"Clash Display", sans-serif', fontSize: 18, fontWeight: 500, letterSpacing: '-0.02em', color: t.ink }}>{title}</div>
      {!inline && <div style={{ flex: 1, height: 1, background: t.rule, marginLeft: 6 }} />}
    </div>
  );
}

function LumenArcCaption({ t, children }) {
  return (
    <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: t.inkSoft, opacity: 0.75 }}>
      {children}
    </div>
  );
}

window.LumenArc = LumenArc;
