/**
 * A marker recorded by the travel pass when a travel block would consume an
 * entire category slot. Instead of emitting the travel (which would eat the
 * slot's available time), the pass records a trespass and lets the slot
 * remain available. Later, markCategoryBoundaryTrespasses uses these markers
 * to stamp red top/bottom borders on the affected category wrapper events.
 */
export interface CategoryBoundaryTrespass {
  /** The category whose slot is being consumed. */
  categoryId: string;
  /** Start of the consumed slot — used to find the matching wrapper event. */
  slotStart: Date;
  /** End of the consumed slot — used to find the matching wrapper event. */
  slotEnd: Date;
  /**
   * Which boundary of the wrapper to mark red:
   *   "end"   → outbound travel would have consumed the tail of the slot
   *   "start" → return travel would have consumed the head of the slot
   */
  boundary: "start" | "end";
}
