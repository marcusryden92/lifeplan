import { recipe } from "@vanilla-extract/recipes";
import { vars } from "./tokens.css";
import { themeTransition } from "./global.css";

export const glass = recipe({
  base: {
    backdropFilter: "blur(28px) saturate(180%)",
    WebkitBackdropFilter: "blur(28px) saturate(180%)",
    border: `1px solid ${vars.glass.stroke}`,
    boxShadow: vars.shadow.panel,
    background: vars.glass.bg,
    transition: themeTransition,
  },
  variants: {
    fill: {
      regular: { background: vars.glass.bg },
      deep: { background: vars.glass.bgDeep },
      soft: { background: vars.glass.bgSoft },
    },
    radius: {
      sm: { borderRadius: 16 },
      md: { borderRadius: 18 },
      lg: { borderRadius: 22 },
      xl: { borderRadius: 24 },
      canvas: { borderRadius: 30 },
    },
    shadow: {
      panel: { boxShadow: vars.shadow.panel },
      panelSm: { boxShadow: vars.shadow.panelSm },
      none: { boxShadow: "none" },
    },
  },
  defaultVariants: {
    fill: "regular",
    radius: "lg",
    shadow: "panel",
  },
});

export type GlassVariants = NonNullable<Parameters<typeof glass>[0]>;

export const pillBtn = recipe({
  base: {
    fontFamily: vars.font.ui,
    fontWeight: 600,
    borderRadius: 999,
    cursor: "pointer",
    border: "1px solid transparent",
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    transition:
      "background-color .15s ease, color .15s ease, border-color .15s ease, box-shadow .15s ease, transform .12s ease, fill .15s ease, stroke .15s ease",
    selectors: {
      "&:active": { transform: "scale(0.98)" },
      "&:disabled": { opacity: 0.5, cursor: "not-allowed" },
    },
  },
  variants: {
    variant: {
      glass: {
        background: vars.glass.bgDeep,
        backdropFilter: "blur(12px) saturate(140%)",
        WebkitBackdropFilter: "blur(12px) saturate(140%)",
        border: `1px solid ${vars.glass.stroke}`,
        boxShadow: `inset 0 1px 0 ${vars.glass.hi}`,
        color: vars.ink,
      },
      solid: {
        background: vars.ink,
        color: vars.paper,
      },
      ghost: {
        background: "transparent",
        color: vars.inkSoft,
        selectors: {
          "&:hover": { color: vars.ink },
        },
      },
      danger: {
        background: vars.status.error,
        color: "#fff",
      },
    },
    size: {
      sm: { padding: "6px 14px", fontSize: 12 },
      md: { padding: "8px 16px", fontSize: 12.5 },
      lg: { padding: "10px 20px", fontSize: 14 },
    },
  },
  defaultVariants: {
    variant: "solid",
    size: "md",
  },
});

export type PillBtnVariants = NonNullable<Parameters<typeof pillBtn>[0]>;

export const badge = recipe({
  base: {
    fontFamily: vars.font.ui,
    fontSize: 10.5,
    fontWeight: 700,
    letterSpacing: "0.06em",
    textTransform: "uppercase",
    padding: "3px 10px",
    borderRadius: 999,
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    whiteSpace: "nowrap",
    transition: themeTransition,
  },
  variants: {
    tone: {
      type: { background: vars.ink, color: vars.paper },
      now: { background: vars.accent.now, color: "#fff" },
      done: { background: vars.accent.done, color: "#fff" },
      success: { background: vars.status.success, color: "#fff" },
      warning: { background: vars.status.warning, color: vars.ink },
      error: { background: vars.status.error, color: "#fff" },
      info: { background: vars.status.info, color: "#fff" },
      neutral: {
        background: vars.glass.bgSoft,
        border: `1px solid ${vars.rule}`,
        color: vars.inkSoft,
      },
    },
  },
  defaultVariants: {
    tone: "neutral",
  },
});

export type BadgeVariants = NonNullable<Parameters<typeof badge>[0]>;

export const progressTrack = recipe({
  base: {
    width: "100%",
    height: 6,
    background: vars.rule,
    borderRadius: 999,
    overflow: "hidden",
    position: "relative",
  },
  variants: {
    size: {
      sm: { height: 4 },
      md: { height: 6 },
      lg: { height: 8 },
    },
  },
  defaultVariants: { size: "md" },
});
