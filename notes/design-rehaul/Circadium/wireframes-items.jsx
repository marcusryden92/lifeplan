/* global React */
// Items browsing — three directions

// ============================================================
// A. DATABASE VIEW — Linear/Notion style table with grouping
// ============================================================
function ItemsA() {
  const rows = [
    { group: 'Career', icon: '🌅', color: '#9bb8d6', items: [
      { t: 'Q4 strategy doc draft', type: 'task', dur: '2h', dl: 'Fri Apr 12', ready: true, where: '📍 office' },
      { t: 'Hiring panel — back-end role', type: 'goal', dur: '∑ 4h', dl: 'next sprint', sub: '2 / 5', where: '📍 office' },
      { t: '1:1 with Ana', type: 'plan', dur: '45m', dl: 'Tue 3pm', where: '📍 office' },
      { t: 'Submit expenses', type: 'task', dur: '20m', dl: 'overdue', overdue: true, where: '—' }
    ]},
    { group: 'Health', icon: '🧘', color: '#b6cfa7', items: [
      { t: 'Renew prescription', type: 'task', dur: '15m', dl: 'Apr 20', where: '—' },
      { t: 'Dentist — crown follow-up', type: 'task', dur: '30m', dl: 'this month', where: '📍 dentist' },
      { t: '10k training plan', type: 'goal', dur: '∑ 18h', dl: 'May 25', sub: '7 / 12', where: '📍 park' }
    ]},
    { group: 'Home', icon: '🏠', color: '#d6b9a2', items: [
      { t: 'Plant basil before it dies', type: 'task', dur: '15m', dl: 'today', overdue: false, where: '📍 home' },
      { t: 'Schedule plumber', type: 'task', dur: '10m', dl: 'this week', where: '—' }
    ]},
    { group: 'Uncategorized', icon: '◌', color: '#cccccc', items: [
      { t: 'birthday gift for sam', type: 'task', dur: '—', dl: '—', unprocessed: true, where: '—' },
      { t: 'read paper Linda sent', type: 'task', dur: '—', dl: '—', unprocessed: true, where: '—' }
    ]}
  ];
  return (
    <div className="sk-page sk-hand">
      <AppTop active="Library" right={<div className="sk-box wob-sm tight" style={{ background: 'var(--ink)', color: 'var(--paper)', padding: '4px 12px' }}>+ new item</div>} />
      <div style={{ padding: '14px 22px 0' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
          <div>
            <div className="sk-script" style={{ fontSize: 34, fontWeight: 700, lineHeight: 1 }}>Library</div>
            <div className="sk-mono-tag" style={{ marginTop: 4 }}>everything you might do · 42 items</div>
          </div>
          {/* view switcher */}
          <div style={{ display: 'flex', gap: 4 }}>
            {[
              ['table', true], ['cards', false], ['tree', false], ['map', false]
            ].map(([v, sel]) => (
              <div key={v} className="sk-box wob-sm" style={{
                padding: '5px 14px',
                background: sel ? 'var(--ink)' : 'var(--paper)',
                color: sel ? 'var(--paper)' : 'var(--ink)'
              }}>{v}</div>
            ))}
          </div>
        </div>

        {/* Saved view tabs */}
        <div style={{ marginTop: 14, display: 'flex', gap: 6, alignItems: 'center', borderBottom: '2px solid var(--ink)', paddingBottom: 8 }}>
          {[
            ['All', true],
            ['Inbox · 7', false],
            ['Today', false],
            ['This week', false],
            ['Overdue · 2', false, 'red'],
            ['By area', false],
            ['Goals only', false]
          ].map(([n, sel, tone]) => (
            <div key={n} className={`sk-box wob-sm`} style={{
              padding: '4px 12px', fontSize: 14,
              background: sel ? 'var(--paper-2)' : 'transparent',
              borderColor: tone === 'red' ? 'var(--red-ink)' : 'var(--ink)',
              color: tone === 'red' ? 'var(--red-ink)' : 'var(--ink)',
              borderStyle: sel ? 'solid' : 'solid',
              borderWidth: sel ? '2px' : '1.5px'
            }}>{n}</div>
          ))}
          <span style={{ flex: 1 }} />
          <div className="sk-box wob-sm" style={{ padding: '4px 12px', fontSize: 14, borderStyle: 'dashed' }}>+ save view</div>
        </div>

        {/* Filter bar */}
        <div style={{ marginTop: 10, display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <div className="sk-box wob-pill" style={{ padding: '4px 14px', display: 'flex', gap: 6, alignItems: 'center', minWidth: 240 }}>
            <span style={{ color: 'var(--pencil)' }}>⌕</span>
            <span style={{ color: 'var(--pencil)' }}>search titles…</span>
          </div>
          <Badge>type · any ▾</Badge>
          <Badge>area · any ▾</Badge>
          <Badge>status · ready ▾</Badge>
          <Badge>group by · area ▾</Badge>
          <Badge>sort · deadline ▾</Badge>
          <span style={{ flex: 1 }} />
          <span className="sk-mono-tag">4 filters · clear</span>
        </div>
      </div>

      {/* Table */}
      <div style={{ marginTop: 14, padding: '0 22px', overflow: 'auto', height: 'calc(100% - 220px)' }}>
        {/* Header row */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '24px 1fr 70px 80px 130px 100px 90px 50px',
          padding: '6px 4px',
          borderBottom: '1.5px solid var(--ink)',
          fontSize: 12, color: 'var(--pencil)',
          textTransform: 'uppercase', letterSpacing: 0.5,
          fontFamily: 'Special Elite, monospace'
        }}>
          <span />
          <span>title</span>
          <span>type</span>
          <span>duration</span>
          <span>deadline</span>
          <span>where</span>
          <span>status</span>
          <span></span>
        </div>

        {rows.map((g, gi) => (
          <div key={gi}>
            {/* Group header */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '12px 4px 6px',
              borderBottom: '1px dashed var(--pencil-light)'
            }}>
              <span style={{ fontSize: 12 }}>▾</span>
              <Swatch color={g.color} />
              <span style={{ fontSize: 18, fontWeight: 700 }}>{g.icon} {g.group}</span>
              <span className="sk-mono-tag">{g.items.length}</span>
              <span style={{ flex: 1 }} />
              <span className="sk-mono-tag" style={{ color: 'var(--pencil)' }}>+ add to {g.group.toLowerCase()}</span>
            </div>
            {g.items.map((r, i) => (
              <div key={i} style={{
                display: 'grid',
                gridTemplateColumns: '24px 1fr 70px 80px 130px 100px 90px 50px',
                padding: '9px 4px',
                borderBottom: '1px dashed var(--pencil-faint)',
                alignItems: 'center',
                fontSize: 15,
                background: r.unprocessed ? 'rgba(240, 226, 90, 0.18)' : 'transparent'
              }}>
                <Check on={r.completed} />
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span>{r.t}</span>
                  {r.sub && <Badge kind="dim" style={{ fontSize: 11 }}>{r.sub}</Badge>}
                  {r.unprocessed && <Badge kind="yel" style={{ fontSize: 11 }}>unprocessed</Badge>}
                </div>
                <Badge kind={r.type === 'goal' ? 'dark' : ''} style={{ fontSize: 11 }}>{r.type}</Badge>
                <span style={{ color: r.dur === '—' ? 'var(--pencil-light)' : 'var(--ink)' }}>{r.dur}</span>
                <span style={{ color: r.overdue ? 'var(--red-ink)' : (r.dl === '—' ? 'var(--pencil-light)' : 'var(--ink)'), fontWeight: r.overdue ? 700 : 400 }}>
                  {r.dl}{r.overdue && ' ⚠'}
                </span>
                <span style={{ color: r.where === '—' ? 'var(--pencil-light)' : 'var(--ink)' }}>{r.where}</span>
                <span>{r.ready ? <Badge kind="dark" style={{ fontSize: 11 }}>ready</Badge> : (r.unprocessed ? <Badge kind="red" style={{ fontSize: 11 }}>triage</Badge> : <Badge kind="dim" style={{ fontSize: 11 }}>—</Badge>)}</span>
                <span className="sk-mono-tag" style={{ color: 'var(--pencil)' }}>···</span>
              </div>
            ))}
          </div>
        ))}
      </div>

      {/* Floating Anno */}
      <div style={{ position: 'absolute', top: 130, right: 22 }}>
        <Anno width={220}>
          everything in one table — inbox is just a smart view, not a separate page.
        </Anno>
      </div>
    </div>
  );
}

// ============================================================
// B. SMART INBOX + LIBRARY HYBRID — left rail, card list, peek
// ============================================================
function ItemsB() {
  return (
    <div className="sk-page sk-hand">
      <AppTop active="Library" />
      <div style={{ display: 'grid', gridTemplateColumns: '230px 1fr', height: 'calc(100% - 56px)' }}>
        {/* Left rail */}
        <div style={{ borderRight: '2px solid var(--ink)', padding: '14px 14px', display: 'flex', flexDirection: 'column', gap: 18, overflow: 'auto' }}>
          <div>
            <div className="sk-mono-tag">smart views</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 6 }}>
              {[
                ['📥', 'Inbox', '7', true, 'red'],
                ['🔥', 'Today', '4'],
                ['📆', 'This week', '12'],
                ['⏰', 'Overdue', '2', false, 'red'],
                ['🎯', 'Goals', '8'],
                ['🏁', 'Plans', '6'],
                ['◌', 'Unprocessed', '7'],
                ['✓', 'Done · this wk', '11']
              ].map(([icon, name, count, sel, tone]) => (
                <div key={name} className="sk-box wob-sm" style={{
                  padding: '6px 10px', display: 'flex', alignItems: 'center', gap: 8, fontSize: 14,
                  background: sel ? 'var(--ink)' : 'transparent',
                  color: sel ? 'var(--paper)' : 'var(--ink)',
                  border: sel ? '2px solid var(--ink)' : '1.5px solid transparent'
                }}>
                  <span>{icon}</span>
                  <span style={{ flex: 1 }}>{name}</span>
                  <span className="sk-mono-tag" style={{
                    color: sel ? 'var(--paper)' : (tone === 'red' ? 'var(--red-ink)' : 'var(--pencil)'),
                    fontWeight: tone === 'red' ? 700 : 400
                  }}>{count}</span>
                </div>
              ))}
            </div>
          </div>

          <div>
            <div className="sk-mono-tag">life areas</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 6 }}>
              {[
                ['🌅 Career', 14, '#9bb8d6'],
                ['🧘 Health', 9, '#b6cfa7'],
                ['🏠 Home', 5, '#d6b9a2'],
                ['❤️ Relationships', 4, '#d6a2b9'],
                ['💰 Finance', 3, '#d6cea2'],
                ['🌱 Growth', 7, '#a2c8d6']
              ].map(([n, c, col]) => (
                <div key={n} style={{ padding: '5px 8px', display: 'flex', alignItems: 'center', gap: 8, fontSize: 14 }}>
                  <Swatch color={col} />
                  <span style={{ flex: 1 }}>{n}</span>
                  <span className="sk-mono-tag" style={{ color: 'var(--pencil)' }}>{c}</span>
                </div>
              ))}
              <div style={{ padding: '5px 8px', fontSize: 13, color: 'var(--pencil)' }}>+ add area</div>
            </div>
          </div>

          <div style={{ marginTop: 'auto', padding: 10, borderTop: '1px dashed var(--pencil-light)', fontSize: 13, color: 'var(--pencil)' }}>
            <div style={{ marginBottom: 4 }}>⌘K · capture</div>
            <div>⌘N · new item</div>
            <div>⌘/ · search</div>
          </div>
        </div>

        {/* Main */}
        <div style={{ padding: '16px 22px', overflow: 'hidden' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span className="sk-script" style={{ fontSize: 36, fontWeight: 700, lineHeight: 1 }}>Inbox</span>
                <Badge kind="red">7 to triage</Badge>
              </div>
              <div className="sk-mono-tag" style={{ marginTop: 4 }}>captured but not classified · clear it like email</div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <div className="sk-box wob-sm tight">⌘K capture</div>
              <div className="sk-box wob-sm tight" style={{ background: 'var(--ink)', color: 'var(--paper)' }}>triage mode →</div>
            </div>
          </div>

          {/* Capture bar */}
          <div className="sk-box wob-pill" style={{ marginTop: 14, padding: '10px 16px', display: 'flex', gap: 10, alignItems: 'center', background: 'var(--paper-2)' }}>
            <span className="sk-script" style={{ fontSize: 22 }}>+</span>
            <span style={{ flex: 1, color: 'var(--pencil)' }}>jot anything — classify later</span>
            <span className="sk-mono-tag">enter</span>
          </div>

          {/* Filters / view toggle */}
          <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Badge>type · any</Badge>
            <Badge>sort · oldest</Badge>
            <span style={{ flex: 1 }} />
            <div style={{ display: 'flex', gap: 4 }}>
              {[['list', false], ['cards', true]].map(([v, sel]) => (
                <div key={v} className="sk-box wob-sm" style={{
                  padding: '4px 12px', fontSize: 13,
                  background: sel ? 'var(--ink)' : 'var(--paper)',
                  color: sel ? 'var(--paper)' : 'var(--ink)'
                }}>{v}</div>
              ))}
            </div>
          </div>

          {/* Cards grid */}
          <div style={{ marginTop: 14, display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, overflow: 'auto', height: 'calc(100% - 200px)', padding: 4 }}>
            {[
              { t: 'birthday gift for sam', age: '1h', un: true },
              { t: 'finish Q4 strategy doc draft', age: '14m', un: true },
              { t: 'tax stuff — schedule w/ accountant', age: '1d', un: true },
              { t: 'plant basil before it dies', age: '3h', un: true },
              { t: 'call dentist about crown', age: '2m', un: true },
              { t: 'read paper Linda sent', age: '2d', un: true },
              { t: 'check garage door', age: '8s', un: true }
            ].map((c, i) => (
              <Card key={i} style={{
                padding: 14, minHeight: 132, display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
                background: c.un ? 'var(--highlight-soft)' : 'var(--paper)'
              }}>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <Badge kind="yel" style={{ fontSize: 11 }}>unprocessed</Badge>
                    <span className="sk-mono-tag" style={{ color: 'var(--pencil)' }}>{c.age}</span>
                  </div>
                  <div className="sk-script" style={{ fontSize: 24, fontWeight: 600, lineHeight: 1.1, marginTop: 8 }}>{c.t}</div>
                </div>
                <div style={{ display: 'flex', gap: 6, marginTop: 12 }}>
                  <div className="sk-box wob-sm tight" style={{ fontSize: 12 }}>classify</div>
                  <div className="sk-box wob-sm tight" style={{ fontSize: 12 }}>schedule</div>
                  <span style={{ flex: 1 }} />
                  <span className="sk-mono-tag" style={{ color: 'var(--pencil)' }}>···</span>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </div>

      <div style={{ position: 'absolute', top: 110, right: 28 }}>
        <Anno width={220}>
          inbox feels like a familiar email surface — but every card has classify / schedule built in.
        </Anno>
      </div>
    </div>
  );
}

// ============================================================
// C. MAP / TREE — life areas as clusters, goals as branches
// ============================================================
function ItemsC() {
  return (
    <div className="sk-page sk-hand" style={{ display: 'flex', flexDirection: 'column' }}>
      <AppTop active="Library" />
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 22px', borderBottom: '1.5px dashed var(--pencil-light)' }}>
        <div>
          <div className="sk-script" style={{ fontSize: 30, fontWeight: 700, lineHeight: 1 }}>Map view</div>
          <div className="sk-mono-tag" style={{ marginTop: 2 }}>everything you might do, clustered by life area</div>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <Badge>collapse all</Badge>
          <Badge>focus · goals</Badge>
          <div style={{ display: 'flex', gap: 4, marginLeft: 6 }}>
            {[['table', false], ['cards', false], ['tree', false], ['map', true]].map(([v, sel]) => (
              <div key={v} className="sk-box wob-sm" style={{
                padding: '4px 12px', fontSize: 13,
                background: sel ? 'var(--ink)' : 'var(--paper)',
                color: sel ? 'var(--paper)' : 'var(--ink)'
              }}>{v}</div>
            ))}
          </div>
        </div>
      </div>

      <div style={{ position: 'relative', flex: 1, overflow: 'hidden', padding: '24px 24px' }}>
        {/* Map canvas */}
        <div style={{ position: 'relative', width: '100%', height: '100%' }}>
          {/* Career cluster */}
          <Cluster
            title="🌅 Career"
            color="#9bb8d6"
            x={40} y={20} w={420} h={300}
            items={[
              { name: 'Q4 strategy doc', kind: 'task', sub: '2h · Fri' },
              { name: 'Hiring panel', kind: 'goal', sub: '2/5' },
              { name: '1:1 with Ana', kind: 'plan', sub: 'Tue 3p' },
              { name: 'Submit expenses', kind: 'task', sub: '20m · overdue', warn: true }
            ]}
          />
          {/* Health cluster */}
          <Cluster
            title="🧘 Health"
            color="#b6cfa7"
            x={500} y={40} w={350} h={260}
            items={[
              { name: '10k training plan', kind: 'goal', sub: '7/12 · May' },
              { name: 'Dentist follow-up', kind: 'task', sub: '30m' },
              { name: 'Renew prescription', kind: 'task', sub: '15m' }
            ]}
          />
          {/* Home cluster */}
          <Cluster
            title="🏠 Home"
            color="#d6b9a2"
            x={880} y={20} w={280} h={220}
            items={[
              { name: 'Plant basil', kind: 'task', sub: '15m · today', warn: true },
              { name: 'Schedule plumber', kind: 'task', sub: '10m' }
            ]}
          />
          {/* Inbox cluster */}
          <Cluster
            title="◌ Inbox"
            color="#f0e25a"
            x={120} y={350} w={620} h={180}
            wide
            items={[
              { name: 'birthday gift for sam', kind: 'note' },
              { name: 'call dentist re: crown', kind: 'note' },
              { name: 'tax stuff w/ accountant', kind: 'note' },
              { name: 'read paper Linda sent', kind: 'note' },
              { name: 'check garage door', kind: 'note' }
            ]}
          />
          {/* Growth cluster */}
          <Cluster
            title="🌱 Growth"
            color="#a2c8d6"
            x={780} y={320} w={340} h={200}
            items={[
              { name: 'Spanish · 30 day', kind: 'goal', sub: '12/30' },
              { name: 'Annual reflection', kind: 'task', sub: '2h' }
            ]}
          />

          {/* connecting lines for goals → subtasks (decorative) */}
          <svg style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
            <path d="M 600 130 Q 700 200, 820 320" fill="none" stroke="var(--pencil)" strokeWidth="1.5" strokeDasharray="3 5" opacity="0.55" />
            <path d="M 320 280 Q 380 320, 420 360" fill="none" stroke="var(--pencil)" strokeWidth="1.5" strokeDasharray="3 5" opacity="0.55" />
          </svg>

          <Anno style={{ position: 'absolute', bottom: 24, right: 28, transform: 'rotate(-2deg)' }} width={220}>
            for big-picture thinkers: see the SHAPE of your life. drag items between clusters to recategorize.
          </Anno>
        </div>
      </div>
    </div>
  );
}

function Cluster({ title, color, x, y, w, h, items, wide }) {
  return (
    <div className="sk-box wob" style={{
      position: 'absolute', left: x, top: y, width: w, minHeight: h,
      background: 'var(--paper)',
      borderColor: 'var(--ink)',
      padding: 12,
      boxShadow: `4px 5px 0 ${color}`
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
        <Swatch color={color} />
        <span className="sk-script" style={{ fontSize: 22, fontWeight: 700, lineHeight: 1 }}>{title}</span>
        <span style={{ flex: 1 }} />
        <span className="sk-mono-tag">{items.length} items</span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: wide ? 'repeat(3, 1fr)' : 'repeat(2, 1fr)', gap: 6 }}>
        {items.map((it, i) => (
          <div key={i} className="sk-box wob-sm" style={{
            padding: '6px 9px',
            background: it.warn ? 'var(--red-ink-faint)' : 'var(--paper-2)',
            borderColor: it.warn ? 'var(--red-ink)' : 'var(--ink)',
            minHeight: 46
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: 13, fontWeight: 600, lineHeight: 1.1, color: it.warn ? 'var(--red-ink)' : 'var(--ink)' }}>{it.name}</span>
              <Badge style={{ fontSize: 10, padding: '2px 6px' }} kind={it.kind === 'goal' ? 'dark' : (it.kind === 'note' ? 'yel' : '')}>{it.kind}</Badge>
            </div>
            {it.sub && <div className="sk-mono-tag" style={{ marginTop: 2 }}>{it.sub}</div>}
          </div>
        ))}
      </div>
    </div>
  );
}

Object.assign(window, { ItemsA, ItemsB, ItemsC });
