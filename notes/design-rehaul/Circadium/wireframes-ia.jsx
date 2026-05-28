/* global React */
// Proposed IA — bold rethink

function IAOverview() {
  return (
    <div className="sk-page sk-hand" style={{ padding: '36px 44px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
        <div>
          <div className="sk-script" style={{ fontSize: 42, lineHeight: 1, fontWeight: 700 }}>
            A proposed IA for circadium
          </div>
          <div className="sk-mono-tag" style={{ marginTop: 6 }}>
            from 9 incremental pages → 4 primary surfaces + capture-everywhere
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div className="sk-script" style={{ fontSize: 26, color: 'var(--red-ink)', lineHeight: 1 }}>
            bold rethink ✱
          </div>
          <div className="sk-mono-tag">v0 · low-fi</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 28, marginTop: 24 }}>
        {/* LEFT: Before */}
        <div className="sk-box wob" style={{ background: 'transparent', padding: 18 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
            <span className="sk-mono-tag">before</span>
            <span style={{ flex: 1, height: 1.5, background: 'var(--pencil-light)' }} />
            <span className="sk-hand" style={{ fontSize: 14, color: 'var(--pencil)' }}>9 pages, grown incrementally</span>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {['Landing/Auth', 'Calendar', 'Items', 'Item detail', 'Inbox', 'Categories', 'Locations', 'Settings', 'Strategy'].map(p => (
              <Badge key={p} kind="dim">{p}</Badge>
            ))}
          </div>
          <div style={{ marginTop: 18, color: 'var(--pencil)', fontSize: 16, lineHeight: 1.4 }}>
            <div>· capture lives in two places (inbox + items)</div>
            <div>· categories + locations are constraints but sit in their own corners</div>
            <div>· "strategy" is a debug page, not a destination</div>
            <div>· item detail is a separate page — heavy for quick edits</div>
          </div>
        </div>

        {/* RIGHT: After */}
        <div className="sk-box wob filled" style={{ padding: 18 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
            <span className="sk-mono-tag" style={{ color: 'var(--red-ink)' }}>after</span>
            <span style={{ flex: 1, height: 1.5, background: 'var(--red-ink-faint)' }} />
            <span className="sk-hand" style={{ fontSize: 14, color: 'var(--red-ink)' }}>4 primaries · capture is ambient</span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 12 }}>
            {[
              { name: 'Today', sub: 'now / next' },
              { name: 'Library', sub: 'everything you might do' },
              { name: 'Calendar', sub: 'the woven week' },
              { name: 'Life Areas', sub: 'rules of life' }
            ].map(p => (
              <div key={p.name} className="sk-box wob-sm" style={{ background: 'var(--paper)', textAlign: 'center', padding: '10px 8px' }}>
                <div className="sk-script" style={{ fontSize: 22, lineHeight: 1, fontWeight: 600 }}>{p.name}</div>
                <div style={{ fontSize: 13, color: 'var(--pencil)', marginTop: 4 }}>{p.sub}</div>
              </div>
            ))}
          </div>

          {/* Ambient capture bar */}
          <div className="sk-box wob-pill" style={{ background: 'var(--ink)', color: 'var(--paper)', padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 10 }}>
            <span className="sk-script" style={{ fontSize: 20, fontWeight: 600 }}>capture</span>
            <span style={{ flex: 1, fontSize: 14, opacity: 0.7 }}>⌘K · always reachable · drop anywhere</span>
            <span className="sk-mono-tag" style={{ color: 'var(--paper)', opacity: 0.6 }}>ambient</span>
          </div>

          <div style={{ marginTop: 14, display: 'flex', gap: 8 }}>
            {[
              ['Places', 'collapses ↓ Life Areas'],
              ['Engine', 'lives in Calendar drawer'],
              ['Settings', 'kept · simplified']
            ].map(([n, s]) => (
              <div key={n} className="sk-box wob-sm" style={{ background: 'var(--paper)', padding: '8px 10px', flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: 14 }}>{n}</div>
                <div style={{ fontSize: 12, color: 'var(--pencil)' }}>{s}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Big map */}
      <div style={{ marginTop: 30, position: 'relative' }}>
        <div className="sk-script" style={{ fontSize: 28, fontWeight: 600, marginBottom: 12 }}>
          how the pieces connect
        </div>

        <div style={{ position: 'relative', height: 360 }}>
          {/* Capture pill at top */}
          <div className="sk-box wob-pill" style={{
            position: 'absolute', top: 6, left: '50%', transform: 'translateX(-50%)',
            background: 'var(--ink)', color: 'var(--paper)', padding: '10px 24px',
            width: 320, textAlign: 'center'
          }}>
            <span className="sk-script" style={{ fontSize: 24, fontWeight: 700 }}>capture (ambient)</span>
            <div style={{ fontSize: 12, opacity: 0.6, marginTop: 2 }}>⌘K · voice · paste · drag</div>
          </div>

          {/* Three primary surfaces */}
          {[
            { name: 'Today', sub: 'one screen. now, next,\nand what slipped.', x: 60 },
            { name: 'Library', sub: 'inbox · tasks · goals · plans\nfilters · views · search', x: 470 },
            { name: 'Calendar', sub: 'the woven week\nwhy / when / override', x: 870 }
          ].map((p, i) => (
            <div key={p.name} className="sk-box wob" style={{
              position: 'absolute', top: 140, left: p.x, width: 280, padding: '14px 16px',
              background: 'var(--paper-2)'
            }}>
              <div className="sk-script" style={{ fontSize: 30, lineHeight: 1, fontWeight: 700 }}>{p.name}</div>
              <div style={{ marginTop: 6, fontSize: 14, color: 'var(--pencil)', whiteSpace: 'pre-line' }}>{p.sub}</div>
            </div>
          ))}

          {/* Constraint layer */}
          <div className="sk-box wob" style={{
            position: 'absolute', bottom: 0, left: 60, right: 60, padding: '12px 16px',
            background: 'transparent', borderStyle: 'dashed'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div className="sk-script" style={{ fontSize: 22, fontWeight: 600 }}>Life Areas <span style={{ color: 'var(--pencil)', fontSize: 16 }}>· the rules of your life</span></div>
                <div style={{ fontSize: 13, color: 'var(--pencil)', marginTop: 2 }}>categories · time windows · places · strict vs. soft</div>
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                <Badge>🌅 Career</Badge>
                <Badge>🧘 Health</Badge>
                <Badge>🏠 Home</Badge>
                <Badge kind="dim">+ 3</Badge>
              </div>
            </div>
          </div>

          {/* Arrows from capture to all three */}
          <svg style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
            <defs>
              <marker id="iaArr" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="8" markerHeight="8" orient="auto">
                <path d="M 0 0 L 10 5 L 0 10 z" fill="var(--red-ink)" />
              </marker>
            </defs>
            {[200, 610, 1010].map((x, i) => (
              <path key={i}
                d={`M ${600} 50 Q ${(600+x)/2} ${80 + i*8}, ${x} 138`}
                fill="none" stroke="var(--red-ink)" strokeWidth="1.8" strokeDasharray="4 4"
                markerEnd="url(#iaArr)" opacity="0.7"
              />
            ))}
            {/* Library ↔ Calendar */}
            <path d="M 750 195 Q 820 175, 870 195" fill="none" stroke="var(--ink)" strokeWidth="1.8" markerEnd="url(#iaArr)" />
            <path d="M 870 215 Q 820 235, 750 215" fill="none" stroke="var(--ink)" strokeWidth="1.8" markerEnd="url(#iaArr)" />
            {/* Today ← Library */}
            <path d="M 470 200 Q 410 220, 340 200" fill="none" stroke="var(--ink)" strokeWidth="1.8" markerEnd="url(#iaArr)" />
          </svg>

          {/* labels on arrows */}
          <div className="sk-script" style={{ position: 'absolute', top: 90, left: 240, color: 'var(--red-ink)', fontSize: 18 }}>raw → triage</div>
          <div className="sk-script" style={{ position: 'absolute', top: 70, left: 600, color: 'var(--red-ink)', fontSize: 18, transform: 'translateX(-50%)' }}>quick add</div>
          <div className="sk-script" style={{ position: 'absolute', top: 90, left: 920, color: 'var(--red-ink)', fontSize: 18 }}>schedule now</div>
          <div className="sk-script" style={{ position: 'absolute', top: 170, left: 790, color: 'var(--ink-soft)', fontSize: 16 }}>plan ↔ schedule</div>
        </div>
      </div>
    </div>
  );
}

window.IAOverview = IAOverview;
