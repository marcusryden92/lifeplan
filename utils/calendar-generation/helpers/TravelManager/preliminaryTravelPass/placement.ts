import {
  AvailableSlot,
  CategorySlot,
  Slot,
} from "../../../models/TimeSlot";
import { TravelManager } from "../../../core/TravelManager";
import { TravelProcessingAction } from "../../../models/SchedulingModels";
import {
  createTravelShards,
  shardSourceFromAvailable,
  shardSourceFromCategory,
} from "../../../utils/timeSlotUtils";
import { TravelPassRecorder } from "../TravelPassRecorder";
import { M } from "../travelPassMessages";
import { makeAvailableLeftover } from "./slotShape";
import { v4 as uuidv4 } from "uuid";

// ---------------------------------------------------------------------------
// Action: Available, current large enough — PlaceAtStart / PlaceAtEnd
// ---------------------------------------------------------------------------

export function placeTravelInCurrent(
  slots: Slot[],
  i: number,
  action: TravelProcessingAction,
): number {
  const slot = slots[i] as AvailableSlot;
  const { prevLocation, nextLocation, placeAtSlotStart, travelMinutes } =
    action;

  const travelStart = placeAtSlotStart
    ? slot.start
    : new Date(slot.end.getTime() - travelMinutes * 60000);
  const travelEnd = placeAtSlotStart
    ? new Date(slot.start.getTime() + travelMinutes * 60000)
    : slot.end;

  const shards = createTravelShards(
    [shardSourceFromAvailable(slot, travelStart, travelEnd)],
    uuidv4(),
    prevLocation,
    nextLocation,
    "preliminary",
  );

  const replacements: Slot[] = [];
  if (placeAtSlotStart) {
    replacements.push(...shards);
    if (travelEnd.getTime() < slot.end.getTime()) {
      replacements.push(
        makeAvailableLeftover(
          travelEnd,
          slot.end,
          nextLocation,
          slot.nextLocationId ?? null,
        ),
      );
    }
  } else {
    if (slot.start.getTime() < travelStart.getTime()) {
      replacements.push(
        makeAvailableLeftover(
          slot.start,
          travelStart,
          slot.prevLocationId ?? null,
          prevLocation,
        ),
      );
    }
    replacements.push(...shards);
  }

  slots.splice(i, 1, ...replacements);
  return i + replacements.length;
}

// ---------------------------------------------------------------------------
// Action: Category entry — PlaceAtStart (eat from interior at HEAD)
// ---------------------------------------------------------------------------

export function placeTravelAtCategoryHead(
  slots: Slot[],
  i: number,
  action: TravelProcessingAction,
): number {
  const slot = slots[i] as CategorySlot;
  const { prevLocation, nextLocation, travelMinutes } = action;

  const travelStart = slot.start;
  const travelEnd = new Date(travelStart.getTime() + travelMinutes * 60000);

  const shards = createTravelShards(
    [shardSourceFromCategory(slot, travelStart, travelEnd)],
    uuidv4(),
    prevLocation,
    nextLocation,
    "preliminary",
    { categoryId: slot.categoryId, isStrictCategory: slot.isStrictCategory },
  );

  const replacements: Slot[] = [...shards];
  if (travelEnd.getTime() < slot.end.getTime()) {
    replacements.push({
      ...slot,
      start: travelEnd,
      durationMinutes: Math.floor(
        (slot.end.getTime() - travelEnd.getTime()) / 60000,
      ),
      prevLocationId: slot.currentLocationId,
      trespassingStart: undefined,
    });
  }

  slots.splice(i, 1, ...replacements);
  // Position walker at the (possibly-shortened) category for exit-edge handling.
  return i + 1;
}

// ---------------------------------------------------------------------------
// Action: Category exit — PlaceAtEnd (eat from interior at TAIL)
// ---------------------------------------------------------------------------

