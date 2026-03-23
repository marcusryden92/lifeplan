/**
 * TravelConverter
 *
 * Converts travel slots to SimpleEvent format for calendar display.
 */

import { SimpleEvent } from "@/types/prisma";
import { TimeSlot } from "../models/TimeSlot";
import { getAllTravelSlots, generateTravelEvents } from "../helpers/TravelConverter";

export class TravelConverter {
  static getAllTravelSlots(occupiedSlots: Map<string, TimeSlot[]>): TimeSlot[] {
    return getAllTravelSlots(occupiedSlots);
  }

  static generateTravelEvents(
    occupiedSlots: Map<string, TimeSlot[]>,
    userId: string
  ): SimpleEvent[] {
    return generateTravelEvents(occupiedSlots, userId);
  }
}
