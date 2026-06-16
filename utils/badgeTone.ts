export type PlannerTypeTone = "type" | "info" | "done" | "neutral";

// Map a PlannerType string to a badge tone. Used by the library list, the
// item detail header, and any other surface that wants a consistent
// type-coded badge.
export function plannerTypeBadgeTone(type: string): PlannerTypeTone {
  switch (type) {
    case "goal":
      return "done";
    case "plan":
      return "info";
    case "task":
      return "type";
    default:
      return "neutral";
  }
}
