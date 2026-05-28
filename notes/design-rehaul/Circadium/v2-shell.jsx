/* global React */
// Collapsible left navigation — shared shell

function LeftNav({ active = 'Today', collapsed = false }) {
  const items = [
    { key: 'Today',      icon: '◐', sub: 'dashboard' },
    { key: 'Capture',    icon: '✎', sub: '⌘K · always' },
    { key: 'Library',    icon: '☰', sub: 'tasks · goals' },
    { key: 'Calendar',   icon: '▦', sub: 'the woven week' },
    { key: 'Life Areas', icon: '✦', sub: 'rules of life' },
    { key: 'Places',     icon: '◉', sub: 'travel matrix' }
  ];
  const w = collapsed ? 60 : 224;
  return (
    <div style={{
      width: w, flexShrink: 0,
      borderRight: '2px solid var(--ink)',
      background: 'var(--paper)',
      display: 'flex', flexDirection: 'column',
      transition: 'width .2s ease'
    }}>
      {/* logo */}
      <div style={{
        padding: collapsed ? '14px 0' : '14px 16px',
        borderBottom: '1.5px dashed var(--pencil-light)',
        display: 'flex', alignItems: 'center',
        justifyContent: collapsed ? 'center' : 'space-between',
        gap: 8
      }}>
        {collapsed
          ? <span className="sk-script" style={{ fontSize: 24, fontWeight: 700, lineHeight: 1 }}>c</span>
          : <>
              <span className="sk-script" style={{ fontSize: 26, fontWeight: 700, lineHeight: 1 }}>circadium</span>
              <span style={{ fontSize: 14, color: 'var(--pencil)' }}>‹</span>
            </>
        }
      </div>

      {/* nav */}
      <div style={{ padding: collapsed ? '10px 6px' : '10px 10px', display: 'flex', flexDirection: 'column', gap: 4, flex: 1 }}>
        {items.map(it => {
          const sel = it.key === active;
          return (
            <div key={it.key} className="sk-box wob-sm" style={{
              padding: collapsed ? '8px 0' : '8px 10px',
              display: 'flex', alignItems: 'center', gap: 10,
              justifyContent: collapsed ? 'center' : 'flex-start',
              background: sel ? 'var(--ink)' : 'transparent',
              color: sel ? 'var(--paper)' : 'var(--ink)',
              borderColor: sel ? 'var(--ink)' : 'transparent',
              borderWidth: sel ? 2 : 1.5
            }}>
              <span style={{ fontFamily: 'Caveat, cursive', fontSize: 20, lineHeight: 1, width: 18, textAlign: 'center' }}>{it.icon}</span>
              {!collapsed && (
                <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.05, flex: 1 }}>
                  <span style={{ fontWeight: 700, fontSize: 15 }}>{it.key}</span>
                  <span className="sk-mono-tag" style={{ color: sel ? 'rgba(245,241,232,0.7)' : 'var(--pencil)', fontSize: 10 }}>{it.sub}</span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* footer */}
      <div style={{
        padding: collapsed ? '10px 0' : '10px 12px',
        borderTop: '1.5px dashed var(--pencil-light)',
        display: 'flex', alignItems: 'center',
        justifyContent: collapsed ? 'center' : 'space-between', gap: 8
      }}>
        {!collapsed && (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Glyph>A</Glyph>
              <div style={{ fontSize: 12, lineHeight: 1.1 }}>
                <div style={{ fontWeight: 700 }}>Alex</div>
                <div style={{ color: 'var(--pencil)' }}>settings</div>
              </div>
            </div>
            <span style={{ fontSize: 16, color: 'var(--pencil)' }}>‹</span>
          </>
        )}
        {collapsed && <Glyph>A</Glyph>}
      </div>
    </div>
  );
}

// Wrapper that lays out left-nav + main content
function Shell({ active, collapsed = false, children, contentStyle = {} }) {
  return (
    <div className="sk-page sk-hand" style={{ display: 'flex', flexDirection: 'row' }}>
      <LeftNav active={active} collapsed={collapsed} />
      <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column', ...contentStyle }}>
        {children}
      </div>
    </div>
  );
}

Object.assign(window, { LeftNav, Shell });
