/* global React */
// Auth screens — sign in / register / reset / 2FA / verify-email error

function AuthScreens() {
  const screens = [
    { title: 'Sign in', body: <SignIn /> },
    { title: 'Register', body: <Register /> },
    { title: 'Password reset · request', body: <ResetReq /> },
    { title: 'Set new password', body: <ResetSet /> },
    { title: '2-factor prompt', body: <TwoFA /> },
    { title: 'Error · expired link', body: <AuthError /> }
  ];
  return (
    <div className="sk-page sk-hand" style={{ padding: '24px 28px', overflow: 'auto' }}>
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 16 }}>
        <div>
          <div className="sk-script" style={{ fontSize: 36, fontWeight: 700, lineHeight: 1 }}>Authentication · all states</div>
          <div className="sk-mono-tag" style={{ marginTop: 4 }}>centered card on paper · same chrome across states</div>
        </div>
        <Anno width={210} style={{ position: 'static', transform: 'rotate(-1deg)' }}>
          one shared layout · the card body switches per state.
        </Anno>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 18 }}>
        {screens.map(s => (
          <AuthFrame key={s.title} title={s.title}>{s.body}</AuthFrame>
        ))}
      </div>
    </div>
  );
}

function AuthFrame({ title, children }) {
  return (
    <div className="sk-box wob" style={{ background: 'var(--paper-2)', padding: 0, overflow: 'hidden' }}>
      <div style={{ padding: '6px 10px', borderBottom: '1.5px dashed var(--pencil-light)', display: 'flex', alignItems: 'center', gap: 6 }}>
        <span className="sk-mono-tag">state · {title.toLowerCase()}</span>
      </div>
      <div style={{ padding: 24, minHeight: 320, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="sk-box wob" style={{ width: '100%', maxWidth: 360, padding: 20, background: 'var(--paper)' }}>
          {children}
        </div>
      </div>
    </div>
  );
}

function SignIn() {
  return (
    <>
      <div className="sk-script" style={{ fontSize: 28, fontWeight: 700, lineHeight: 1 }}>circadium</div>
      <div className="sk-mono-tag">welcome back</div>
      <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
        <Input ph="you@email.com" label="email" />
        <Input ph="••••••••" label="password" />
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 2 }}>
          <span style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 6 }}><Check on /> remember me</span>
          <span style={{ fontSize: 12, color: 'var(--red-ink)' }}>forgot?</span>
        </div>
        <div className="sk-box wob-sm tight" style={{ marginTop: 6, textAlign: 'center', padding: '8px 12px', background: 'var(--ink)', color: 'var(--paper)' }}>sign in</div>
      </div>
      <Divider />
      <SocialButtons />
      <div style={{ marginTop: 10, fontSize: 12, color: 'var(--pencil)', textAlign: 'center' }}>
        new here? <span style={{ color: 'var(--red-ink)' }}>create an account ↗</span>
      </div>
    </>
  );
}

function Register() {
  return (
    <>
      <div className="sk-script" style={{ fontSize: 28, fontWeight: 700, lineHeight: 1 }}>create account</div>
      <div className="sk-mono-tag">takes 30 seconds</div>
      <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 8 }}>
        <Input ph="Alex Patel" label="name" />
        <Input ph="you@email.com" label="email" />
        <Input ph="at least 12 chars" label="password" />
        <Input ph="retype" label="confirm" />
        <div className="sk-box wob-sm tight" style={{ marginTop: 4, textAlign: 'center', padding: '8px 12px', background: 'var(--ink)', color: 'var(--paper)' }}>create account</div>
      </div>
      <Divider />
      <SocialButtons />
      <div style={{ marginTop: 10, fontSize: 12, color: 'var(--pencil)', textAlign: 'center' }}>
        have one? <span style={{ color: 'var(--red-ink)' }}>sign in ↗</span>
      </div>
    </>
  );
}

function ResetReq() {
  return (
    <>
      <div className="sk-script" style={{ fontSize: 28, fontWeight: 700, lineHeight: 1 }}>reset password</div>
      <div style={{ marginTop: 6, fontSize: 13, color: 'var(--pencil)' }}>we'll email you a link to set a new password.</div>
      <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 8 }}>
        <Input ph="you@email.com" label="email" />
        <div className="sk-box wob-sm tight" style={{ marginTop: 4, textAlign: 'center', padding: '8px 12px', background: 'var(--ink)', color: 'var(--paper)' }}>send reset link</div>
      </div>
      <div style={{ marginTop: 12, padding: '8px 10px', background: 'var(--paper-2)', borderRadius: 6, fontSize: 12, color: 'var(--ink-soft)', lineHeight: 1.3 }}>
        if an account exists with that email, you'll get the link shortly.
      </div>
      <div style={{ marginTop: 10, fontSize: 12, color: 'var(--pencil)', textAlign: 'center' }}>
        <span style={{ color: 'var(--red-ink)' }}>← back to sign in</span>
      </div>
    </>
  );
}

