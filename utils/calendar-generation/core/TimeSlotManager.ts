import { TimeSlot } from "../models/TimeSlot";

export class TimeSlotManager {
  availableSlots: TimeSlot[] = [];
  occupiedSlots: TimeSlot[] = [];
  readonly bufferTimeMinutes: number;
  readonly currentDate: Date;

  constructor(currentDate: Date = new Date(), bufferTimeMinutes: number = 0) {
    this.currentDate = currentDate;
    this.bufferTimeMinutes = bufferTimeMinutes;
  }

  clear(): void {
    this.availableSlots.length = 0;
    this.occupiedSlots.length = 0;
  }
}
