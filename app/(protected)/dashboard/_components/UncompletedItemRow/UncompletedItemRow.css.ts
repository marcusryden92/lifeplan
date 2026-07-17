import { globalStyle, style } from "@vanilla-extract/css";
import { space, vars, media } from "@/lib/theme";
import {
  agendaTime,
  agendaDur,
  agendaTitle,
  agendaMeta,
} from "../agendaRow.css";

export const uncompletedDaysLabel = style({
  color: vars.status.success,
});

// On mobile the two action buttons don't fit beside the time + title columns,
// so the row reflows to a second full-width band that holds the actions.
export const uncompletedRow = style({
  "@media": {
    [media.mobile]: {
      gridTemplateColumns: "72px 1fr",
      gridTemplateAreas: '"time content" "actions actions"',
      rowGap: space["2.5"],
    },
  },
});

globalStyle(`${uncompletedRow} > :nth-child(1)`, {
  "@media": {
    [media.mobile]: { gridArea: "time" },
  },
});

globalStyle(`${uncompletedRow} > :nth-child(2)`, {
  "@media": {
    [media.mobile]: { gridArea: "content" },
  },
});

export const uncompletedActions = style({
  display: "inline-flex",
  alignItems: "center",
  alignSelf: "center",
  gap: space["1.5"],
  "@media": {
    [media.mobile]: {
      gridArea: "actions",
      display: "flex",
      alignSelf: "stretch",
    },
  },
});

// Full-width, evenly split buttons on the mobile action band so they read as
// deliberate primary/secondary actions rather than crammed pills.
globalStyle(`${uncompletedActions} > button`, {
  "@media": {
    [media.mobile]: {
      flex: 1,
      justifyContent: "center",
    },
  },
});

// 500ms confirmation flash on the row before Complete/Postpone fires.
// Complete uses success (green), Postpone uses info (blue). Overrides the
// default themeTransition (300ms) with a snappy 80ms so the tint pops in
// crisply instead of fading; the hover selector mirrors the flash bg so it
// stays solid while the cursor is still over the row. No border override —
// row keeps its transparent base border.
const FLASH_TRANSITION = "background-color 80ms ease";

export const uncompletedRowFlashSuccess = style({
  background: `color-mix(in srgb, ${vars.status.success} 55%, transparent)`,
  transition: FLASH_TRANSITION,
  selectors: {
    "&:hover": {
      background: `color-mix(in srgb, ${vars.status.success} 55%, transparent)`,
    },
  },
});

export const uncompletedRowFlashInfo = style({
  background: `color-mix(in srgb, ${vars.status.info} 55%, transparent)`,
  transition: FLASH_TRANSITION,
  selectors: {
    "&:hover": {
      background: `color-mix(in srgb, ${vars.status.info} 55%, transparent)`,
    },
  },
});

// While the row is flashing, force the text content to white so the row
// reads cleanly in light mode (otherwise the muted/ink colors are black on
// a saturated tint). Buttons keep their own pillBtn styling — they sit
// inside the uncompletedActions wrapper which isn't in the selector list.
const FLASH_SELECTORS = [uncompletedRowFlashSuccess, uncompletedRowFlashInfo]
  .flatMap((cls) => [
    `.${cls} .${agendaTime}`,
    `.${cls} .${agendaDur}`,
    `.${cls} .${agendaTitle}`,
    `.${cls} .${agendaMeta}`,
    `.${cls} .${agendaMeta} *`,
    `.${cls} .${uncompletedDaysLabel}`,
    `.${cls} .${uncompletedActions} button`,
    `.${cls} .${uncompletedActions} button *`,
  ])
  .join(", ");

globalStyle(FLASH_SELECTORS, {
  color: vars.textOnAccent,
  transition: "color 80ms ease",
});