function ResetSet() {
  return (
    <>
      <div className="sk-script" style={{ fontSize: 26, fontWeight: 700, lineHeight: 1 }}>set new password</div>
      <div style={{ marginTop: 6, fontSize: 13, color: 'var(--pencil)' }}>for alex@hyperisland.se</div>
      <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 8 }}>
        <Input ph="at least 12 chars" label="new password" />
        <Input ph="retype" label="confirm" />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 3, marginTop: 4, fontSize: 11, color: 'var(--pencil)' }}>
          <span>✓ at least 12 characters</span>
          <span>✓ at least 1 number</span>
          <span style={{ color: 'var(--red-ink)' }}>○ at least 1 symbol</span>
        </div>
        <div className="sk-box wob-sm tight" style={{ marginTop: 4, textAlign: 'center', padding: '8px 12px', background: 'var(--ink)', color: 'var(--paper)' }}>update password</div>
      </div>
    </>
  );
}

function TwoFA() {
  return (
    <>
      <div className="sk-script" style={{ fontSize: 26, fontWeight: 700, lineHeight: 1 }}>two-factor</div>
      <div style={{ marginTop: 6, fontSize: 13, color: 'var(--pencil)' }}>code from your authenticator app</div>
      <div style={{ marginTop: 16, display: 'flex', gap: 6, justifyContent: 'center' }}>
        {['4', '7', '2', '_', '_', '_'].map((d, i) => (
          <div key={i} style={{
            width: 36, height: 46,
            border: '2px solid ' + (d === '_' ? 'var(--pencil-light)' : 'var(--ink)'),
            borderRadius: 6,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: 'Caveat, cursive', fontSize: 26, fontWeight: 700,
            color: d === '_' ? 'var(--pencil-light)' : 'var(--ink)',
            background: 'var(--paper)'
          }}>{d === '_' ? '' : d}</div>
        ))}
      </div>
      <div className="sk-box wob-sm tight" style={{ marginTop: 16, textAlign: 'center', padding: '8px 12px', background: 'var(--ink)', color: 'var(--paper)' }}>verify</div>
      <div style={{ marginTop: 10, fontSize: 12, color: 'var(--pencil)', textAlign: 'center' }}>
        lost device? <span style={{ color: 'var(--red-ink)' }}>use a recovery code</span>
      </div>
    </>
  );
}

function AuthError() {
  return (
    <div style={{ textAlign: 'center' }}>
      <div className="sk-script" style={{ fontSize: 48, fontWeight: 700, lineHeight: 1, color: 'var(--red-ink)' }}>×</div>
      <div className="sk-script" style={{ fontSize: 22, fontWeight: 700, lineHeight: 1, marginTop: 6 }}>link expired</div>
      <div style={{ marginTop: 8, fontSize: 13, color: 'var(--ink-soft)', lineHeight: 1.4 }}>
        reset links are valid for 30 minutes. request a new one.
      </div>
      <div className="sk-box wob-sm tight" style={{ marginTop: 16, padding: '8px 12px', background: 'var(--ink)', color: 'var(--paper)' }}>send new link</div>
      <div style={{ marginTop: 10, fontSize: 12, color: 'var(--pencil)' }}>
        <span style={{ color: 'var(--red-ink)' }}>← back to sign in</span>
      </div>
    </div>
  );
}

function Input({ ph, label }) {
  return (
    <div>
      <div className="sk-mono-tag" style={{ fontSize: 10, marginBottom: 2 }}>{label}</div>
      <div className="sk-box wob-sm tight" style={{ padding: '7px 10px', background: 'var(--paper-2)', color: 'var(--pencil)' }}>
        {ph}
      </div>
    </div>
  );
}

function Divider() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '14px 0' }}>
      <span style={{ flex: 1, height: 1.5, background: 'var(--pencil-light)' }} />
      <span className="sk-mono-tag">or</span>
      <span style={{ flex: 1, height: 1.5, background: 'var(--pencil-light)' }} />
    </div>
  );
}

function SocialButtons() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {[['G', 'continue with Google'], ['⌥', 'continue with GitHub']].map(([icon, label]) => (
        <div key={label} className="sk-box wob-sm tight" style={{
          padding: '7px 12px', display: 'flex', alignItems: 'center', gap: 10
        }}>
          <Glyph>{icon}</Glyph>
          <span style={{ fontSize: 13 }}>{label}</span>
        </div>
      ))}
    </div>
  );
}

window.AuthScreens = AuthScreens;
