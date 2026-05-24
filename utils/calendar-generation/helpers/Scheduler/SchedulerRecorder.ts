/**
 * SchedulerRecorder
 *
 * Accumulates a per-task decision/action trail from the dynamic scheduling
 * phase (after staticEventTravelPass). For each task the scheduler attempts
 * to place, we capture:
 *
 *   - the task identity (id, title, duration, location, category constraint)
 *   - decision branching during slot selection (which candidate considered,
 *     travel-before/after math, absorb/reclaim choices, capacity check)
 *   - actions taken during reservation (span removals, leftover splices,
 *     travel slot creation)
 *   - outcome (scheduled at [start, end] / failed with reason)
 *   - end-state snapshot of the slot array (filtered to dateRangeStart..End)
 *
 * Filters at record time:
 *   - enabled flag (off by default; no-op everywhere when false)
 *   - timespan [rangeStart, rangeEnd] — a task record is kept if the task's
 *     scheduled time or its candidate's start falls in the window; failed
 *     tasks are always kept (the user usually cares about failures).
 *
 * Use case: trace where a dynamic task absorbed a multi-shard travel
 * incorrectly, which slot it ended up in, and which decision branch led
 * there.
 */

import type { Category, Planner } from "@/types/prisma";
import type { Slot } from "../../models/TimeSlot";

export type DecisionLine = { depth: number; text: string };

export type SlotSnapshot = {
  label: string;
  type: Slot["type"];
  id: string | null;
  start: Date;
  end: Date;
  markers: string[];
};

export type TaskOutcome =
  | { kind: "scheduled"; start: Date; end: Date }
  | { kind: "failed"; reason: string; details?: string }
  | { kind: "skipped"; reason: string };

export type TaskRecord = {
  iterationIndex: number;
  task: {
    id: string;
    title: string;
    duration: number;
    locationId: string | null | undefined;
    categoryConstraintId: string | null | undefined;
  };
  decisions: DecisionLine[];
  actions: string[];
  outcome: TaskOutcome | null;
  endState: SlotSnapshot[];
  inRangeHit: boolean;
};

export interface SchedulerRecorderLookups {
  categoryById?: Map<string, Category>;
  locationNameById?: Map<string, string>;
  eventTitleById?: Map<string, string>;
}

export interface SchedulerRecorderOptions {
  enabled: boolean;
  rangeStart: Date | null;
  rangeEnd: Date | null;
  lookups?: SchedulerRecorderLookups;
}

export class SchedulerRecorder {
  readonly enabled: boolean;
  private readonly rangeStart: Date | null;
  private readonly rangeEnd: Date | null;
  private readonly lookups: SchedulerRecorderLookups;
  private iterationCounter = 0;
  private current: TaskRecord | null = null;
  readonly records: TaskRecord[] = [];

  constructor(opts: SchedulerRecorderOptions) {
    this.enabled = opts.enabled;
    this.rangeStart = opts.rangeStart;
    this.rangeEnd = opts.rangeEnd;
    this.lookups = opts.lookups ?? {};
  }

  /**
   * A Date is "in range" if it falls within [rangeStart, rangeEnd] with
   * either bound optional (null = open on that side). When neither bound
   * is set, everything is in range.
   */
  private dateInRange(d: Date): boolean {
    if (this.rangeStart && d < this.rangeStart) return false;
    if (this.rangeEnd && d > this.rangeEnd) return false;
    return true;
  }

  /**
   * A Slot is "in range" if its time window overlaps [rangeStart, rangeEnd].
   */
  inRange(slot: Slot): boolean {
    if (!this.enabled) return false;
    if (this.rangeStart && slot.end <= this.rangeStart) return false;
    if (this.rangeEnd && slot.start >= this.rangeEnd) return false;
    return true;
  }

  beginTask(
    task: Planner,
    taskLocationId: string | null | undefined,
    categoryConstraintId: string | null | undefined,
  ): void {
    if (!this.enabled) return;
    this.iterationCounter += 1;
    this.current = {
      iterationIndex: this.iterationCounter,
      task: {
        id: task.id,
        title: task.title,
        duration: task.duration,
        locationId: taskLocationId,
        categoryConstraintId,
      },
      decisions: [],
      actions: [],
      outcome: null,
      endState: [],
      inRangeHit: false,
    };
  }

  decision(text: string, depth = 0): void {
    if (!this.current) return;
    this.current.decisions.push({ depth, text });
  }

