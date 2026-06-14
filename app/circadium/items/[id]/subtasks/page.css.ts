import { style, globalStyle } from "@vanilla-extract/css";

const MOBILE = "screen and (max-width: 767px)";

export const layout = style({
  display: "flex",
  flexDirection: "row",
  width: "100%",
  flex: 1,
  minHeight: 0,
  gap: 0,
  "@media": {
    [MOBILE]: { flexDirection: "column" },
  },
});

export const treePane = style({
  flex: 1,
  minWidth: 0,
  display: "flex",
  flexDirection: "column",
});

export const drawerSlot = style({
  width: 0,
  flexShrink: 0,
  overflow: "hidden",
  transition: "width 220ms ease",
});

export const drawerSlotOpen = style({
  width: 360,
});

export const card = style({
  display: "flex",
  flexDirection: "column",
  width: "100%",
  flex: 1,
  minHeight: 0,
});

export const legacyCardDisabled = style({
  opacity: 0.5,
  pointerEvents: "none",
});

export const cardBody = style({
  padding: "12px 0 16px",
});

// When the subtask list wrapper renders null (no subtasks), AddSubtask is the
// only child — pin it to the bottom so the empty space sits above it rather
// than below.
globalStyle(`${cardBody} > :only-child`, {
  marginTop: "auto",
});
