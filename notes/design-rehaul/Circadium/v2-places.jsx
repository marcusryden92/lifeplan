/* global React */
// Places / Locations — saved places + travel-time matrix

function PlacesPage() {
  const places = [
    { name: 'Home', addr: '142 Linden St · Brooklyn', defaultFor: ['🏠 Home', '💰 Finance'], sel: false, primary: true },
    { name: 'Office', addr: '380 Lafayette · Manhattan', defaultFor: ['🌅 Career'], sel: true },
    { name: 'Park', addr: 'Prospect Park · Brooklyn', defaultFor: ['🧘 Health'] },
    { name: 'Gym', addr: 'Equinox · Court St', defaultFor: [] },
    { name: 'Dentist', addr: '155 W 57th St', defaultFor: [] },
    { name: 'Mom\'s', addr: 'Yonkers, NY', defaultFor: ['❤️ Relationships'] }
  ];
  return (
    <Shell active="Places">
      <div style={{ padding: '14px 22px', borderBottom: '1.5px dashed var(--pencil-light)', display: 'flex', alignItems: 'flex-end', gap: 14, flexShrink: 0 }}>
        <div>
          <div className="sk-script" style={{ fontSize: 30, fontWeight: 700, lineHeight: 1 }}>Places</div>
          <div className="sk-mono-tag" style={{ marginTop: 2 }}>6 of 10 saved · travel times between every pair</div>
        </div>
        <span style={{ flex: 1 }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span className="sk-mono-tag">transport · default</span>
          <div style={{ display: 'flex', gap: 0 }}>
            {[['🚗', 'driving', true], ['🚆', 'transit', false], ['🚲', 'bike', false], ['🚶', 'walk', false]].map(([icon, mode, sel]) => (
              <div key={mode} className="sk-box wob-sm" style={{
                padding: '5px 10px', borderRadius: 0,
                background: sel ? 'var(--ink)' : 'var(--paper)',
                color: sel ? 'var(--paper)' : 'var(--ink)',
                display: 'flex', alignItems: 'center', gap: 4,
                fontSize: 12, fontFamily: 'Patrick Hand, cursive'
              }}>
                <span>{icon}</span><span>{mode}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="sk-box wob-sm tight" style={{ fontSize: 12 }}>↻ fetch missing</div>
        <div className="sk-box wob-sm tight" style={{ fontSize: 12 }}>refresh all</div>
        <div className="sk-box wob-sm tight" style={{ fontSize: 12, background: 'var(--ink)', color: 'var(--paper)' }}>+ add place</div>
      </div>

      <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '300px 1fr', minHeight: 0 }}>
        {/* Places list */}
        <div style={{ borderRight: '2px solid var(--ink)', padding: '14px 12px', overflow: 'auto', display: 'flex', flexDirection: 'column', gap: 8 }}>
          {/* Google Places autocomplete */}
          <div className="sk-box wob-pill" style={{ padding: '7px 12px', display: 'flex', alignItems: 'center', gap: 8, background: 'var(--paper-2)' }}>
            <span style={{ color: 'var(--pencil)' }}>⌕</span>
            <span style={{ flex: 1, color: 'var(--pencil)', fontSize: 13 }}>search a place via Google…</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 4 }}>
            {places.map((p, i) => (
              <div key={i} className="sk-box wob-sm" style={{
                padding: '8px 10px',
                background: p.sel ? 'var(--ink)' : 'var(--paper)',
                color: p.sel ? 'var(--paper)' : 'var(--ink)',
                borderColor: 'var(--ink)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontSize: 16 }}>📍</span>
                  <span style={{ fontSize: 14, fontWeight: 700, flex: 1 }}>{p.name}</span>
                  {p.primary && <Badge style={{ fontSize: 9, padding: '1px 6px' }}>home</Badge>}
                </div>
                <div className="sk-mono-tag" style={{ fontSize: 10, color: p.sel ? 'rgba(245,241,232,0.7)' : 'var(--pencil)', marginTop: 2 }}>{p.addr}</div>
                {p.defaultFor.length > 0 && (
                  <div style={{ marginTop: 5, display: 'flex', flexWrap: 'wrap', gap: 3 }}>
                    {p.defaultFor.map(a => (
                      <span key={a} className="sk-mono-tag" style={{
                        fontSize: 9, padding: '1px 5px',
                        background: p.sel ? 'rgba(245,241,232,0.15)' : 'var(--paper-2)',
                        color: p.sel ? 'var(--paper)' : 'var(--ink-soft)',
                        borderRadius: 2
                      }}>default · {a}</span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
          <div style={{ marginTop: 'auto', padding: '6px 10px', fontSize: 12, color: 'var(--pencil)', borderTop: '1px dashed var(--pencil-light)' }}>
            up to 10 places · cascading delete removes travel-time entries
          </div>
        </div>

        {/* Travel time matrix */}
        <div style={{ overflow: 'auto', padding: '14px 18px' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 10 }}>
            <span className="sk-script" style={{ fontSize: 26, fontWeight: 700, lineHeight: 1 }}>Travel matrix</span>
            <span className="sk-mono-tag">from row · to column · 3 time-of-day values</span>
            <span style={{ flex: 1 }} />
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: 'var(--pencil)' }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><span style={{ width: 8, height: 8, background: 'var(--red-ink)', borderRadius: 2 }} />rush</span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><span style={{ width: 8, height: 8, background: 'var(--ink)', borderRadius: 2 }} />regular</span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><span style={{ width: 8, height: 8, background: 'var(--pencil)', borderRadius: 2 }} />night</span>
            </div>
          </div>

          <TravelMatrix places={places.map(p => p.name)} />

          <div style={{ marginTop: 12, padding: '8px 12px', background: 'var(--paper-2)', borderRadius: 8, border: '1.5px dashed var(--pencil-light)', display: 'flex', alignItems: 'center', gap: 10, fontSize: 13 }}>
            <span>cells marked <Badge kind="yel" style={{ fontSize: 10, padding: '1px 6px' }}>custom</Badge> were overridden by you.</span>
            <span style={{ flex: 1 }} />
            <span className="sk-mono-tag" style={{ color: 'var(--red-ink)' }}>clear all overrides</span>
          </div>
        </div>
      </div>
    </Shell>
  );
}

function TravelMatrix({ places }) {
  // Generate a mock matrix
  function mins(i, j) {
    const base = Math.abs(i - j) * 14 + (i === j ? 0 : 6);
    return {
      rush: base ? `${Math.round(base * 1.8)}` : '—',
      reg: base ? `${base}` : '—',
      night: base ? `${Math.round(base * 0.7)}` : '—',
      missing: !base ? false : (i === 4 && j === 5),
      custom: (i === 1 && j === 2)
    };
  }
  return (
    <div style={{ overflow: 'auto', border: '2px solid var(--ink)', borderRadius: 8 }}>
      <table style={{ borderCollapse: 'separate', borderSpacing: 0, width: '100%', fontFamily: 'Patrick Hand, cursive', fontSize: 13 }}>
        <thead>
          <tr>
            <th style={{ ...thCell, background: 'var(--paper-2)', textAlign: 'left', borderRight: '2px solid var(--ink)' }}>
              <span className="sk-mono-tag">from \ to</span>
            </th>
            {places.map((p, i) => (
              <th key={p} style={{ ...thCell, fontWeight: 700, textAlign: 'left', minWidth: 90 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span style={{ fontSize: 11 }}>📍</span>
                  <span>{p}</span>
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {places.map((p, i) => (
            <tr key={p}>
              <th style={{ ...tdCell, fontWeight: 700, background: 'var(--paper-2)', textAlign: 'left', borderRight: '2px solid var(--ink)', borderTop: '1px dashed var(--pencil-light)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span style={{ fontSize: 11 }}>📍</span>
                  <span>{p}</span>
                </div>
              </th>
              {places.map((q, j) => {
                const m = mins(i, j);
                const self = i === j;
                return (
                  <td key={q} style={{
                    ...tdCell,
                    borderTop: '1px dashed var(--pencil-light)',
                    background: self ? 'var(--pencil-faint)' : (m.custom ? 'rgba(240,226,90,0.18)' : 'transparent')
                  }}>
                    {self ? <span style={{ color: 'var(--pencil)' }}>—</span> : (
                      m.missing ? (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 2 }}>
                          <span className="sk-mono-tag" style={{ color: 'var(--red-ink)' }}>missing</span>
                          <span className="sk-mono-tag" style={{ fontSize: 9, color: 'var(--pencil)' }}>fetch ↻</span>
                        </div>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 1, lineHeight: 1.1 }}>
                          <span><span style={{ color: 'var(--red-ink)', fontWeight: 700 }}>{m.rush}</span> <span className="sk-mono-tag" style={{ fontSize: 9 }}>rush</span></span>
                          <span><span style={{ color: 'var(--ink)', fontWeight: 700 }}>{m.reg}</span> <span className="sk-mono-tag" style={{ fontSize: 9 }}>reg</span></span>
                          <span><span style={{ color: 'var(--pencil)', fontWeight: 700 }}>{m.night}</span> <span className="sk-mono-tag" style={{ fontSize: 9 }}>night</span></span>
                          {m.custom && <span className="sk-mono-tag" style={{ fontSize: 8, color: 'var(--ink-soft)', marginTop: 2, fontWeight: 700 }}>· CUSTOM ·</span>}
                        </div>
                      )
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const thCell = { padding: '8px 10px', borderBottom: '2px solid var(--ink)', verticalAlign: 'top', background: 'var(--paper)' };
const tdCell = { padding: '8px 10px', verticalAlign: 'top' };

window.PlacesPage = PlacesPage;
