"use client";

import { card, cardTitle, dangerNote } from "../../page.css";

export function DangerSection() {
  return (
    <div className={card}>
      <span className={cardTitle}>Account deletion</span>
      <div className={dangerNote}>
        Permanent account deletion isn't wired up yet. When it is, this is where
        you'll be able to download your data and remove everything.
      </div>
    </div>
  );
}
