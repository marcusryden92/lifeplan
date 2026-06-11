"use client";

import { Caption } from "@/components/ui";
import { stubCard, stubTitle, stubBody } from "../schedule/page.css";

export default function ItemActivityPage() {
  return (
    <div className={stubCard}>
      <div className={stubTitle}>Activity</div>
      <Caption className={stubBody}>
        Edit history, completions, and engine decisions will appear here once
        the activity log is wired up.
      </Caption>
    </div>
  );
}
