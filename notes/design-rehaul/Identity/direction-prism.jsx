// Direction 4 — Prism · Bold Modernist
// Pure white, ink black, electric violet + chartreuse. Bricolage Grotesque + Space Mono.
// Vibe: Pentagram-poster meets product. For the operator who wants their tools to have a point of view.

const prismTokens = {
  paper: '#fafaf7',
  paperDeep: '#ebebe5',
  ink: '#0a0a0c',
  inkSoft: '#3a3a40',
  muted: '#86868c',
  rule: '#dedcd2',
  violet: '#5e3df5',
  violetSoft: '#a895fa',
  lemon: '#e5f53d',
};

function Prism() {
  const t = prismTokens;
  return (
    <div className="ab" style={{
      width: '100%', height: '100%',
      background: t.paper,
      color: t.ink,
      fontFamily: '"Bricolage Grotesque", system-ui, sans-serif',
      padding: '56px 64px',
      overflow: 'hidden',
      position: 'relative',
    }}>
      <div style={{ position: 'relative' }}>
        <PrismPlate t={t} />
        <PrismWordmark t={t} />

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 48, marginTop: 56 }}>
          <PrismPalette t={t} />
          <PrismType t={t} />
        </div>

        <PrismAppChrome t={t} />
        <PrismMarketing t={t} />
        <PrismVoice t={t} />
      </div>
    </div>
  );
}

function PrismPlate({ t }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', paddingBottom: 24, borderBottom: `2px solid ${t.ink}` }}>
      <div>
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 10,
          background: t.ink, color: t.lemon,
          padding: '4px 12px',
          fontFamily: '"Space Mono", monospace', fontSize: 11, fontWeight: 700, letterSpacing: '0.06em',
          marginBottom: 14,
        }}>
          04//MODERNIST
        </div>
        <div style={{ fontSize: 48, lineHeight: 0.9, fontWeight: 800, letterSpacing: '-0.04em' }}>
          Prism
        </div>
        <div style={{ marginTop: 12, color: t.inkSoft, fontSize: 14, maxWidth: 580, lineHeight: 1.5, fontWeight: 500 }}>
          A scheduling product with a point of view. Brutalist grids, oversized type, electric violet. For the operator who wants their tools to look as serious as their ambition.
        </div>
      </div>
      <div style={{ textAlign: 'right', fontFamily: '"Space Mono", monospace', fontSize: 10, lineHeight: 1.8, color: t.muted }}>
        <div>BRICOLAGE_GROTESQUE</div>
        <div>SPACE_MONO</div>
        <div style={{ color: t.violet }}>VIOLET // 5E3DF5</div>
      </div>
    </div>
  );
}

function PrismWordmark({ t }) {
  return (
    <div style={{ padding: '52px 0 36px', position: 'relative' }}>
      {/* Background geometric */}
      <div style={{
        position: 'absolute', top: 60, right: 8, width: 180, height: 180,
        background: t.violet, borderRadius: '50%', opacity: 1,
      }} />
      <div style={{
        position: 'absolute', top: 130, right: 130, width: 56, height: 56,
        background: t.lemon, borderRadius: '50%',
      }} />

      <div style={{
        fontFamily: '"Bricolage Grotesque", sans-serif',
        fontWeight: 800,
        fontSize: 196,
        lineHeight: 0.85,
        letterSpacing: '-0.07em',
        color: t.ink,
        position: 'relative',
      }}>
        <div>circa·</div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 12 }}>
          <span style={{ color: t.violet }}>dium</span>
          <span style={{ fontFamily: '"Space Mono", monospace', fontSize: 18, fontWeight: 400, letterSpacing: '0.1em', color: t.muted, transform: 'translateY(-12px)' }}>
            /sɜːˈkeɪ.di.əm/
          </span>
        </div>
      </div>

      {/* Definition tagline */}
      <div style={{
        marginTop: 18,
        fontFamily: '"Space Mono", monospace', fontSize: 12, fontWeight: 400, letterSpacing: '0.04em',
        color: t.inkSoft, maxWidth: 480,
      }}>
        n. — the rhythm of a deliberate week. Adj. — having to do with time spent on purpose.
      </div>
    </div>
  );
}

