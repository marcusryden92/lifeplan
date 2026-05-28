/* global React */
// Item detail v2 — full-screen, with VS-Code file tree sidebar + tabs

function ItemDetailV2({ kind = 'goal' }) {
  const isGoal = kind === 'goal';
  const item = isGoal
    ? { title: '10k training plan', area: '🧘 Health', col: '#b6cfa7', type: 'goal', dur: '∑ 18h', dl: 'May 25', priority: 7, ready: true, progress: 58, subDone: 7, subTotal: 12 }
    : { title: 'Submit Q4 expenses', area: '🌅 Career', col: '#9bb8d6', type: 'task', dur: '20m', dl: 'overdue · Apr 7', priority: 4, ready: true };

  return (
    <Shell active="Library">
      {/* breadcrumb bar */}
      <div style={{ padding: '10px 22px', borderBottom: '1.5px dashed var(--pencil-light)', display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
        <span style={{ fontSize: 13, color: 'var(--pencil)' }}>Library</span>
        <span style={{ color: 'var(--pencil-light)' }}>›</span>
        <Badge style={{ fontSize: 11 }}><Swatch color={item.col} />{item.area}</Badge>
        <span style={{ color: 'var(--pencil-light)' }}>›</span>
        <span style={{ fontSize: 14, fontWeight: 700 }}>{item.title}</span>
        <span style={{ flex: 1 }} />
        <span className="sk-mono-tag">⌘← back · j / k next item · ⌘e edit title</span>
      </div>

      {/* main row: file tree + content */}
      <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '240px 1fr', minHeight: 0 }}>
        {/* VS-Code style item tree */}
        <div style={{ borderRight: '2px solid var(--ink)', overflow: 'auto', padding: '10px 6px 14px', background: 'var(--paper)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 8px 4px' }}>
            <span className="sk-mono-tag">items · tree</span>
            <span style={{ fontSize: 12, color: 'var(--pencil)' }}>⌕</span>
          </div>
          <Tree items={[
            { icon: '🌅', name: 'Career', color: '#9bb8d6', count: 14, open: true, children: [
              { name: 'Q4 strategy doc', kind: 'goal', count: 6, open: true, children: [
                { name: 'draft outline', kind: 'task', count: 1 },
                { name: 'data review', kind: 'task', count: 1 },
                { name: 'review w/ leads', kind: 'task', count: 1, sel: !isGoal && false }
              ]},
              { name: 'Hiring', kind: 'goal', count: 5 },
              { name: 'Submit Q4 expenses', kind: 'task', count: 1, sel: !isGoal },
              { name: '1:1 with Ana', kind: 'plan', count: 1 }
            ]},
            { icon: '🧘', name: 'Health', color: '#b6cfa7', count: 9, open: true, children: [
              { name: '10k training plan', kind: 'goal', count: 12, open: true, sel: isGoal, children: [
                { name: '3-mile easy', kind: 'task', count: 1, done: true },
                { name: 'intervals 800×4', kind: 'task', count: 1, current: true },
                { name: 'long run 8mi', kind: 'task', count: 1 },
                { name: '...+9 more', kind: 'more' }
              ]},
              { name: 'Dentist follow-up', kind: 'task', count: 1 }
            ]},
            { icon: '🏠', name: 'Home', color: '#d6b9a2', count: 5 },
            { icon: '❤️', name: 'Relationships', color: '#d6a2b9', count: 4 },
            { icon: '🌱', name: 'Growth', color: '#a2c8d6', count: 7 }
          ]} />
        </div>

        {/* Content */}
        <div style={{ overflow: 'auto', padding: '20px 32px 32px' }}>
          {/* Title block */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Badge kind={isGoal ? 'dark' : ''}>{item.type}</Badge>
              <Badge><Swatch color={item.col} /> {item.area}</Badge>
              {item.ready && <Badge>ready</Badge>}
              <span className="sk-mono-tag" style={{ marginLeft: 4 }}>{isGoal ? 'created 14d ago' : 'created 3d ago'}</span>
            </div>
            <div className="sk-script" style={{ fontSize: 48, fontWeight: 700, lineHeight: 1.02, marginTop: 6 }}>
              {item.title}
            </div>
            <SketchyUnderline width={420} style={{ marginTop: 2 }} />
          </div>

          {/* Progress bar (always shown, but for tasks shows scheduled state) */}
          <div style={{ marginTop: 16 }}>
            {isGoal ? (
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 13, color: 'var(--pencil)', marginBottom: 4 }}>
                  <span>{item.subDone} of {item.subTotal} subtasks · {item.progress}%</span>
                  <span>by {item.dl} · 4 weeks left</span>
                </div>
                <div style={{ height: 18, border: '2px solid var(--ink)', borderRadius: 9, overflow: 'hidden', background: 'var(--paper-2)', position: 'relative' }}>
                  <div style={{ position: 'absolute', inset: 0, width: `${item.progress}%`, background: 'var(--ink)' }} />
                  {/* tick marks for subtasks */}
                  {Array.from({ length: item.subTotal - 1 }).map((_, i) => (
                    <span key={i} style={{ position: 'absolute', top: 0, bottom: 0, left: `${((i+1)/item.subTotal) * 100}%`, width: 1, background: 'var(--paper)', opacity: 0.5 }} />
                  ))}
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', background: 'var(--red-ink-faint)', border: '2px solid var(--red-ink)', borderRadius: 8 }}>
                <Badge kind="red" style={{ fontSize: 11 }}>overdue</Badge>
                <span style={{ fontSize: 14, color: 'var(--red-ink)', flex: 1 }}>
                  deadline Apr 7 passed · engine couldn't fit before then (strict Career window full). proposed: today 5:00 pm.
                </span>
                <div className="sk-box wob-sm tight" style={{ background: 'var(--ink)', color: 'var(--paper)', fontSize: 12 }}>accept slot</div>
              </div>
            )}
          </div>

          {/* Tabs */}
          <div style={{ marginTop: 22, display: 'flex', gap: 4, borderBottom: '2px solid var(--ink)' }}>
            {[
              { name: 'Overview', sel: true },
              { name: 'Schedule', sel: false },
              { name: 'Subtasks', sel: false, disabled: !isGoal, badge: isGoal ? '12' : null },
              { name: 'Activity', sel: false }
            ].map(t => (
              <div key={t.name} style={{
                padding: '8px 16px 6px',
                borderRadius: '6px 8px 0 0 / 6px 8px 0 0',
                background: t.sel ? 'var(--paper-2)' : 'transparent',
                border: t.sel ? '2px solid var(--ink)' : '2px solid transparent',
                borderBottom: t.sel ? '2px solid var(--paper-2)' : 'none',
                marginBottom: -2,
                color: t.disabled ? 'var(--pencil-light)' : 'var(--ink)',
                fontWeight: t.sel ? 700 : 400,
                fontSize: 16,
                display: 'flex', alignItems: 'center', gap: 6,
                cursor: t.disabled ? 'not-allowed' : 'pointer'
              }}>
                <span>{t.name}</span>
                {t.badge && <span className="sk-mono-tag" style={{ fontSize: 10 }}>{t.badge}</span>}
                {t.disabled && <span className="sk-mono-tag" style={{ fontSize: 9, color: 'var(--pencil-light)' }}>· n/a for tasks</span>}
              </div>
            ))}
            <span style={{ flex: 1 }} />
            <div style={{ display: 'flex', gap: 6, padding: '6px 0' }}>
              <div className="sk-box wob-sm tight" style={{ fontSize: 12 }}>duplicate</div>
              <div className="sk-box wob-sm tight" style={{ fontSize: 12, color: 'var(--red-ink)', borderColor: 'var(--red-ink)' }}>delete</div>
            </div>
          </div>

          {/* Overview content */}
          <div style={{ padding: '18px 0', display: 'grid', gridTemplateColumns: '1fr 320px', gap: 22 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <Section title="Identity">
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <FieldRow label="type">
                    <div style={{ display: 'flex', gap: 6 }}>
                      {[['task', !isGoal], ['plan', false], ['goal', isGoal]].map(([k, s]) => (
                        <div key={k} className="sk-box wob-sm tight" style={{
                          padding: '4px 12px',
                          background: s ? 'var(--ink)' : 'var(--paper)',
                          color: s ? 'var(--paper)' : 'var(--ink)'
                        }}>{k}</div>
                      ))}
                    </div>
                  </FieldRow>
                  <FieldRow label="area"><Badge><Swatch color={item.col} />{item.area} ▾</Badge></FieldRow>
                  <FieldRow label="priority">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%' }}>
                      <div style={{ flex: 1, height: 8, background: 'var(--paper-2)', border: '1.5px solid var(--ink)', borderRadius: 4, position: 'relative' }}>
                        <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: `${item.priority*10}%`, background: 'var(--ink)' }} />
                      </div>
                      <span style={{ fontWeight: 700 }}>{item.priority}</span>
                    </div>
                  </FieldRow>
                  <FieldRow label={isGoal ? 'rolled-up duration' : 'duration'}>
                    <span style={{ fontWeight: 700 }}>{item.dur}</span>
                    {isGoal && <span className="sk-mono-tag">computed</span>}
                  </FieldRow>
                </div>
              </Section>

              <Section title="Place">
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Badge>📍 {isGoal ? 'Park · area default' : 'Office'}</Badge>
                  <span className="sk-mono-tag" style={{ color: 'var(--pencil)' }}>{isGoal ? 'inherited from Health' : 'inherited from Career'}</span>
                </div>
                <div style={{ marginTop: 8, fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Check on /> use area's default location
                </div>
                {isGoal && (
                  <div style={{ marginTop: 6, fontSize: 13, color: 'var(--pencil)' }}>
                    travel from <i>home</i> auto-added before runs.
                  </div>
                )}
              </Section>

              {/* Subtasks teaser (goal only) */}
              {isGoal && (
                <Section title="Subtasks · 12 (preview)">
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    {[
                      { t: '3-mile easy', done: true },
                      { t: 'intervals 800×4', current: true },
                      { t: 'long run 8mi' },
                      { t: 'taper · race day' }
                    ].map((s, i) => (
                      <div key={i} style={{
                        display: 'flex', alignItems: 'center', gap: 8,
                        padding: '6px 10px',
                        border: s.current ? '2px solid var(--ink)' : '1.5px dashed var(--pencil-faint)',
                        borderRadius: 6,
                        background: s.current ? 'var(--highlight-soft)' : 'transparent'
                      }}>
                        <Check on={s.done} />
                        <span style={{ fontSize: 14, flex: 1, textDecoration: s.done ? 'line-through' : 'none', color: s.done ? 'var(--pencil)' : 'var(--ink)' }}>{s.t}</span>
                        {s.current && <Badge style={{ fontSize: 10 }}>scheduled today</Badge>}
                      </div>
                    ))}
                    <div style={{ padding: '4px 10px', fontSize: 13, color: 'var(--pencil)' }}>see all 12 in <u>Subtasks tab →</u></div>
                  </div>
                </Section>
              )}
            </div>

            {/* Right rail */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <Section title={isGoal ? 'Next on calendar' : 'Scheduled'} tight>
                {isGoal ? (
                  <>
                    <div className="sk-script" style={{ fontSize: 22, fontWeight: 700, lineHeight: 1 }}>Wed · 6:30 am</div>
                    <div style={{ fontSize: 13, marginTop: 2 }}>intervals 800×4 · 50m</div>
                    <div className="sk-mono-tag" style={{ marginTop: 8 }}>5 more queued through May 25</div>
                  </>
                ) : (
                  <>
                    <div className="sk-script" style={{ fontSize: 22, fontWeight: 700, lineHeight: 1, color: 'var(--red-ink)' }}>not yet scheduled</div>
                    <div style={{ fontSize: 13, marginTop: 2 }}>engine flagged it as overdue · accept proposed slot or reschedule.</div>
                  </>
                )}
                <div style={{ marginTop: 8, display: 'flex', gap: 6 }}>
                  <div className="sk-box wob-sm tight" style={{ fontSize: 12 }}>view on calendar →</div>
                </div>
              </Section>

              <Section title="Engine notes" tight>
                {isGoal
                  ? <div style={{ fontSize: 13, lineHeight: 1.4 }}>📍 cluster of 3 runs grouped on Wed mornings. ✓ all subtasks fit deadline.</div>
                  : <div style={{ fontSize: 13, lineHeight: 1.4 }}>Couldn't fit before deadline. Career window full Mon–Fri 9–12. Proposed: relax window or accept post-deadline slot.</div>
                }
              </Section>

              <Section title="Activity" tight>
                <div style={{ fontSize: 13, display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <div>· you · created · {isGoal ? '14d' : '3d'} ago</div>
                  {isGoal && <div>· engine · scheduled 7 runs · 14d</div>}
                  <div>· engine · last gen · 2m ago</div>
                </div>
              </Section>
            </div>
          </div>
        </div>
      </div>
    </Shell>
  );
}

// Re-use Tree from v2-library.jsx if loaded, otherwise tolerate missing
// (Tree component is on window from v2-library)

window.ItemDetailV2 = ItemDetailV2;
