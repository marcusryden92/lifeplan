// Direction 1 — Mercury · Quiet Power
// Pure white, graphite, emerald, hairline rules. Mona Sans variable.
// Vibe: Mercury bank / Compound / Brex — quiet money confidence, not startup-loud.

const mercuryTokens = {
  bg: '#fafafa',
  bgSoft: '#f3f3f1',
  bgDeep: '#ececea',
  ink: '#15161a',
  inkSoft: '#3c3d44',
  muted: '#8d8e95',
  mutedSoft: '#c5c6cc',
  rule: '#e2e2dd',
  emerald: '#0c8a55',
  emeraldDeep: '#076640',
  emeraldSoft: '#d5ebde',
  amber: '#c4995a',
};

function Mercury() {
  const t = mercuryTokens;
  return (
    <div className="ab" style={{
      width: '100%', height: '100%',
      background: t.bg,
      color: t.ink,
      fontFamily: '"Mona Sans", system-ui, sans-serif',
      fontFeatureSettings: '"ss01", "ss02"',
      padding: '56px 64px',
      overflow: 'hidden',
      position: 'relative',
    }}>
      <div style={{ position: 'relative' }}>
        <MercuryPlate t={t} />
        <MercuryWordmark t={t} />

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 48, marginTop: 56 }}>
          <MercuryPalette t={t} />
          <MercuryType t={t} />
        </div>

        <MercuryAppChrome t={t} />
        <MercuryMarketing t={t} />
        <MercuryVoice t={t} />
      </div>
    </div>
  );
}

function MercuryPlate({ t }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', paddingBottom: 24, borderBottom: `1px solid ${t.rule}` }}>
      <div>
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 8,
          fontSize: 11, fontWeight: 600, letterSpacing: '0.16em', textTransform: 'uppercase',
          color: t.emerald, marginBottom: 16,
        }}>
          <span style={{ width: 6, height: 6, background: t.emerald, borderRadius: 1 }} />
          01 · Quiet Power
        </div>
        <div style={{ fontSize: 48, lineHeight: 0.95, fontWeight: 800, letterSpacing: '-0.04em' }}>
          Mercury
        </div>
        <div style={{ marginTop: 12, color: t.inkSoft, fontSize: 14, maxWidth: 580, lineHeight: 1.55, fontWeight: 450 }}>
          The look of a serious instrument. Tight type, hairline rules, generous whitespace, a single emerald signal. For ambitious people who chose the boring banking app on purpose.
        </div>
      </div>
      <div style={{ textAlign: 'right', fontSize: 11, lineHeight: 1.8, color: t.muted, fontWeight: 500, fontFeatureSettings: '"tnum"', letterSpacing: '0.04em' }}>
        <div>Mona Sans · variable</div>
        <div>200 → 900</div>
        <div style={{ color: t.emerald, fontWeight: 600 }}>Emerald · 0C8A55</div>
      </div>
    </div>
  );
}

function MercuryWordmark({ t }) {
  return (
    <div style={{ padding: '60px 0 36px', position: 'relative' }}>
      {/* Subtle horizontal hairline grid behind wordmark */}
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none',
        backgroundImage: `linear-gradient(${t.rule} 1px, transparent 1px)`,
        backgroundSize: '100% 56px',
        opacity: 0.6,
      }} />

      <div style={{
        fontFamily: '"Mona Sans", sans-serif',
        fontWeight: 800,
        fontSize: 220,
        lineHeight: 0.85,
        letterSpacing: '-0.07em',
        color: t.ink,
        position: 'relative',
        display: 'flex',
        alignItems: 'baseline',
      }}>
        <span>circadium</span>
        <span style={{
          display: 'inline-block', width: 24, height: 24,
          background: t.emerald, marginLeft: 14, transform: 'translateY(-6px)',
        }} />
      </div>

      {/* Specimen meta strip */}
      <div style={{
        marginTop: 28, display: 'flex', alignItems: 'center', gap: 20,
        paddingTop: 16, borderTop: `1px solid ${t.rule}`,
        fontSize: 11, fontWeight: 500, color: t.muted, letterSpacing: '0.06em',
        fontFeatureSettings: '"tnum"', textTransform: 'uppercase',
      }}>
        <span>Personal scheduling engine</span>
        <span style={{ width: 4, height: 4, background: t.mutedSoft, borderRadius: 999 }} />
        <span>Est. 2026</span>
        <span style={{ width: 4, height: 4, background: t.mutedSoft, borderRadius: 999 }} />
        <span style={{ color: t.emerald }}>● Solving</span>
        <span style={{ flex: 1 }} />
        <span>Edition 01 · MMXXVI</span>
      </div>
    </div>
  );
}

