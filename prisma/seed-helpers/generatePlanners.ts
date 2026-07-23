import { Planner, PlannerType } from "../../generated/client";
import { LOCATION_IDS } from "./generateLocations";
import { CATEGORY_IDS } from "./generateCategories";

// Split settings ride as a JSON string on the row (see utils/taskSplitting).
interface SeedSplitting {
  minMinutes: number;
  maxMinutes: number;
  maxMinutesPerDay?: number;
  minSpacingMinutes?: number;
}

// A branch (has children) becomes a goal; a childless node becomes a leaf
// task. Branch durations are rolled up from their children.
interface SeedNode {
  title: string;
  duration?: number; // minutes; leaf tasks only (branches sum their children)
  locationId?: string | null;
  splitting?: SeedSplitting;
  children?: SeedNode[];
}

interface SeedGoal {
  title: string;
  color: string;
  categoryId?: string | null;
  locationId?: string | null;
  priority?: number; // 1-7 scale (4 = neutral)
  deadlineInDays?: number; // deadline = seed time + N days
  maxMinutesPerDay?: number; // goal daily cap on the subtree
  children: SeedNode[];
}

const SORT_STEP = 1024;

// Ten multi-layer goals across the seeded roles. Each is a goal root with
// sub-goal branches and leaf tasks; a couple carry split leaves, deadlines, or
// a daily cap to exercise those engine features.
const seedGoals: SeedGoal[] = [
  {
    title: "Launch Q3 Marketing Campaign",
    color: "#2563EB",
    categoryId: CATEGORY_IDS.DEEP_WORK,
    priority: 6,
    deadlineInDays: 30,
    children: [
      {
        title: "Research",
        children: [
          { title: "Competitor analysis", duration: 90 },
          { title: "Audience survey", duration: 60 },
        ],
      },
      {
        title: "Content creation",
        children: [
          {
            title: "Draft blog posts",
            duration: 180,
            splitting: { minMinutes: 45, maxMinutes: 90 },
          },
          { title: "Design graphics", duration: 120 },
        ],
      },
      {
        title: "Launch",
        children: [
          { title: "Schedule social posts", duration: 45 },
          { title: "Send announcement email", duration: 30 },
        ],
      },
    ],
  },
  {
    title: "Ship Mobile App v2",
    color: "#3B82F6",
    categoryId: CATEGORY_IDS.DEEP_WORK,
    priority: 6,
    deadlineInDays: 45,
    children: [
      {
        title: "Backend",
        children: [
          { title: "Build API endpoints", duration: 150 },
          { title: "Database migration", duration: 90 },
        ],
      },
      {
        title: "Frontend",
        children: [
          { title: "Onboarding screens", duration: 120 },
          { title: "Settings screen", duration: 90 },
        ],
      },
      {
        title: "QA",
        children: [
          { title: "Write automated tests", duration: 120 },
          { title: "Manual testing pass", duration: 90 },
        ],
      },
    ],
  },
  {
    title: "Quarterly Business Review Prep",
    color: "#6366F1",
    categoryId: CATEGORY_IDS.MEETINGS,
    priority: 5,
    deadlineInDays: 20,
    children: [
      { title: "Gather metrics", duration: 60 },
      {
        title: "Build slide deck",
        children: [
          { title: "Financials slides", duration: 75 },
          { title: "Roadmap slides", duration: 60 },
        ],
      },
      { title: "Rehearse presentation", duration: 45 },
    ],
  },
  {
    title: "Run a Half Marathon",
    color: "#10B981",
    categoryId: CATEGORY_IDS.FITNESS,
    priority: 5,
    deadlineInDays: 90,
    children: [
      {
        title: "Base building",
        children: [
          {
            title: "Easy runs",
            duration: 210,
            splitting: { minMinutes: 30, maxMinutes: 60, minSpacingMinutes: 720 },
          },
          { title: "Weekend long run", duration: 90 },
        ],
      },
      {
        title: "Speed work",
        children: [
          { title: "Interval training", duration: 60 },
          { title: "Tempo runs", duration: 50 },
        ],
      },
      { title: "Taper week", duration: 40 },
    ],
  },
  {
    title: "Improve Nutrition Habits",
    color: "#059669",
    categoryId: CATEGORY_IDS.HEALTH,
    priority: 4,
    children: [
      { title: "Plan weekly meals", duration: 45 },
      {
        title: "Grocery prep",
        children: [
          { title: "Weekly shopping", duration: 60, locationId: null },
          {
            title: "Batch cooking",
            duration: 120,
            locationId: LOCATION_IDS.HOME,
          },
        ],
      },
    ],
  },
  {
    title: "Renovate Home Office",
    color: "#F59E0B",
    categoryId: CATEGORY_IDS.HOME_PROJECTS,
    locationId: LOCATION_IDS.HOME,
    priority: 4,
    children: [
      {
        title: "Planning",
        children: [
          { title: "Measure the space", duration: 30 },
          { title: "Choose furniture", duration: 60 },
        ],
      },
      {
        title: "Execution",
        children: [
          { title: "Paint the walls", duration: 180 },
          { title: "Assemble the desk", duration: 90 },
          { title: "Set up cable management", duration: 45 },
        ],
      },
    ],
  },
  {
    title: "Plan Summer Vacation",
    color: "#D97706",
    categoryId: CATEGORY_IDS.PERSONAL,
    priority: 5,
    deadlineInDays: 60,
    children: [
      { title: "Research destinations", duration: 90 },
      {
        title: "Bookings",
        children: [
          { title: "Book flights", duration: 45 },
          { title: "Book hotels", duration: 45 },
        ],
      },
      { title: "Build the itinerary", duration: 60 },
    ],
  },
  {
    title: "Learn Spanish",
    color: "#8B5CF6",
    categoryId: CATEGORY_IDS.LEARNING,
    priority: 5,
    deadlineInDays: 120,
    maxMinutesPerDay: 60,
    children: [
      {
        title: "Foundations",
        children: [
          {
            title: "Vocabulary drills",
            duration: 200,
            splitting: { minMinutes: 20, maxMinutes: 40, minSpacingMinutes: 120 },
          },
          { title: "Grammar basics", duration: 120 },
        ],
      },
      {
        title: "Practice",
        children: [
          { title: "Conversation practice", duration: 90 },
          { title: "Listening exercises", duration: 75 },
        ],
      },
    ],
  },
  {
    title: "Read 12 Books This Year",
    color: "#A78BFA",
    categoryId: CATEGORY_IDS.READING,
    priority: 3,
    children: [
      {
        title: "Fiction",
        children: [
          {
            title: "Finish current novel",
            duration: 240,
            splitting: { minMinutes: 45, maxMinutes: 90 },
          },
          {
            title: "Start next novel",
            duration: 240,
            splitting: { minMinutes: 45, maxMinutes: 90 },
          },
        ],
      },
      {
        title: "Non-fiction",
        children: [
          {
            title: "Read business book",
            duration: 300,
            splitting: { minMinutes: 45, maxMinutes: 90 },
          },
          {
            title: "Read science book",
            duration: 300,
            splitting: { minMinutes: 45, maxMinutes: 90 },
          },
        ],
      },
    ],
  },
  {
    title: "Organize Digital Life",
    color: "#F97316",
    categoryId: CATEGORY_IDS.PERSONAL,
    priority: 3,
    children: [
      {
        title: "Photos",
        children: [
          { title: "Back up photo library", duration: 60 },
          { title: "Organize into albums", duration: 90 },
        ],
      },
      {
        title: "Files",
        children: [
          { title: "Clean up downloads", duration: 45 },
          { title: "Archive old projects", duration: 75 },
        ],
      },
    ],
  },
];

