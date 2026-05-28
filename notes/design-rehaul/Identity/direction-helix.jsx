// Direction 3 — Helix · Clinical Modernism
// Bone white, deep cobalt, lipstick red signal. Boldonse + IBM Plex Sans/Mono.
// Vibe: Severance Lumon meets pharmaceutical brand book — labels, indicators, instruments.

const helixTokens = {
  bg: '#ecebe2',
  bgSoft: '#f5f4ec',
  bgDeep: '#dfddcf',
  ink: '#0b1024',
  inkSoft: '#3a3f5c',
  muted: '#7c8099',
  mutedSoft: '#b0b3c2',
  rule: '#cfcdc0',
  cobalt: '#1a2eb0',
  cobaltSoft: '#aab1ea',
  cobaltDeep: '#0e1f7a',
  red: '#d8243a',
  amber: '#e8a234',
};

function Helix() {
  const t = helixTokens;
  return (
    <div className="ab" style={{
      width: '100%', height: '100%',
      background: t.bg,
      color: t.ink,
      fontFamily: '"IBM Plex Sans", system-ui, sans-serif',
      padding: '56px 64px',
      overflow: 'hidden',
      position: 'relative',
    }}>
      {/* Schematic grid backdrop */}
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none', opacity: 0.5,
        backgroundImage: `linear-gradient(${t.rule} 1px, transparent 1px), linear-gradient(90deg, ${t.rule} 1px, transparent 1px)`,
        backgroundSize: '32px 32px',
        maskImage: 'radial-gradient(circle at 100% 0%, rgba(0,0,0,0.5), transparent 50%)',
      }} />

      <div style={{ position: 'relative' }}>
        <HelixPlate t={t} />
        <HelixWordmark t={t} />

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 48, marginTop: 56 }}>
          <HelixPalette t={t} />
          <HelixType t={t} />
        </div>

        <HelixAppChrome t={t} />
        <HelixMarketing t={t} />
        <HelixVoice t={t} />
      </div>
    </div>
  );
}

function HelixPlate({ t }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', paddingBottom: 24, borderBottom: `2px solid ${t.ink}` }}>
      <div>
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 10,
          fontFamily: '"IBM Plex Mono", monospace', fontSize: 11, fontWeight: 500, letterSpacing: '0.12em',
          color: t.red, marginBottom: 14, textTransform: 'uppercase',
        }}>
          <span style={{ width: 7, height: 7, background: t.red, borderRadius: 999 }} />
          03 / Clinical Modernism
        </div>
        <div style={{ fontFamily: '"Boldonse", system-ui, sans-serif', fontSize: 44, lineHeight: 1, color: t.ink, fontWeight: 400, letterSpacing: '-0.02em' }}>
          Helix
        </div>
        <div style={{ marginTop: 14, color: t.inkSoft, fontSize: 14, maxWidth: 580, lineHeight: 1.55 }}>
          The look of a finely-made instrument. Schematic grids, indicator lights, chunky display lettering, cobalt over bone. For ambitious people who think Severance is a hangout movie.
        </div>
      </div>
      <div style={{ textAlign: 'right', fontFamily: '"IBM Plex Mono", monospace', fontSize: 10, lineHeight: 1.9, color: t.muted, letterSpacing: '0.06em' }}>
        <div>BOLDONSE · DISPLAY</div>
        <div>IBM PLEX · SANS/MONO</div>
        <div style={{ color: t.cobalt, fontWeight: 600 }}>COBALT // 1A2EB0</div>
      </div>
    </div>
  );
}