function PrismPalette({ t }) {
  const sw = [
    { name: 'Paper', hex: '#FAFAF7', bg: t.paper, fg: t.ink, border: true },
    { name: 'Ink', hex: '#0A0A0C', bg: t.ink, fg: t.paper },
    { name: 'Violet', hex: '#5E3DF5', bg: t.violet, fg: t.paper },
    { name: 'Lemon', hex: '#E5F53D', bg: t.lemon, fg: t.ink },
    { name: 'Violet · Soft', hex: '#A895FA', bg: t.violetSoft, fg: t.ink },
    { name: 'Stone', hex: '#EBEBE5', bg: t.paperDeep, fg: t.ink },
  ];
  return (
    <div>
      <PrismSectionLabel t={t} num="01" title="PALETTE" />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 0, marginTop: 18 }}>
        {sw.map((s, i) => (
          <div key={s.name} style={{
            background: s.bg, color: s.fg,
            padding: '18px 14px', height: 116,
            display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
            border: `2px solid ${t.ink}`,
            marginLeft: i % 3 === 0 ? 0 : -2,
            marginTop: i >= 3 ? -2 : 0,
          }}>
            <div style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-0.03em', lineHeight: 1 }}>
              {s.name}
            </div>
            <div style={{ fontFamily: '"Space Mono", monospace', fontSize: 11, fontWeight: 700, letterSpacing: '0.04em' }}>
              {s.hex}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function PrismType({ t }) {
  return (
    <div>
      <PrismSectionLabel t={t} num="02" title="TYPE" />
      <div style={{ marginTop: 18, display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ borderTop: `2px solid ${t.ink}`, paddingTop: 14 }}>
          <PrismCaption t={t}>DISPLAY · Bricolage 800</PrismCaption>
          <div style={{ fontSize: 48, fontWeight: 800, marginTop: 4, lineHeight: 0.95, letterSpacing: '-0.04em' }}>
            Move with <span style={{ color: t.violet }}>intent.</span>
          </div>
        </div>
        <div style={{ borderTop: `2px solid ${t.ink}`, paddingTop: 14 }}>
          <PrismCaption t={t}>UI · Bricolage 500/600</PrismCaption>
          <div style={{ fontSize: 16, marginTop: 4, lineHeight: 1.4, fontWeight: 500 }}>
            Fourteen items. Four categories. One week that actually fits the human living it.
          </div>
        </div>
        <div style={{ borderTop: `2px solid ${t.ink}`, paddingTop: 14 }}>
          <PrismCaption t={t}>MONO · Space Mono</PrismCaption>
          <div style={{ fontFamily: '"Space Mono", monospace', fontSize: 13, marginTop: 4, lineHeight: 1.5, color: t.inkSoft, fontVariantNumeric: 'tabular-nums' }}>
            [W22] · 09:00//11:30 · 02h30m · 06/14 ▮▮▮▮▮▮▯▯▯▯▯▯▯▯
          </div>
        </div>
      </div>
    </div>
  );
}

function PrismAppChrome({ t }) {
  return (
    <div style={{ marginTop: 56 }}>
      <PrismSectionLabel t={t} num="03" title="IN THE PRODUCT" />
      <div style={{
        marginTop: 18, background: t.paper,
        border: `2px solid ${t.ink}`,
        overflow: 'hidden',
      }}>
        {/* Top bar */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '14px 18px', borderBottom: `2px solid ${t.ink}`, background: t.paper,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 22, height: 22, background: t.violet, borderRadius: 999 }} />
              <div style={{ fontSize: 19, fontWeight: 800, letterSpacing: '-0.04em' }}>
                circa<span style={{ color: t.violet }}>·</span>dium
              </div>
            </div>
            <div style={{ display: 'flex', gap: 0, fontSize: 12, color: t.inkSoft, fontFamily: '"Space Mono", monospace', fontWeight: 700 }}>
              {['CAL', 'INBOX', 'ITEMS', 'CATS', 'LOCS'].map((n, i) => (
                <span key={n} style={{
                  padding: '8px 12px',
                  background: i === 0 ? t.ink : 'transparent',
                  color: i === 0 ? t.lemon : t.inkSoft,
                  letterSpacing: '0.04em',
                  borderRight: i < 4 ? `1px solid ${t.rule}` : 'none',
                }}>{n}</span>
              ))}
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              fontFamily: '"Space Mono", monospace', fontSize: 11, color: t.ink, fontWeight: 700,
              padding: '6px 10px', background: t.lemon,
            }}>W22 · MAY 03</div>
            <div style={{ width: 30, height: 30, background: t.violet, color: t.paper, display: 'grid', placeItems: 'center', fontSize: 13, fontWeight: 800, letterSpacing: '-0.02em', borderRadius: 999 }}>M</div>
          </div>
        </div>

        {/* Calendar */}
        <div style={{ display: 'grid', gridTemplateColumns: '64px 1fr 1fr 1fr 1fr', minHeight: 240, background: t.paper }}>
          <div style={{ borderRight: `2px solid ${t.ink}`, padding: '14px 10px', fontFamily: '"Space Mono", monospace', fontSize: 10, color: t.muted, lineHeight: 2.4, fontWeight: 700 }}>
            <div>09</div><div>10</div><div>11</div><div>12</div>
          </div>
          {['MON 03', 'TUE 04', 'WED 05', 'THU 06'].map((d, i) => (
            <div key={d} style={{ borderRight: i < 3 ? `1px solid ${t.rule}` : 'none', position: 'relative', padding: '8px 4px 0' }}>
              <div style={{ fontFamily: '"Space Mono", monospace', fontSize: 10, color: t.ink, marginBottom: 8, letterSpacing: '0.04em', fontWeight: 700, padding: '0 4px' }}>{d}</div>
              {i === 0 && <PrismEvent t={t} top={4} h={58} cat="DEEP" title="Manifesto draft" time="09:00→10:00" bg={t.violet} fg={t.paper} />}
              {i === 1 && (
                <>
                  <PrismEvent t={t} top={4} h={40} cat="HEALTH" title="Run" time="09:00→09:30" bg={t.lemon} fg={t.ink} />
                  <PrismEvent t={t} top={50} h={62} cat="MEET" title="Brand sync" time="10:00→11:15" bg={t.ink} fg={t.paper} />
                </>
              )}
              {i === 2 && <PrismEvent t={t} top={20} h={94} cat="CREATIVE" title="Type explorations" time="09:30→12:00" bg={t.violet} fg={t.paper} />}
              {i === 3 && (
                <>
                  <PrismEvent t={t} top={28} h={48} cat="ADMIN" title="Invoicing" time="09:30→10:15" bg={t.paperDeep} fg={t.ink} />
                  <PrismEvent t={t} top={84} h={52} cat="DEEP" title="Spec read" time="10:30→11:30" bg={t.ink} fg={t.lemon} />
                </>
              )}
            </div>
          ))}
        </div>
        {/* Bottom strip */}
        <div style={{
          padding: '10px 18px', borderTop: `2px solid ${t.ink}`,
          background: t.ink, color: t.paper,
          display: 'flex', alignItems: 'center', gap: 14,
          fontFamily: '"Space Mono", monospace', fontSize: 11, fontWeight: 700, letterSpacing: '0.06em',
        }}>
          <span style={{ color: t.lemon }}>● SOLVED</span>
          <span>14/14 · 187MS</span>
          <span style={{ flex: 1 }} />
          <span style={{ color: t.violetSoft }}>{'> '}NEXT: WED 09:30 — TYPE EXPLORATIONS</span>
        </div>
      </div>
    </div>
  );
}

