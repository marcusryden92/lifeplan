import { globalStyle, style } from "@vanilla-extract/css";
import { vars } from "@/lib/theme";
import {
  agendaTime,
  agendaDur,
  agendaTitle,
  agendaMeta,
} from "../agendaRow.css";

export const uncompletedDaysLabel = style({
  color: vars.status.success,
});

export const uncompletedActions = style({
  display: "inline-flex",
  alignItems: "center",
  alignSelf: "center",
  gap: 6,
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
