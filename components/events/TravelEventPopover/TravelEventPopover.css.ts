import { style, styleVariants } from "@vanilla-extract/css";
import { vars, colorMixAlpha, radii, borderWidth } from "@/lib/theme";

// Mirrors the drag state CalendarPopover exposes via its render prop.
export const headerCursor = styleVariants({
  dragging: { cursor: "grabbing" },
  idle: { cursor: "default" },
});

// Accent color keyed by the popover's travel-health variant. "ok" reads muted
// so the estimate delta stays quiet when nothing is wrong.
export const tone = styleVariants({
  error: { color: vars.status.error },
  warning: { color: vars.status.warning },
  ok: { color: vars.muted },
});

export const statusNote = style({
  fontFamily: vars.font.ui,
  fontSize: 11,
  fontWeight: 600,
  letterSpacing: "0.02em",
});

export const travelTitle = style({
  cursor: "default",
  display: "inline-flex",
  alignItems: "center",
  gap: 8,
});

export const titleIcon = style({
  color: vars.muted,
  flexShrink: 0,
});

export const mutedText = style({
  color: vars.muted,
});

export const estimateRow = style({
  display: "flex",
  alignItems: "center",
  gap: 6,
  fontSize: 12,
  color: vars.inkSoft,
  fontFamily: vars.font.ui,
  fontVariantNumeric: "tabular-nums",
});

export const estimateValue = style({
  fontWeight: 600,
});

const alertBoxBase = style({
  display: "flex",
  alignItems: "flex-start",
  gap: 10,
  padding: "10px 12px",
  borderRadius: radii["sm+2"],
});

export const alertBox = styleVariants({
  error: [
    alertBoxBase,
    {
      border: `${borderWidth.hairline}px solid ${vars.status.error}`,
      background: `color-mix(in srgb, ${vars.status.error} ${colorMixAlpha.subtleFill}%, transparent)`,
    },
  ],
  warning: [
    alertBoxBase,
    {
      border: `${borderWidth.hairline}px solid ${vars.status.warning}`,
      background: `color-mix(in srgb, ${vars.status.warning} ${colorMixAlpha.subtleFill}%, transparent)`,
    },
  ],
});

export const alertIcon = style({
  marginTop: 1,
  flexShrink: 0,
});

export const alertText = style({
  fontSize: 11.5,
  color: vars.ink,
  lineHeight: 1.45,
  fontFamily: vars.font.ui,
});

export const footerActions = style({
  display: "flex",
  flexDirection: "column",
  gap: 2,
  paddingTop: 8,
  borderTop: `${borderWidth.hairline}px solid ${vars.rule}`,
});
