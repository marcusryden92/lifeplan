import { TimeSlot } from "../../models/TimeSlot";
import { createTravelSlot } from "../../utils/timeSlotUtils";
import { v4 as uuidv4 } from "uuid";
import { tryBleedBackward } from "./tryBleedBackward";

export function carveAtEnd(
  slot: TimeSlot,
  slots: TimeSlot[],
  slotIndex: number,
  prevLoc: string,
  nextLoc: string,
  travelMinutes: number,
  bufferTimeMinutes: number,
  occupiedSlots: TimeSlot[],
  result: TimeSlot[],
): void {
  const travelMs = travelMinutes * 60000;
  const bufferMs = bufferTimeMinutes * 60000;
  const travelEnd = slot.end;
  const travelStart = new Date(travelEnd.getTime() - travelMs);

  if (travelStart.getTime() >= slot.start.getTime()) {
    if (travelStart.getTime() > slot.start.getTime()) {
      occupiedSlots.push(
        createTravelSlot(
          travelStart,
          travelEnd,
          prevLoc,
          nextLoc,
          "preliminary",
          uuidv4(),
        ),
      );
      result.push({
        start: slot.start,
        end: new Date(travelStart.getTime()),
        durationMinutes: Math.floor(
          (travelStart.getTime() - slot.start.getTime()) / 60000,
        ),
        isAvailable: true,
        prevLocationId: slot.prevLocationId,
        nextLocationId: nextLoc,
        categoryId: slot.categoryId,
        isStrictCategory: slot.isStrictCategory,
      });
    } else {
      if (
        !tryBleedBackward(
          slot,
          prevLoc,
          nextLoc,
          travelMinutes,
          bufferMs,
          false,
          occupiedSlots,
          result,
        )
      ) {
        occupiedSlots.push(
          createTravelSlot(
            travelStart,
            travelEnd,
            prevLoc,
            nextLoc,
            "preliminary",
            uuidv4(),
          ),
        );
      }
    }
  } else {
    if (
      !tryBleedBackward(
        slot,
        prevLoc,
        nextLoc,
        travelMinutes,
        bufferMs,
        true,
        occupiedSlots,
        result,
      )
    ) {
      const nextSlot =
        slotIndex + 1 < slots.length ? slots[slotIndex + 1] : null;
      if (
        !slot.categoryId &&
        nextSlot?.isAvailable &&
        nextSlot.categoryId &&
        nextSlot.start.getTime() === slot.end.getTime()
      ) {
        const bleedEnd = new Date(slot.start.getTime() + travelMs);
        occupiedSlots.push(
          createTravelSlot(
            slot.start,
            bleedEnd,
            prevLoc,
            nextLoc,
            "preliminary",
            uuidv4(),
          ),
        );
        const newCatStart = new Date(bleedEnd.getTime() + bufferMs);
        if (newCatStart.getTime() < nextSlot.end.getTime()) {
          slots[slotIndex + 1] = {
            ...nextSlot,
            start: newCatStart,
            durationMinutes: Math.floor(
              (nextSlot.end.getTime() - newCatStart.getTime()) / 60000,
            ),
            prevLocationId: nextLoc,
          };
        }
      } else {
        occupiedSlots.push(
          createTravelSlot(
            slot.start,
            slot.end,
            prevLoc,
            nextLoc,
            "preliminary",
            uuidv4(),
            {
              insufficientTravel: true,
              requiredTravelMinutes: travelMinutes,
            },
          ),
        );
      }
    }
  }
}