function PrismEvent({ t, top, h, cat, title, time, bg, fg }) {
  return (
    <div style={{
      position: 'absolute', top, left: 4, right: 4, height: h,
      background: bg, color: fg,
      border: `1px solid ${t.ink}`,
      padding: '5px 7px',
    }}>
      <div style={{ fontFamily: '"Space Mono", monospace', fontSize: 9, letterSpacing: '0.08em', fontWeight: 700, opacity: 0.85 }}>{cat}</div>
      <div style={{ fontSize: 12, marginTop: 1, fontWeight: 700, lineHeight: 1.1, letterSpacing: '-0.02em' }}>{title}</div>
      <div style={{ fontFamily: '"Space Mono", monospace', fontSize: 9.5, marginTop: 3, opacity: 0.85, fontWeight: 700 }}>{time}</div>
    </div>
  );
}

function PrismMarketing({ t }) {
  return (
    <div style={{ marginTop: 48 }}>
      <PrismSectionLabel t={t} num="04" title="ON THE WEB" />
      <div style={{
        marginTop: 18, background: t.ink, color: t.paper,
        border: `2px solid ${t.ink}`,
        padding: '54px 48px 50px',
        position: 'relative', overflow: 'hidden', minHeight: 320,
      }}>
        {/* Decorative violet sphere */}
        <div style={{
          position: 'absolute', top: -100, right: -80, width: 360, height: 360,
          background: t.violet, borderRadius: '50%', opacity: 1,
        }} />
        <div style={{
          position: 'absolute', top: 30, right: 60, width: 70, height: 70,
          background: t.lemon, borderRadius: '50%',
        }} />

        <div style={{
          fontFamily: '"Space Mono", monospace', fontSize: 11, letterSpacing: '0.2em', color: t.lemon, marginBottom: 28, fontWeight: 700,
        }}>
          CIRCADIUM // PERSONAL SCHEDULING ENGINE
        </div>
        <div style={{
          fontSize: 92, fontWeight: 800, lineHeight: 0.92, letterSpacing: '-0.05em',
          color: t.paper, maxWidth: 760, position: 'relative',
        }}>
          Move<br />
          with <span style={{ color: t.lemon }}>intent.</span>
        </div>
        <div style={{
          marginTop: 24, maxWidth: 480, fontSize: 16, lineHeight: 1.5, color: '#c4c4c8', fontWeight: 500,
          position: 'relative',
        }}>
          The scheduling engine for people building something. Hand it your goals, deadlines and constraints. Get a week worth living.
        </div>
        <div style={{ marginTop: 32, display: 'flex', alignItems: 'center', gap: 12, position: 'relative' }}>
          <button style={{
            background: t.lemon, color: t.ink, border: `2px solid ${t.lemon}`,
            fontFamily: '"Bricolage Grotesque", sans-serif', fontSize: 15, fontWeight: 700, letterSpacing: '-0.01em',
            padding: '14px 24px', cursor: 'pointer',
          }}>Start a week →</button>
          <button style={{
            background: 'transparent', color: t.paper, border: `2px solid ${t.paper}`,
            fontFamily: '"Space Mono", monospace', fontSize: 12, fontWeight: 700,
            padding: '14px 18px', cursor: 'pointer', letterSpacing: '0.04em',
          }}>READ THE MANIFESTO</button>
        </div>
      </div>
    </div>
  );
}

