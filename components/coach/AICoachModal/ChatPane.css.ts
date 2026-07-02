import { style, keyframes } from "@vanilla-extract/css";
import { vars, themeTransition, radii } from "@/lib/theme";

export const wrap = style({
  flex: 1,
  minHeight: 0,
  display: "flex",
  flexDirection: "column",
  gap: 12,
});

// Message list has no background of its own — it sits directly on the darker
// chat pane bg. Padding gives the messages room to breathe from the pane
// edges.
export const messageList = style({
  flex: 1,
  minHeight: 0,
  overflow: "auto",
  display: "flex",
  flexDirection: "column",
  gap: 12,
  padding: "6px 6px",
  transition: themeTransition,
});

export const empty = style({
  flex: 1,
  minHeight: 0,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: 24,
  color: vars.muted,
  fontFamily: vars.font.ui,
  fontSize: 12,
  textAlign: "center",
  lineHeight: 1.55,
});

const messageBase = style({
  display: "flex",
  flexDirection: "column",
  gap: 4,
  fontFamily: vars.font.ui,
  fontSize: 13,
  lineHeight: 1.6,
  color: vars.ink,
  transition: themeTransition,
});

// User: subtle accent-tinted bubble on the right. Feels like a Circadium
// message rather than a generic chat balloon by borrowing the accent hue.
export const messageUser = style([
  messageBase,
  {
    alignSelf: "flex-end",
    maxWidth: "82%",
    padding: "8px 14px",
    borderRadius: radii["lg+2"],
    background: `color-mix(in srgb, ${vars.accent.primary} 14%, ${vars.paper})`,
    border: `1px solid color-mix(in srgb, ${vars.accent.primary} 22%, transparent)`,
  },
]);

// Assistant: no bubble. Plain text on the darker chat surface — modern chat
// UX and stays out of the way of longer reasoning responses.
export const messageAssistant = style([
  messageBase,
  {
    alignSelf: "stretch",
    maxWidth: "100%",
    padding: "2px 6px",
  },
]);

export const messageRole = style({
  fontFamily: vars.font.ui,
  fontSize: 9.5,
  fontWeight: 700,
  letterSpacing: "0.14em",
  textTransform: "uppercase",
  color: vars.muted,
});

export const messageContent = style({
  whiteSpace: "pre-wrap",
  wordBreak: "break-word",
});

const dotPulse = keyframes({
  "0%, 80%, 100%": { opacity: 0.25 },
  "40%": { opacity: 1 },
});

export const streamingDots = style({
  display: "inline-flex",
  alignItems: "center",
  gap: 3,
  marginLeft: 6,
  verticalAlign: "middle",
});

export const streamingDot = style({
  width: 4,
  height: 4,
  borderRadius: radii.pill,
  background: vars.muted,
  animation: `${dotPulse} 1.4s ease-in-out infinite`,
  selectors: {
    "&:nth-child(2)": { animationDelay: "0.15s" },
    "&:nth-child(3)": { animationDelay: "0.3s" },
  },
});

// Composer sits on paper — a light card at the bottom of the darker chat
// pane. Focus ring uses accent to match the user bubble tint.
export const composer = style({
  flexShrink: 0,
  display: "flex",
  alignItems: "flex-end",
  gap: 8,
  padding: 8,
  borderRadius: radii["md+2"],
  border: `1px solid ${vars.rule}`,
  background: vars.paper,
  transition: themeTransition,
  selectors: {
    "&:focus-within": {
      borderColor: vars.accent.primary,
    },
  },
});

export const textarea = style({
  flex: 1,
  minHeight: 22,
  maxHeight: 160,
  resize: "none",
  border: "none",
  outline: "none",
  background: "transparent",
  padding: "4px 6px",
  fontFamily: vars.font.ui,
  fontSize: 13,
  lineHeight: 1.5,
  color: vars.ink,
  transition: themeTransition,
  selectors: {
    "&::placeholder": { color: vars.muted },
  },
});
