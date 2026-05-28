/* global React */
// Round-up: bulk actions · global search · mind-map · engine actions · subtasks board

// ============================================================
// BULK ACTIONS in Library
// ============================================================
function LibraryBulkActions() {
  const rows = [
    { t: 'Q4 strategy doc draft', type: 'task', area: 'Career', col: '#9bb8d6', dur: '2h', dl: 'Fri', sel: true },
    { t: 'Hiring panel — back-end', type: 'goal', area: 'Career', col: '#9bb8d6', dur: '∑ 4h', dl: 'sprint', sel: true },
    { t: '1:1 with Ana', type: 'plan', area: 'Career', col: '#9bb8d6', dur: '45m', dl: 'Tue 3p' },
    { t: 'Submit Q4 expenses', type: 'task', area: 'Career', col: '#9bb8d6', dur: '20m', dl: 'overdue', sel: true, overdue: true },
    { t: 'Dentist follow-up', type: 'task', area: 'Health', col: '#b6cfa7', dur: '30m', dl: 'this month' },
    { t: 'Renew prescription', type: 'task', area: 'Health', col: '#b6cfa7', dur: '15m', dl: 'Apr 20', sel: true },
    { t: '10k training plan', type: 'goal', area: 'Health', col: '#b6cfa7', dur: '∑ 18h', dl: 'May 25' },
    { t: 'Plant basil', type: 'task', area: 'Home', col: '#d6b9a2', dur: '15m', dl: 'today', sel: true },
    { t: 'Schedule plumber', type: 'task', area: 'Home', col: '#d6b9a2', dur: '10m', dl: 'this week' }
  ];
  const selectedCount = rows.filter(r => r.sel).length;
  return (
    <Shell active="Library">
      <div style={{ padding: '14px 22px', borderBottom: '1.5px dashed var(--pencil-light)', display: 'flex', alignItems: 'baseline', gap: 14, flexShrink: 0 }}>
        <div className="sk-script" style={{ fontSize: 28, fontWeight: 700, lineHeight: 1 }}>Library · Browse all</div>
        <span className="sk-mono-tag">42 items</span>
        <span style={{ flex: 1 }} />
        <Badge>filters · all areas</Badge>
        <Badge>sort · deadline</Badge>
      </div>

      <div style={{ flex: 1, overflow: 'auto', padding: '12px 22px 110px' }}>
        <div style={{
          display: 'grid', gridTemplateColumns: '24px 1fr 70px 110px 100px 90px 30px',
          padding: '6px 4px', borderBottom: '1.5px solid var(--ink)',
          fontSize: 11, color: 'var(--pencil)',
          textTransform: 'uppercase', letterSpacing: 0.5, fontFamily: 'Special Elite, monospace'
        }}>
          <Check on />
          <span>title · select all</span>
          <span>type</span>
          <span>area</span>
          <span>dur · dl</span>
          <span>status</span>
          <span />
        </div>
        {rows.map((r, i) => (
          <div key={i} style={{
            display: 'grid', gridTemplateColumns: '24px 1fr 70px 110px 100px 90px 30px',
            padding: '10px 4px',
            borderBottom: '1px dashed var(--pencil-faint)',
            alignItems: 'center', fontSize: 14,
            background: r.sel ? 'rgba(240,226,90,0.18)' : 'transparent'
          }}>
            <Check on={r.sel} />
            <span style={{ fontWeight: 600 }}>{r.t}</span>
            <Badge style={{ fontSize: 11 }}>{r.type}</Badge>
            <Badge style={{ fontSize: 11 }}><Swatch color={r.col} />{r.area}</Badge>
            <span style={{ fontSize: 13 }}>
              <span style={{ fontWeight: 700 }}>{r.dur}</span>
              <span style={{ color: r.overdue ? 'var(--red-ink)' : 'var(--pencil)', marginLeft: 6 }}>{r.dl}</span>
            </span>
            <Badge kind={r.overdue ? 'red' : 'dim'} style={{ fontSize: 11 }}>{r.overdue ? 'overdue' : 'ready'}</Badge>
            <span className="sk-mono-tag" style={{ color: 'var(--pencil)' }}>···</span>
          </div>
        ))}
      </div>

      {/* Floating bulk action bar */}
      <div style={{
        position: 'absolute', bottom: 24, left: '50%', transform: 'translateX(-50%)',
        background: 'var(--ink)', color: 'var(--paper)',
        borderRadius: '14px 18px 12px 16px / 16px 12px 18px 14px',
        padding: '10px 14px',
        boxShadow: '0 8px 28px rgba(28,26,23,0.3)',
        display: 'flex', alignItems: 'center', gap: 12,
        border: '2px solid var(--ink)'
      }}>
        <span className="sk-script" style={{ fontSize: 22, fontWeight: 700, lineHeight: 1 }}>{selectedCount} selected</span>
        <span style={{ width: 1, height: 22, background: 'rgba(245,241,232,0.3)' }} />
        {[
          ['🌅', 'reassign area'],
          ['📍', 'set location'],
          ['🎨', 'set color'],
          ['↑', 'set priority'],
          ['📅', 'reschedule'],
          ['✓', 'mark done'],
          ['❏', 'duplicate']
        ].map(([icon, label]) => (
          <div key={label} className="sk-box wob-sm tight" style={{
            background: 'transparent', borderColor: 'rgba(245,241,232,0.5)',
            color: 'var(--paper)', padding: '4px 9px', fontSize: 12,
            display: 'flex', alignItems: 'center', gap: 4
          }}>
            <span>{icon}</span><span>{label}</span>
          </div>
        ))}
        <div className="sk-box wob-sm tight" style={{
          background: 'var(--red-ink)', borderColor: 'var(--red-ink)',
          color: 'var(--paper)', padding: '4px 9px', fontSize: 12
        }}>🗑 delete</div>
        <span style={{ width: 1, height: 22, background: 'rgba(245,241,232,0.3)' }} />
        <span className="sk-mono-tag" style={{ color: 'rgba(245,241,232,0.6)' }}>esc to clear</span>
      </div>
    </Shell>
  );
}