function PrismVoice({ t }) {
  return (
    <div style={{ marginTop: 36, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 28 }}>
      <div>
        <PrismCaption t={t}>VOICE</PrismCaption>
        <div style={{ fontSize: 22, fontWeight: 700, lineHeight: 1.25, color: t.ink, marginTop: 6, letterSpacing: '-0.02em' }}>
          "Three things today. <span style={{ color: t.violet }}>Make them count.</span>"
        </div>
      </div>
      <div>
        <PrismCaption t={t}>NOT</PrismCaption>
        <div style={{ fontSize: 14, lineHeight: 1.5, color: t.muted, marginTop: 6, textDecoration: 'line-through' }}>
          You have 14 unfinished tasks. Optimize your day with our smart AI assistant!
        </div>
      </div>
    </div>
  );
}

function PrismSectionLabel({ t, num, title }) {
  return (
    <div style={{ display: 'flex', alignItems: 'baseline', gap: 0 }}>
      <div style={{ fontFamily: '"Space Mono", monospace', fontSize: 11, fontWeight: 700, color: t.violet, padding: '0 12px 0 0' }}>{num}</div>
      <div style={{ fontSize: 18, fontWeight: 800, letterSpacing: '-0.02em', color: t.ink, paddingRight: 14 }}>{title}</div>
      <div style={{ flex: 1, height: 2, background: t.ink, marginLeft: 4 }} />
    </div>
  );
}

function PrismCaption({ t, children }) {
  return (
    <div style={{ fontFamily: '"Space Mono", monospace', fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', color: t.muted }}>
      {children}
    </div>
  );
}

window.Prism = Prism;
