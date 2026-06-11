"use client";

import { Caption } from "@/components/ui";
import { stubCard, stubTitle, stubBody } from "./page.css";

export default function ItemSchedulePage() {
  return (
    <div className={stubCard}>
      <div className={stubTitle}>Schedule</div>
      <Caption className={stubBody}>
        A per-item schedule view is coming. For now, the Calendar surface owns
        scheduled events end-to-end — see the &ldquo;Next on calendar&rdquo;
        card on Overview for the nearest upcoming block.
      </Caption>
    </div>
  );
}