export function placeTravelAtCategoryTail(
  slots: Slot[],
  i: number,
  action: TravelProcessingAction,
): number {
  const slot = slots[i] as CategorySlot;
  const { prevLocation, nextLocation, travelMinutes } = action;

  const travelEnd = slot.end;
  const travelStart = new Date(travelEnd.getTime() - travelMinutes * 60000);

  const shards = createTravelShards(
    [shardSourceFromCategory(slot, travelStart, travelEnd)],
    uuidv4(),
    prevLocation,
    nextLocation,
    "preliminary",
    { categoryId: slot.categoryId, isStrictCategory: slot.isStrictCategory },
  );

  const replacements: Slot[] = [];
  if (slot.start.getTime() < travelStart.getTime()) {
    replacements.push({
      ...slot,
      end: travelStart,
      durationMinutes: Math.floor(
        (travelStart.getTime() - slot.start.getTime()) / 60000,
      ),
      nextLocationId: slot.currentLocationId,
      trespassingEnd: undefined,
      isFinal: undefined,
    });
  }
  replacements.push(...shards);

  slots.splice(i, 1, ...replacements);
  return i + replacements.length;
}

// ---------------------------------------------------------------------------
// Action: Available with both neighbors fixed (Occupied), too small — fill + alert
// ---------------------------------------------------------------------------

export function fillCurrentWithAlert(
  slots: Slot[],
  i: number,
  action: TravelProcessingAction,
): number {
  const slot = slots[i] as AvailableSlot;
  const shards = createTravelShards(
    [shardSourceFromAvailable(slot, slot.start, slot.end)],
    uuidv4(),
    action.prevLocation,
    action.nextLocation,
    "preliminary",
    {
      insufficientTravel: true,
      requiredTravelMinutes: action.travelMinutes,
    },
  );
  slots.splice(i, 1, ...shards);
  return i + shards.length;
}

// ---------------------------------------------------------------------------
// Action: Category exit, Next=Occupied, doesn't fit, no backward Travel
// ---------------------------------------------------------------------------

export function fillCategoryTailOrTrespass(
  slots: Slot[],
  i: number,
  action: TravelProcessingAction,
  travelManager: TravelManager,
  recorder?: TravelPassRecorder,
): number {
  const slot = slots[i] as CategorySlot;
  const T = action.travelMinutes;
  const curDur = slot.durationMinutes;

  if (T >= curDur) {
    // Entire interior consumed -> trespass instead of visible travel.
    slot.trespassingEnd = true;
    travelManager.untrackLeg(action.prevLocation, action.nextLocation);
    recorder?.decision(M.fillCategoryTailOrTrespass.trespassEnd(T, curDur), 3);
    recorder?.action(
      M.fillCategoryTailOrTrespass.trespassEndAction(recorder.label(slot)),
    );
    return i + 1;
  }

  // Otherwise fill the category TAIL with an alert travel.
  const travelEnd = slot.end;
  const travelStart = new Date(travelEnd.getTime() - curDur * 60000);
  const shards = createTravelShards(
    [shardSourceFromCategory(slot, travelStart, travelEnd)],
    uuidv4(),
    action.prevLocation,
    action.nextLocation,
    "preliminary",
    {
      insufficientTravel: true,
      requiredTravelMinutes: T,
      categoryId: slot.categoryId,
      isStrictCategory: slot.isStrictCategory,
    },
  );

  const replacements: Slot[] = [];
  if (slot.start.getTime() < travelStart.getTime()) {
    replacements.push({
      ...slot,
      end: travelStart,
      durationMinutes: Math.floor(
        (travelStart.getTime() - slot.start.getTime()) / 60000,
      ),
      nextLocationId: slot.currentLocationId,
      trespassingEnd: undefined,
      isFinal: undefined,
    });
  }
  replacements.push(...shards);

  slots.splice(i, 1, ...replacements);
  recorder?.action(M.fillCategoryTailOrTrespass.fillTailAction(curDur, T));
  return i + replacements.length;
}
