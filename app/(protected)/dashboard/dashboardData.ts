import { format } from "date-fns";
import type {
  Planner,
  SimpleEvent,
  EventTemplate,
  Category,
  TravelEvent,
} from "@/types/prisma";
import { EventType, PlannerType } from "@/types/prisma";
import type { SerializedLocation } from "@/redux/slices/schedulingSettingsSlice";
import { endOfDay, startOfDay } from "@/utils/dateUtils";
import { getGoalDurationProgress } from "@/utils/plannerStatus";
import { formatDurationCompact } from "@/utils/timeFormatting";
import type { InheritedLocationInfo } from "@/utils/goalPageHandlers";

export type AgendaItem = {
  id: string;
  plannerId?: string;
  start: Date;
  end: Date;
  durationMinutes: number;
  title: string;
  travel: boolean;
  now: boolean;
  warn: boolean;
  overdue: boolean;
  pastDeadline: boolean;
  kind?: "plan" | "task" | "template";
  categoryName?: string;
  categoryColor?: string | null;
  where?: string;
};

export type DashboardGoal = {
  id: string;
  name: string;
  pct: number;
  fraction: string;
  categoryName?: string;
  categoryColor?: string | null;
  next?: string;
  deadline?: string;
};

export type DashboardSummary = {
  itemCount: number;
  plannedMinutes: number;
  overdueCount: number;
  pastDeadlineCount: number;
};

function withinToday(date: Date, dayStart: Date, dayEnd: Date): boolean {
  return date >= dayStart && date <= dayEnd;
}

export function buildTodayAgenda(args: {
  now: Date;
  calendar: SimpleEvent[];
  travelEvents: TravelEvent[];
  templates: EventTemplate[];
  planners: Planner[];
  categories: Category[];
  locations: SerializedLocation[];
  inheritedLocationMap: Map<string, InheritedLocationInfo>;
}): AgendaItem[] {
  const {
    now,
    calendar,
    travelEvents,
    templates,
    planners,
    categories,
    locations,
    inheritedLocationMap,
  } = args;

  const dayStart = startOfDay(now);
  const dayEnd = endOfDay(now);
  const categoryById = new Map(categories.map((c) => [c.id, c]));
  const locationById = new Map(locations.map((l) => [l.id, l]));
  // The engine emits planner-type SimpleEvents with `event.id === planner.id`
  // (see utils/calendar-generation/helpers/Scheduler/buildTaskEvent.ts), so a
  // direct id lookup matches both regular scheduled tasks and completed-item
  // events.
  const plannerById = new Map(planners.map((p) => [p.id, p]));

  const items: AgendaItem[] = [];

  for (const event of calendar) {
    if (event.extendedProps?.eventType !== EventType.planner) continue;
    const start = new Date(event.start);
    if (!withinToday(start, dayStart, dayEnd)) continue;
    const end = new Date(event.end);
    const planner = plannerById.get(event.id);
    const durationMinutes = Math.max(
      0,
      Math.round((end.getTime() - start.getTime()) / 60000),
    );

    const category = planner?.categoryId
      ? categoryById.get(planner.categoryId)
      : undefined;
    const completed = Boolean(planner?.completedEndTime);

    const deadline = planner?.deadline ? new Date(planner.deadline) : null;
    const pastDeadline =
      !!deadline && !completed && start.getTime() > deadline.getTime();
    const overdue =
      !!deadline && !completed && deadline.getTime() < dayStart.getTime();

    const isNow = start <= now && now < end;
    const warn = !isNow && !completed && end.getTime() <= now.getTime();

    let where: string | undefined;
    if (planner) {
      if (planner.locationId && !planner.useParentLocation) {
        where = locationById.get(planner.locationId)?.name;
      } else {
        where = inheritedLocationMap.get(planner.id)?.locationName;
      }
    }

    items.push({
      id: event.id,
      plannerId: planner?.id,
      start,
      end,
      durationMinutes,
      title: event.title,
      travel: false,
      now: isNow,
      warn,
      overdue,
      pastDeadline,
      kind: planner?.plannerType === PlannerType.plan ? "plan" : "task",
      categoryName: category?.name,
      categoryColor: category?.color,
      where,
    });
  }

  for (const travel of travelEvents) {
    const start = new Date(travel.start);
    if (!withinToday(start, dayStart, dayEnd)) continue;
    const end = new Date(travel.end);
    const fromName = travel.fromLocationId
      ? (locationById.get(travel.fromLocationId)?.name ?? "Unknown")
      : "Anywhere";
    const toName = travel.toLocationId
      ? (locationById.get(travel.toLocationId)?.name ?? "Unknown")
      : "Anywhere";

    items.push({
      id: travel.id,
      start,
      end,
      durationMinutes: travel.travelMinutes,
      title: `${fromName} → ${toName}`,
      travel: true,
      now: start <= now && now < end,
      warn: false,
      overdue: false,
      pastDeadline: false,
    });
  }

  const todayWeekday = now.getDay();
  for (const template of templates) {
    if (template.startDay !== todayWeekday) continue;
    const [hours, minutes] = template.startTime.split(":").map(Number);
    if (Number.isNaN(hours) || Number.isNaN(minutes)) continue;
    const start = new Date(now);
    start.setHours(hours, minutes, 0, 0);
    const end = new Date(start.getTime() + template.duration * 60000);

    items.push({
      id: template.id,
      start,
      end,
      durationMinutes: template.duration,
      title: template.title,
      travel: false,
      now: start <= now && now < end,
      warn: false,
      overdue: false,
      pastDeadline: false,
      kind: "template",
      where: template.locationId
        ? locationById.get(template.locationId)?.name
        : undefined,
    });
  }

  return items.sort((a, b) => a.start.getTime() - b.start.getTime());
}

