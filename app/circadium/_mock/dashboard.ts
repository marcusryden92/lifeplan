import { vars } from "@/components/ui";

export type AreaKey =
  | "career"
  | "health"
  | "home"
  | "growth"
  | "rel"
  | "finance";

export const areaColor: Record<AreaKey, string> = {
  career: vars.swatches.blue,
  health: vars.swatches.green,
  home: vars.swatches.teal,
  growth: vars.swatches.violet,
  rel: vars.swatches.rose,
  finance: vars.swatches.amber,
};

export type AgendaItem = {
  time: string;
  dur: string;
  title: string;
  area?: string;
  col?: AreaKey;
  now?: boolean;
  warn?: boolean;
  overdue?: boolean;
  travel?: boolean;
  where?: string;
  kind?: "plan" | "task";
};

export type GoalItem = {
  name: string;
  pct: number;
  sub: string;
  area: string;
  col: AreaKey;
  next: string;
  dl: string;
};

export type StatItem = {
  label: string;
  value: string;
  sub: string;
};

export const TODAY = {
  date: "Thursday, May 28",
  greeting: "Good morning, Marcus",
  agenda: [
    {
      time: "09:00",
      dur: "2h 30m",
      title: "Q4 strategy · deep work",
      area: "Career",
      col: "career",
      now: true,
      where: "Office",
    },
    {
      time: "11:45",
      dur: "45m",
      title: "1:1 with Ana",
      area: "Career",
      col: "career",
      kind: "plan",
      where: "Office",
    },
    {
      time: "12:45",
      dur: "20m",
      title: "office → home",
      travel: true,
    },
    {
      time: "14:00",
      dur: "15m",
      title: "Plant basil",
      area: "Home",
      col: "home",
      warn: true,
      where: "Home",
    },
    {
      time: "14:30",
      dur: "50m",
      title: "Intervals · 800m × 4",
      area: "Health",
      col: "health",
      where: "Park",
    },
    {
      time: "17:00",
      dur: "20m",
      title: "Submit Q4 expenses",
      area: "Career",
      col: "career",
      overdue: true,
      where: "—",
    },
  ] satisfies AgendaItem[],
  goals: [
    {
      name: "10k training plan",
      pct: 58,
      sub: "7 / 12",
      area: "Health",
      col: "health",
      next: "intervals · today 2:30 pm",
      dl: "Jun 21",
    },
    {
      name: "Hiring · back-end",
      pct: 40,
      sub: "2 / 5",
      area: "Career",
      col: "career",
      next: "screen 3 candidates · Thu",
      dl: "next sprint",
    },
    {
      name: "Spanish · 30 day",
      pct: 40,
      sub: "12 / 30",
      area: "Growth",
      col: "growth",
      next: "15m drill · tonight",
      dl: "Jun 10",
    },
  ] satisfies GoalItem[],
  stats: [
    { label: "this week", value: "22 / 31", sub: "71% set" },
    { label: "overdue", value: "1", sub: "across 1 area" },
    { label: "streak", value: "11d", sub: "goals on track" },
  ] satisfies StatItem[],
};