// ============================================================
// GLOBAL SEARCH PALETTE
// ============================================================
function GlobalSearch() {
  return (
    <Shell active="Today">
      {/* dimmed background */}
      <div style={{ flex: 1, opacity: 0.3, overflow: 'hidden', padding: '22px 28px' }}>
        <div className="sk-script" style={{ fontSize: 32 }}>Today</div>
        <Lines count={4} style={{ marginTop: 12 }} />
        <div className="sk-box wob" style={{ marginTop: 14, padding: 14, height: 200 }}>
          <span className="sk-mono-tag">what to do today</span>
          <Lines count={5} style={{ marginTop: 8 }} />
        </div>
      </div>

      {/* Palette */}
      <div style={{
        position: 'absolute', top: '20%', left: '50%', transform: 'translate(-50%, 0)',
        width: 'min(640px, 80%)',
        background: 'var(--paper)',
        border: '2px solid var(--ink)',
        borderRadius: '14px 18px 12px 16px / 16px 12px 18px 14px',
        boxShadow: '0 20px 60px rgba(28,26,23,0.35)',
        overflow: 'hidden'
      }}>
        {/* input */}
        <div style={{ padding: '12px 16px', borderBottom: '2px solid var(--ink)', display: 'flex', alignItems: 'center', gap: 10 }}>
          <span className="sk-script" style={{ fontSize: 22 }}>⌕</span>
          <span style={{ flex: 1, fontSize: 18 }}>
            <i>plant</i>
            <span style={{ display: 'inline-block', width: 2, height: 20, background: 'var(--red-ink)', marginLeft: 1, verticalAlign: 'middle' }} />
          </span>
          <span className="sk-mono-tag">esc to close</span>
        </div>

        {/* Results grouped */}
        <div style={{ maxHeight: 380, overflow: 'auto' }}>
          <ResultGroup label="items · 3">
            <Result icon="✓" name="Plant basil before it dies" sub="Task · Home · 15m · today" sel />
            <Result icon="🎯" name="Garden plan" sub="Goal · Home · 4 subtasks" />
            <Result icon="✓" name="Plant tulip bulbs" sub="Task · Home · 30m · last Oct" />
          </ResultGroup>
          <ResultGroup label="life areas · 0" empty />
          <ResultGroup label="places · 1">
            <Result icon="📍" name="Plant Shop · Hill Road" sub="2 mi from home · 8m driving" />
          </ResultGroup>
          <ResultGroup label="actions · 2">
            <Result icon="+" name="Capture · Plant basil" sub="quick add" />
            <Result icon="↗" name="Open Today" sub="navigate" />
          </ResultGroup>
        </div>

        {/* footer */}
        <div style={{ padding: '8px 14px', background: 'var(--paper-2)', borderTop: '1.5px dashed var(--pencil-light)', display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--pencil)' }}>
          <span>↑↓ navigate · ↵ open · ⌥↵ quick action</span>
          <span>⌘/ · across items, areas, places</span>
        </div>
      </div>
    </Shell>
  );
}

function ResultGroup({ label, children, empty }) {
  return (
    <div>
      <div style={{ padding: '8px 14px 4px', borderBottom: '1px dashed var(--pencil-faint)' }}>
        <span className="sk-mono-tag">{label}</span>
      </div>
      {empty
        ? <div style={{ padding: '8px 14px', fontSize: 12, color: 'var(--pencil)' }}>no matches</div>
        : children
      }
    </div>
  );
}

function Result({ icon, name, sub, sel }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12,
      padding: '8px 14px',
      background: sel ? 'var(--paper-2)' : 'transparent',
      borderLeft: sel ? '3px solid var(--red-ink)' : '3px solid transparent'
    }}>
      <span style={{ width: 22, fontSize: 14, textAlign: 'center' }}>{icon}</span>
      <div style={{ flex: 1, lineHeight: 1.15 }}>
        <div style={{ fontSize: 15, fontWeight: 600 }}>{name}</div>
        <div className="sk-mono-tag" style={{ fontSize: 10, color: 'var(--pencil)' }}>{sub}</div>
      </div>
      {sel && <span className="sk-mono-tag" style={{ color: 'var(--red-ink)' }}>↵</span>}
    </div>
  );
}

