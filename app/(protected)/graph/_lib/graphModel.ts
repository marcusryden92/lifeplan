import { addDays, format, startOfDay } from "date-fns";
import type {
  Category,
  Planner,
  PlannerDependency,
  Queue,
  SimpleEvent,
} from "@/types/prisma";
import type { WeekDayIntegers } from "@/types/calendarTypes";
import { plannerIdFromEventId } from "@/utils/planRecurrence";
import { sortQueueMembers } from "@/utils/queue-handlers/mutateQueueMembers";
import { plannerIsCompleted } from "@/utils/plannerCompletion";

export type GraphSpan = { start: number; end: number };

export const INDEPENDENT_LANE_KEY = "independent";

const DAY_MS = 24 * 60 * 60 * 1000;

export const ZOOM_MIN_PX_PER_DAY = 6;
export const ZOOM_MAX_PX_PER_DAY = 960;

const NODE_HEIGHT_MIN = 18;
const NODE_HEIGHT_MAX = 30;

// Node size follows the zoom (log-scaled, like the slider), so zooming out
// shrinks the tiles with the timeline. Min width equals the height, so a
// fully squished node clamps to a perfect circle at every zoom level.
export function nodeHeightForZoom(pxPerDay: number): number {
  const t = Math.max(
    0,
    Math.min(
      1,
      Math.log(pxPerDay / ZOOM_MIN_PX_PER_DAY) /
        Math.log(ZOOM_MAX_PX_PER_DAY / ZOOM_MIN_PX_PER_DAY),
    ),
  );
  return Math.round(NODE_HEIGHT_MIN + t * (NODE_HEIGHT_MAX - NODE_HEIGHT_MIN));
}

export const GRAPH_METRICS = {
  rowSpacing: 8,
  lanePadTop: 8,
  lanePadBottom: 14,
  laneHeadHeight: 26,
  headerLanePadBottom: 2,
  dockNodeWidth: 150,
  dockGap: 56,
  dockNodeGap: 10,
  rightPad: 48,
  minRowGapX: 6,
} as const;

export function buildRootSpans(
  calendar: SimpleEvent[],
  planner: Planner[],
): Map<string, GraphSpan> {
  const parentById = new Map<string, string | null>();
  for (const row of planner) parentById.set(row.id, row.parentId ?? null);

  const rootCache = new Map<string, string | null>();
  const rootOf = (id: string): string | null => {
    const cached = rootCache.get(id);
    if (cached !== undefined) return cached;
    const seen = new Set<string>();
    let current = id;
    let root: string | null = null;
    for (;;) {
      if (seen.has(current)) break;
      seen.add(current);
      const parent = parentById.get(current);
      if (parent === undefined) break;
      if (parent === null) {
        root = current;
        break;
      }
      current = parent;
    }
    rootCache.set(id, root);
    return root;
  };

  const spans = new Map<string, GraphSpan>();
  for (const event of calendar) {
    if (event.extendedProps?.eventType !== "planner") continue;
    const rootId = rootOf(plannerIdFromEventId(event.id));
    if (!rootId) continue;
    const start = Date.parse(event.start);
    const end = Date.parse(event.end);
    if (Number.isNaN(start) || Number.isNaN(end)) continue;
    const existing = spans.get(rootId);
    if (!existing) {
      spans.set(rootId, { start, end });
    } else {
      if (start < existing.start) existing.start = start;
      if (end > existing.end) existing.end = end;
    }
  }
  return spans;
}

export type GraphNode = {
  id: string;
  planner: Planner;
  span: GraphSpan | null;
  laneKey: string;
  completed: boolean;
  unreadyGoal: boolean;
};

export type GraphLane = {
  key: string;
  queue: Queue | null;
  category: Category | null;
  title: string;
  // Indent level for the lane heading: category tree depth; a
  // category-attached queue sits one below its category, unattached queues 0.
  depth: number;
  // A category heading rendered for context only — its items live in
  // subcategory or attached-queue lanes below it. Gets a compact height and
  // no lane body.
  headerOnly: boolean;
  nodes: GraphNode[];
  // Full logical member order (completed included) — drop-index math must run
  // against it, exactly like QueueMemberList, even when completed are hidden.
  memberOrderRows: Planner[];
};

