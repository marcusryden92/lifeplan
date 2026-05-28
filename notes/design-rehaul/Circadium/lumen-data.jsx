/* global React */
// Shared sample data for theme exploration

const TODAY = {
  date: 'Thursday, May 28',
  greeting: 'Good morning, Alex',
  stats: [
    { label: 'today', value: '6', sub: 'planned' },
    { label: 'this week', value: '22 / 31', sub: '71% set' },
    { label: 'overdue', value: '1', sub: 'across 1 area' },
    { label: 'streak', value: '11d', sub: 'goals on track' }
  ],
  events: [
    { time: '09:00', dur: '2h 30m', title: 'Q4 strategy · deep work', area: 'Career', col: 'career', now: true, where: 'Office' },
    { time: '11:45', dur: '45m',    title: '1:1 with Ana',          area: 'Career', col: 'career', kind: 'plan',   where: 'Office' },
    { time: '12:45', dur: '20m',    title: 'office → home',         travel: true },
    { time: '14:00', dur: '15m',    title: 'Plant basil',           area: 'Home',   col: 'home',   warn: true,    where: 'Home' },
    { time: '14:30', dur: '50m',    title: 'Intervals · 800m × 4',  area: 'Health', col: 'health', where: 'Park' },
    { time: '17:00', dur: '20m',    title: 'Submit Q4 expenses',    area: 'Career', col: 'career', overdue: true, where: '—' }
  ],
  goals: [
    { name: '10k training plan',    pct: 58, sub: '7 / 12', area: 'Health',  col: 'health', next: 'intervals · today 2:30 pm', dl: 'Jun 21' },
    { name: 'Hiring · back-end',    pct: 40, sub: '2 / 5',  area: 'Career',  col: 'career', next: 'screen 3 candidates · Thu', dl: 'next sprint' },
    { name: 'Spanish · 30 day',     pct: 40, sub: '12 / 30',area: 'Growth',  col: 'growth', next: '15m drill · tonight',       dl: 'Jun 10' },
    { name: 'Annual reflection',    pct: 15, sub: 'first pass', area: 'Growth', col: 'growth', next: '—', dl: 'May 30' }
  ]
};