function MercuryPalette({ t }) {
  const sw = [
    { name: 'Paper', hex: '#FAFAFA', bg: t.bg, fg: t.ink, border: true },
    { name: 'Ink', hex: '#15161A', bg: t.ink, fg: t.bg },
    { name: 'Emerald', hex: '#0C8A55', bg: t.emerald, fg: t.bg },
    { name: 'Emerald · deep', hex: '#076640', bg: t.emeraldDeep, fg: t.bg },
    { name: 'Stone', hex: '#F3F3F1', bg: t.bgSoft, fg: t.ink, border: true },
    { name: 'Amber', hex: '#C4995A', bg: t.amber, fg: t.bg },
  ];
  return (
    <div>
      <MercurySectionLabel t={t} num="i" title="Palette" />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 0, marginTop: 18, border: `1px solid ${t.rule}` }}>
        {sw.map((s, i) => (
          <div key={s.name} style={{
            background: s.bg, color: s.fg,
            padding: '16px 14px', height: 110,
            display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
            borderRight: (i % 3) < 2 ? `1px solid ${t.rule}` : 'none',
            borderTop: i >= 3 ? `1px solid ${t.rule}` : 'none',
          }}>
            <div style={{ fontSize: 18, fontWeight: 700, letterSpacing: '-0.02em', lineHeight: 1 }}>
              {s.name}
            </div>
            <div style={{ fontSize: 10, fontWeight: 500, letterSpacing: '0.06em', opacity: 0.8, fontFeatureSettings: '"tnum"' }}>
              {s.hex}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function MercuryType({ t }) {
  return (
    <div>
      <MercurySectionLabel t={t} num="ii" title="Typography" />
      <div style={{ marginTop: 18, display: 'flex', flexDirection: 'column' }}>
        <div style={{ paddingTop: 14, paddingBottom: 14, borderBottom: `1px solid ${t.rule}` }}>
          <MercuryCaption t={t}>Display · Mona Sans 800</MercuryCaption>
          <div style={{ fontSize: 44, fontWeight: 800, marginTop: 4, lineHeight: 0.98, letterSpacing: '-0.04em' }}>
            A serious calendar.
          </div>
        </div>
        <div style={{ paddingTop: 14, paddingBottom: 14, borderBottom: `1px solid ${t.rule}` }}>
          <MercuryCaption t={t}>Body · Mona Sans 450</MercuryCaption>
          <div style={{ fontSize: 15, marginTop: 4, lineHeight: 1.5, color: t.ink, fontWeight: 450 }}>
            Fourteen items placed across the week, respecting deadlines, category windows, and travel time between locations.
          </div>
        </div>
        <div style={{ paddingTop: 14 }}>
          <MercuryCaption t={t}>Numerics · Mona Sans tabular</MercuryCaption>
          <div style={{ fontSize: 15, marginTop: 4, color: t.inkSoft, fontFeatureSettings: '"tnum"', fontWeight: 600, letterSpacing: '-0.01em' }}>
            09:00 — 11:30 &nbsp;·&nbsp; 2h 30m &nbsp;·&nbsp; <span style={{ color: t.emerald }}>+12.4%</span> focus this week
          </div>
        </div>
      </div>
    </div>
  );
}

function MercuryAppChrome({ t }) {
  return (
    <div style={{ marginTop: 56 }}>
      <MercurySectionLabel t={t} num="iii" title="In the product" />
      <div style={{
        marginTop: 18, background: t.bg,
        border: `1px solid ${t.rule}`,
        overflow: 'hidden',
      }}>
        {/* Top bar */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '14px 22px', borderBottom: `1px solid ${t.rule}`,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 28 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
              <div style={{ width: 18, height: 18, background: t.emerald }} />
              <div style={{ fontSize: 18, fontWeight: 800, letterSpacing: '-0.04em' }}>circadium</div>
            </div>
            <div style={{ display: 'flex', gap: 22, fontSize: 13, color: t.inkSoft, fontWeight: 500 }}>
              <span style={{ color: t.ink, fontWeight: 600 }}>Calendar</span>
              <span>Inbox</span>
              <span>Items</span>
              <span>Categories</span>
              <span>Locations</span>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{
              fontSize: 11, color: t.muted, fontFeatureSettings: '"tnum"',
              fontWeight: 500, letterSpacing: '0.04em',
              padding: '5px 10px', border: `1px solid ${t.rule}`,
            }}>WK 22 · MAY 3</div>
            <div style={{ width: 28, height: 28, background: t.ink, color: t.bg, display: 'grid', placeItems: 'center', fontSize: 12, fontWeight: 700, letterSpacing: '-0.02em' }}>M</div>
          </div>
        </div>

        {/* Stats strip */}
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)',
          borderBottom: `1px solid ${t.rule}`,
          background: t.bgSoft,
        }}>
          {[
            { label: 'SCHEDULED', value: '14', delta: '/ 14', deltaCol: t.emerald },
            { label: 'FOCUS', value: '18h 40m', delta: '+12.4%', deltaCol: t.emerald },
            { label: 'TRAVEL', value: '1h 12m', delta: '−24%', deltaCol: t.emerald },
            { label: 'UNALLOC', value: '6h 08m', delta: 'OPEN', deltaCol: t.amber },
          ].map((s, i) => (
            <div key={s.label} style={{
              padding: '12px 18px',
              borderRight: i < 3 ? `1px solid ${t.rule}` : 'none',
            }}>
              <div style={{ fontSize: 10, fontWeight: 600, color: t.muted, letterSpacing: '0.12em' }}>{s.label}</div>
              <div style={{ fontSize: 20, fontWeight: 700, color: t.ink, marginTop: 4, fontFeatureSettings: '"tnum"', letterSpacing: '-0.02em' }}>
                {s.value} <span style={{ fontSize: 11, fontWeight: 600, color: s.deltaCol, letterSpacing: '0.04em', marginLeft: 4 }}>{s.delta}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Calendar */}
        <div style={{ display: 'grid', gridTemplateColumns: '72px 1fr 1fr 1fr 1fr', minHeight: 220 }}>
          <div style={{ borderRight: `1px solid ${t.rule}`, padding: '14px 10px', fontSize: 10, color: t.muted, lineHeight: 2.4, fontWeight: 500, fontFeatureSettings: '"tnum"', letterSpacing: '0.04em' }}>
            <div>09:00</div><div>10:00</div><div>11:00</div><div>12:00</div>
          </div>
          {['MON 3', 'TUE 4', 'WED 5', 'THU 6'].map((d, i) => (
            <div key={d} style={{ borderRight: i < 3 ? `1px solid ${t.rule}` : 'none', position: 'relative', padding: '10px 6px 0' }}>
              <div style={{ fontSize: 10, fontWeight: 600, color: t.muted, marginBottom: 8, letterSpacing: '0.12em' }}>{d}</div>
              {i === 0 && <MercuryEvent t={t} top={4} h={58} cat="Career" title="Board prep" time="09:00 — 10:00" cur />}
              {i === 1 && (
                <>
                  <MercuryEvent t={t} top={4} h={40} cat="Health" title="Run · 5k" time="09:00 — 09:30" />
                  <MercuryEvent t={t} top={50} h={60} cat="Career" title="Investor call" time="10:00 — 11:15" cur />
                </>
              )}
              {i === 2 && <MercuryEvent t={t} top={20} h={94} cat="Deep" title="Quarterly memo" time="09:30 — 12:00" cur />}
              {i === 3 && (
                <>
                  <MercuryEvent t={t} top={20} h={40} cat="Admin" title="Inbox" time="09:30 — 10:00" />
                  <MercuryEvent t={t} top={68} h={64} cat="Career" title="Strategy review" time="10:30 — 12:00" cur />
                </>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function MercuryEvent({ t, top, h, cat, title, time, cur }) {
  return (
    <div style={{
      position: 'absolute', top, left: 6, right: 6, height: h,
      background: cur ? t.emeraldSoft : t.bgSoft,
      borderLeft: `2px solid ${cur ? t.emerald : t.muted}`,
      padding: '6px 9px',
    }}>
      <div style={{ fontSize: 9, fontWeight: 600, letterSpacing: '0.1em', color: cur ? t.emeraldDeep : t.muted, textTransform: 'uppercase' }}>{cat}</div>
      <div style={{ fontSize: 12, color: t.ink, marginTop: 1, fontWeight: 600, lineHeight: 1.15, letterSpacing: '-0.01em' }}>{title}</div>
      <div style={{ fontSize: 10, color: t.inkSoft, marginTop: 3, fontFeatureSettings: '"tnum"', fontWeight: 500 }}>{time}</div>
    </div>
  );
}

function MercuryMarketing({ t }) {
  return (
    <div style={{ marginTop: 48 }}>
      <MercurySectionLabel t={t} num="iv" title="On the web" />
      <div style={{
        marginTop: 18, background: t.bg,
        border: `1px solid ${t.rule}`,
        padding: '54px 48px 50px',
        position: 'relative', overflow: 'hidden', minHeight: 320,
      }}>
        {/* Hairline grid decoration */}
        <div style={{
          position: 'absolute', inset: 0, pointerEvents: 'none', opacity: 0.4,
          backgroundImage: `linear-gradient(${t.rule} 1px, transparent 1px), linear-gradient(90deg, ${t.rule} 1px, transparent 1px)`,
          backgroundSize: '64px 64px',
          maskImage: 'linear-gradient(to bottom, rgba(0,0,0,0.7), transparent 80%)',
        }} />

        <div style={{ position: 'relative' }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            fontSize: 11, fontWeight: 600, letterSpacing: '0.14em',
            color: t.emerald, marginBottom: 28, textTransform: 'uppercase',
          }}>
            <span style={{ width: 6, height: 6, background: t.emerald, borderRadius: 999 }} />
            Circadium · Now in private preview
          </div>
          <div style={{
            fontSize: 84, fontWeight: 800, lineHeight: 0.94, letterSpacing: '-0.05em',
            color: t.ink, maxWidth: 760,
          }}>
            A serious<br />
            calendar<span style={{ color: t.emerald }}>.</span>
          </div>
          <div style={{
            marginTop: 24, maxWidth: 520, fontSize: 16, lineHeight: 1.55, color: t.inkSoft, fontWeight: 450,
          }}>
            Goals, deadlines, routines, location. Circadium solves the week — so you can spend it on the work, not on planning the work.
          </div>
          <div style={{ marginTop: 32, display: 'flex', alignItems: 'center', gap: 14 }}>
            <button style={{
              background: t.ink, color: t.bg, border: 'none',
              fontFamily: '"Mona Sans", sans-serif', fontSize: 14, fontWeight: 600,
              padding: '14px 24px', cursor: 'pointer', letterSpacing: '-0.01em',
            }}>Request access</button>
            <button style={{
              background: 'transparent', color: t.ink, border: 'none',
              fontSize: 14, fontWeight: 600, cursor: 'pointer', letterSpacing: '-0.01em',
            }}>How it works →</button>
          </div>

          {/* Inline mini-stat */}
          <div style={{
            position: 'absolute', top: 0, right: 0,
            border: `1px solid ${t.rule}`,
            background: t.bg,
            padding: '14px 18px', minWidth: 180,
          }}>
            <div style={{ fontSize: 10, fontWeight: 600, color: t.muted, letterSpacing: '0.12em' }}>SOLVED THIS WEEK</div>
            <div style={{ fontSize: 32, fontWeight: 800, color: t.ink, marginTop: 4, fontFeatureSettings: '"tnum"', letterSpacing: '-0.03em' }}>
              14<span style={{ color: t.muted }}>/14</span>
            </div>
            <div style={{ fontSize: 11, fontWeight: 500, color: t.emerald, marginTop: 2 }}>● All items placed</div>
          </div>
        </div>
      </div>
    </div>
  );
}

function MercuryVoice({ t }) {
  return (
    <div style={{ marginTop: 36, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 28, paddingTop: 24, borderTop: `1px solid ${t.rule}` }}>
      <div>
        <MercuryCaption t={t}>Voice</MercuryCaption>
        <div style={{ fontSize: 17, lineHeight: 1.45, color: t.ink, marginTop: 6, fontWeight: 500, letterSpacing: '-0.01em' }}>
          "Two items couldn't fit. Move <span style={{ color: t.emerald }}>'Investor call'</span> to Thursday?"
        </div>
      </div>
      <div>
        <MercuryCaption t={t}>Not</MercuryCaption>
        <div style={{ fontSize: 14, lineHeight: 1.5, color: t.muted, marginTop: 6, textDecoration: 'line-through', fontWeight: 450 }}>
          Hey! Your schedule is feeling a little tight. Want me to take a look? ✨
        </div>
      </div>
    </div>
  );
}

function MercurySectionLabel({ t, num, title }) {
  return (
    <div style={{ display: 'flex', alignItems: 'baseline', gap: 14 }}>
      <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.1em', color: t.emerald, textTransform: 'uppercase' }}>{num}.</div>
      <div style={{ fontSize: 18, fontWeight: 700, letterSpacing: '-0.02em', color: t.ink }}>{title}</div>
      <div style={{ flex: 1, height: 1, background: t.rule, marginLeft: 8 }} />
    </div>
  );
}

function MercuryCaption({ t, children }) {
  return (
    <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.14em', textTransform: 'uppercase', color: t.muted }}>
      {children}
    </div>
  );
}

window.Mercury = Mercury;
