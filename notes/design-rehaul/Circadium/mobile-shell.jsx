/* global React */
// Mobile shell — sketchy phone bezel + bottom tab nav

const PHONE_W = 380;
const PHONE_H = 800;

function SketchPhone({ children, label, dim = false }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
      <div style={{
        width: PHONE_W, height: PHONE_H,
        background: 'var(--paper)',
        border: '2.5px solid var(--ink)',
        borderRadius: '38px 42px 36px 40px / 42px 36px 42px 38px',
        padding: 9,
        boxSizing: 'border-box',
        position: 'relative',
        boxShadow: '4px 6px 0 var(--ink)',
        opacity: dim ? 0.7 : 1
      }}>
        {/* notch */}
        <div style={{
          position: 'absolute', top: 14, left: '50%', transform: 'translateX(-50%)',
          width: 100, height: 24, background: 'var(--ink)',
          borderRadius: '14px / 14px', zIndex: 5
        }} />
        {/* screen area */}
        <div style={{
          position: 'absolute', inset: 9,
          borderRadius: '32px 34px 32px 32px',
          border: '1.5px solid var(--ink)',
          overflow: 'hidden', display: 'flex', flexDirection: 'column',
          background: 'var(--paper)'
        }}>
          {/* status row */}
          <div style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            padding: '13px 22px 4px',
            fontFamily: 'Special Elite, monospace', fontSize: 11
          }}>
            <span>9:36</span>
            <span />
            <span style={{ display: 'inline-flex', gap: 3, alignItems: 'center' }}>
              <span style={{ display: 'inline-block', width: 14, height: 8, background: 'var(--ink)', borderRadius: 1 }} />
              <span style={{ fontSize: 10 }}>5G</span>
              <span style={{ display: 'inline-block', width: 16, height: 8, border: '1px solid var(--ink)', borderRadius: 2 }} />
            </span>
          </div>
          {/* content */}
          <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            {children}
          </div>
          {/* home indicator */}
          <div style={{ height: 18, display: 'flex', justifyContent: 'center', alignItems: 'center', flexShrink: 0 }}>
            <span style={{ width: 110, height: 4, background: 'var(--ink)', borderRadius: 4 }} />
          </div>
        </div>
      </div>
      {label && <span className="sk-mono-tag" style={{ textAlign: 'center', display: 'block' }}>{label}</span>}
    </div>
  );
}

function MobileNav({ active }) {
  const tabs = [
    { name: 'Today', icon: '◐' },
    { name: 'Library', icon: '☰' },
    { name: 'Capture', icon: '+', center: true },
    { name: 'Calendar', icon: '▦' },
    { name: 'More', icon: '⋯' }
  ];
  return (
    <div style={{
      borderTop: '2px solid var(--ink)',
      background: 'var(--paper)',
      display: 'flex', alignItems: 'flex-end', justifyContent: 'space-around',
      padding: '6px 4px 0',
      flexShrink: 0
    }}>
      {tabs.map(t => {
        const sel = t.name === active;
        if (t.center) {
          return (
            <div key={t.name} style={{
              width: 52, height: 52, marginTop: -22,
              borderRadius: '50%', border: '2.5px solid var(--ink)',
              background: 'var(--ink)', color: 'var(--paper)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontFamily: 'Caveat, cursive', fontSize: 28, fontWeight: 700,
              boxShadow: '3px 4px 0 var(--red-ink)'
            }}>{t.icon}</div>
          );
        }
        return (
          <div key={t.name} style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            gap: 2, padding: '4px 6px',
            color: sel ? 'var(--ink)' : 'var(--pencil)',
            fontWeight: sel ? 700 : 400
          }}>
            <span style={{ fontFamily: 'Caveat, cursive', fontSize: 22, lineHeight: 1 }}>{t.icon}</span>
            <span className="sk-mono-tag" style={{ fontSize: 9, color: 'inherit' }}>{t.name}</span>
            {sel && <span style={{ width: 16, height: 2, background: 'var(--ink)', borderRadius: 1, marginTop: -1 }} />}
          </div>
        );
      })}
    </div>
  );
}

// Mobile screen wrapper — body content scrolls; bottom nav fixed
function MobileScreen({ active, children, hideNav = false }) {
  return (
    <>
      <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        {children}
      </div>
      {!hideNav && <MobileNav active={active} />}
    </>
  );
}

// Top header in mobile screen
function MTop({ title, sub, right, onBack }) {
  return (
    <div style={{
      padding: '6px 16px 8px',
      display: 'flex', alignItems: 'center', gap: 10,
      borderBottom: '1.5px dashed var(--pencil-light)',
      flexShrink: 0
    }}>
      {onBack && <span style={{ fontFamily: 'Caveat, cursive', fontSize: 22, lineHeight: 1, fontWeight: 700 }}>‹</span>}
      <div style={{ flex: 1, lineHeight: 1.05 }}>
        <div className="sk-script" style={{ fontSize: 24, fontWeight: 700, lineHeight: 1 }}>{title}</div>
        {sub && <div className="sk-mono-tag" style={{ fontSize: 10, marginTop: 1 }}>{sub}</div>}
      </div>
      {right}
    </div>
  );
}

Object.assign(window, { SketchPhone, MobileNav, MobileScreen, MTop, PHONE_W, PHONE_H });
