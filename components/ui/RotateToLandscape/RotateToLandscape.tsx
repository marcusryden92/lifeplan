"use client";

import { Smartphone } from "lucide-react";
import { wrap, icon, title, note } from "./RotateToLandscape.css";

// Shown instead of a wide canvas surface (graph, mindmap) on a portrait
// phone — the view needs landscape width, and the mobile web has no reliable
// orientation-lock API, so a prompt is the strongest gate available.
export function RotateToLandscape({
  children = "This view needs the width of your screen.",
}: {
  children?: React.ReactNode;
}) {
  return (
    <div className={wrap} role="status">
      <Smartphone size={40} strokeWidth={1.6} className={icon} aria-hidden />
      <span className={title}>Turn your phone sideways</span>
      <span className={note}>{children}</span>
    </div>
  );
}
