/* global React */
// Settings — account + scheduling preferences

function SettingsPage() {
  return (
    <Shell active="Today">
      {/* Top bar */}
      <div style={{ padding: '14px 22px', borderBottom: '1.5px dashed var(--pencil-light)', display: 'flex', alignItems: 'flex-end', gap: 14, flexShrink: 0 }}>
        <div>
          <div className="sk-script" style={{ fontSize: 30, fontWeight: 700, lineHeight: 1 }}>Settings</div>
          <div className="sk-mono-tag" style={{ marginTop: 2 }}>account · scheduling · integrations</div>
        </div>
        <span style={{ flex: 1 }} />
        <Badge kind="dim" style={{ fontSize: 11 }}>signed in · Alex · USER</Badge>
        <div className="sk-box wob-sm tight" style={{ fontSize: 12, color: 'var(--red-ink)', borderColor: 'var(--red-ink)' }}>sign out</div>
      </div>

      <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '240px 1fr', minHeight: 0 }}>
        {/* sub-nav */}
        <div style={{ borderRight: '2px solid var(--ink)', padding: '12px 10px', display: 'flex', flexDirection: 'column', gap: 4 }}>
          {[
            ['👤', 'Profile'],
            ['🔐', 'Account', true],
            ['📅', 'Scheduling'],
            ['📍', 'Places & travel'],
            ['🔔', 'Notifications'],
            ['🔌', 'Integrations'],
            ['📦', 'Data & export'],
            ['⚠', 'Danger zone', false, 'red']
          ].map(([icon, name, sel, tone]) => (
            <div key={name} className="sk-box wob-sm" style={{
              padding: '7px 10px', display: 'flex', alignItems: 'center', gap: 8, fontSize: 14,
              background: sel ? 'var(--ink)' : 'transparent',
              color: sel ? 'var(--paper)' : (tone === 'red' ? 'var(--red-ink)' : 'var(--ink)'),
              border: sel ? '2px solid var(--ink)' : '1.5px solid transparent'
            }}>
              <span>{icon}</span>
              <span style={{ flex: 1 }}>{name}</span>
            </div>
          ))}
        </div>

        {/* content — Account section shown */}
        <div style={{ overflow: 'auto', padding: '20px 32px 32px', display: 'flex', flexDirection: 'column', gap: 18 }}>
          <div>
            <div className="sk-script" style={{ fontSize: 36, fontWeight: 700, lineHeight: 1 }}>Account</div>
            <div className="sk-mono-tag" style={{ marginTop: 2 }}>email · password · two-factor · linked sign-ins</div>
          </div>

          {/* Identity */}
          <Section title="profile">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <FieldRow label="name">
                <div className="sk-box wob-sm tight" style={{ padding: '6px 10px', minWidth: 220, background: 'var(--paper-2)' }}>Alex Patel</div>
              </FieldRow>
              <FieldRow label="role">
                <Badge kind="dim">USER</Badge>
                <span className="sk-mono-tag">read-only</span>
              </FieldRow>
            </div>
          </Section>

          {/* Email */}
          <Section title="email">
            <FieldRow label="current">
              <span style={{ fontWeight: 700 }}>alex@hyperisland.se</span>
              <Badge style={{ fontSize: 10 }}>✓ verified</Badge>
              <span style={{ flex: 1 }} />
              <span className="sk-mono-tag" style={{ color: 'var(--red-ink)' }}>change ↗</span>
            </FieldRow>
            <div style={{ marginTop: 6, fontSize: 12, color: 'var(--pencil)', lineHeight: 1.35 }}>
              changing email sends a confirmation link to the new address. the change isn't applied until you click the link.
            </div>
          </Section>

          {/* Password */}
          <Section title="password">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
              <FieldRow label="old">
                <div className="sk-box wob-sm tight" style={{ padding: '6px 10px', minWidth: 140, background: 'var(--paper-2)', color: 'var(--pencil)' }}>••••••••••</div>
              </FieldRow>
              <FieldRow label="new">
                <div className="sk-box wob-sm tight" style={{ padding: '6px 10px', minWidth: 140, background: 'var(--paper-2)', color: 'var(--pencil)' }}>at least 12 chars</div>
              </FieldRow>
              <FieldRow label="confirm">
                <div className="sk-box wob-sm tight" style={{ padding: '6px 10px', minWidth: 140, background: 'var(--paper-2)', color: 'var(--pencil)' }}>retype new</div>
              </FieldRow>
            </div>
            <div style={{ marginTop: 8, display: 'flex', gap: 8 }}>
              <span className="sk-mono-tag" style={{ flex: 1, color: 'var(--pencil)' }}>OAuth-linked accounts skip this section.</span>
              <div className="sk-box wob-sm tight" style={{ fontSize: 12 }}>cancel</div>
              <div className="sk-box wob-sm tight" style={{ fontSize: 12, background: 'var(--ink)', color: 'var(--paper)' }}>update password</div>
            </div>
          </Section>

          {/* 2FA */}
          <Section title="two-factor authentication">
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <ToggleSketchy on />
              <div>
                <div style={{ fontWeight: 700, fontSize: 15 }}>Authenticator app · on</div>
                <div className="sk-mono-tag">enrolled · Apr 2 · 6 recovery codes remaining</div>
              </div>
              <span style={{ flex: 1 }} />
              <div className="sk-box wob-sm tight" style={{ fontSize: 12 }}>regen codes</div>
              <div className="sk-box wob-sm tight" style={{ fontSize: 12 }}>disable 2FA</div>
            </div>
          </Section>

          {/* Linked sign-ins */}
          <Section title="linked sign-ins">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {[
                { p: 'Google', icon: 'G', linked: true, email: 'alex@hyperisland.se' },
                { p: 'GitHub', icon: '⌥', linked: false }
              ].map(p => (
                <div key={p.p} style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '8px 10px',
                  border: '1.5px dashed var(--pencil-light)', borderRadius: 6
                }}>
                  <Glyph>{p.icon}</Glyph>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: 14 }}>{p.p}</div>
                    {p.linked
                      ? <div style={{ fontSize: 12, color: 'var(--pencil)' }}>linked · {p.email}</div>
                      : <div style={{ fontSize: 12, color: 'var(--pencil)' }}>not connected</div>
                    }
                  </div>
                  <div className="sk-box wob-sm tight" style={{ fontSize: 12 }}>{p.linked ? 'unlink' : 'connect'}</div>
                </div>
              ))}
            </div>
          </Section>

          {/* Show a peek at the Scheduling section too */}
          <div style={{ marginTop: 6, padding: '10px 14px', background: 'var(--paper-2)', borderRadius: 8, border: '1.5px dashed var(--pencil-light)' }}>
            <div className="sk-mono-tag">next up · Scheduling preferences</div>
            <div style={{ marginTop: 6, fontSize: 13, color: 'var(--ink-soft)', lineHeight: 1.4 }}>
              buffer time · 10m between events ·
              default transport · 🚗 driving ·
              travel events · on ·
              auto-regenerate · off
              <span style={{ marginLeft: 6, color: 'var(--red-ink)' }}>open Scheduling →</span>
            </div>
          </div>
        </div>
      </div>
    </Shell>
  );
}

window.SettingsPage = SettingsPage;
