/* global React */
// Onboarding storyboard — first-run flow

function OnboardingStoryboard() {
  const frames = [
    { n: 1, title: 'Welcome', body: <WelcomeFrame /> },
    { n: 2, title: 'Pick life areas', body: <PickAreasFrame /> },
    { n: 3, title: 'Add your places', body: <PlacesIntroFrame /> },
    { n: 4, title: 'Sketch your week', body: <TemplatesIntroFrame /> },
    { n: 5, title: 'Plan with AI', body: <AIOfferFrame /> },
    { n: 6, title: 'Calendar · empty', body: <EmptyCalendarFrame /> }
  ];
  return (
    <div className="sk-page sk-hand" style={{ padding: '24px 28px', overflow: 'auto' }}>
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 16 }}>
        <div>
          <div className="sk-script" style={{ fontSize: 36, fontWeight: 700, lineHeight: 1 }}>First-run · storyboard</div>
          <div className="sk-mono-tag" style={{ marginTop: 4 }}>welcome → pick areas → add places → sketch week → AI offer → empty calendar</div>
        </div>
        <Anno width={240} style={{ position: 'static', transform: 'rotate(-1deg)' }}>
          each step is skippable. user can come back via setup checklist on Today.
        </Anno>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 18 }}>
        {frames.map(f => (
          <Frame key={f.n} step={f.n} of={frames.length} title={f.title}>
            {f.body}
          </Frame>
        ))}
      </div>
    </div>
  );
}

function Frame({ step, of, title, children }) {
  return (
    <div className="sk-box wob" style={{ background: 'var(--paper)', padding: 0, overflow: 'hidden' }}>
      {/* faux device chrome */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 10px', borderBottom: '1.5px dashed var(--pencil-light)' }}>
        <span style={{ width: 8, height: 8, borderRadius: '50%', border: '1.5px solid var(--ink)' }} />
        <span style={{ width: 8, height: 8, borderRadius: '50%', border: '1.5px solid var(--ink)' }} />
        <span style={{ width: 8, height: 8, borderRadius: '50%', border: '1.5px solid var(--ink)' }} />
        <span className="sk-mono-tag" style={{ marginLeft: 6 }}>step {step} of {of} · {title}</span>
        <span style={{ flex: 1 }} />
        <span className="sk-mono-tag" style={{ color: 'var(--pencil)' }}>skip</span>
      </div>
      <div style={{ padding: 16, minHeight: 280, position: 'relative' }}>{children}</div>
    </div>
  );
}

function WelcomeFrame() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div className="sk-script" style={{ fontSize: 42, fontWeight: 700, lineHeight: 1 }}>circadium</div>
      <SketchyUnderline width={130} />
      <div style={{ marginTop: 14, fontSize: 16, lineHeight: 1.4 }}>
        a calendar that plans <i>around</i> your life.
        <br /><br />
        you say what matters · we weave it through the week.
      </div>
      <div style={{ marginTop: 'auto', display: 'flex', gap: 8 }}>
        <div className="sk-box wob-sm tight">sign in</div>
        <span style={{ flex: 1 }} />
        <div className="sk-box wob-sm tight" style={{ background: 'var(--ink)', color: 'var(--paper)' }}>get started →</div>
      </div>
    </div>
  );
}