function HelixWordmark({ t }) {
  return (
    <div style={{ padding: '48px 0 36px', position: 'relative' }}>
      {/* Spec label top */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 18,
        fontFamily: '"IBM Plex Mono", monospace', fontSize: 10, fontWeight: 500, letterSpacing: '0.14em',
        color: t.muted, marginBottom: 24, textTransform: 'uppercase',
      }}>
        <div style={{ width: 28, height: 1, background: t.ink }} />
        <span>Specimen 03 · Wordmark</span>
        <span style={{ flex: 1, height: 1, background: t.rule }} />
        <span>Set 168pt · Boldonse Regular</span>
      </div>

      <div style={{
        fontFamily: '"Boldonse", system-ui, sans-serif',
        fontWeight: 400,
        fontSize: 168,
        lineHeight: 0.92,
        letterSpacing: '-0.03em',
        color: t.ink,
        position: 'relative',
        display: 'flex',
        alignItems: 'baseline',
      }}>
        <span>circadium</span>
        <span style={{
          display: 'inline-block', width: 14, height: 14,
          background: t.red, marginLeft: 10, transform: 'translateY(-12px)', borderRadius: 999,
          boxShadow: `0 0 0 4px ${t.bg}, 0 0 0 5px ${t.red}40`,
        }} />
      </div>

      {/* Schematic measure annotations */}
      <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        fontFamily: '"IBM Plex Mono", monospace', fontSize: 9, color: t.muted, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
        <span>↕ x-height · 0.62em</span>
        <span>cap-height · 1.00em</span>
        <span>tracking · −30u</span>
        <span style={{ color: t.cobalt }}>● mark · 1.0c offset</span>
      </div>
    </div>
  );
}

