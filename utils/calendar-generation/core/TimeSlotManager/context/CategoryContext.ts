/**
 * CategoryContext
 *
 * Manages category period tracking for location-aware travel calculations.
 * Stores category periods by day and provides lookup functionality.
 */

export interface CategoryPeriod {
  start: Date;
  end: Date;
  locationId: string | null;
}

export class CategoryContext {
  private categoryPeriodsByDay: Map<string, CategoryPeriod[]> = new Map();

  constructor(private getDayKeyFn: (date: Date) => string) {}

  /**
   * Set category periods for travel context
   */
  setCategoryPeriods(periods: CategoryPeriod[]): void {
    this.categoryPeriodsByDay.clear();
    for (const p of periods) {
      const key = this.getDayKeyFn(p.start);
      const list = this.categoryPeriodsByDay.get(key) || [];
      list.push({
        start: p.start,
        end: p.end,
        locationId: p.locationId ?? null,
      });
      this.categoryPeriodsByDay.set(key, list);
    }
    // Sort periods per day by start time for faster lookup
    for (const [k, list] of this.categoryPeriodsByDay.entries()) {
      list.sort((a, b) => a.start.getTime() - b.start.getTime());
      this.categoryPeriodsByDay.set(k, list);
    }
  }

  /**
   * Lookup category location at a given time if the time falls inside a wrapper
   */
  getCategoryLocationAt(date: Date): string | null {
    const key = this.getDayKeyFn(date);
    const list = this.categoryPeriodsByDay.get(key) || [];
    for (const p of list) {
      if (date >= p.start && date <= p.end) {
        return p.locationId ?? null;
      }
    }
    return null;
  }
}
