/* global React, DesignCanvas, DCSection, DCArtboard */
// Compose v2 wireframes incorporating round-2 feedback

function App() {
  return (
    <DesignCanvas
      title="Circadium · wireframes v2"
      subtitle="Left-nav · dashboard · triage · nested library · full-bleed calendar w/ engine console · item detail · AI · life areas · templates."
      bg="#e8e2d2"
    >
      <DCSection
        id="ia"
        title="00 · Proposed IA"
        subtitle="Reference map. Four primary surfaces + ambient capture. Unchanged from v1."
      >
        <DCArtboard id="ia-overview" label="IA map" width={1440} height={960}>
          <IAOverview />
        </DCArtboard>
      </DCSection>

      <DCSection
        id="shell"
        title="01 · Navigation shell"
        subtitle="Collapsible left sidebar replaces top nav. Icons-only when collapsed."
      >
        <DCArtboard id="shell-exp" label="Expanded · icons + labels" width={720} height={760}>
          <ShellPreview collapsed={false} />
        </DCArtboard>
        <DCArtboard id="shell-col" label="Collapsed · icons only" width={300} height={760}>
          <ShellPreview collapsed={true} />
        </DCArtboard>
      </DCSection>

      <DCSection
        id="today"
        title="02 · Today dashboard"
        subtitle="What to do today + priority goals with progress. Landing page."
      >
        <DCArtboard id="today-main" label="Today · dashboard" width={1440} height={900}>
          <TodayDashboard />
        </DCArtboard>
      </DCSection>

      <DCSection
        id="capture"
        title="03 · Capture · triage queue"
        subtitle="Variant C from v1, without the ghost-calendar preview (would require simulating a full re-schedule). Shows the rules that WILL apply instead."
      >
        <DCArtboard id="cap-v2" label="Triage · keyboard-driven" width={1440} height={900}>
          <CaptureV2 />
        </DCArtboard>
      </DCSection>

      <DCSection
        id="library"
        title="04 · Library"
        subtitle="Smart views + nested life areas (file-route tree, sub-areas collapsible) + browseable table inside. Cluster/map view becomes its own section, later."
      >
        <DCArtboard id="lib-v2" label="Library · nested areas + table" width={1440} height={900}>
          <LibraryV2 />
        </DCArtboard>
      </DCSection>

      <DCSection
        id="calendar"
        title="05 · Calendar"
        subtitle="Full-bleed week + a side engine console (failures, overshoots, travel-time warnings). Proposed actions will land here later."
      >
        <DCArtboard id="cal-v2" label="Calendar · full-bleed + engine messages" width={1440} height={900}>
          <CalendarV2 />
        </DCArtboard>
      </DCSection>

      <DCSection
        id="detail"
        title="06 · Item detail"
        subtitle="Full-screen. Left: VS-Code-style item tree. Tabs (Overview / Schedule / Subtasks / Activity); Subtasks tab politely disables for tasks. Goal progress bar at top."
      >
        <DCArtboard id="det-goal" label="Goal detail · progress bar + Subtasks tab active" width={1440} height={900}>
          <ItemDetailV2 kind="goal" />
        </DCArtboard>
        <DCArtboard id="det-task" label="Task detail · Subtasks tab disabled, overdue banner instead" width={1440} height={900}>
          <ItemDetailV2 kind="task" />
        </DCArtboard>
      </DCSection>

      <DCSection
        id="ai"
        title="07 · AI integration"
        subtitle="High-level coach for goal generation (slide-over from anywhere); granular helper inside each goal/task for subtask drafting."
      >
        <DCArtboard id="ai-coach" label="High-level · AI coach drafts goals from a conversation" width={1440} height={900}>
          <AICoachOnDashboard />
        </DCArtboard>
        <DCArtboard id="ai-detail" label="Granular · AI helper proposes / edits subtasks inside an item" width={1440} height={900}>
          <ItemDetailWithAI />
        </DCArtboard>
      </DCSection>

      <DCSection
        id="areas"
        title="08 · Life Areas editor"
        subtitle="Categories tree on the left, per-area editor on the right — icon, color, parent, default location, strict toggle, time windows, sub-areas."
      >
        <DCArtboard id="areas-main" label="Life Areas · tree + editor + time windows" width={1440} height={900}>
          <LifeAreasPage />
        </DCArtboard>
      </DCSection>

      <DCSection
        id="templates"
        title="09 · Templates editor"
        subtitle="Recurring weekly blocks (sleep, work, gym, family dinner) that always sit on the calendar. Opened as an editing mode over Calendar."
      >
        <DCArtboard id="templates-main" label="Templates · typical week + selected template editor" width={1440} height={900}>
          <TemplatesEditor />
        </DCArtboard>
      </DCSection>

      <DCSection
        id="places"
        title="10 · Places + travel matrix"
        subtitle="Saved places with their default-area mappings, plus the travel-time matrix between every pair (rush / regular / night). Global transport mode picker at the top."
      >
        <DCArtboard id="places-main" label="Places · list + travel matrix" width={1440} height={900}>
          <PlacesPage />
        </DCArtboard>
      </DCSection>

      <DCSection
        id="popover"
        title="11 · Calendar event popovers"
        subtitle="Click any event on the calendar — popover shows actions appropriate to its type. Three variants: task event, template event, travel warning."
      >
        <DCArtboard id="pop-cal" label="Calendar · with a task popover open" width={1440} height={900}>
          <CalendarWithPopover />
        </DCArtboard>
        <DCArtboard id="pop-task" label="Task popover · standalone" width={420} height={580}>
          <PopoverFrame><TaskEventPopover /></PopoverFrame>
        </DCArtboard>
        <DCArtboard id="pop-tmpl" label="Template popover · standalone" width={420} height={540}>
          <PopoverFrame><TemplateEventPopover /></PopoverFrame>
        </DCArtboard>
        <DCArtboard id="pop-trav" label="Travel warning popover · standalone" width={440} height={580}>
          <PopoverFrame><TravelWarningPopover /></PopoverFrame>
        </DCArtboard>
      </DCSection>

      <DCSection
        id="engine"
        title="12 · Engine · advanced tuning"
        subtitle="Slide-over drawer from Calendar. Buffer · strategy weights · location-grouping scoring · travel penalty · debug. Power-user surface."
      >
        <DCArtboard id="eng-main" label="Engine drawer over calendar" width={1440} height={900}>
          <EngineDrawer />
        </DCArtboard>
      </DCSection>

      <DCSection
        id="settings"
        title="13 · Settings"
        subtitle="Account section shown (profile · email change · password · 2FA · linked sign-ins). Sub-nav on the left covers scheduling, places, notifications, integrations, danger zone."
      >
        <DCArtboard id="set-main" label="Settings · Account" width={1440} height={900}>
          <SettingsPage />
        </DCArtboard>
      </DCSection>

      <DCSection
        id="onboarding"
        title="14 · Onboarding · first-run"
        subtitle="Storyboard of 6 frames: welcome → pick areas → add places → sketch templates → AI offer → empty calendar with checklist."
      >
        <DCArtboard id="onb-main" label="Onboarding · storyboard" width={1400} height={920}>
          <OnboardingStoryboard />
        </DCArtboard>
      </DCSection>

      <DCSection
        id="auth"
        title="15 · Auth · all states"
        subtitle="Sign in · register · request password reset · set new password · 2FA prompt · expired-link error. Same shared card chrome."
      >
        <DCArtboard id="auth-main" label="Auth · 6 states" width={1400} height={1240}>
          <AuthScreens />
        </DCArtboard>
      </DCSection>

      <DCSection
        id="bulk"
        title="16 · Bulk actions in Library"
        subtitle="Multi-select rows; floating contextual action bar at the bottom with reassign · location · color · priority · reschedule · done · duplicate · delete."
      >
        <DCArtboard id="bulk-main" label="Library · 4 selected, bulk bar active" width={1440} height={900}>
          <LibraryBulkActions />
        </DCArtboard>
      </DCSection>

      <DCSection
        id="search"
        title="17 · Global search palette"
        subtitle="⌘/ command palette over any screen. Results grouped by items · areas · places · actions. Keyboard-driven."
      >
        <DCArtboard id="search-main" label="Search palette · query 'plant'" width={1440} height={900}>
          <GlobalSearch />
        </DCArtboard>
      </DCSection>

      <DCSection
        id="mindmap"
        title="18 · Mind-map view"
        subtitle="Life areas as connected clusters with goals/tasks as branches off them. A fourth view-mode for Library, alongside table/cards/tree."
      >
        <DCArtboard id="mm-main" label="Mind map · life areas + branches" width={1440} height={900}>
          <MindMapView />
        </DCArtboard>
      </DCSection>

      <DCSection
        id="engine-actions"
        title="19 · Engine · proposed actions"
        subtitle="Engine messages expanded with concrete one-click fixes: split task, relax window, push deadline, switch transport, reassign area, etc."
      >
        <DCArtboard id="eng-act-main" label="Engine messages · proposed actions" width={1440} height={900}>
          <EngineProposedActions />
        </DCArtboard>
      </DCSection>

      <DCSection
        id="board"
        title="20 · Subtasks board (inside item detail)"
        subtitle="Goal's Subtasks tab in board mode: Backlog → Up next → This week → Done. List/board/timeline toggle at top-right."
      >
        <DCArtboard id="board-main" label="Goal · Subtasks · board view" width={1440} height={900}>
          <SubtasksBoard />
        </DCArtboard>
      </DCSection>

      <DCSection
        id="mobile"
        title="21 · Mobile · responsive parallel"
        subtitle="Same product, mobile-shaped. Each row below is a flow — parent screen on the LEFT, derived screens cascade right. Bottom tab nav with a raised Capture button. Sheets / full-screen instead of side panels. Agenda-style calendar by default."
      >
        <DCArtboard id="mobile-auth" label="A · Auth + onboarding" width={2720} height={990}>
          <MobileRowAuth />
        </DCArtboard>
        <DCArtboard id="mobile-daily" label="B · Daily flow (Today is home base)" width={2300} height={990}>
          <MobileRowDaily />
        </DCArtboard>
        <DCArtboard id="mobile-library" label="C · Library + item detail" width={2300} height={990}>
          <MobileRowLibrary />
        </DCArtboard>
        <DCArtboard id="mobile-calendar" label="D · Calendar + engine" width={2300} height={990}>
          <MobileRowCalendar />
        </DCArtboard>
        <DCArtboard id="mobile-admin" label="E · Settings hub + admin (areas · templates · places)" width={2720} height={990}>
          <MobileRowAdmin />
        </DCArtboard>
      </DCSection>
    </DesignCanvas>
  );
}