function HelixPalette({ t }) {
  const sw = [
    { name: 'Bone', code: 'H-01', hex: '#ECEBE2', bg: t.bg, fg: t.ink, border: true },
    { name: 'Ink', code: 'H-02', hex: '#0B1024', bg: t.ink, fg: t.bg },
    { name: 'Cobalt', code: 'H-03', hex: '#1A2EB0', bg: t.cobalt, fg: t.bg },
    { name: 'Red · signal', code: 'H-04', hex: '#D8243A', bg: t.red, fg: t.bg },
    { name: 'Amber', code: 'H-05', hex: '#E8A234', bg: t.amber, fg: t.ink },
    { name: 'Cobalt · soft', code: 'H-06', hex: '#AAB1EA', bg: t.cobaltSoft, fg: t.ink },
  ];
  return (
    <div>
      <HelixSectionLabel t={t} num="i" title="Palette" />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 0, marginTop: 18, border: `2px solid ${t.ink}` }}>
        {sw.map((s, i) => (
          <div key={s.name} style={{
            background: s.bg, color: s.fg,
            padding: '14px 12px', height: 116,
            display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
            borderRight: (i % 3) < 2 ? `1px solid ${t.ink}` : 'none',
            borderTop: i >= 3 ? `1px solid ${t.ink}` : 'none',
          }}>
            <div>
              <div style={{ fontFamily: '"IBM Plex Mono", monospace', fontSize: 9, fontWeight: 500, letterSpacing: '0.1em', opacity: 0.75 }}>{s.code}</div>
              <div style={{ fontFamily: '"Boldonse", sans-serif', fontSize: 20, lineHeight: 1.05, marginTop: 4, letterSpacing: '-0.01em' }}>{s.name}</div>
            </div>
            <div style={{ fontFamily: '"IBM Plex Mono", monospace', fontSize: 10, fontWeight: 500, letterSpacing: '0.06em', opacity: 0.85 }}>
              {s.hex}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function HelixType({ t }) {
  return (
    <div>
      <HelixSectionLabel t={t} num="ii" title="Typography" />
      <div style={{ marginTop: 18, display: 'flex', flexDirection: 'column' }}>
        <div style={{ paddingTop: 12, paddingBottom: 14, borderBottom: `1px solid ${t.ink}` }}>
          <HelixCaption t={t}>DISPLAY · Boldonse</HelixCaption>
          <div style={{ fontFamily: '"Boldonse", sans-serif', fontSize: 42, fontWeight: 400, marginTop: 6, lineHeight: 0.98, letterSpacing: '-0.02em' }}>
            Instrument grade.
          </div>
        </div>
        <div style={{ paddingTop: 12, paddingBottom: 14, borderBottom: `1px solid ${t.ink}` }}>
          <HelixCaption t={t}>UI · IBM Plex Sans</HelixCaption>
          <div style={{ fontSize: 15, marginTop: 6, lineHeight: 1.5, color: t.ink, fontWeight: 400 }}>
            14 items scheduled. 1 deadline at risk. 2 hours of unallocated focus on Thursday — review or release.
          </div>
        </div>
        <div style={{ paddingTop: 12 }}>
          <HelixCaption t={t}>MONO · IBM Plex Mono</HelixCaption>
          <div style={{ fontFamily: '"IBM Plex Mono", monospace', fontSize: 13, marginTop: 6, lineHeight: 1.5, color: t.inkSoft, fontVariantNumeric: 'tabular-nums' }}>
            [W22] solver.run() → placed 14/14 · risk 1 · t=187ms
          </div>
        </div>
      </div>
    </div>
  );
}

function HelixAppChrome({ t }) {
  return (
    <div style={{ marginTop: 56 }}>
      <HelixSectionLabel t={t} num="iii" title="In the product" />
      <div style={{
        marginTop: 18, background: t.bgSoft,
        border: `2px solid ${t.ink}`,
        overflow: 'hidden',
      }}>
        {/* Top bar */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '12px 20px', borderBottom: `1px solid ${t.ink}`, background: t.bg,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 26 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 14, height: 14, background: t.red, borderRadius: 999, boxShadow: `0 0 0 3px ${t.bg}, 0 0 0 4px ${t.ink}` }} />
              <div style={{ fontFamily: '"Boldonse", sans-serif', fontSize: 18, fontWeight: 400, letterSpacing: '-0.02em' }}>circadium</div>
            </div>
            <div style={{ display: 'flex', gap: 0, fontFamily: '"IBM Plex Mono", monospace', fontSize: 11, color: t.inkSoft, fontWeight: 500 }}>
              {['CAL', 'INBOX', 'ITEMS', 'CATS', 'LOCS'].map((n, i) => (
                <span key={n} style={{
                  padding: '7px 12px',
                  background: i === 0 ? t.cobalt : 'transparent',
                  color: i === 0 ? t.bgSoft : t.inkSoft,
                  letterSpacing: '0.12em', fontWeight: i === 0 ? 600 : 500,
                  borderRight: i < 4 ? `1px solid ${t.rule}` : 'none',
                }}>{n}</span>
              ))}
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ fontFamily: '"IBM Plex Mono", monospace', fontSize: 10, color: t.ink, letterSpacing: '0.1em', padding: '4px 8px', border: `1px solid ${t.ink}` }}>
              <span style={{ color: t.red }}>●</span> 01 AT RISK
            </div>
            <div style={{ width: 28, height: 28, background: t.cobalt, color: t.bg, display: 'grid', placeItems: 'center', fontSize: 12, fontFamily: '"Boldonse", sans-serif' }}>M</div>
          </div>
        </div>

        {/* Stats row */}
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)',
          borderBottom: `1px solid ${t.ink}`,
        }}>
          {[
            { label: 'WK', value: '22', sub: 'MAY 03 — 09' },
            { label: 'PLACED', value: '14/14', sub: 'SOLVED' },
            { label: 'RISK', value: '01', sub: 'BOARD PREP', col: t.red },
            { label: 'FOCUS', value: '18h40', sub: '+12.4%', col: t.cobalt },
          ].map((s, i) => (
            <div key={s.label} style={{
              padding: '12px 18px', borderRight: i < 3 ? `1px solid ${t.rule}` : 'none',
              background: t.bgSoft,
            }}>
              <div style={{ fontFamily: '"IBM Plex Mono", monospace', fontSize: 10, fontWeight: 500, color: t.muted, letterSpacing: '0.14em' }}>{s.label}</div>
              <div style={{ fontFamily: '"Boldonse", sans-serif', fontSize: 24, color: s.col || t.ink, marginTop: 4, fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.01em' }}>{s.value}</div>
              <div style={{ fontFamily: '"IBM Plex Mono", monospace', fontSize: 9, color: s.col || t.muted, marginTop: 2, letterSpacing: '0.1em' }}>{s.sub}</div>
            </div>
          ))}
        </div>

        {/* Calendar */}
        <div style={{ display: 'grid', gridTemplateColumns: '64px 1fr 1fr 1fr 1fr', minHeight: 220, background: t.bg }}>
          <div style={{ borderRight: `1px solid ${t.rule}`, padding: '12px 8px', fontFamily: '"IBM Plex Mono", monospace', fontSize: 10, color: t.muted, lineHeight: 2.4, fontWeight: 500, letterSpacing: '0.04em' }}>
            <div>09:00</div><div>10:00</div><div>11:00</div><div>12:00</div>
          </div>
          {['MON 03', 'TUE 04', 'WED 05', 'THU 06'].map((d, i) => (
            <div key={d} style={{ borderRight: i < 3 ? `1px solid ${t.rule}` : 'none', position: 'relative', padding: '8px 5px 0' }}>
              <div style={{ fontFamily: '"IBM Plex Mono", monospace', fontSize: 10, fontWeight: 600, color: t.ink, marginBottom: 8, letterSpacing: '0.1em' }}>{d}</div>
              {i === 0 && <HelixEvent t={t} top={2} h={58} cat="CAREER" title="Board prep" time="09:00→10:00" risk />}
              {i === 1 && (
                <>
                  <HelixEvent t={t} top={2} h={40} cat="HEALTH" title="Run" time="09:00→09:30" />
                  <HelixEvent t={t} top={50} h={58} cat="CAREER" title="Investor call" time="10:00→11:15" />
                </>
              )}
              {i === 2 && <HelixEvent t={t} top={18} h={94} cat="DEEP" title="Quarterly memo" time="09:30→12:00" />}
              {i === 3 && (
                <>
                  <HelixEvent t={t} top={20} h={40} cat="ADMIN" title="Inbox" time="09:30→10:00" />
                  <HelixEvent t={t} top={70} h={62} cat="CAREER" title="Strategy review" time="10:30→12:00" />
                </>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function HelixEvent({ t, top, h, cat, title, time, risk }) {
  return (
    <div style={{
      position: 'absolute', top, left: 4, right: 4, height: h,
      background: risk ? '#fde6e8' : t.bgSoft,
      border: `1px solid ${risk ? t.red : t.rule}`,
      borderLeft: `3px solid ${risk ? t.red : t.cobalt}`,
      padding: '5px 8px',
    }}>
      <div style={{ fontFamily: '"IBM Plex Mono", monospace', fontSize: 9, fontWeight: 600, letterSpacing: '0.1em', color: risk ? t.red : t.cobalt }}>{cat}</div>
      <div style={{ fontFamily: '"Boldonse", sans-serif', fontSize: 12, color: t.ink, marginTop: 1, lineHeight: 1.1, letterSpacing: '-0.01em' }}>{title}</div>
      <div style={{ fontFamily: '"IBM Plex Mono", monospace', fontSize: 9.5, color: t.inkSoft, marginTop: 3, fontVariantNumeric: 'tabular-nums' }}>{time}</div>
    </div>
  );
}

function HelixMarketing({ t }) {
  return (
    <div style={{ marginTop: 48 }}>
      <HelixSectionLabel t={t} num="iv" title="On the web" />
      <div style={{
        marginTop: 18, background: t.bg,
        border: `2px solid ${t.ink}`,
        padding: '50px 48px 50px',
        position: 'relative', overflow: 'hidden', minHeight: 320,
      }}>
        {/* Schematic blueprint corner */}
        <div style={{ position: 'absolute', top: 0, right: 0, bottom: 0, width: 280, opacity: 0.35, pointerEvents: 'none' }}>
          <svg viewBox="0 0 280 320" width="280" height="320">
            <g stroke={t.cobalt} strokeWidth="0.6" fill="none">
              {/* concentric circles */}
              <circle cx="180" cy="160" r="40" />
              <circle cx="180" cy="160" r="80" />
              <circle cx="180" cy="160" r="120" />
              {/* radial lines */}
              {[...Array(12)].map((_, i) => {
                const a = (i * Math.PI * 2) / 12;
                return (
                  <line key={i}
                    x1={180 + Math.cos(a) * 40} y1={160 + Math.sin(a) * 40}
                    x2={180 + Math.cos(a) * 120} y2={160 + Math.sin(a) * 120}
                  />
                );
              })}
              {/* ticks */}
              {[...Array(48)].map((_, i) => {
                const a = (i * Math.PI * 2) / 48;
                const r1 = 120, r2 = i % 4 === 0 ? 130 : 125;
                return (
                  <line key={'t' + i}
                    x1={180 + Math.cos(a) * r1} y1={160 + Math.sin(a) * r1}
                    x2={180 + Math.cos(a) * r2} y2={160 + Math.sin(a) * r2}
                  />
                );
              })}
            </g>
            <circle cx="180" cy="160" r="6" fill={t.red} />
          </svg>
        </div>

        <div style={{ position: 'relative' }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 10,
            fontFamily: '"IBM Plex Mono", monospace', fontSize: 11, fontWeight: 500, letterSpacing: '0.16em',
            color: t.cobalt, marginBottom: 28, textTransform: 'uppercase',
          }}>
            <span style={{ width: 8, height: 8, background: t.red, borderRadius: 999 }} />
            CIRCADIUM / Personal Time Instrument
          </div>
          <div style={{
            fontFamily: '"Boldonse", sans-serif',
            fontSize: 80, fontWeight: 400, lineHeight: 0.96, letterSpacing: '-0.035em',
            color: t.ink, maxWidth: 760,
          }}>
            The week,<br />
            <span style={{ color: t.cobalt }}>instrumented.</span>
          </div>
          <div style={{
            marginTop: 26, maxWidth: 500, fontSize: 16, lineHeight: 1.55, color: t.inkSoft, fontWeight: 400,
          }}>
            A finely-tuned scheduling instrument for ambitious work. Inputs: goals, deadlines, constraints. Output: a deliberate week.
          </div>
          <div style={{ marginTop: 32, display: 'flex', alignItems: 'center', gap: 12 }}>
            <button style={{
              background: t.ink, color: t.bg, border: `2px solid ${t.ink}`,
              fontFamily: '"IBM Plex Sans", sans-serif', fontSize: 14, fontWeight: 600,
              padding: '13px 22px', cursor: 'pointer',
            }}>Request access →</button>
            <button style={{
              background: 'transparent', color: t.ink, border: `2px solid ${t.ink}`,
              fontFamily: '"IBM Plex Mono", monospace', fontSize: 11, fontWeight: 500,
              padding: '13px 18px', cursor: 'pointer', letterSpacing: '0.1em',
            }}>VIEW SPECIFICATIONS</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function HelixVoice({ t }) {
  return (
    <div style={{ marginTop: 36, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 28, paddingTop: 24, borderTop: `2px solid ${t.ink}` }}>
      <div>
        <HelixCaption t={t}>VOICE</HelixCaption>
        <div style={{ fontFamily: '"IBM Plex Mono", monospace', fontSize: 14, lineHeight: 1.5, color: t.ink, marginTop: 8 }}>
          <span style={{ color: t.red }}>[01 AT RISK]</span> Board prep · deadline Wed 17:00.<br />
          &nbsp;&nbsp;Options: relax window, shift deadline, defer item.
        </div>
      </div>
      <div>
        <HelixCaption t={t}>NOT</HelixCaption>
        <div style={{ fontSize: 14, lineHeight: 1.5, color: t.muted, marginTop: 8, textDecoration: 'line-through' }}>
          Looks like things are getting a little hectic! No worries — we've got you 🙌
        </div>
      </div>
    </div>
  );
}

function HelixSectionLabel({ t, num, title }) {
  return (
    <div style={{ display: 'flex', alignItems: 'baseline', gap: 14 }}>
      <div style={{ fontFamily: '"IBM Plex Mono", monospace', fontSize: 11, fontWeight: 500, letterSpacing: '0.12em', color: t.red, textTransform: 'uppercase' }}>{num}/</div>
      <div style={{ fontFamily: '"Boldonse", sans-serif', fontSize: 20, color: t.ink, letterSpacing: '-0.01em' }}>{title}</div>
      <div style={{ flex: 1, height: 2, background: t.ink, marginLeft: 8 }} />
    </div>
  );
}

function HelixCaption({ t, children }) {
  return (
    <div style={{ fontFamily: '"IBM Plex Mono", monospace', fontSize: 10, fontWeight: 500, letterSpacing: '0.14em', textTransform: 'uppercase', color: t.muted }}>
      {children}
    </div>
  );
}

window.Helix = Helix;