  /**
   * Mark that a slot in the configured time window was touched by this
   * task's processing — either evaluated as a candidate or chosen as the
   * placement. Drives the per-task in-range filter at dump time.
   */
  noteSlotInRange(slot: { start: Date; end: Date }): void {
    if (!this.current) return;
    if (
      this.rangeStart &&
      slot.end &&
      slot.end.getTime() <= this.rangeStart.getTime()
    )
      return;
    if (
      this.rangeEnd &&
      slot.start &&
      slot.start.getTime() >= this.rangeEnd.getTime()
    )
      return;
    this.current.inRangeHit = true;
  }

  action(text: string): void {
    if (!this.current) return;
    this.current.actions.push(text);
  }

  setOutcome(outcome: TaskOutcome): void {
    if (!this.current) return;
    this.current.outcome = outcome;
    // Scheduled outcomes count as in-range only if the schedule time
    // overlaps the window. Failed/skipped outcomes don't auto-mark — they
    // get included only if a candidate evaluation already flagged the
    // task as in-range. This keeps the noise level down when the user
    // narrows the date range.
    if (outcome.kind === "scheduled") {
      if (
        this.dateInRange(outcome.start) ||
        this.dateInRange(outcome.end)
      ) {
        this.current.inRangeHit = true;
      }
    }
  }

  endTask(slots: Slot[]): void {
    if (!this.current) return;
    if (
      this.current.inRangeHit ||
      (!this.rangeStart && !this.rangeEnd) ||
      this.current.outcome?.kind === "failed"
    ) {
      this.current.endState = slots
        .filter((s) => this.inRange(s))
        .map((s) => this.snapshot(s));
      this.records.push(this.current);
    }
    this.current = null;
  }

  label(slot: Slot): string {
    return this.snapshot(slot).label;
  }

  taskLabel(): string {
    if (!this.current) return "(no task)";
    return `${this.current.task.title} [${this.current.task.duration}min]`;
  }

  locName(id: string | null | undefined): string {
    if (id == null) return "Anywhere";
    return this.lookups.locationNameById?.get(id) ?? id;
  }

  categoryName(id: string | null | undefined): string {
    if (id == null) return "—";
    return this.lookups.categoryById?.get(id)?.name ?? id;
  }

  /**
   * Format a Date the same way slot snapshots do — useful for caller-side
   * message construction (e.g. "span [10:00-10:30]") so the trace stays
   * visually consistent.
   */
  fmtDate(d: Date): string {
    return this.fmt(d);
  }

  private snapshot(slot: Slot): SlotSnapshot {
    const start = slot.start;
    const end = slot.end;
    let label: string;
    let id: string | null = null;
    const markers: string[] = [];

    switch (slot.type) {
      case "category": {
        const name = this.categoryName(slot.categoryId);
        label = `Category(${name}) [${this.fmt(start)}–${this.fmt(end)}]`;
        id = slot.categoryId;
        if (slot.trespassingStart) markers.push("trespassingStart");
        if (slot.trespassingEnd) markers.push("trespassingEnd");
        if (slot.isFinal) markers.push("isFinal");
        break;
      }
      case "available": {
        const prev = this.locName(slot.prevLocationId);
        const next = this.locName(slot.nextLocationId);
        label = `Available [${this.fmt(start)}–${this.fmt(end)}, prev=${prev}, next=${next}]`;
        break;
      }
      case "occupied": {
        const title = this.lookups.eventTitleById?.get(slot.eventId);
        const name = title ?? `${slot.plannerType}/${slot.eventType}`;
        label = `Occupied(${name}) [${this.fmt(start)}–${this.fmt(end)}]`;
        id = slot.eventId;
        break;
      }
      case "travel": {
        const from = this.locName(slot.travelFromLocationId);
        const to = this.locName(slot.travelToLocationId);
        label = `Travel(${from}→${to}) [${this.fmt(start)}–${this.fmt(end)}]`;
        id = slot.eventId;
        if (slot.insufficientTravel) {
          markers.push(
            `insufficientTravel(needs ${slot.requiredTravelMinutes}min)`,
          );
        }
        if (slot.overconstrained) markers.push("overconstrained");
        if (slot.consumedCategoryIds && slot.consumedCategoryIds.length > 0) {
          const names = slot.consumedCategoryIds
            .map((cid) => this.categoryName(cid))
            .join(", ");
          markers.push(`consumed=[${names}]`);
        }
        if (slot.travelId) markers.push(`travelId=${slot.travelId.slice(0, 8)}`);
        break;
      }
    }

    return { label, type: slot.type, id, start, end, markers };
  }

  private fmt(d: Date): string {
    const pad = (n: number) => String(n).padStart(2, "0");
    const ms = d.getTime();
    const day = new Date(ms);
    return `${pad(day.getMonth() + 1)}-${pad(day.getDate())} ${pad(day.getHours())}:${pad(day.getMinutes())}`;
  }
}
