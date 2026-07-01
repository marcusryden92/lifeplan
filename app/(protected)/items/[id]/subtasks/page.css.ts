import { style, globalStyle } from "@vanilla-extract/css";
import { DURATIONS, media } from "@/lib/theme";


export const layout = style({
  display: "flex",
  flexDirection: "row",
  width: "100%",
  flex: 1,
  minHeight: 0,
  gap: 0,
  "@media": {
    [media.mobile]: { flexDirection: "column" },
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
  transition: `width ${DURATIONS.collapse}s ease`,
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
// only child â€” pin it to the bottom so the empty space sits above it rather
// than below.
globalStyle(`${cardBody} > :only-child`, {
  marginTop: "auto",
});
