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
import { DeleteRow } from "./DeleteRow";
import { card, cardBody, fieldGrid, doubleGrid } from "./IdentityCard.css";

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
          <DurationSection />
          <SplittingSection />
          <LocationSection />
          <RecurrenceSection />
        </div>
        <DeleteRow />
      </div>
    </div>
  );
}