interface BuildContext {
  id: string;
  parentId: string;
  siblingIndex: number;
  color: string;
  userId: string;
  timestamp: string;
  out: Planner[];
}

// Depth-first build; returns the node's rolled-up duration so branches report
// the sum of their leaves. Children are emitted before their parent, which is
// safe because Planner.parentId has no DB foreign key (the tree is managed in
// application code).
const buildNode = (node: SeedNode, ctx: BuildContext): number => {
  const children = node.children ?? [];
  const isLeaf = children.length === 0;

  let childDurationSum = 0;
  children.forEach((child, index) => {
    childDurationSum += buildNode(child, {
      id: `${ctx.id}-${index + 1}`,
      parentId: ctx.id,
      siblingIndex: index,
      color: ctx.color,
      userId: ctx.userId,
      timestamp: ctx.timestamp,
      out: ctx.out,
    });
  });

  const duration = isLeaf ? (node.duration ?? 30) : childDurationSum;
  const hasCustomLocation = node.locationId != null;

  ctx.out.push({
    id: ctx.id,
    title: node.title,
    parentId: ctx.parentId,
    plannerType: isLeaf ? PlannerType.task : PlannerType.goal,
    isReady: true,
    isTriaged: true,
    duration,
    deadline: null,
    starts: null,
    recurrence: null,
    recurrenceExceptions: null,
    splitting: node.splitting ? JSON.stringify(node.splitting) : null,
    completedSegments: null,
    maxMinutesPerDay: null,
    earliestStartDate: null,
    allowedTimes: null,
    linkedItemId: null,
    notes: null,
    sortOrder: (ctx.siblingIndex + 1) * SORT_STEP,
    completedStartTime: null,
    completedEndTime: null,
    priority: 4,
    userId: ctx.userId,
    color: ctx.color,
    locationId: node.locationId ?? null,
    useParentLocation: !hasCustomLocation,
    categoryId: null, // categoryId rides on root goals only; descendants inherit
    createdAt: ctx.timestamp,
    updatedAt: ctx.timestamp,
  });

  return duration;
};

