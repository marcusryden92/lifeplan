/* global React */
// Calendar event popover — three event types

// ============================================================
// Full calendar with a task popover open
// ============================================================
function CalendarWithPopover() {
  return (
    <Shell active="Calendar">
      <div style={{ padding: '14px 22px', borderBottom: '1.5px dashed var(--pencil-light)', display: 'flex', alignItems: 'center', gap: 14, flexShrink: 0 }}>
        <div className="sk-script" style={{ fontSize: 30, fontWeight: 700, lineHeight: 1 }}>Apr 8 – 14</div>
        <div style={{ display: 'flex', gap: 4, marginLeft: 8 }}>
          <Badge>‹</Badge>
          <Badge>today</Badge>
          <Badge>›</Badge>
        </div>
        <span style={{ flex: 1 }} />
        <Badge>filters · all areas</Badge>
        <div className="sk-box wob-sm tight" style={{ fontSize: 12 }}>edit templates</div>
        <div className="sk-box wob-sm tight" style={{ fontSize: 12, background: 'var(--ink)', color: 'var(--paper)' }}>regenerate ↻</div>
      </div>

      {/* main row */}
      <div style={{ flex: 1, position: 'relative', display: 'flex', minHeight: 0 }}>
        <div style={{ flex: 1, padding: '14px 18px', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <FullWeekCalendar />
        </div>

        {/* popover anchored over the calendar */}
        <div style={{ position: 'absolute', top: 230, left: 420, zIndex: 5 }}>
          <TaskEventPopover />
        </div>
      </div>
    </Shell>
  );
}

// ============================================================
// Popover variants (also rendered as standalone artboards)
// ============================================================
function TaskEventPopover() {
  return (
    <div className="sk-box wob" style={{
      width: 320, padding: 14, background: 'var(--paper)',
      boxShadow: '6px 8px 0 var(--ink)'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <Badge kind="dim" style={{ fontSize: 10 }}>task</Badge>
        <Badge style={{ fontSize: 10 }}><Swatch color="#9bb8d6" /> 🌅 Career</Badge>
        <span style={{ flex: 1 }} />
        <span className="sk-mono-tag">×</span>
      </div>
      <div className="sk-script" style={{ fontSize: 24, fontWeight: 700, lineHeight: 1.05, marginTop: 4 }}>
        Q4 strategy doc · deep work
      </div>
      <div style={{ fontSize: 13, color: 'var(--pencil)', marginTop: 4 }}>
        Tue Apr 9 · 9:00 – 11:30 am · 2h 30m
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6 }}>
        <Badge style={{ fontSize: 10 }}>📍 Office</Badge>
        <Badge kind="dim" style={{ fontSize: 10 }}>scheduled by engine</Badge>
      </div>

      {/* primary action row */}
      <div style={{ marginTop: 10, display: 'flex', gap: 6 }}>
        <div className="sk-box wob-sm tight" style={{ flex: 1, textAlign: 'center', fontSize: 12, background: 'var(--ink)', color: 'var(--paper)' }}>✓ complete</div>
        <div className="sk-box wob-sm tight" style={{ flex: 1, textAlign: 'center', fontSize: 12 }}>postpone</div>
      </div>

      {/* secondary actions */}
      <div style={{ marginTop: 8, borderTop: '1px dashed var(--pencil-light)', paddingTop: 8 }}>
        <PopAction icon="✎" label="edit title" />
        <PopAction icon="📍" label="override location for this instance" />
        <PopAction icon="🌅" label="reassign area" />
        <PopAction icon="🎨" label="custom color" />
        <PopAction icon="❏" label="duplicate" />
        <PopAction icon="↗" label="open full editor" />
        <PopAction icon="🗑" label="delete" danger />
      </div>
    </div>
  );
}

function TemplateEventPopover() {
  return (
    <div className="sk-box wob" style={{
      width: 320, padding: 14, background: 'var(--paper)',
      boxShadow: '6px 8px 0 var(--ink)'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <Badge kind="dim" style={{ fontSize: 10 }}>template</Badge>
        <Badge style={{ fontSize: 10 }}><Swatch color="#b6cfa7" /> Health</Badge>
        <span style={{ flex: 1 }} />
        <span className="sk-mono-tag">×</span>
      </div>
      <div className="sk-script" style={{ fontSize: 24, fontWeight: 700, lineHeight: 1.05, marginTop: 4 }}>
        Gym
      </div>
      <div style={{ fontSize: 13, color: 'var(--pencil)', marginTop: 4 }}>
        recurring · Mon · Wed · Fri · 6:00 – 7:00 pm
      </div>
      <div style={{ marginTop: 6, padding: '6px 8px', background: 'var(--paper-2)', borderRadius: 5, fontSize: 12, color: 'var(--ink-soft)' }}>
        editing applies to <b>every</b> occurrence. for a one-off skip use "skip this".
      </div>

      <div style={{ marginTop: 10, display: 'flex', gap: 6 }}>
        <div className="sk-box wob-sm tight" style={{ flex: 1, textAlign: 'center', fontSize: 12 }}>skip this</div>
        <div className="sk-box wob-sm tight" style={{ flex: 1, textAlign: 'center', fontSize: 12, background: 'var(--ink)', color: 'var(--paper)' }}>edit template ↗</div>
      </div>

      <div style={{ marginTop: 8, borderTop: '1px dashed var(--pencil-light)', paddingTop: 8 }}>
        <PopAction icon="✎" label="rename" />
        <PopAction icon="🎨" label="recolor" />
        <PopAction icon="📍" label="assign location" />
        <PopAction icon="🗑" label="delete all gyms" danger />
      </div>
    </div>
  );
}

function TravelWarningPopover() {
  return (
    <div className="sk-box wob" style={{
      width: 340, padding: 14, background: 'var(--paper)',
      boxShadow: '6px 8px 0 var(--red-ink)',
      borderColor: 'var(--red-ink)', borderWidth: 2
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <Badge kind="red" style={{ fontSize: 10 }}>warning</Badge>
        <span className="sk-mono-tag" style={{ color: 'var(--red-ink)' }}>insufficient travel time</span>
        <span style={{ flex: 1 }} />
        <span className="sk-mono-tag">×</span>
      </div>
      <div className="sk-script" style={{ fontSize: 22, fontWeight: 700, lineHeight: 1.1, marginTop: 6 }}>
        🚗 Office → Home
      </div>
      <div style={{ fontSize: 13, color: 'var(--ink-soft)', marginTop: 4, lineHeight: 1.35 }}>
        Tue Apr 9 · 12:30 – 12:40 pm · 10m allotted.
        <br />Driving · regular traffic · normally <b style={{ color: 'var(--red-ink)' }}>20m</b>.
      </div>

      <div style={{ marginTop: 10, padding: '8px 10px', background: 'var(--red-ink-faint)', borderRadius: 5, fontSize: 12 }}>
        before: <i>1:1 with Ana · 12:00</i>
        <br />after: <i>plant basil · 12:40 (at home)</i>
      </div>

      <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 5 }}>
        <PopAction icon="🚆" label="switch to transit (15m est.)" />
        <PopAction icon="⏰" label="push next event 10m later" />
        <PopAction icon="↗" label="move 1:1 with Ana earlier" />
        <PopAction icon="📍" label="override location for one event" />
        <PopAction icon="✓" label="accept · I'll be late" />
      </div>
    </div>
  );
}

function PopAction({ icon, label, danger }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 8,
      padding: '5px 6px',
      fontSize: 13,
      color: danger ? 'var(--red-ink)' : 'var(--ink)',
      cursor: 'pointer'
    }}>
      <span style={{ width: 18, textAlign: 'center' }}>{icon}</span>
      <span>{label}</span>
    </div>
  );
}

window.CalendarWithPopover = CalendarWithPopover;
window.TaskEventPopover = TaskEventPopover;
window.TemplateEventPopover = TemplateEventPopover;
window.TravelWarningPopover = TravelWarningPopover;