// Small preview frame that renders the LeftNav with sample content next to it
function ShellPreview({ collapsed }) {
  return (
    <div style={{ display: 'flex', height: '100%', background: 'var(--paper)' }}>
      <LeftNav active="Today" collapsed={collapsed} />
      <div style={{ flex: 1, padding: '24px 24px', background: 'var(--paper-2)' }}>
        <div className="sk-mono-tag">preview</div>
        <div className="sk-script" style={{ fontSize: 28, fontWeight: 700, lineHeight: 1, marginTop: 4 }}>
          {collapsed ? 'collapsed · more room' : 'expanded · clear labels'}
        </div>
        <div style={{ marginTop: 10, fontSize: 14, color: 'var(--pencil)', lineHeight: 1.4 }}>
          tap the chevron at the bottom of the rail to {collapsed ? 'expand' : 'collapse'}. state persists per device.
        </div>
        <div style={{ marginTop: 14, padding: 12, border: '1.5px dashed var(--pencil-light)', borderRadius: 6, fontSize: 13, color: 'var(--pencil)' }}>
          main content lives here — dashboard, calendar, library, etc.
        </div>
      </div>
    </div>
  );
}

// Background frame for showing a popover standalone
function PopoverFrame({ children }) {
  return (
    <div className="sk-page" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      {children}
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);