function PickAreasFrame() {
  return (
    <div>
      <div className="sk-script" style={{ fontSize: 24, fontWeight: 700, lineHeight: 1 }}>What matters?</div>
      <div style={{ fontSize: 13, color: 'var(--pencil)', marginTop: 4 }}>tap to add · skip any · edit later</div>
      <div style={{ marginTop: 12, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {[
          ['🌅 Career', true], ['🧘 Health', true], ['❤️ Relationships', false],
          ['💰 Finance', true], ['🌱 Growth', false], ['🏠 Home', true],
          ['🎨 Creative'], ['👶 Family'], ['🛐 Faith']
        ].map(([n, sel]) => (
          <span key={n} className="sk-badge" style={{
            fontSize: 13, padding: '5px 10px',
            background: sel ? 'var(--ink)' : 'var(--paper)',
            color: sel ? 'var(--paper)' : 'var(--ink)',
            borderColor: 'var(--ink)'
          }}>{sel ? '✓ ' : '+ '}{n}</span>
        ))}
        <span className="sk-badge sk-stroke-faint" style={{ fontSize: 13, padding: '5px 10px', color: 'var(--pencil)' }}>+ custom</span>
      </div>
      <div style={{ marginTop: 14, fontSize: 12, color: 'var(--pencil)' }}>
        4 selected · sub-areas can be added later
      </div>
      <div style={{ marginTop: 18, display: 'flex', gap: 8 }}>
        <div className="sk-box wob-sm tight">← back</div>
        <span style={{ flex: 1 }} />
        <div className="sk-box wob-sm tight" style={{ background: 'var(--ink)', color: 'var(--paper)' }}>continue →</div>
      </div>
    </div>
  );
}

function PlacesIntroFrame() {
  return (
    <div>
      <div className="sk-script" style={{ fontSize: 24, fontWeight: 700, lineHeight: 1 }}>Where do you live & work?</div>
      <div style={{ fontSize: 13, color: 'var(--pencil)', marginTop: 4 }}>so we know travel time. add more in Places.</div>
      <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 8 }}>
        <FieldRow label="🏠 home">
          <div className="sk-box wob-pill" style={{ padding: '5px 10px', minWidth: 200, fontSize: 13 }}>142 Linden St, Brooklyn</div>
          <span className="sk-mono-tag">✓</span>
        </FieldRow>
        <FieldRow label="💼 work">
          <div className="sk-box wob-pill" style={{ padding: '5px 10px', minWidth: 200, color: 'var(--pencil)', fontSize: 13 }}>search address…</div>
        </FieldRow>
        <FieldRow label="🚗 default">
          <Badge>driving ▾</Badge>
        </FieldRow>
      </div>
      <div style={{ marginTop: 'auto', paddingTop: 12, display: 'flex', gap: 8 }}>
        <div className="sk-box wob-sm tight">← back</div>
        <div className="sk-box wob-sm tight">skip for now</div>
        <span style={{ flex: 1 }} />
        <div className="sk-box wob-sm tight" style={{ background: 'var(--ink)', color: 'var(--paper)' }}>continue →</div>
      </div>
    </div>
  );
}

function TemplatesIntroFrame() {
  const blocks = [
    { d: 0, s: 0, h: 2, l: 'sleep', c: '#cccccc' },
    { d: 1, s: 0, h: 2, l: 'sleep', c: '#cccccc' },
    { d: 2, s: 0, h: 2, l: 'sleep', c: '#cccccc' },
    { d: 3, s: 0, h: 2, l: 'sleep', c: '#cccccc' },
    { d: 4, s: 0, h: 2, l: 'sleep', c: '#cccccc' },
    { d: 0, s: 3, h: 4, l: 'work', c: '#9bb8d6' },
    { d: 1, s: 3, h: 4, l: 'work', c: '#9bb8d6' },
    { d: 2, s: 3, h: 4, l: 'work', c: '#9bb8d6' },
    { d: 3, s: 3, h: 4, l: 'work', c: '#9bb8d6' },
    { d: 4, s: 3, h: 4, l: 'work', c: '#9bb8d6' }
  ];
  return (
    <div>
      <div className="sk-script" style={{ fontSize: 22, fontWeight: 700, lineHeight: 1 }}>Sketch your typical week</div>
      <div style={{ fontSize: 12, color: 'var(--pencil)', marginTop: 4 }}>sleep · work · the unmovables. drag to add more.</div>
      <div className="sk-box wob" style={{ marginTop: 10, padding: 6, background: 'var(--paper-2)' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2, height: 130 }}>
          {Array.from({ length: 7 }).map((_, d) => (
            <div key={d} style={{ display: 'flex', flexDirection: 'column', gap: 2, position: 'relative', border: '1px dashed var(--pencil-faint)', padding: 2 }}>
              <span className="sk-mono-tag" style={{ fontSize: 8, color: 'var(--pencil)' }}>{['M','T','W','T','F','S','S'][d]}</span>
              {blocks.filter(b => b.d === d).map((b, i) => (
                <div key={i} style={{
                  position: 'absolute', left: 2, right: 2,
                  top: 14 + b.s * 14,
                  height: b.h * 14,
                  background: b.c, border: '1px solid var(--ink)',
                  fontSize: 9, padding: '1px 3px', lineHeight: 1
                }}>{b.l}</div>
              ))}
            </div>
          ))}
        </div>
      </div>
      <div style={{ marginTop: 6, fontSize: 11, color: 'var(--pencil)' }}>2 templates · expand later in Calendar → edit templates</div>
      <div style={{ marginTop: 10, display: 'flex', gap: 6 }}>
        <div className="sk-box wob-sm tight" style={{ fontSize: 12 }}>← back</div>
        <span style={{ flex: 1 }} />
        <div className="sk-box wob-sm tight" style={{ fontSize: 12, background: 'var(--ink)', color: 'var(--paper)' }}>continue →</div>
      </div>
    </div>
  );
}

