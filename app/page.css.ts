import { style } from "@vanilla-extract/css";
import { vars } from "@/lib/theme";

const MOBILE = "screen and (max-width: 767px)";

// Same chrome as AppShell: 5px bezel padding around a 30px-radius canvas.
// On mobile we drop the padding + radius so the field bleeds edge-to-edge.
export const page = style({
  minHeight: "100vh",
  width: "100vw",
  boxSizing: "border-box",
  background: vars.paper,
  padding: 12,
  display: "flex",
  flexDirection: "column",
  gap: 5,
  color: vars.ink,
  "@media": {
    [MOBILE]: { padding: 0, gap: 0 },
  },
});

// The vector-field card. ~2/3 of the viewport vertically, with the same 30px
// rounded chrome the AppShell canvas uses.
export const hero = style({
  position: "relative",
  height: "calc((100vh - 15px) * 2 / 3)",
  borderRadius: 30,
  overflow: "hidden",
  isolation: "isolate",
  background: vars.paper,
  "@media": {
    [MOBILE]: { borderRadius: 0 },
  },
});

// Floating sign-in inside the hero card (top-right, inset from the rounded edge).
export const signInWrap = style({
  position: "absolute",
  top: "clamp(16px, 2vw, 24px)",
  right: "clamp(16px, 2vw, 24px)",
  zIndex: 2,
});

// Title row beneath the hero. Takes the remaining ~1/3 of the viewport.
export const titleRow = style({
  flex: 1,
  display: "flex",
  flexDirection: "column",
  alignItems: "flex-start",
  justifyContent: "center",
  padding: "24px clamp(24px, 4vw, 56px)",
  textAlign: "left",
});

export const wordmark = style({
  fontFamily: vars.font.display,
  fontSize: "clamp(56px, 12vw, 140px)",
  fontWeight: 400,
  letterSpacing: "-0.03em",
  lineHeight: 1,
  color: vars.ink,
  margin: 0,
  userSelect: "none",
});
