import { style, keyframes } from "@vanilla-extract/css";
import { vars, space, text, caption } from "@/lib/theme";

const tilt = keyframes({
  "0%": { transform: "rotate(0deg)" },
  "25%": { transform: "rotate(90deg)" },
  "60%": { transform: "rotate(90deg)" },
  "80%": { transform: "rotate(0deg)" },
  "100%": { transform: "rotate(0deg)" },
});

export const wrap = style({
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  gap: space["3"],
  flex: 1,
  padding: "60px 24px",
  textAlign: "center",
});

export const icon = style({
  color: vars.inkSoft,
  animation: `${tilt} 2.6s ease-in-out infinite`,
  "@media": {
    "(prefers-reduced-motion: reduce)": {
      animation: "none",
      transform: "rotate(90deg)",
    },
  },
});

export const title = style([
  text.bodyLg,
  {
    color: vars.ink,
    fontWeight: 550,
  },
]);

export const note = style([
  caption,
  {
    color: vars.muted,
    maxWidth: 280,
  },
]);