const sortNodesByStart = (nodes: GraphNode[]): GraphNode[] =>
  [...nodes].sort((a, b) => {
    const aStart = a.span?.start ?? Number.POSITIVE_INFINITY;
    const bStart = b.span?.start ?? Number.POSITIVE_INFINITY;
    return (
      aStart - bStart ||
      (a.planner.title || "").localeCompare(b.planner.title || "")
    );
  });

export function buildGraphLanes({
  planner,
  queues,
  dependencies,
  categories,
  spans,
  showCompleted,
}: {
  planner: Planner[];
  queues: Queue[];
  dependencies: PlannerDependency[];
  categories: Category[];
  spans: Map<string, GraphSpan>;
  showCompleted: boolean;
}): GraphLane[] {
  const plannerById = new Map(planner.map((p) => [p.id, p]));
  const knownCategoryIds = new Set(categories.map((c) => c.id));
  const orderedQueues = [...queues].sort(
    (a, b) =>
      a.sortOrder - b.sortOrder ||
      a.createdAt.localeCompare(b.createdAt) ||
      a.id.localeCompare(b.id),
  );

  const toNode = (row: Planner, laneKey: string): GraphNode => ({
    id: row.id,
    planner: row,
    span: spans.get(row.id) ?? null,
    laneKey,
    completed: plannerIsCompleted(row),
    unreadyGoal: row.plannerType === "goal" && row.isReady !== true,
  });

  const queuedIds = new Set<string>();
  const memberRowsByQueueId = new Map<string, Planner[]>();
  for (const queue of orderedQueues) {
    const rows = sortQueueMembers(queue.members)
      .map((m) => plannerById.get(m.plannerId))
      .filter((p): p is Planner => !!p);
    for (const row of rows) queuedIds.add(row.id);
    memberRowsByQueueId.set(queue.id, rows);
  }

  // A queue attached to a category nests under that category in the tree
  // walk, like a subcategory; unattached queues stay as top lanes.
  const queuesByCategoryId = new Map<string, Queue[]>();
  const unattachedQueues: Queue[] = [];
  for (const queue of orderedQueues) {
    if (queue.categoryId && knownCategoryIds.has(queue.categoryId)) {
      const list = queuesByCategoryId.get(queue.categoryId);
      if (list) list.push(queue);
      else queuesByCategoryId.set(queue.categoryId, [queue]);
    } else {
      unattachedQueues.push(queue);
    }
  }

  const toQueueLane = (queue: Queue, depth: number): GraphLane => {
    const rows = memberRowsByQueueId.get(queue.id) ?? [];
    return {
      key: queue.id,
      queue,
      category: null,
      title: queue.title || "Untitled queue",
      depth,
      headerOnly: false,
      nodes: rows
        .map((row) => toNode(row, queue.id))
        .filter((n) => showCompleted || !n.completed),
      memberOrderRows: rows,
    };
  };

  const lanes: GraphLane[] = unattachedQueues.map((queue) =>
    toQueueLane(queue, 0),
  );

  const endpointIds = new Set<string>();
  for (const edge of dependencies) {
    endpointIds.add(edge.predecessorId);
    endpointIds.add(edge.successorId);
  }

  const independentNodes = planner
    .filter(
      (p) =>
        p.parentId == null &&
        p.isTriaged &&
        (p.plannerType === "task" || p.plannerType === "goal") &&
        !queuedIds.has(p.id) &&
        (p.plannerType === "goal" || endpointIds.has(p.id)),
    )
    .map((row) => toNode(row, INDEPENDENT_LANE_KEY))
    .filter((n) => showCompleted || !n.completed);

  // Non-queue items group under their category, lanes ordered as an indented
  // depth-first walk of the category tree. Roots carry categoryId directly
  // (the root-only invariant), so no parent-chain resolution is needed.
  const nodesByCategoryId = new Map<string | null, GraphNode[]>();
  for (const node of independentNodes) {
    const categoryId =
      node.planner.categoryId && knownCategoryIds.has(node.planner.categoryId)
        ? node.planner.categoryId
        : null;
    const list = nodesByCategoryId.get(categoryId);
    if (list) list.push(node);
    else nodesByCategoryId.set(categoryId, [node]);
  }

  const childrenByParent = new Map<string | null, Category[]>();
  for (const category of [...categories].sort(
    (a, b) =>
      a.sortOrder - b.sortOrder ||
      a.name.localeCompare(b.name) ||
      a.id.localeCompare(b.id),
  )) {
    const parentKey =
      category.parentId && knownCategoryIds.has(category.parentId)
        ? category.parentId
        : null;
    const list = childrenByParent.get(parentKey);
    if (list) list.push(category);
    else childrenByParent.set(parentKey, [category]);
  }

  const subtreeHasContentCache = new Map<string, boolean>();
  const subtreeHasContent = (categoryId: string): boolean => {
    const cached = subtreeHasContentCache.get(categoryId);
    if (cached !== undefined) return cached;
    // Seed before recursing — a parentId cycle then resolves to false
    // instead of recursing forever.
    subtreeHasContentCache.set(categoryId, false);
    const result =
      (nodesByCategoryId.get(categoryId)?.length ?? 0) > 0 ||
      (queuesByCategoryId.get(categoryId)?.length ?? 0) > 0 ||
      (childrenByParent.get(categoryId) ?? []).some((child) =>
        subtreeHasContent(child.id),
      );
    subtreeHasContentCache.set(categoryId, result);
    return result;
  };

  const walkCategory = (category: Category, depth: number) => {
    if (!subtreeHasContent(category.id)) return;
    const direct = nodesByCategoryId.get(category.id) ?? [];
    lanes.push({
      key: `category:${category.id}`,
      queue: null,
      category,
      title: category.name,
      depth,
      headerOnly: direct.length === 0,
      nodes: sortNodesByStart(direct),
      memberOrderRows: [],
    });
    for (const queue of queuesByCategoryId.get(category.id) ?? []) {
      lanes.push(toQueueLane(queue, depth + 1));
    }
    for (const child of childrenByParent.get(category.id) ?? []) {
      walkCategory(child, depth + 1);
    }
  };
  for (const top of childrenByParent.get(null) ?? []) walkCategory(top, 0);

  const uncategorized = nodesByCategoryId.get(null) ?? [];
  if (uncategorized.length > 0) {
    lanes.push({
      key: INDEPENDENT_LANE_KEY,
      queue: null,
      category: null,
      title: "Uncategorized",
      depth: 0,
      headerOnly: false,
      nodes: sortNodesByStart(uncategorized),
      memberOrderRows: [],
    });
  }

  return lanes;
}