const WEEK = {
  range: 'May 26 – Jun 1',
  days: [
    { d: 'Mon', n: '26' },
    { d: 'Tue', n: '27' },
    { d: 'Wed', n: '28', today: true },
    { d: 'Thu', n: '29' },
    { d: 'Fri', n: '30' },
    { d: 'Sat', n: '31' },
    { d: 'Sun', n: '01' }
  ],
  hours: ['7','8','9','10','11','12','13','14','15','16','17','18','19','20'],
  events: [
    // recurring "standup" template-style across weekdays
    { day: 0, start: 9,    end: 9.5,  title: 'standup',           kind: 'tmpl' },
    { day: 1, start: 9,    end: 9.5,  title: 'standup',           kind: 'tmpl' },
    { day: 2, start: 9,    end: 9.5,  title: 'standup',           kind: 'tmpl' },
    { day: 3, start: 9,    end: 9.5,  title: 'standup',           kind: 'tmpl' },
    { day: 4, start: 9,    end: 9.5,  title: 'standup',           kind: 'tmpl' },
    // Q4 strategy block on Wed (today)
    { day: 2, start: 9.5,  end: 12,   title: 'Q4 strategy · deep work', col: 'career', current: true },
    // 1:1 ana
    { day: 2, start: 11.75, end: 12.5, title: '1:1 ana',          col: 'career', kind: 'plan' },
    // travel
    { day: 2, start: 12.5, end: 12.83, title: 'office → home',    travel: true },
    // intervals
    { day: 2, start: 14.5, end: 15.33, title: 'intervals 800×4',  col: 'health' },
    // plant basil late
    { day: 2, start: 14,   end: 14.25, title: 'plant basil',      col: 'home', warn: true },
    // expenses overdue
    { day: 2, start: 17,   end: 17.33, title: 'submit expenses',  col: 'career', warn: true },
    // long run Sat
    { day: 5, start: 7,    end: 8.5,  title: 'long run · 8mi',    col: 'health' },
    // family dinner Mon
    { day: 0, start: 19,   end: 20.5, title: 'family dinner',     col: 'rel', kind: 'plan' },
    { day: 1, start: 14,   end: 16,   title: 'hiring · take-home review', col: 'career' },
    { day: 3, start: 10,   end: 12,   title: 'Q4 strategy · pt 2', col: 'career' },
    { day: 3, start: 14,   end: 15,   title: 'tempo · 25min',     col: 'health' },
    { day: 4, start: 11,   end: 12,   title: '1:1 ana',           col: 'career', kind: 'plan' },
    { day: 4, start: 15,   end: 17,   title: 'spike · billing client', col: 'career' },
    { day: 6, start: 9,    end: 11,   title: 'brunch w/ T',       col: 'rel',   kind: 'plan' },
    // strict career window markers (visual band)
  ],
  strict: [
    { day: 0, start: 9, end: 12, kind: 'career' },
    { day: 2, start: 9, end: 12, kind: 'career' },
    { day: 4, start: 9, end: 12, kind: 'career' }
  ],
  engineMsgs: [
    { tag: 'FAIL', tone: 'fail', title: "Couldn't place: ‘refactor billing service’", body: '6h block needed. No 6h gap fits this week — strict Career window + 2 plans block it.' },
    { tag: 'LATE', tone: 'warn', title: "‘Plant basil’ planned 3 days after deadline", body: 'Deadline Apr 7 passed. Earliest Home slot: today 2 pm.' },
    { tag: 'TRAVEL', tone: 'warn', title: 'Insufficient travel · Wed 12:30', body: 'Office → home is 20m. Only 10m between events.' },
    { tag: 'OK', tone: 'info', title: '42 items scheduled across 28 days', body: '38 honored fully · 2 deadlines missed · 2 travel-tight.' }
  ]
};

const GOAL = {
  title: '10k training plan',
  area: 'Health',
  col: 'health',
  status: 'in progress',
  pct: 58,
  done: 7, total: 12,
  dl: 'Jun 21',
  weeksLeft: 4,
  totalDur: '18h',
  rolledUp: true,
  priority: 7,
  place: 'Park',
  inheritFromArea: true,
  next: { day: 'Wed', time: '6:30 am', title: 'intervals · 800m × 4', dur: '50m' },
  subtasks: [
    { t: '3-mile easy',           dur: '30m',    dl: 'last wk',    done: true },
    { t: 'intervals · 400m × 6',  dur: '45m',    dl: 'last wk',    done: true },
    { t: 'long run · 5mi',        dur: '1h',     dl: 'last wk',    done: true },
    { t: '3-mile easy',           dur: '30m',    dl: 'this wk',    done: true },
    { t: 'tempo · 20 min',        dur: '45m',    dl: 'this wk',    done: true },
    { t: 'long run · 6mi',        dur: '1h 10m', dl: 'this wk',    done: true },
    { t: '4-mile easy',           dur: '40m',    dl: 'today',      done: true },
    { t: 'intervals · 800m × 4',  dur: '50m',    sched: 'today 2:30 pm', current: true },
    { t: 'long run · 7mi',        dur: '1h 20m', sched: 'Sat 7 am' },
    { t: 'tempo · 25 min',        dur: '50m',    sched: 'Wed 6:30 am' },
    { t: 'long run · 8mi',        dur: '1h 30m', sched: 'next Sat' },
    { t: 'taper · race day',      dur: '1h',     sched: 'Jun 21' }
  ],
  engineHint: 'Wed long run is tight with brunch — engine bumped brunch by 30m.',
  why: 'Backwards from Jun 21 race. Build at ~10%/wk. Spike weeks alternate with recovery. 3 sessions a week (M/W/Sa) per your prefs.'
};

// Area color tokens are theme-defined; each theme provides a mapping from
// `col` keys (career, health, home, rel, finance, growth) → real colors.

window.TODAY = TODAY;
window.WEEK = WEEK;
window.GOAL = GOAL;
