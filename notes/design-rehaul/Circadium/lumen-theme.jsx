/* global React */
// ============================================================
// LUMEN — shared design foundation
// Single source of truth for tokens, glass primitives, the
// frosted shell + nav. Screens import these as globals.
// ============================================================

// ---- TOKENS ------------------------------------------------
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

const lumenArea = (t) => t.isDark ? ({
  career: '#60a5fa', health: '#34d399', home: '#a78bfa',
  growth: '#818cf8', rel: '#22d3ee', finance: '#fbbf24'
}) : ({
  career: '#3b82f6', health: '#22c55e', home: '#8b5cf6',
  growth: '#6366f1', rel: '#06b6d4', finance: '#f59e0b'
});

const CD = "'Clash Display', sans-serif";
const HS = "'Hubot Sans', system-ui, sans-serif";

// ---- GLASS PRIMITIVES --------------------------------------
const makeGlass = (t, deep) => ({
  background: deep ? t.glassBgDeep : t.glassBg,
  backdropFilter: 'blur(28px) saturate(180%)',
  WebkitBackdropFilter: 'blur(28px) saturate(180%)',
  border: `1px solid ${t.glassStroke}`,
  boxShadow: t.shadow
});

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

// Top masthead shared by the screens (date / capture / user)
function LMast({ t, children }) {
  return (
    <div style={{
      padding: '11px 28px',
      borderBottom: `1px solid ${t.rule}`,
      display: 'flex', alignItems: 'baseline', gap: 18,
      background: t.glassBgSoft,
      backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
      flexShrink: 0
    }}>
      {children}
    </div>
  );
}

// ---- NAV (navigable) ---------------------------------------
// Maps the nav label → screen key the app routes on.
const LUMEN_NAV = [
  ['Today', '◐', 'today'],
  ['Calendar', '▦', 'calendar'],
  ['Inbox', '☰', 'inbox'],
  ['Items', '✦', 'item'],
  ['Categories', '◉', 'categories'],
  ['Locations', '⌖', 'locations']
];

function LNav({ t, active = 'Today', onNav, onToggleTheme }) {
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
      {LUMEN_NAV.map(([k, icon, key]) => {
        const sel = k === active;
        return (
        <button key={k} onClick={() => onNav && onNav(key)} style={{
          padding: '8px 12px', display: 'flex', alignItems: 'center', gap: 12,
          borderRadius: 999, textAlign: 'left',
          background: sel ? t.glassBgDeep : 'transparent',
          border: sel ? `1px solid ${t.glassStroke}` : '1px solid transparent',
          color: sel ? t.ink : t.inkSoft,
          fontSize: 13.5, fontWeight: sel ? 600 : 500,
          fontFamily: HS, cursor: 'pointer',
          boxShadow: sel ? `inset 0 1px 0 ${t.glassHi}` : 'none',
          transition: 'background .15s ease, color .15s ease'
        }}>
          <span style={{ width: 14, textAlign: 'center', fontSize: 13 }}>{icon}</span>
          <span>{k}</span>
        </button>
        );
      })}
      <div style={{ flex: 1 }} />

      {/* theme toggle */}
      <button onClick={onToggleTheme} style={{
        margin: '0 0 10px', padding: '8px 12px',
        display: 'flex', alignItems: 'center', gap: 10,
        borderRadius: 999, textAlign: 'left',
        background: t.glassBgSoft, border: `1px solid ${t.rule}`,
        color: t.inkSoft, fontSize: 12.5, fontWeight: 600, fontFamily: HS, cursor: 'pointer'
      }}>
        <span style={{ width: 14, textAlign: 'center', fontSize: 13 }}>{t.isDark ? '☀' : '☾'}</span>
        <span>{t.isDark ? 'Light mode' : 'Dark mode'}</span>
      </button>

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

// ---- SHELL -------------------------------------------------
// Bezel + frosted .tc canvas + grain + persistent nav.
// Screen content is supplied as children (the main column).
function LumenShell({ t, active, onNav, onToggleTheme, children }) {
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
          <LNav t={t} active={active} onNav={onNav} onToggleTheme={onToggleTheme} />
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, overflow: 'hidden' }}>
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}

// helper used by the week grid
function fmtL(h) {
  const hh = Math.floor(h);
  const mm = Math.round((h - hh) * 60);
  return `${hh}:${mm.toString().padStart(2,'0')}`;
}

Object.assign(window, {
  lumenLight, lumenDark, lumenArea, CD, HS,
  makeGlass, btnGlass, btnSolid,
  LGrain, ConicDot, LCaption, LMast,
  LNav, LumenShell, LUMEN_NAV, fmtL
});
