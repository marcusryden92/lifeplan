/* global React, ReactDOM, lumenLight, lumenDark, LumenShell, LumenToday, LumenCalendar, LumenGoal, LumenStub */
// ============================================================
// LUMEN — clickable app
// Holds active screen + theme; routes nav clicks; persists both.
// ============================================================

const SCREEN_LABEL = {
  today: 'Today', calendar: 'Calendar', inbox: 'Inbox',
  item: 'Items', categories: 'Categories', locations: 'Locations'
};

function LumenApp() {
  const [screen, setScreen] = React.useState(() => localStorage.getItem('lumen.screen') || 'today');
  const [dark, setDark] = React.useState(() => localStorage.getItem('lumen.dark') === '1');

  React.useEffect(() => { localStorage.setItem('lumen.screen', screen); }, [screen]);
  React.useEffect(() => { localStorage.setItem('lumen.dark', dark ? '1' : '0'); }, [dark]);

  const t = dark ? lumenDark : lumenLight;
  const onNav = (key) => setScreen(key);
  const onToggleTheme = () => setDark(d => !d);

  let body;
  if (screen === 'today') body = <LumenToday t={t} onNav={onNav} />;
  else if (screen === 'calendar') body = <LumenCalendar t={t} onNav={onNav} />;
  else if (screen === 'item') body = <LumenGoal t={t} onNav={onNav} />;
  else body = <LumenStub t={t} label={SCREEN_LABEL[screen] || 'Surface'} />;

  return (
    <LumenShell t={t} active={SCREEN_LABEL[screen]} onNav={onNav} onToggleTheme={onToggleTheme}>
      {body}
    </LumenShell>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<LumenApp />);