/**
 * Generates full Planner objects from the nested seed goals above.
 *
 * Roots and branches are goal-type; childless leaves are task-type. categoryId
 * is only set on the root (descendants inherit their effective category at
 * scheduling time via buildPlannerCategoryMap walking the parent chain), and
 * top-level sortOrder is 0 (root order is non-semantic).
 */
export const generatePlanners = (userId: string): Planner[] => {
  const timestamp = new Date().toISOString();
  const now = Date.now();
  const out: Planner[] = [];

  seedGoals.forEach((goal, goalIndex) => {
    const rootId = `seed-goal-${goalIndex + 1}`;

    let childDurationSum = 0;
    goal.children.forEach((child, index) => {
      childDurationSum += buildNode(child, {
        id: `${rootId}-${index + 1}`,
        parentId: rootId,
        siblingIndex: index,
        color: goal.color,
        userId,
        timestamp,
        out,
      });
    });

    const deadline =
      goal.deadlineInDays != null
        ? new Date(now + goal.deadlineInDays * 86_400_000).toISOString()
        : null;

    out.push({
      id: rootId,
      title: goal.title,
      parentId: null,
      plannerType: PlannerType.goal,
      isReady: true,
      isTriaged: true,
      duration: childDurationSum,
      deadline,
      starts: null,
      recurrence: null,
      recurrenceExceptions: null,
      splitting: null,
      completedSegments: null,
      maxMinutesPerDay: goal.maxMinutesPerDay ?? null,
      earliestStartDate: null,
      allowedTimes: null,
      linkedItemId: null,
      notes: null,
      sortOrder: 0,
      completedStartTime: null,
      completedEndTime: null,
      priority: goal.priority ?? 4,
      userId,
      color: goal.color,
      locationId: goal.locationId ?? null,
      useParentLocation: false,
      categoryId: goal.categoryId ?? null,
      createdAt: timestamp,
      updatedAt: timestamp,
    });
  });

  return out;
};
