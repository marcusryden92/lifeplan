/**
 * Schedule Task
 *
 * Orchestrates the 5-phase pipeline to schedule a single task:
 * validate -> find slots -> select best -> reserve -> build event
 */

import { Planner, SimpleEvent } from "@/types/prisma";
import { TimeSlotManager } from "../../TimeSlotManager";
import { SchedulingStrategy } from "../../../strategies/SchedulingStrategy";
import {
  SchedulingContext,
  SchedulingFailure,
} from "../../../models/SchedulingModels";
import { validateTask } from "../validation/validateTask";
import { findValidSlots } from "../slot-selection/findValidSlots";
import { selectBestSlot } from "../slot-selection/selectBestSlot";
import { reserveTaskSlot } from "../reservation/reserveTaskSlot";
import { buildTaskEvent } from "../event-creation/buildTaskEvent";

export function scheduleTask(
  task: Planner,
  slotManager: TimeSlotManager,
  strategy: SchedulingStrategy,
  context: SchedulingContext,
  afterTime?: Date,
): { success: boolean; event?: SimpleEvent; failure?: SchedulingFailure } {
  // Phase 1: Validate task
  const validationError = validateTask(task);
  if (validationError) {
    return { success: false, failure: validationError };
  }

  // Phase 2: Find valid slots
  const slotsResult = findValidSlots(task, slotManager, context, afterTime);
  if ("failure" in slotsResult) {
    return { success: false, failure: slotsResult.failure };
  }

  // Phase 3: Select best slot with travel calculation
  const selectionResult = selectBestSlot(
    task,
    slotsResult.validSlots,
    slotsResult.fittingSlots,
    slotsResult.taskLocationId,
    slotManager,
    strategy,
    context,
  );
  if ("failure" in selectionResult) {
    return { success: false, failure: selectionResult.failure };
  }

  // Phase 4: Reserve the slot with travel
  const reservationResult = reserveTaskSlot(
    task,
    selectionResult.selectedSlot,
    selectionResult.travelBefore,
    selectionResult.travelAfter,
    selectionResult.taskLocationId,
    selectionResult.reusableTravelStart,
    slotManager,
    selectionResult.absorbPrevTravelAfter,
    selectionResult.absorbedTravelStart,
  );
  if ("failure" in reservationResult) {
    return { success: false, failure: reservationResult.failure };
  }

  // Phase 5: Build the event
  const event = buildTaskEvent(
    task,
    reservationResult.taskStartDate,
    reservationResult.taskEndDate,
    context,
  );

  // Add to scheduled events (travel events added later by CalendarGenerator)
  context.scheduledEvents.push(event);

  return { success: true, event };
}
