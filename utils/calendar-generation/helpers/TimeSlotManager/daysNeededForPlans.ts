import { Planner } from "@/types/prisma";
import { SCHEDULING_CONFIG } from "../../constants";

// The initial slot build always covers a fixed horizon chunk; Plans further
// out are deliberately not considered yet (expansion picks them up when it
// reaches their dates). The `planners` and `currentDate` args are unused
// today but kept on the signature so the caller in buildAvailableSlots can
// stay declarative — drop them if the call site is refactored.
export function daysNeededForPlans(
  _planners: Planner[],
  _currentDate: Date,
): number {
  return SCHEDULING_CONFIG.HORIZON_CHUNK_DAYS;
}
