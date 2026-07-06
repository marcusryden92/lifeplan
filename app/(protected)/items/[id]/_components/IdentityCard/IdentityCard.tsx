"use client";

import { PrioritySection } from "./PrioritySection";
import { TypePickerSection } from "./TypePickerSection";
import { CategorySection } from "./CategorySection";
import { DateSection } from "./DateSection";
import { DurationSection } from "./DurationSection";
import { LocationSection } from "./LocationSection";
import { ColorSection } from "./ColorSection";
import { DeleteRow } from "./DeleteRow";
import { card, cardBody, fieldGrid } from "./IdentityCard.css";

export function IdentityCard() {
  return (
    <div className={card}>
      <PrioritySection />
      <div className={cardBody}>
        <div className={fieldGrid}>
          <TypePickerSection />
          <CategorySection />
          <DateSection />
          <DurationSection />
          <LocationSection />
          <ColorSection />
        </div>
        <DeleteRow />
      </div>
    </div>
  );
}
