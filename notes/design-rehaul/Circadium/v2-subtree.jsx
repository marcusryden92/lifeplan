/* global React, Shell, Badge, Swatch, Check */
// Subtasks · TREE view — my proposal. Two things done deliberately:
//   1. a depth-aware DRAGGABLE tree (reorder vs. re-parent are distinct, shown live)
//   2. per-item editing in a side drawer — the row stays a clean summary
// Sits to the right of the existing board view (§20), same goal context.

const TREE = [
  { id: 'base',   depth: 0, type: 'phase', name: 'Base phase',          rollup: '4 h 30 m', kept: '3/3', collapsed: true },

  { id: 'build',  depth: 0, type: 'phase', name: 'Build phase',         rollup: '6 h 10 m', kept: '1/4' },
  { id: 'int',    depth: 1, type: 'leaf',  name: 'Intervals · 800m × 4', dur: '50 m', sched: 'Today 2:30p', selected: true },
  { id: 'long8',  depth: 1, type: 'leaf',  name: 'Long run · 8 mi',      dur: '1 h 30 m', sched: 'Sat 7a' },
  { id: 'brick',  depth: 1, type: 'phase', name: 'Brick session',        rollup: '40 m' },
  { id: 'bike',   depth: 2, type: 'leaf',  name: 'Bike · 30 min',        dur: '30 m' },
  { id: 'trans',  depth: 2, type: 'leaf',  name: 'Transition run · 10 min', dur: '10 m', dropTarget: true },
  // 'Tempo · 25 min' is the one being dragged → rendered as a lifted ghost, leaves a gap here
  { id: 'tempo-gap', depth: 1, type: 'gap' },

  { id: 'peak',   depth: 0, type: 'phase', name: 'Peak phase',          rollup: '5 h 00 m', collapsed: true },
  { id: 'taper',  depth: 0, type: 'leaf',  name: 'Taper · race week',   dur: '1 h 00 m', dl: 'May 25' },
];

function TreeRow({ r }) {
  const pad = 14 + r.depth * 26;

  if (r.type === 'gap') {
    return (
      <div style={{ paddingLeft: pad, paddingRight: 14 }}>
        <div style={{ height: 30, border: '1.5px dashed var(--pencil-light)', borderRadius: 6, background: 'rgba(28,26,23,0.03)' }} />
      </div>
    );
  }

  const isPhase = r.type === 'phase';
  const sel = r.selected;
  return (
    <div style={{ position: 'relative' }}>
      {/* depth-aware DROP indicator: nesting under "Brick session" (depth 2) */}
      {r.dropTarget && (
        <div style={{ position: 'absolute', left: 14 + 2 * 26, right: 14, top: -5, zIndex: 3, display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ width: 9, height: 9, borderRadius: '50%', border: '2px solid var(--red-ink)', background: 'var(--paper)' }} />
          <span style={{ flex: 1, borderTop: '2.5px solid var(--red-ink)' }} />
          <span className="sk-mono-tag" style={{ color: 'var(--red-ink)', whiteSpace: 'nowrap' }}>↳ nest into Brick session</span>
        </div>
      )}

      <div className="sk-row" style={{
        paddingLeft: pad, paddingRight: 14, minHeight: 44, gap: 8,
        borderBottom: '1px dashed var(--pencil-faint)',
        background: sel ? 'var(--highlight-soft)' : 'transparent',
        boxShadow: sel ? 'inset 3px 0 0 var(--ink)' : 'none',
      }}>
        {/* drag handle — always present, the explicit grab target */}
        <span title="drag to reorder or re-nest" style={{ cursor: 'grab', color: 'var(--pencil-light)', fontSize: 17, lineHeight: 1, userSelect: 'none' }}>⠿</span>

        {/* disclosure caret (phases only) */}
        {isPhase
          ? <span style={{ width: 16, textAlign: 'center', color: 'var(--pencil)', fontSize: 13 }}>{r.collapsed ? '▸' : '▾'}</span>
          : <span style={{ width: 16 }} />}

        {/* status */}
        {isPhase
          ? <Swatch color="#b6cfa7" />
          : <Check on={false} />}

        {/* name */}
        <span style={{
          flex: 1, fontSize: isPhase ? 17 : 15,
          fontWeight: isPhase ? 700 : 600,
          letterSpacing: isPhase ? 0.2 : 0,
        }}>{r.name}</span>

        {/* leaf inline hints (read-only summary) */}
        {r.sched && <Badge style={{ fontSize: 10, borderColor: 'var(--red-ink)', color: 'var(--red-ink)', background: 'var(--red-ink-faint)' }}>📅 {r.sched}</Badge>}
        {r.dl && <Badge kind="dim" style={{ fontSize: 10 }}>by {r.dl}</Badge>}

        {/* duration — rollup (phase, computed/quiet) vs. editable (leaf) */}
        {isPhase
          ? <span className="sk-mono-tag" style={{ color: 'var(--pencil)' }}>Σ {r.rollup}</span>
          : <Badge style={{ fontSize: 11 }}>{r.dur}</Badge>}

        {/* overflow */}
        <span style={{ width: 18, textAlign: 'center', color: 'var(--pencil-light)', fontSize: 16, cursor: 'pointer' }}>⋯</span>
      </div>
    </div>
  );
}