function AIOfferFrame() {
  return (
    <div>
      <div className="sk-script" style={{ fontSize: 28, fontWeight: 700, lineHeight: 1 }}>✦ Plan with AI?</div>
      <div style={{ marginTop: 8, fontSize: 14, color: 'var(--ink-soft)', lineHeight: 1.4 }}>
        We can interview you for a few minutes and propose goals for the season.
      </div>
      <div className="sk-box wob" style={{ marginTop: 14, padding: 12, background: 'var(--highlight-soft)' }}>
        <div className="sk-mono-tag">what it does</div>
        <div style={{ marginTop: 4, fontSize: 13, lineHeight: 1.4 }}>
          ✦ asks about your season<br />
          ✦ drafts goals across your areas<br />
          ✦ proposes subtasks per goal<br />
          ✦ nothing is added without your ok
        </div>
      </div>
      <div style={{ marginTop: 14, display: 'flex', gap: 8 }}>
        <div className="sk-box wob-sm tight">← back</div>
        <div className="sk-box wob-sm tight">no thanks · I'll add my own</div>
        <span style={{ flex: 1 }} />
        <div className="sk-box wob-sm tight" style={{ background: 'var(--ink)', color: 'var(--paper)' }}>start session →</div>
      </div>
    </div>
  );
}

function EmptyCalendarFrame() {
  return (
    <div>
      <div className="sk-script" style={{ fontSize: 24, fontWeight: 700, lineHeight: 1 }}>You're all set ✦</div>
      <div style={{ fontSize: 13, color: 'var(--pencil)', marginTop: 4 }}>your calendar is empty — capture anything and we'll place it.</div>

      <div className="sk-box wob" style={{ marginTop: 12, padding: 8, background: 'var(--paper-2)', height: 140, position: 'relative' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', height: '100%', gap: 1 }}>
          {Array.from({ length: 7 }).map((_, d) => (
            <div key={d} style={{ background: 'var(--paper)', border: '1px dashed var(--pencil-faint)' }} />
          ))}
        </div>
        <Anno style={{ position: 'absolute', bottom: 6, right: 6, transform: 'rotate(-2deg)' }} width={120}>
          press ⌘K to add something
        </Anno>
      </div>

      <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 4, fontSize: 13 }}>
        <div>✓ 4 life areas set up</div>
        <div>✓ 1 place added</div>
        <div>✓ 2 templates sketched</div>
        <div style={{ color: 'var(--pencil)' }}>○ capture your first item</div>
        <div style={{ color: 'var(--pencil)' }}>○ run AI coach (optional)</div>
      </div>
      <div style={{ marginTop: 12, display: 'flex', justifyContent: 'flex-end' }}>
        <div className="sk-box wob-sm tight" style={{ background: 'var(--ink)', color: 'var(--paper)' }}>open Today →</div>
      </div>
    </div>
  );
}

window.OnboardingStoryboard = OnboardingStoryboard;