// ============================================================
// MIND MAP — life areas as connected clusters
// ============================================================
function MindMapView() {
  return (
    <Shell active="Library">
      <div style={{ padding: '14px 22px', borderBottom: '1.5px dashed var(--pencil-light)', display: 'flex', alignItems: 'center', gap: 14, flexShrink: 0 }}>
        <div className="sk-script" style={{ fontSize: 28, fontWeight: 700, lineHeight: 1 }}>Mind map</div>
        <span className="sk-mono-tag">your life · clustered · drag to reorganize</span>
        <span style={{ flex: 1 }} />
        <div style={{ display: 'flex', gap: 4 }}>
          {[['table', false], ['cards', false], ['tree', false], ['map', true]].map(([v, sel]) => (
            <div key={v} className="sk-box wob-sm" style={{
              padding: '4px 12px', fontSize: 13,
              background: sel ? 'var(--ink)' : 'var(--paper)',
              color: sel ? 'var(--paper)' : 'var(--ink)'
            }}>{v}</div>
          ))}
        </div>
        <Badge>filter · all</Badge>
        <Badge>zoom · 100%</Badge>
      </div>

      <div style={{ flex: 1, position: 'relative', overflow: 'hidden', padding: 0, background: 'radial-gradient(circle at 50% 50%, var(--paper) 0%, var(--paper-2) 100%)' }}>
        {/* center node — me */}
        <Node x="50%" y="50%" w={120} h={120} round label="you" center />
        {/* area clusters */}
        <AreaNode x={170} y={140} w={300} h={200} icon="🌅" name="Career" color="#9bb8d6" branches={[
          { name: 'Q4 strategy', kind: 'goal' },
          { name: 'Hiring panel', kind: 'goal' },
          { name: '1:1 Ana', kind: 'plan' }
        ]} />
        <AreaNode x={850} y={90} w={320} h={210} icon="🧘" name="Health" color="#b6cfa7" branches={[
          { name: '10k training', kind: 'goal', emphasize: true },
          { name: 'Dentist follow-up', kind: 'task' },
          { name: 'Renew Rx', kind: 'task' }
        ]} />
        <AreaNode x={80} y={420} w={300} h={170} icon="❤️" name="Relationships" color="#d6a2b9" branches={[
          { name: 'Mom · weekly call', kind: 'plan' },
          { name: 'Sam birthday', kind: 'task' }
        ]} />
        <AreaNode x={900} y={420} w={280} h={160} icon="🏠" name="Home" color="#d6b9a2" branches={[
          { name: 'Plant basil', kind: 'task', warn: true },
          { name: 'Plumber', kind: 'task' }
        ]} />
        <AreaNode x={500} y={500} w={300} h={170} icon="🌱" name="Growth" color="#a2c8d6" branches={[
          { name: 'Spanish · 30d', kind: 'goal' },
          { name: 'Annual reflection', kind: 'task' }
        ]} />

        {/* connecting lines from center to each cluster */}
        <svg style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
          <g stroke="var(--ink)" strokeWidth="2" fill="none" strokeDasharray="4 5" opacity="0.45">
            <path d="M 700 460 Q 500 360, 320 240" />
            <path d="M 700 460 Q 850 320, 1010 200" />
            <path d="M 700 460 Q 460 480, 230 510" />
            <path d="M 700 460 Q 850 500, 1040 500" />
            <path d="M 700 460 Q 660 530, 650 580" />
          </g>
        </svg>

        <Anno style={{ position: 'absolute', top: 22, right: 28, transform: 'rotate(-2deg)' }} width={220}>
          for big-picture thinking. drag a task between areas to recategorize. zoom out for years.
        </Anno>
      </div>
    </Shell>
  );
}

