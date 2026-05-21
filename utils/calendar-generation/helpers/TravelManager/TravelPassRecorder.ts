/**
 * TravelPassRecorder
 *
 * Accumulates a per-slot decision/action trail from preliminaryTravelPass
 * together with an end-state snapshot of the slot array after each iteration.
 *
 * Two filters apply at record time:
 *   - enabled flag (off by default; no-op everywhere when false)
 *   - timespan [rangeStart, rangeEnd] — only slots that overlap the window
 *     produce records, so the log stays focused on the time the user is
 *     debugging.
 *
 * The recorder is intentionally append-only: every call site is a one-liner
 * that pushes a string into the current record, and the records array is
 * dumped by logPreliminaryTravelPass at the end of CalendarGenerator.
 */

import { Category } from "@/types/prisma";
import { Slot } from "../../models/TimeSlot";

export type SlotSnapshot = {
  label: string;
  type: Slot["type"];
  id: string | null;
  start: Date;
  end: Date;
  markers: string[];
};

export type DecisionLine = { depth: number; text: string };

export type SlotRecord = {
  pass: string;
  iterationIndex: number;
  slot: SlotSnapshot;
  decisions: DecisionLine[];
  actions: string[];
  endState: SlotSnapshot[];
};

export interface RecorderLookups {
  categoryById?: Map<string, Category>;
  locationNameById?: Map<string, string>;
  eventTitleById?: Map<string, string>;
}

export interface TravelPassRecorderOptions {
  enabled: boolean;
  rangeStart: Date | null;
  rangeEnd: Date | null;
  lookups?: RecorderLookups;
}

export class TravelPassRecorder {
  readonly enabled: boolean;
  private readonly rangeStart: Date | null;
  private readonly rangeEnd: Date | null;
  private readonly lookups: RecorderLookups;
  private currentPass = "preliminary";
  private iterationCounter = 0;
  private current: SlotRecord | null = null;
  readonly records: SlotRecord[] = [];

  constructor(opts: TravelPassRecorderOptions) {
    this.enabled = opts.enabled;
    this.rangeStart = opts.rangeStart;
    this.rangeEnd = opts.rangeEnd;
    this.lookups = opts.lookups ?? {};
  }

  startPass(label: string): void {
    if (!this.enabled) return;
    this.currentPass = label;
    this.iterationCounter = 0;
  }

  inRange(slot: Slot): boolean {
    if (!this.enabled) return false;
    if (this.rangeStart && slot.end <= this.rangeStart) return false;
    if (this.rangeEnd && slot.start >= this.rangeEnd) return false;
    return true;
  }

  beginSlot(slot: Slot): void {
    if (!this.enabled) return;
    this.iterationCounter += 1;
    if (!this.inRange(slot)) {
      this.current = null;
      return;
    }
    this.current = {
      pass: this.currentPass,
      iterationIndex: this.iterationCounter,
      slot: this.snapshot(slot),
      decisions: [],
      actions: [],
      endState: [],
    };
  }

  decision(text: string, depth = 0): void {
    if (!this.current) return;
    this.current.decisions.push({ depth, text });
  }

  action(text: string): void {
    if (!this.current) return;
    this.current.actions.push(text);
  }

  endSlot(slots: Slot[]): void {
    if (!this.current) return;
    this.current.endState = slots
      .filter((s) => this.inRange(s))
      .map((s) => this.snapshot(s));
    this.records.push(this.current);
    this.current = null;
  }

  label(slot: Slot): string {
    return this.snapshot(slot).label;
  }

  private snapshot(slot: Slot): SlotSnapshot {
    const start = slot.start;
    const end = slot.end;
    let label: string;
    let id: string | null = null;
    const markers: string[] = [];

    switch (slot.type) {
      case "category": {
        const name =
          this.lookups.categoryById?.get(slot.categoryId)?.name ??
          slot.categoryId;
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
            .map((cid) => this.lookups.categoryById?.get(cid)?.name ?? cid)
            .join(", ");
          markers.push(`consumed=[${names}]`);
        }
        break;
      }
    }

    return { label, type: slot.type, id, start, end, markers };
  }

  private locName(id: string | null | undefined): string {
    if (id == null) return "Anywhere";
    return this.lookups.locationNameById?.get(id) ?? id;
  }

  private fmt(d: Date): string {
    const pad = (n: number) => String(n).padStart(2, "0");
    const ms = d.getTime();
    const day = new Date(ms);
    return `${pad(day.getMonth() + 1)}-${pad(day.getDate())} ${pad(day.getHours())}:${pad(day.getMinutes())}`;
  }
}