function SubtasksTree() {
  return (
    <Shell active="Library">
      {/* breadcrumb */}
      <div style={{ padding: '10px 22px', borderBottom: '1.5px dashed var(--pencil-light)', display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
        <span style={{ fontSize: 13, color: 'var(--pencil)' }}>Library</span>
        <span style={{ color: 'var(--pencil-light)' }}>›</span>
        <Badge style={{ fontSize: 11 }}><Swatch color="#b6cfa7" />🧘 Health</Badge>
        <span style={{ color: 'var(--pencil-light)' }}>›</span>
        <span style={{ fontSize: 14, fontWeight: 700 }}>10k training plan</span>
        <Badge kind="dark" style={{ fontSize: 11 }}>goal</Badge>
        <span style={{ flex: 1 }} />
        <span className="sk-mono-tag">subtasks tab · tree</span>
      </div>

      {/* title + tabs + view toggle (tree selected) */}
      <div style={{ padding: '14px 32px 0' }}>
        <div className="sk-script" style={{ fontSize: 32, fontWeight: 700, lineHeight: 1 }}>10k training plan</div>
        <div className="sk-mono-tag" style={{ marginTop: 6 }}>12 subtasks · 4 phases · grouped, ordered &amp; scheduled by you · totals roll up live</div>
        <div style={{ marginTop: 12, display: 'flex', gap: 4, borderBottom: '2px solid var(--ink)' }}>
          {[['Overview'], ['Schedule'], ['Subtasks', true, '12'], ['Activity']].map(([name, sel, badge]) => (
            <div key={name} style={{
              padding: '8px 16px 6px', borderRadius: '6px 8px 0 0 / 6px 8px 0 0',
              background: sel ? 'var(--paper-2)' : 'transparent',
              border: sel ? '2px solid var(--ink)' : '2px solid transparent',
              borderBottom: sel ? '2px solid var(--paper-2)' : 'none', marginBottom: -2,
              fontWeight: sel ? 700 : 400, fontSize: 16, display: 'flex', alignItems: 'center', gap: 6,
            }}>
              <span>{name}</span>{badge && <span className="sk-mono-tag" style={{ fontSize: 10 }}>{badge}</span>}
            </div>
          ))}
          <span style={{ flex: 1 }} />
          <div style={{ padding: '6px 0', display: 'flex', gap: 4 }}>
            {[['list', false], ['board', false], ['tree', true], ['timeline', false]].map(([v, sel]) => (
              <div key={v} className="sk-box wob-sm" style={{ padding: '3px 10px', fontSize: 12, background: sel ? 'var(--ink)' : 'var(--paper)', color: sel ? 'var(--paper)' : 'var(--ink)' }}>{v}</div>
            ))}
          </div>
        </div>
      </div>

      {/* main: tree (left) + edit drawer (right) */}
      <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 360px', minHeight: 0 }}>
        {/* TREE */}
        <div style={{ position: 'relative', overflow: 'auto', padding: '14px 22px 22px' }}>
          <div className="sk-box wob" style={{ background: 'var(--paper)', padding: '4px 0', position: 'relative' }}>
            {TREE.map(r => <TreeRow key={r.id} r={r} />)}

            {/* the lifted drag ghost (Tempo being moved) */}
            <div className="sk-box wob-sm" style={{
              position: 'absolute', left: 70, top: 250, width: 300, zIndex: 5,
              padding: '8px 12px', background: 'var(--paper)', transform: 'rotate(-1.5deg)',
              boxShadow: '5px 7px 0 rgba(28,26,23,0.25)', display: 'flex', alignItems: 'center', gap: 8, cursor: 'grabbing',
            }}>
              <span style={{ color: 'var(--pencil)', fontSize: 17 }}>⠿</span>
              <Check on={false} />
              <span style={{ flex: 1, fontSize: 15, fontWeight: 600 }}>Tempo · 25 min</span>
              <Badge style={{ fontSize: 11 }}>50 m</Badge>
            </div>
          </div>

          {/* add + drag legend */}
          <div style={{ marginTop: 12, display: 'flex', alignItems: 'flex-start', gap: 14 }}>
            <div style={{ padding: '8px 12px', fontSize: 13, color: 'var(--pencil)', border: '1.5px dashed var(--pencil-light)', borderRadius: 6 }}>+ add subtask</div>
            <div className="sk-box wob-sm" style={{ flex: 1, padding: '8px 12px', background: 'var(--paper-2)' }}>
              <span className="sk-mono-tag" style={{ display: 'block', marginBottom: 4 }}>how dropping works</span>
              <div style={{ fontSize: 13, color: 'var(--ink-soft)', lineHeight: 1.4 }}>
                <b>line between rows</b> → reorder at that level &nbsp;·&nbsp; <b>indented under a row</b> → nest as its child. the drop indicator shows the exact depth before you release, and parent <b>Σ totals recompute live.</b>
              </div>
            </div>
          </div>
        </div>

        {/* EDIT DRAWER — row is a summary; every field lives here */}
        <div style={{ borderLeft: '2px solid var(--ink)', background: 'var(--paper-2)', padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 14, overflow: 'auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span className="sk-mono-tag">edit subtask</span>
            <span style={{ fontSize: 16, color: 'var(--pencil)', cursor: 'pointer' }}>✕</span>
          </div>

          <input className="sk-box wob-sm" defaultValue="Intervals · 800m × 4" style={{ fontFamily: "'Patrick Hand', cursive", fontSize: 20, fontWeight: 700, padding: '8px 12px', background: 'var(--paper)', border: '2px solid var(--ink)', width: '100%', boxSizing: 'border-box' }} />

          {/* duration stepper */}
          <Field label="duration">
            <div className="sk-row" style={{ gap: 8 }}>
              <Stepper>–</Stepper>
              <span className="sk-box wob-sm" style={{ padding: '5px 16px', fontSize: 15, fontWeight: 700, background: 'var(--paper)' }}>50 min</span>
              <Stepper>+</Stepper>
            </div>
          </Field>

          {/* deadline */}
          <Field label="deadline">
            <span className="sk-box wob-sm" style={{ padding: '5px 12px', fontSize: 14, background: 'var(--paper)' }}>May 18 ▾</span>
          </Field>

          {/* LOCATION — unified inherited / override control */}
          <Field label="location">
            <div className="sk-box wob-sm" style={{ padding: '8px 12px', background: 'var(--paper)' }}>
              <div className="sk-row" style={{ justifyContent: 'space-between' }}>
                <span style={{ fontSize: 15, color: 'var(--pencil)' }}>📍 Gamla Stan</span>
                <span className="sk-row" style={{ gap: 7, fontSize: 12 }}>
                  <span className="sk-mono-tag" style={{ fontSize: 9 }}>override</span>
                  <span style={{ width: 30, height: 16, borderRadius: 9, border: '1.5px solid var(--ink)', background: 'var(--paper-2)', position: 'relative' }}>
                    <span style={{ position: 'absolute', width: 12, height: 12, borderRadius: '50%', background: 'var(--ink)', top: 1, left: 1 }} />
                  </span>
                </span>
              </div>
              <div className="sk-mono-tag" style={{ marginTop: 5, fontSize: 9 }}>inherited from Work area · flip to set your own</div>
            </div>
          </Field>

          {/* dependency */}
          <Field label="depends on">
            <span className="sk-box wob-sm" style={{ padding: '4px 10px', fontSize: 12.5, background: 'var(--paper)' }}>⛓ Long run · 8 mi ✕</span>
          </Field>

          <div style={{ flex: 1 }} />
          <div className="sk-row" style={{ gap: 8 }}>
            <span className="sk-box wob-sm" style={{ flex: 1, textAlign: 'center', padding: '8px 0', fontSize: 14, fontWeight: 700, background: 'var(--ink)', color: 'var(--paper)' }}>Done</span>
            <span className="sk-box wob-sm" style={{ padding: '8px 14px', fontSize: 14, color: 'var(--red-ink)', borderColor: 'var(--red-ink)' }}>🗑</span>
          </div>
        </div>
      </div>
    </Shell>
  );
}

function Field({ label, children }) {
  return (
    <div>
      <div className="sk-mono-tag" style={{ marginBottom: 5 }}>{label}</div>
      {children}
    </div>
  );
}
function Stepper({ children }) {
  return <span className="sk-box wob-sm" style={{ width: 30, height: 30, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, fontWeight: 700, background: 'var(--paper)', cursor: 'pointer' }}>{children}</span>;
}

Object.assign(window, { SubtasksTree });