export function summarizeAgenda(agenda: AgendaItem[]): DashboardSummary {
  let plannedMinutes = 0;
  let overdueCount = 0;
  let pastDeadlineCount = 0;
  let itemCount = 0;
  for (const item of agenda) {
    if (item.travel) continue;
    itemCount++;
    plannedMinutes += item.durationMinutes;
    if (item.overdue) overdueCount++;
    if (item.pastDeadline) pastDeadlineCount++;
  }
  return { itemCount, plannedMinutes, overdueCount, pastDeadlineCount };
}

export function formatPlannedMinutes(total: number): string {
  if (total <= 0) return "0m";
  return formatDurationCompact(total);
}

function leafCounts(
  goal: Planner,
  planners: Planner[],
): { done: number; total: number } {
  const childrenByParent = new Map<string, Planner[]>();
  for (const p of planners) {
    if (!p.parentId) continue;
    const arr = childrenByParent.get(p.parentId);
    if (arr) arr.push(p);
    else childrenByParent.set(p.parentId, [p]);
  }

  let total = 0;
  let done = 0;
  const stack: Planner[] = [goal];
  const visited = new Set<string>();
  while (stack.length > 0) {
    const node = stack.pop() as Planner;
    if (visited.has(node.id)) continue;
    visited.add(node.id);
    const children = childrenByParent.get(node.id);
    if (!children || children.length === 0) {
      if (node.id === goal.id) continue;
      total++;
      if (node.completedEndTime) done++;
    } else {
      for (const c of children) stack.push(c);
    }
  }
  return { done, total };
}

function nextScheduledForGoal(
  goal: Planner,
  planners: Planner[],
  calendar: SimpleEvent[],
  now: Date,
): SimpleEvent | undefined {
  const descendants = new Set<string>();
  const stack = [goal.id];
  const childrenByParent = new Map<string, string[]>();
  for (const p of planners) {
    if (!p.parentId) continue;
    const arr = childrenByParent.get(p.parentId);
    if (arr) arr.push(p.id);
    else childrenByParent.set(p.parentId, [p.id]);
  }
  while (stack.length > 0) {
    const id = stack.pop() as string;
    if (descendants.has(id)) continue;
    descendants.add(id);
    const children = childrenByParent.get(id);
    if (children) for (const c of children) stack.push(c);
  }

  const upcoming = calendar
    .filter((e) => {
      if (e.extendedProps?.eventType !== EventType.planner) return false;
      return descendants.has(e.id);
    })
    .map((e) => ({ event: e, start: new Date(e.start) }))
    .filter((row) => row.start.getTime() >= now.getTime())
    .sort((a, b) => a.start.getTime() - b.start.getTime());

  return upcoming[0]?.event;
}

export function buildPriorityGoals(args: {
  now: Date;
  planners: Planner[];
  categories: Category[];
  calendar: SimpleEvent[];
  plannerScores: Record<string, number>;
  limit?: number;
}): DashboardGoal[] {
  const { now, planners, categories, calendar, plannerScores, limit = 3 } =
    args;
  const categoryById = new Map(categories.map((c) => [c.id, c]));

  const rootGoals = planners.filter(
    (p) =>
      p.plannerType === PlannerType.goal && !p.parentId && !p.completedEndTime,
  );

  const hasScores = Object.keys(plannerScores).length > 0;
  const sorted = [...rootGoals].sort((a, b) => {
    if (hasScores) {
      const aScore = plannerScores[a.id] ?? -Infinity;
      const bScore = plannerScores[b.id] ?? -Infinity;
      if (aScore !== bScore) return bScore - aScore;
    }
    if (b.priority !== a.priority) return b.priority - a.priority;
    const aDl = a.deadline ? new Date(a.deadline).getTime() : Infinity;
    const bDl = b.deadline ? new Date(b.deadline).getTime() : Infinity;
    return aDl - bDl;
  });

  return sorted.slice(0, limit).map((goal) => {
    const pctRaw = getGoalDurationProgress(goal, planners);
    const pct = pctRaw == null ? 0 : Math.round(pctRaw * 100);
    const { done, total } = leafCounts(goal, planners);
    const category = goal.categoryId
      ? categoryById.get(goal.categoryId)
      : undefined;
    const upcoming = nextScheduledForGoal(goal, planners, calendar, now);

    const nextLabel = upcoming
      ? `${upcoming.title} · ${format(new Date(upcoming.start), "EEE h:mm a")}`
      : undefined;

    return {
      id: goal.id,
      name: goal.title,
      pct,
      fraction: total > 0 ? `${done} / ${total}` : "—",
      categoryName: category?.name,
      categoryColor: category?.color,
      next: nextLabel,
      deadline: goal.deadline
        ? format(new Date(goal.deadline), "MMM d")
        : undefined,
    };
  });
}

export function greetingForHour(hour: number, name?: string | null): string {
  const period =
    hour < 5
      ? "Good night"
      : hour < 12
        ? "Good morning"
        : hour < 17
          ? "Good afternoon"
          : hour < 21
            ? "Good evening"
            : "Good night";
  const firstName = name?.split(" ")[0]?.trim();
  return firstName ? `${period}, ${firstName}` : period;
}

export function formatDashboardDate(now: Date): string {
  return format(now, "EEEE, MMMM d");
}

export function formatAgendaTime(start: Date): string {
  return format(start, "h:mm a");
}
