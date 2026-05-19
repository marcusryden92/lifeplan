import { Category } from "@/types/prisma";
import { Slot } from "../../models/TimeSlot";
import { TravelManager } from "../../core/TravelManager";

/**
 * Walks slots[] in order and places travel slots for location transitions.
 * See notes/claudeTravelCriteria.md for the decision tree this implements.
 *
 * Trespass markers are set directly on CategorySlot fragments
 * (trespassingStart / trespassingEnd) so downstream wrapper-marking can read
 * them from the slot array without a side-channel.
 *
 * Implementation pending — body intentionally empty until the rewrite.
 */
export function preliminaryTravelPass(
  hasLocationMap: boolean,
  categories: Category[],
  slots: Slot[],
  travelManager: TravelManager,
  bufferTimeMinutes: number,
): void {
  if (!hasLocationMap) return;
  void categories;
  void slots;
  void travelManager;
  void bufferTimeMinutes;
}