export type LaidNode = {
  node: GraphNode;
  x: number;
  w: number;
  y: number;
  row: number;
  docked: boolean;
};

export type LaidLane = {
  lane: GraphLane;
  y: number;
  height: number;
  rows: number;
  nodes: LaidNode[];
};

export type GraphLayout = {
  domainStart: number;
  domainEnd: number;
  pxPerDay: number;
  nodeHeight: number;
  width: number;
  height: number;
  lanes: LaidLane[];
  nodeById: Map<string, LaidNode>;
  dockX: number | null;
  nowX: number;
  // Where the engine's placements end — the delimiter between forecast and
  // the uncalculated beyond. Null when nothing is scheduled.
  scheduleEndX: number | null;
};

export function layoutGraph(
  lanes: GraphLane[],
  { pxPerDay, now }: { pxPerDay: number; now: number },
): GraphLayout {
  const M = GRAPH_METRICS;
  const nodeHeight = nodeHeightForZoom(pxPerDay);

  let minStart = Number.POSITIVE_INFINITY;
  let maxEnd = Number.NEGATIVE_INFINITY;
  for (const lane of lanes) {
    for (const node of lane.nodes) {
      if (!node.span) continue;
      if (node.span.start < minStart) minStart = node.span.start;
      if (node.span.end > maxEnd) maxEnd = node.span.end;
    }
  }
  const rawScheduleEnd =
    maxEnd === Number.NEGATIVE_INFINITY ? null : maxEnd;
  if (minStart === Number.POSITIVE_INFINITY) {
    minStart = now;
    maxEnd = now + 13 * DAY_MS;
  }
  minStart = Math.min(minStart, now);
  maxEnd = Math.max(maxEnd, now);
  const domainStart = minStart - DAY_MS;
  const domainEnd = maxEnd + DAY_MS;

  const toX = (t: number) => ((t - domainStart) / DAY_MS) * pxPerDay;

  const hasDock = lanes.some((lane) => lane.nodes.some((n) => !n.span));
  const dockX = hasDock ? toX(domainEnd) + M.dockGap : null;

  let yCursor = 0;
  let maxRight = toX(domainEnd);
  let scheduledRight = Number.NEGATIVE_INFINITY;
  const laidLanes: LaidLane[] = [];
  const nodeById = new Map<string, LaidNode>();

  for (const lane of lanes) {
    if (lane.headerOnly) {
      const height = M.laneHeadHeight + M.headerLanePadBottom;
      laidLanes.push({ lane, y: yCursor, height, rows: 0, nodes: [] });
      yCursor += height;
      continue;
    }
    const laid: LaidNode[] = [];
    let dockIndex = 0;
    for (const node of lane.nodes) {
      if (node.span) {
        const left = toX(node.span.start);
        const width = Math.max(nodeHeight, toX(node.span.end) - left);
        laid.push({ node, x: left, w: width, y: 0, row: 0, docked: false });
      } else {
        const left =
          (dockX ?? 0) + dockIndex * (M.dockNodeWidth + M.dockNodeGap);
        dockIndex += 1;
        laid.push({
          node,
          x: left,
          w: M.dockNodeWidth,
          y: 0,
          row: 0,
          docked: true,
        });
      }
    }

    let rows = 1;
    if (lane.queue) {
      // Queue members weave over-under in member order — back-to-back
      // placements would otherwise touch and read as one bar.
      laid.forEach((item, index) => {
        item.row = index % 2;
      });
      rows = Math.min(2, Math.max(1, laid.length));
    } else {
      laid.sort((a, b) => a.x - b.x);
      const rowEnds: number[] = [];
      for (const item of laid) {
        let row = rowEnds.findIndex((end) => end + M.minRowGapX <= item.x);
        if (row === -1) {
          row = rowEnds.length;
          rowEnds.push(Number.NEGATIVE_INFINITY);
        }
        rowEnds[row] = item.x + item.w;
        item.row = row;
      }
      rows = Math.max(1, rowEnds.length);
    }
    const height =
      M.laneHeadHeight +
      M.lanePadTop +
      rows * nodeHeight +
      (rows - 1) * M.rowSpacing +
      M.lanePadBottom;

    for (const item of laid) {
      item.y =
        yCursor +
        M.laneHeadHeight +
        M.lanePadTop +
        item.row * (nodeHeight + M.rowSpacing);
      if (item.x + item.w > maxRight) maxRight = item.x + item.w;
      if (!item.docked && item.x + item.w > scheduledRight) {
        scheduledRight = item.x + item.w;
      }
      nodeById.set(item.node.id, item);
    }

    laidLanes.push({ lane, y: yCursor, height, rows, nodes: laid });
    yCursor += height;
  }

  return {
    domainStart,
    domainEnd,
    pxPerDay,
    nodeHeight,
    width: Math.ceil(maxRight + M.rightPad),
    height: yCursor,
    lanes: laidLanes,
    nodeById,
    dockX,
    nowX: toX(now),
    // Min-width clamping can render a pill past its span's end — the
    // delimiter tracks the furthest rendered edge, not the raw timestamp.
    scheduleEndX:
      rawScheduleEnd !== null
        ? Math.max(toX(rawScheduleEnd), scheduledRight)
        : null,
  };
}

