import { style } from "@vanilla-extract/css";
import { space, vars, themeTransition, media, radii } from "@/lib/theme";


export const root = style({
  paddingTop: space["3"],
  display: "flex",
  flexDirection: "column",
  gap: space["7"],
});

export const sectionLabel = style({
  fontFamily: vars.font.ui,
  fontSize: 11,
  fontWeight: 600,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  color: vars.muted,
  marginBottom: space["3.5"],
  transition: themeTransition,
});

export const dayGroup = style({
  marginBottom: space["6"],
  selectors: {
    "&:last-child": { marginBottom: 0 },
  },
});

export const dayHeader = style({
  display: "flex",
  alignItems: "baseline",
  gap: space["2.5"],
  marginBottom: space["2.5"],
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
  gap: space["4"],
  padding: "10px 0",
  borderTop: `1px solid ${vars.rule}`,
  alignItems: "baseline",
  transition: themeTransition,
  "@media": {
    [media.mobile]: { gridTemplateColumns: "92px 1fr auto", gap: space["2.5"] },
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
  borderRadius: radii.pill,
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
