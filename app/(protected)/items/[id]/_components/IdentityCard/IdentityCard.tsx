"use client";

import { PrioritySection } from "./PrioritySection";
import { TypePickerSection } from "./TypePickerSection";
import { CategorySection } from "./CategorySection";
import { DateSection } from "./DateSection";
import { DurationSection } from "./DurationSection";
import { LocationSection } from "./LocationSection";
import { ColorSection } from "./ColorSection";
import { RecurrenceSection } from "./RecurrenceSection";
import { SplittingSection } from "./SplittingSection";
import { DailyLimitSection } from "./DailyLimitSection";
import { EarliestStartSection } from "./EarliestStartSection";
import { AllowedTimesSection } from "./AllowedTimesSection";
import { DeleteRow } from "./DeleteRow";
import {
  card,
  cardBody,
  fieldGrid,
  doubleGrid,
  splitRecurrenceSlot,
} from "./IdentityCard.css";

export function IdentityCard() {
  return (
    <div className={card}>
      <PrioritySection />
      <div className={cardBody}>
        <div className={fieldGrid}>
          <TypePickerSection />
          <div className={doubleGrid}>
            <CategorySection /> <ColorSection />
          </div>
          <DateSection />
          <EarliestStartSection />
          <DurationSection />
          <LocationSection />
          <div className={splitRecurrenceSlot}>
            <SplittingSection />
            <RecurrenceSection />
            <DailyLimitSection />
            <AllowedTimesSection />
          </div>
        </div>
        <DeleteRow />
      </div>
    </div>
  );
}