export type GraphTickUnit = "hour" | "day" | "week" | "month";

export type GraphTick = { x: number; label: string; unit: GraphTickUnit };

export type GraphTickUnits = Record<GraphTickUnit, boolean>;

const MAX_TICK_DAYS = 1500;
const TICK_LINE_MIN_SPACING = 10;
const TICK_LABEL_MIN_SPACING: Record<GraphTickUnit, number> = {
  hour: 44,
  day: 56,
  week: 56,
  month: 32,
};
// Hour lines stay hourly, but labels thin out to every Nth hour so adjacent
// timestamps can never collide.
const HOUR_LABEL_STRIDES = [1, 2, 3, 6, 12];

// Each enabled unit contributes vertical markers, auto-hidden while its
// spacing is too tight to read (lines below 10px apart, labels per unit).
// A day that is also a week/month boundary belongs to the coarsest visible
// unit. Hour ticks are viewport-windowed — a season-long domain at hour zoom
// would otherwise emit tens of thousands of ticks.
export function buildGraphTicks(
  layout: GraphLayout,
  weekStartDay: WeekDayIntegers,
  units: GraphTickUnits,
  window?: { start: number; end: number },
): GraphTick[] {
  const { domainStart, domainEnd, pxPerDay } = layout;
  const toX = (t: number) => ((t - domainStart) / DAY_MS) * pxPerDay;

  const spacing: Record<GraphTickUnit, number> = {
    hour: pxPerDay / 24,
    day: pxPerDay,
    week: pxPerDay * 7,
    month: pxPerDay * 28,
  };
  const lineVisible = (unit: GraphTickUnit) =>
    units[unit] && spacing[unit] >= TICK_LINE_MIN_SPACING;
  const labelFor = (unit: GraphTickUnit, text: string) =>
    spacing[unit] >= TICK_LABEL_MIN_SPACING[unit] ? text : "";

  const ticks: GraphTick[] = [];
  const taken = new Set<number>();
  const push = (x: number, label: string, unit: GraphTickUnit) => {
    const key = Math.round(x * 2);
    if (taken.has(key)) return;
    taken.add(key);
    ticks.push({ x, label, unit });
  };

  let day = startOfDay(new Date(domainStart));
  for (
    let i = 0;
    day.getTime() <= domainEnd && i < MAX_TICK_DAYS;
    i++, day = addDays(day, 1)
  ) {
    if (day.getTime() < domainStart) continue;
    const isMonthStart = day.getDate() === 1;
    const isWeekStart = day.getDay() === weekStartDay;
    if (isMonthStart && lineVisible("month")) {
      push(toX(day.getTime()), labelFor("month", format(day, "MMM")), "month");
    } else if (isWeekStart && lineVisible("week")) {
      push(toX(day.getTime()), labelFor("week", format(day, "MMM d")), "week");
    } else if (lineVisible("day")) {
      push(toX(day.getTime()), labelFor("day", format(day, "EEE d")), "day");
    }
  }

  if (lineVisible("hour")) {
    const HOUR_MS = 60 * 60 * 1000;
    const labelStride =
      HOUR_LABEL_STRIDES.find(
        (n) => n * spacing.hour >= TICK_LABEL_MIN_SPACING.hour,
      ) ?? null;
    const from = window
      ? Math.max(domainStart, domainStart + (window.start / pxPerDay) * DAY_MS)
      : domainStart;
    const to = window
      ? Math.min(domainEnd, domainStart + (window.end / pxPerDay) * DAY_MS)
      : domainEnd;
    let hourDay = startOfDay(new Date(from));
    for (
      let i = 0;
      hourDay.getTime() <= to && i < MAX_TICK_DAYS;
      i++, hourDay = addDays(hourDay, 1)
    ) {
      for (let hour = 0; hour < 24; hour++) {
        const t = hourDay.getTime() + hour * HOUR_MS;
        if (t < from || t > to || t > domainEnd) continue;
        const label =
          labelStride !== null && hour % labelStride === 0
            ? format(new Date(t), "HH:mm")
            : "";
        push(toX(t), label, "hour");
      }
    }
  }

  return ticks;
}
