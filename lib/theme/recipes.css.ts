import { recipe } from "@vanilla-extract/recipes";
import { vars } from "./tokens.css";
import { backdropFilters } from "./effects";
import { themeTransition, buttonTransition } from "./transitions";

export const glass = recipe({
  base: {
    backdropFilter: backdropFilters.panel,
    WebkitBackdropFilter: backdropFilters.panel,
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

// Canonical recipe for every floating surface in the app: small dropdowns,
// menus, mid-size popovers, and centered modals. Locks in the glass fill,
// blur, stroke, and transition so call sites can't drift; size variants
// bundle the radius + shadow pairing.
export const popover = recipe({
  base: {
    background: vars.glass.bgDeep,
    backdropFilter: backdropFilters.panel,
    WebkitBackdropFilter: backdropFilters.panel,
    border: `1px solid ${vars.glass.stroke}`,
    transition: themeTransition,
  },
  variants: {
    size: {
      sm: { borderRadius: 10, boxShadow: vars.shadow.panelSm },
      md: { borderRadius: 14, boxShadow: vars.shadow.panel },
      lg: { borderRadius: 18, boxShadow: vars.shadow.panel },
      xl: { borderRadius: 22, boxShadow: vars.shadow.panel },
    },
  },
  defaultVariants: {
    size: "md",
  },
});

export type PopoverVariants = NonNullable<Parameters<typeof popover>[0]>;

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
    transition: buttonTransition,
    selectors: {
      "&:active": { transform: "scale(0.98)" },
      "&:disabled": { opacity: 0.5, cursor: "not-allowed" },
    },
  },
  variants: {
    variant: {
      glass: {
        background: vars.glass.bgDeep,
        backdropFilter: backdropFilters.button,
        WebkitBackdropFilter: backdropFilters.button,
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
        color: vars.textOnAccent,
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
    fontWeight: 700,
    letterSpacing: "0.06em",
    textTransform: "uppercase",
    borderRadius: 999,
    border: "1px solid transparent",
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    whiteSpace: "nowrap",
    lineHeight: 1,
    transition: themeTransition,
  },
  variants: {
    tone: {
      type: { background: vars.ink, color: vars.paper },
      now: { background: vars.accent.now, color: vars.textOnAccent },
      done: { background: vars.accent.done, color: vars.textOnAccent },
      success: { background: vars.status.success, color: vars.textOnAccent },
      warning: { background: vars.status.warning, color: vars.ink },
      error: { background: vars.status.error, color: vars.textOnAccent },
      info: { background: vars.status.info, color: vars.textOnAccent },
      neutral: {
        background: vars.glass.bgSoft,
        border: `1px solid ${vars.rule}`,
        color: vars.inkSoft,
      },
    },
    size: {
      sm: { fontSize: 9, padding: "1.5px 7px", letterSpacing: "0.08em" },
      md: { fontSize: 10.5, padding: "3px 10px" },
    },
  },
  defaultVariants: {
    tone: "neutral",
    size: "md",
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