function Node({ x, y, w, h, label, round, center }) {
  return (
    <div style={{
      position: 'absolute',
      left: typeof x === 'number' ? x : x, top: typeof y === 'number' ? y : y,
      width: w, height: h,
      transform: typeof x === 'string' ? 'translate(-50%, -50%)' : 'none',
      borderRadius: round ? '50%' : 8,
      background: center ? 'var(--ink)' : 'var(--paper)',
      color: center ? 'var(--paper)' : 'var(--ink)',
      border: '2px solid var(--ink)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: 'Caveat, cursive', fontSize: 28, fontWeight: 700,
      boxShadow: center ? '5px 6px 0 var(--red-ink)' : '3px 4px 0 var(--ink)'
    }}>{label}</div>
  );
}

function AreaNode({ x, y, w, h, icon, name, color, branches }) {
  return (
    <div className="sk-box wob" style={{
      position: 'absolute', left: x, top: y, width: w, minHeight: h,
      background: 'var(--paper)',
      padding: 10,
      boxShadow: `4px 5px 0 ${color}`
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <Swatch color={color} />
        <span className="sk-script" style={{ fontSize: 22, fontWeight: 700, lineHeight: 1 }}>{icon} {name}</span>
        <span style={{ flex: 1 }} />
        <span className="sk-mono-tag">{branches.length}</span>
      </div>
      <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 4 }}>
        {branches.map((b, i) => (
          <div key={i} style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '4px 8px',
            background: b.warn ? 'var(--red-ink-faint)' : (b.emphasize ? 'var(--highlight-soft)' : 'var(--paper-2)'),
            border: '1px solid ' + (b.warn ? 'var(--red-ink)' : 'var(--ink)'),
            borderRadius: 5
          }}>
            <span style={{ fontSize: 13, flex: 1, color: b.warn ? 'var(--red-ink)' : 'var(--ink)' }}>{b.name}</span>
            <Badge style={{ fontSize: 9, padding: '1px 5px' }} kind={b.kind === 'goal' ? 'dark' : ''}>{b.kind}</Badge>
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================================
// ENGINE PROPOSED ACTIONS — one message expanded with concrete fixes
// ============================================================
function EngineProposedActions() {
  return (
    <Shell active="Calendar">
      <div style={{ padding: '14px 22px', borderBottom: '1.5px dashed var(--pencil-light)', display: 'flex', alignItems: 'baseline', gap: 14 }}>
        <div className="sk-script" style={{ fontSize: 26, fontWeight: 700, lineHeight: 1 }}>Engine messages</div>
        <span className="sk-mono-tag">click any message to see proposed fixes</span>
        <span style={{ flex: 1 }} />
        <Badge>last gen · 2m ago · 412ms</Badge>
        <div className="sk-box wob-sm tight" style={{ fontSize: 12 }}>↻ regenerate</div>
      </div>

      <div style={{ flex: 1, overflow: 'auto', padding: '14px 22px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        <ExpandedMsg
          tone="fail"
          tag="FAIL"
          title="Couldn't place: ‘refactor billing service’"
          body="6h block needed. No 6h gap fits this week given strict Career window & 2 plans."
          actions={[
            { icon: '✂', label: 'split into 2 × 3h sessions', primary: true, sub: 'fits Tue + Thu cleanly' },
            { icon: '⚙', label: 'relax Career window to 9–6', sub: 'creates 1 extra hour daily' },
            { icon: '⏩', label: 'push deadline by 1 week', sub: 'opens 5 new candidate slots' },
            { icon: '👁', label: 'show me the conflicts on calendar' }
          ]}
        />
        <ExpandedMsg
          tone="warn"
          tag="LATE"
          title="‘Plant basil’ planned 3 days after deadline"
          body="Deadline was Apr 7. Earliest Home-window slot we found: today 2:00pm."
          actions={[
            { icon: '✓', label: 'accept · do it today 2pm', primary: true },
            { icon: '⚙', label: 'mark Home window as soft (allow other items in)', sub: '5 more candidate slots' },
            { icon: '⏰', label: 'set new deadline to today', sub: 'stop showing as late' }
          ]}
        />
        <ExpandedMsg
          tone="warn"
          tag="TRAVEL"
          title="Insufficient travel · Tue 12:30 → 1:00"
          body="office → home is 20m in regular traffic. Only 10m left between events."
          actions={[
            { icon: '⏰', label: 'push next event 10m later', primary: true, sub: 'plant basil → 1:10' },
            { icon: '🚆', label: 'switch travel to transit', sub: 'transit takes 15m, would fit' },
            { icon: '↗', label: 'move 1:1 with Ana earlier', sub: 'previous slot · 11:15 fits' }
          ]}
        />
        <ExpandedMsg
          tone="warn"
          tag="TRESPASS"
          title="‘Submit expenses’ sits in strict Health window"
          body="Wed 5pm. Health window is strict — only Health items allowed."
          actions={[
            { icon: '↗', label: 'find non-conflicting slot', primary: true, sub: 'next available: Thu 4:30pm' },
            { icon: '🌅', label: 'reassign expenses to Admin sub-area', sub: 'admin has no strict window' },
            { icon: '⚙', label: 'relax Health window to soft', sub: 'allow other items inside' }
          ]}
        />
      </div>
    </Shell>
  );
}

function ExpandedMsg({ tone, tag, title, body, actions }) {
  const tones = {
    fail: { border: 'var(--red-ink)', bg: 'var(--red-ink-faint)', tagBg: 'var(--red-ink)', tagFg: 'var(--paper)' },
    warn: { border: 'var(--ink)', bg: 'var(--highlight-soft)', tagBg: 'var(--ink)', tagFg: 'var(--highlight)' }
  }[tone];
  return (
    <div className="sk-box wob" style={{
      padding: 14, background: tones.bg,
      borderColor: tones.border, borderWidth: tone === 'fail' ? 2 : 1.5
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{
          fontFamily: 'Special Elite, monospace', fontSize: 10, letterSpacing: 0.5,
          padding: '3px 8px', background: tones.tagBg, color: tones.tagFg, borderRadius: 3
        }}>{tag}</span>
        <span style={{ fontSize: 16, fontWeight: 700 }}>{title}</span>
      </div>
      <div style={{ marginTop: 6, fontSize: 13, color: 'var(--ink-soft)' }}>{body}</div>

      <div className="sk-mono-tag" style={{ marginTop: 10 }}>proposed actions</div>
      <div style={{ marginTop: 4, display: 'flex', flexDirection: 'column', gap: 5 }}>
        {actions.map((a, i) => (
          <div key={i} className="sk-box wob-sm" style={{
            padding: '7px 10px', background: 'var(--paper)',
            display: 'flex', alignItems: 'center', gap: 8,
            borderColor: a.primary ? 'var(--ink)' : 'var(--pencil-light)',
            borderWidth: a.primary ? 2 : 1.5
          }}>
            <span style={{ width: 18, textAlign: 'center' }}>{a.icon}</span>
            <div style={{ flex: 1, lineHeight: 1.2 }}>
              <div style={{ fontSize: 14, fontWeight: a.primary ? 700 : 500 }}>{a.label}</div>
              {a.sub && <div className="sk-mono-tag" style={{ fontSize: 10, color: 'var(--pencil)' }}>{a.sub}</div>}
            </div>
            {a.primary && <span className="sk-mono-tag" style={{ color: 'var(--red-ink)' }}>apply ↵</span>}
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================================
// SUBTASKS · BOARD VIEW (inside item detail · Subtasks tab)
// ============================================================
function SubtasksBoard() {
  const cols = [
    { name: 'Backlog', items: [
      { t: 'taper · race day', dur: '1h', dl: 'May 25' },
      { t: 'long run · 9mi', dur: '1h 40m', dl: 'May 18' }
    ]},
    { name: 'Up next', items: [
      { t: 'long run · 8mi', dur: '1h 30m', sched: 'Sat 7a' },
      { t: 'tempo · 25min', dur: '50m', sched: 'Wed 6:30a' },
      { t: 'long run · 7mi', dur: '1h 20m', sched: 'Sat 7a' }
    ]},
    { name: 'This week', items: [
      { t: 'intervals · 800m × 4', dur: '50m', sched: 'today 2:30pm', highlight: true },
      { t: '4-mile easy', dur: '40m', sched: 'Fri 6:30a' }
    ]},
    { name: 'Done', items: [
      { t: '3-mile easy', dur: '30m', done: true },
      { t: 'tempo · 20min', dur: '45m', done: true },
      { t: 'long run · 6mi', dur: '1h 10m', done: true },
      { t: 'intervals · 400m × 6', dur: '45m', done: true },
      { t: '+3 more', subtle: true }
    ]}
  ];
  return (
    <Shell active="Library">
      <div style={{ padding: '10px 22px', borderBottom: '1.5px dashed var(--pencil-light)', display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
        <span style={{ fontSize: 13, color: 'var(--pencil)' }}>Library</span>
        <span style={{ color: 'var(--pencil-light)' }}>›</span>
        <Badge style={{ fontSize: 11 }}><Swatch color="#b6cfa7" />🧘 Health</Badge>
        <span style={{ color: 'var(--pencil-light)' }}>›</span>
        <span style={{ fontSize: 14, fontWeight: 700 }}>10k training plan</span>
        <Badge kind="dark" style={{ fontSize: 11 }}>goal</Badge>
        <span style={{ flex: 1 }} />
        <span className="sk-mono-tag">subtasks tab</span>
      </div>

      {/* Title + progress + tabs */}
      <div style={{ padding: '14px 32px 0' }}>
        <div className="sk-script" style={{ fontSize: 36, fontWeight: 700, lineHeight: 1 }}>10k training plan</div>
        <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
          <span className="sk-mono-tag" style={{ flex: 1 }}>7 of 12 · 58% · by May 25 · 4 weeks left</span>
        </div>
        <div style={{ marginTop: 6, height: 16, border: '2px solid var(--ink)', borderRadius: 8, overflow: 'hidden', background: 'var(--paper-2)', position: 'relative' }}>
          <div style={{ position: 'absolute', inset: 0, width: '58%', background: 'var(--ink)' }} />
        </div>

        {/* Tabs */}
        <div style={{ marginTop: 14, display: 'flex', gap: 4, borderBottom: '2px solid var(--ink)' }}>
          {[
            { name: 'Overview' },
            { name: 'Schedule' },
            { name: 'Subtasks', sel: true, badge: '12' },
            { name: 'Activity' }
          ].map(t => (
            <div key={t.name} style={{
              padding: '8px 16px 6px',
              borderRadius: '6px 8px 0 0 / 6px 8px 0 0',
              background: t.sel ? 'var(--paper-2)' : 'transparent',
              border: t.sel ? '2px solid var(--ink)' : '2px solid transparent',
              borderBottom: t.sel ? '2px solid var(--paper-2)' : 'none',
              marginBottom: -2,
              fontWeight: t.sel ? 700 : 400, fontSize: 16,
              display: 'flex', alignItems: 'center', gap: 6
            }}>
              <span>{t.name}</span>
              {t.badge && <span className="sk-mono-tag" style={{ fontSize: 10 }}>{t.badge}</span>}
            </div>
          ))}
          <span style={{ flex: 1 }} />
          <div style={{ padding: '6px 0', display: 'flex', gap: 4 }}>
            {[['list', false], ['board', true], ['timeline', false]].map(([v, sel]) => (
              <div key={v} className="sk-box wob-sm" style={{
                padding: '3px 10px', fontSize: 12,
                background: sel ? 'var(--ink)' : 'var(--paper)',
                color: sel ? 'var(--paper)' : 'var(--ink)'
              }}>{v}</div>
            ))}
          </div>
        </div>
      </div>

      {/* Board */}
      <div style={{ flex: 1, overflow: 'auto', padding: '14px 32px 28px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, minHeight: '100%' }}>
          {cols.map((c, ci) => (
            <div key={ci} className="sk-box wob" style={{
              padding: 12,
              background: ci === 3 ? 'var(--paper-2)' : 'var(--paper)',
              display: 'flex', flexDirection: 'column', gap: 8
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span className="sk-script" style={{ fontSize: 22, fontWeight: 700, lineHeight: 1 }}>{c.name}</span>
                <span className="sk-mono-tag">{c.items.filter(i => !i.subtle).length}</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {c.items.map((it, i) => (
                  it.subtle
                    ? <div key={i} style={{ fontSize: 13, color: 'var(--pencil)', textAlign: 'center', padding: 6 }}>{it.t}</div>
                    : (
                      <div key={i} className="sk-box wob-sm" style={{
                        padding: 10,
                        background: it.highlight ? 'var(--highlight-soft)' : (it.done ? 'var(--paper-2)' : 'var(--paper)'),
                        boxShadow: it.highlight ? '3px 4px 0 var(--ink)' : 'none',
                        opacity: it.done ? 0.75 : 1
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <Check on={it.done} />
                          <span style={{
                            fontSize: 14, fontWeight: 600, flex: 1,
                            textDecoration: it.done ? 'line-through' : 'none',
                            color: it.done ? 'var(--pencil)' : 'var(--ink)'
                          }}>{it.t}</span>
                          <span className="sk-mono-tag" style={{ color: 'var(--pencil)' }}>⋮⋮</span>
                        </div>
                        <div style={{ marginTop: 5, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                          <Badge style={{ fontSize: 10 }}>{it.dur}</Badge>
                          {it.dl && <Badge kind="dim" style={{ fontSize: 10 }}>{it.dl}</Badge>}
                          {it.sched && <Badge style={{ fontSize: 10, background: 'var(--red-ink-faint)', borderColor: 'var(--red-ink)', color: 'var(--red-ink)' }}>📅 {it.sched}</Badge>}
                        </div>
                      </div>
                    )
                ))}
                {ci !== 3 && (
                  <div style={{ padding: '8px 10px', fontSize: 13, color: 'var(--pencil)', border: '1.5px dashed var(--pencil-light)', borderRadius: 6, textAlign: 'center' }}>
                    + add subtask
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </Shell>
  );
}

Object.assign(window, { LibraryBulkActions, GlobalSearch, MindMapView, EngineProposedActions, SubtasksBoard });
