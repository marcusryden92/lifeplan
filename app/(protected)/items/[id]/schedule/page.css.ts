import { style } from "@vanilla-extract/css";
import { vars, themeTransition } from "@/lib/theme";

const MOBILE = "screen and (max-width: 767px)";

export const root = style({
  paddingTop: 12,
  display: "flex",
  flexDirection: "column",
  gap: 28,
});

export const sectionLabel = style({
  fontFamily: vars.font.ui,
  fontSize: 11,
  fontWeight: 600,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  color: vars.muted,
  marginBottom: 14,
  transition: themeTransition,
});

export const dayGroup = style({
  marginBottom: 22,
  selectors: {
    "&:last-child": { marginBottom: 0 },
  },
});

export const dayHeader = style({
  display: "flex",
  alignItems: "baseline",
  gap: 10,
  marginBottom: 10,
});

export const dayHeaderDate = style({
  fontFamily: vars.font.display,
  fontSize: 16,
  fontWeight: 500,
  letterSpacing: "-0.02em",
  color: vars.ink,
  transition: themeTransition,
});

export const dayHeaderRelative = style({
  fontSize: 12,
  color: vars.inkSoft,
  fontFamily: vars.font.ui,
  fontWeight: 500,
  transition: themeTransition,
});

export const eventRow = style({
  display: "grid",
  gridTemplateColumns: "120px 1fr auto",
  gap: 16,
  padding: "10px 0",
  borderTop: `1px solid ${vars.rule}`,
  alignItems: "baseline",
  transition: themeTransition,
  "@media": {
    [MOBILE]: { gridTemplateColumns: "92px 1fr auto", gap: 10 },
  },
  selectors: {
    "&:last-child": { borderBottom: `1px solid ${vars.rule}` },
  },
});

export const eventTime = style({
  fontFamily: vars.font.ui,
  fontVariantNumeric: "tabular-nums",
  fontSize: 13.5,
  fontWeight: 600,
  color: vars.ink,
  transition: themeTransition,
});

export const eventTitle = style({
  fontFamily: vars.font.ui,
  fontSize: 13.5,
  color: vars.ink,
  fontWeight: 500,
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
  transition: themeTransition,
});

export const eventDuration = style({
  fontFamily: vars.font.ui,
  fontVariantNumeric: "tabular-nums",
  fontSize: 12.5,
  color: vars.inkSoft,
  transition: themeTransition,
});

export const emptyState = style({
  fontSize: 13,
  color: vars.inkSoft,
  fontFamily: vars.font.ui,
  padding: "12px 0",
  transition: themeTransition,
});

export const pastToggle = style({
  background: "transparent",
  border: `1px solid ${vars.rule}`,
  borderRadius: 999,
  padding: "6px 14px",
  fontFamily: vars.font.ui,
  fontSize: 12,
  fontWeight: 600,
  letterSpacing: "0.04em",
  textTransform: "uppercase",
  color: vars.muted,
  cursor: "pointer",
  alignSelf: "flex-start",
  transition: themeTransition,
  selectors: {
    "&:hover": { color: vars.ink, borderColor: vars.ink },
  },
});
