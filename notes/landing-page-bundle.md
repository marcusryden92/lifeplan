# Circadium — Landing Page Bundle

All the files needed to recreate the landing page at `/`, plus the Lumen design-system foundation it reads from. The vector field is stubbed (one-line placeholder) so the design tool sees the layout without the canvas internals.

Stack: Next.js 14 (App Router), React 18, vanilla-extract (CSS-in-TS, zero runtime). No Tailwind.

---

## File tree

```
app/
  page.tsx                     ← the landing page composition
  page.css.ts                  ← landing styles (sections, hero, cards, footer)
components/
  ui/
    Button.tsx                 ← Lumen Button (uses pillBtn recipe)
  landing/
    VectorField/
      index.tsx                ← STUB — solid color block (the real one is a 3D canvas animation; replace with `<div />` for design work)
lib/
  theme/
    index.ts                   ← barrel
    tokens.css.ts              ← theme variable contract
    themes.css.ts              ← light + dark theme values
    recipes.css.ts             ← pillBtn (Button), formInput, popover, glass, badge, progressTrack
    typography.css.ts          ← display + text scale
    effects.ts                 ← backdropFilters + colorMixAlpha
    transitions.ts             ← DURATIONS + composed transition strings
    fonts.ts                   ← Clash Display + Hubot Sans (next/font/local)
```

---

## `app/page.tsx`

```tsx
"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui";
import { themeLight } from "@/lib/theme";
import { VectorField } from "@/components/landing/VectorField";
import {
  page,
  aboveFold,
  hero,
  titleRow,
  wordmark,
  ctaCluster,
  featuresSection,
  sectionInner,
  sectionLead,
  sectionTitle,
  featureGrid,
  featureTile,
  featureGlyph,
  featureTitle,
  featureBody,
  demoSection,
  demoCard,
  ctaSection,
  ctaCard,
  ctaTitle,
  ctaBody,
  ctaActions,
  footer,
  footerLinks,
  footerLink,
} from "./page.css";

const FEATURES = [
  {
    glyph: "◎",
    title: "Engine, not a list",
    body: "Tell Circadium your goals, your deadlines, and where you'll be. It builds the week. You stop dragging tiles around a grid.",
  },
  {
    glyph: "↗",
    title: "Whole life, one plan",
    body: "Sleep, training, errands, family, deep work, commutes — every part of your life sits in the same calendar. Nothing pretends to coexist.",
  },
  {
    glyph: "✦",
    title: "Stays honest",
    body: "Things slip. Things move. The next plan accounts for what actually happened, not what you wrote down a week ago.",
  },
];

export default function Home() {
  const router = useRouter();
  const goLogin = () => router.push("/auth/login");
  const goRegister = () => router.push("/auth/register");

  return (
    <main className={`${themeLight} ${page}`}>
      <section className={aboveFold}>
        <section className={hero}>
          <VectorField />
        </section>
        <section className={titleRow}>
          <h1 className={wordmark}>Circadium</h1>
          <div className={ctaCluster}>
            <Button variant="outlined" size="lg" onClick={goLogin}>
              Sign in
            </Button>
            <Button variant="solid" size="lg" onClick={goRegister}>
              Get started
            </Button>
          </div>
        </section>
      </section>

      <section className={featuresSection}>
        <div className={sectionInner}>
          <p className={sectionLead}>What it is</p>
          <h2 className={sectionTitle}>
            A scheduling engine for the whole life — not just the workday.
          </h2>
          <div className={featureGrid}>
            {FEATURES.map((f) => (
              <article key={f.title} className={featureTile}>
                <span className={featureGlyph} aria-hidden>
                  {f.glyph}
                </span>
                <h3 className={featureTitle}>{f.title}</h3>
                <p className={featureBody}>{f.body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className={demoSection}>
        <div className={sectionInner}>
          <p className={sectionLead}>See a week</p>
          <h2 className={sectionTitle}>Drawn for you, in seconds.</h2>
          <div className={demoCard}>[ Calendar preview ]</div>
        </div>
      </section>

      <section className={ctaSection}>
        <div className={sectionInner}>
          <div className={ctaCard}>
            <h2 className={ctaTitle}>Build a week that holds.</h2>
            <p className={ctaBody}>
              Free while we build. Bring your goals, your places, your
              constraints — Circadium does the math.
            </p>
            <div className={ctaActions}>
              <Button variant="solidLight" size="lg" onClick={goRegister}>
                Get started
              </Button>
              <Button variant="glass" size="lg" onClick={goLogin}>
                Sign in
              </Button>
            </div>
          </div>
        </div>
      </section>

      <footer className={footer}>
        <span>© {new Date().getFullYear()} Circadium</span>
        <div className={footerLinks}>
          <Link href="#" className={footerLink}>
            Terms
          </Link>
          <Link href="#" className={footerLink}>
            Privacy
          </Link>
          <Link href="#" className={footerLink}>
            Contact
          </Link>
        </div>
      </footer>
    </main>
  );
}
```

---

## `app/page.css.ts`

```ts
import { style } from "@vanilla-extract/css";
import { vars } from "@/lib/theme";

const MOBILE = "screen and (max-width: 767px)";

// ---------- page chrome ----------
// Same 5/12px bezel padding pattern AppShell uses; page background is paper,
// locked to light via themeLight applied in page.tsx.
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

// ---------- above-the-fold container ----------
// Hero card (2/3) + title row (1/3) fill the first viewport. Sections beyond
// scroll naturally below.
export const aboveFold = style({
  height: "calc(100vh - 24px)",
  display: "flex",
  flexDirection: "column",
  gap: 5,
  "@media": {
    [MOBILE]: { height: "100vh", gap: 0 },
  },
});

export const hero = style({
  position: "relative",
  flex: 2,
  borderRadius: 30,
  overflow: "hidden",
  isolation: "isolate",
  background: vars.paper,
  "@media": {
    [MOBILE]: { borderRadius: 0 },
  },
});

// ---------- title row ----------
// Tightened horizontal padding so the wordmark sits close to the left edge,
// plus a bottom rule that ties wordmark + CTA cluster together.
export const titleRow = style({
  flex: 1,
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 24,
  padding: "0 clamp(12px, 1.6vw, 28px)",
  borderBottom: `1px solid ${vars.rule}`,
  "@media": {
    [MOBILE]: {
      flexDirection: "column",
      alignItems: "flex-start",
      justifyContent: "center",
      gap: 16,
      padding: "20px 24px",
    },
  },
});

export const wordmark = style({
  fontFamily: vars.font.display,
  fontSize: "clamp(56px, 11vw, 132px)",
  fontWeight: 400,
  letterSpacing: "-0.03em",
  lineHeight: 1,
  color: vars.ink,
  margin: 0,
  userSelect: "none",
});

export const ctaCluster = style({
  display: "flex",
  alignItems: "center",
  gap: 12,
  flexShrink: 0,
  "@media": {
    [MOBILE]: { width: "100%" },
  },
});

// ---------- sections (below the fold) ----------
const sectionBase = style({
  padding: "96px clamp(24px, 6vw, 96px)",
  "@media": {
    [MOBILE]: { padding: "56px 24px" },
  },
});

export const sectionInner = style({
  maxWidth: 1180,
  margin: "0 auto",
  width: "100%",
});

export const featuresSection = style([sectionBase, {}]);

export const sectionLead = style({
  fontFamily: vars.font.ui,
  fontSize: 11,
  fontWeight: 600,
  letterSpacing: "0.16em",
  textTransform: "uppercase",
  color: vars.muted,
  margin: 0,
  marginBottom: 14,
});

export const sectionTitle = style({
  fontFamily: vars.font.display,
  fontSize: "clamp(32px, 4.5vw, 56px)",
  fontWeight: 500,
  letterSpacing: "-0.02em",
  lineHeight: 1.05,
  color: vars.ink,
  margin: 0,
  marginBottom: 48,
  maxWidth: 760,
  "@media": {
    [MOBILE]: { marginBottom: 32 },
  },
});

export const featureGrid = style({
  display: "grid",
  gridTemplateColumns: "repeat(3, 1fr)",
  gap: 16,
  "@media": {
    [MOBILE]: { gridTemplateColumns: "1fr", gap: 12 },
  },
});

export const featureTile = style({
  position: "relative",
  padding: "28px 24px 26px",
  borderRadius: 18,
  background: vars.paper,
  border: `1px solid ${vars.rule}`,
  boxShadow:
    "0 1px 0 rgba(255,255,255,0.6) inset, 0 14px 36px rgba(22,20,42,0.05)",
  display: "flex",
  flexDirection: "column",
  gap: 10,
});

export const featureGlyph = style({
  fontFamily: vars.font.display,
  fontSize: 22,
  fontWeight: 500,
  color: vars.accent.primary,
  lineHeight: 1,
});

export const featureTitle = style({
  fontFamily: vars.font.display,
  fontSize: 20,
  fontWeight: 500,
  letterSpacing: "-0.015em",
  color: vars.ink,
  margin: 0,
});

export const featureBody = style({
  fontFamily: vars.font.ui,
  fontSize: 13.5,
  lineHeight: 1.5,
  color: vars.inkSoft,
  margin: 0,
});

// ---------- demo section ----------
export const demoSection = style([sectionBase, { paddingTop: 32 }]);

export const demoCard = style({
  position: "relative",
  borderRadius: 24,
  background: vars.paper,
  border: `1px solid ${vars.rule}`,
  boxShadow:
    "0 1px 0 rgba(255,255,255,0.6) inset, 0 24px 60px rgba(22,20,42,0.08)",
  padding: "64px 48px",
  textAlign: "center",
  color: vars.inkSoft,
  fontFamily: vars.font.ui,
  fontSize: 13,
  letterSpacing: "0.04em",
  textTransform: "uppercase",
  fontWeight: 600,
  minHeight: 340,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  "@media": {
    [MOBILE]: { padding: "48px 24px", minHeight: 240 },
  },
});

// ---------- final CTA — ink-tinted ----------
export const ctaSection = style({
  padding: "104px clamp(24px, 6vw, 96px) 112px",
  "@media": {
    [MOBILE]: { padding: "72px 24px 80px" },
  },
});

export const ctaCard = style({
  borderRadius: 30,
  background: vars.ink,
  color: vars.paper,
  padding: "72px clamp(32px, 5vw, 80px)",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  textAlign: "center",
  gap: 12,
  "@media": {
    [MOBILE]: { padding: "56px 24px", borderRadius: 22 },
  },
});

export const ctaTitle = style({
  fontFamily: vars.font.display,
  fontSize: "clamp(36px, 5.5vw, 64px)",
  fontWeight: 400,
  letterSpacing: "-0.025em",
  lineHeight: 1.04,
  margin: 0,
});

export const ctaBody = style({
  fontFamily: vars.font.ui,
  fontSize: 15,
  color: "rgba(242,239,234,0.78)",
  margin: 0,
  maxWidth: 520,
  lineHeight: 1.5,
});

export const ctaActions = style({
  display: "flex",
  gap: 10,
  marginTop: 12,
  flexWrap: "wrap",
  justifyContent: "center",
});

// ---------- footer ----------
export const footer = style({
  padding: "32px clamp(24px, 6vw, 96px) 40px",
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 16,
  borderTop: `1px solid ${vars.rule}`,
  color: vars.muted,
  fontSize: 12,
  fontFamily: vars.font.ui,
  "@media": {
    [MOBILE]: {
      flexDirection: "column",
      alignItems: "flex-start",
      padding: "24px 24px 32px",
    },
  },
});

export const footerLinks = style({
  display: "flex",
  gap: 18,
});

export const footerLink = style({
  color: vars.muted,
  textDecoration: "none",
  selectors: {
    "&:hover": { color: vars.ink },
  },
});
```

---

## `components/ui/Button.tsx`

```tsx
import { forwardRef, type ButtonHTMLAttributes } from "react";
import { pillBtn, type PillBtnVariants } from "@/lib/theme";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & PillBtnVariants;

export const Button = forwardRef<HTMLButtonElement, Props>(function Button(
  { variant, size, className, type = "button", ...rest },
  ref,
) {
  const cls = pillBtn({ variant, size });
  return (
    <button
      ref={ref}
      type={type}
      className={className ? `${cls} ${className}` : cls}
      {...rest}
    />
  );
});
```

---

## `components/landing/VectorField/index.tsx` (STUB)

The real implementation is a 3D canvas animation (~1000 lines). For design work, replace with this no-op so the page composition still types and renders:

```tsx
"use client";

export function VectorField() {
  return (
    <div
      aria-hidden
      style={{
        position: "absolute",
        inset: 0,
        background: "#0b0f41",
      }}
    />
  );
}
```

---

## `lib/theme/index.ts`

```ts
import "./global.css";

export {
  DURATIONS,
  themeTransition,
  buttonTransition,
  collapseTransition,
  progressTransition,
  interactiveTransition,
  interactive2Transition,
  TRANSITION_SPEED,
} from "./transitions";

export { vars } from "./tokens.css";
export type { ThemeVars } from "./tokens.css";
export { themeLight, themeDark } from "./themes.css";
export { backdropFilters, colorMixAlpha } from "./effects";
export type { BackdropFilterKey, ColorMixAlphaKey } from "./effects";
export {
  display,
  text,
  caption,
  statusTag,
} from "./typography.css";
export {
  glass,
  popover,
  pillBtn,
  badge,
  formInput,
  progressTrack,
} from "./recipes.css";
export type {
  GlassVariants,
  PopoverVariants,
  PillBtnVariants,
  BadgeVariants,
  FormInputVariants,
} from "./recipes.css";
```

---

## `lib/theme/tokens.css.ts`

```ts
import { createThemeContract } from "@vanilla-extract/css";

export const vars = createThemeContract({
  paper: null,
  bezel: null,
  ink: null,
  inkSoft: null,
  muted: null,
  rule: null,
  textOnAccent: null,
  overlay: null,
  tileFill: null,

  glass: {
    bg: null,
    bgDeep: null,
    bgSoft: null,
    stroke: null,
    hi: null,
  },

  shadow: {
    panel: null,
    panelSm: null,
  },

  noise: {
    opacity: null,
    blend: null,
  },

  accent: {
    primary: null,
    now: null,
    done: null,
    secondary: null,
  },

  status: {
    success: null,
    warning: null,
    error: null,
    info: null,
  },

  swatches: {
    blue: null,
    green: null,
    violet: null,
    indigo: null,
    cyan: null,
    amber: null,
    rose: null,
    teal: null,
  },

  font: {
    display: null,
    ui: null,
  },
});

export type ThemeVars = typeof vars;
```

---

## `lib/theme/themes.css.ts`

```ts
import { createTheme } from "@vanilla-extract/css";
import { vars } from "./tokens.css";

export const themeLight = createTheme(vars, {
  paper: "#f2efea",
  bezel: "#c8bfb6",
  ink: "#16142a",
  inkSoft: "#3c3a52",
  muted: "#7a7890",
  rule: "rgba(22,20,42,0.12)",
  textOnAccent: "#ffffff",
  overlay: "rgba(10,8,20,0.42)",
  tileFill: "#f2efea",

  glass: {
    bg: "rgba(255,255,255,0.28)",
    bgDeep: "rgba(255,255,255,0.40)",
    bgSoft: "rgba(255,255,255,0.16)",
    stroke: "rgba(22,20,42,0.14)",
    hi: "rgba(255,255,255,0.55)",
  },

  shadow: {
    panel:
      "0 14px 40px rgba(40,30,60,0.10), inset 0 1px 0 rgba(255,255,255,0.55)",
    panelSm:
      "0 6px 20px rgba(40,30,60,0.08), inset 0 1px 0 rgba(255,255,255,0.45)",
  },

  noise: {
    opacity: "0.18",
    blend: "overlay",
  },

  accent: {
    primary: "#3b82f6",
    now: "#6366f1",
    done: "#8b5cf6",
    secondary: "#6366f1",
  },

  status: {
    success: "#22c55e",
    warning: "#f59e0b",
    error: "#ef4444",
    info: "#3b82f6",
  },

  swatches: {
    blue: "#3b82f6",
    green: "#22c55e",
    violet: "#8b5cf6",
    indigo: "#6366f1",
    cyan: "#06b6d4",
    amber: "#f59e0b",
    rose: "#f43f5e",
    teal: "#14b8a6",
  },

  font: {
    display: "var(--app-font-display, 'Clash Display', sans-serif)",
    ui: "var(--app-font-ui, system-ui, sans-serif)",
  },
});

export const themeDark = createTheme(vars, {
  paper: "#12141a",
  bezel: "#06080b",
  ink: "#e6e8ec",
  inkSoft: "rgba(230,232,236,0.65)",
  muted: "rgba(230,232,236,0.42)",
  rule: "rgba(230,232,236,0.10)",
  textOnAccent: "#ffffff",
  overlay: "rgba(0,0,0,0.55)",
  tileFill: "#1c1f27",

  glass: {
    bg: "rgba(230,232,236,0.05)",
    bgDeep: "rgba(230,232,236,0.09)",
    bgSoft: "rgba(230,232,236,0.025)",
    stroke: "rgba(230,232,236,0.16)",
    hi: "rgba(230,232,236,0.20)",
  },

  shadow: {
    panel: "0 14px 40px rgba(0,0,0,0.45), inset 0 1px 0 rgba(230,232,236,0.14)",
    panelSm:
      "0 6px 20px rgba(0,0,0,0.40), inset 0 1px 0 rgba(230,232,236,0.12)",
  },

  noise: {
    opacity: "0.22",
    blend: "soft-light",
  },

  accent: {
    primary: "#60a5fa",
    now: "#818cf8",
    done: "#a78bfa",
    secondary: "#818cf8",
  },

  status: {
    success: "#34d399",
    warning: "#fbbf24",
    error: "#f87171",
    info: "#60a5fa",
  },

  swatches: {
    blue: "#60a5fa",
    green: "#34d399",
    violet: "#a78bfa",
    indigo: "#818cf8",
    cyan: "#22d3ee",
    amber: "#fbbf24",
    rose: "#fb7185",
    teal: "#2dd4bf",
  },

  font: {
    display: "var(--app-font-display, 'Clash Display', sans-serif)",
    ui: "var(--app-font-ui, system-ui, sans-serif)",
  },
});
```

---

## `lib/theme/recipes.css.ts`

```ts
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
      // True transparent glass — bg and border tint with currentColor so the
      // button adapts to light/dark without explicit branches. Hover overlays
      // a fixed-white wash so the brighten direction is theme-neutral.
      glass: {
        background: "color-mix(in srgb, currentColor 8%, transparent)",
        backdropFilter: backdropFilters.button,
        WebkitBackdropFilter: backdropFilters.button,
        border: "1px solid color-mix(in srgb, currentColor 18%, transparent)",
        color: vars.ink,
        selectors: {
          "&:hover:not(:disabled)": {
            boxShadow: "inset 0 0 0 999px rgba(255, 255, 255, 0.10)",
          },
        },
      },
      // Primary glass — more tint weight than `glass`, reads as the action.
      glassInk: {
        background: "color-mix(in srgb, currentColor 16%, transparent)",
        backdropFilter: backdropFilters.button,
        WebkitBackdropFilter: backdropFilters.button,
        border: "1px solid color-mix(in srgb, currentColor 32%, transparent)",
        color: vars.ink,
        fontWeight: 700,
        selectors: {
          "&:hover:not(:disabled)": {
            boxShadow: "inset 0 0 0 999px rgba(255, 255, 255, 0.12)",
          },
        },
      },
      // Opaque dark — pure ink bg. Use when full punch is needed.
      solid: {
        background: vars.ink,
        color: vars.paper,
      },
      // Opaque light — pure paper bg, ink text. For use on dark surfaces
      // where `solid` would blend in.
      solidLight: {
        background: vars.paper,
        color: vars.ink,
      },
      ghost: {
        background: "transparent",
        color: vars.inkSoft,
        selectors: {
          "&:hover": { color: vars.ink },
        },
      },
      // Outlined — transparent fill with an ink-colored border. Pairs with
      // `solid` as a secondary CTA on light surfaces.
      outlined: {
        background: "transparent",
        color: vars.ink,
        border: `1px solid ${vars.ink}`,
        selectors: {
          "&:hover:not(:disabled)": {
            background: vars.glass.bgSoft,
          },
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

// Shared form input recipe. Two intentional patterns:
//   underline — single-input "command bar" modals (the input IS the modal).
//   boxed — form-field modals where each input needs a clear container.
// Both share font family, focus color, and text color. Only the shape differs.
export const formInput = recipe({
  base: {
    fontFamily: vars.font.ui,
    color: vars.ink,
    outline: "none",
    width: "100%",
    transition: themeTransition,
    selectors: {
      "&::placeholder": { color: vars.muted },
    },
  },
  variants: {
    variant: {
      underline: {
        fontSize: 16,
        fontWeight: 500,
        padding: "10px 0",
        background: "transparent",
        border: "none",
        borderBottom: `1px solid ${vars.rule}`,
        selectors: {
          "&:focus": { borderBottomColor: vars.accent.primary },
        },
      },
      boxed: {
        fontSize: 13.5,
        fontWeight: 500,
        padding: "9px 12px",
        background: vars.glass.bgSoft,
        border: `1px solid ${vars.glass.stroke}`,
        borderRadius: 10,
        selectors: {
          "&:focus": { borderColor: vars.accent.primary },
        },
      },
    },
  },
  defaultVariants: { variant: "boxed" },
});

export type FormInputVariants = NonNullable<Parameters<typeof formInput>[0]>;

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
```

---

## `lib/theme/typography.css.ts`

```ts
import { style, styleVariants } from "@vanilla-extract/css";
import { vars } from "./tokens.css";

const baseDisplay = style({
  fontFamily: vars.font.display,
  fontWeight: 500,
  fontFeatureSettings: '"tnum" 1',
});

const baseUI = style({
  fontFamily: vars.font.ui,
});

export const display = styleVariants({
  hero: [baseDisplay, { fontSize: 56, letterSpacing: "-0.045em" }],
  bigStat: [baseDisplay, { fontSize: 44, letterSpacing: "-0.045em" }],
  pageTitle: [baseDisplay, { fontSize: 32, letterSpacing: "-0.03em" }],
  statCard: [baseDisplay, { fontSize: 26, letterSpacing: "-0.04em" }],
  sectionHead: [baseDisplay, { fontSize: 20, letterSpacing: "-0.02em" }],
  listTitle: [baseDisplay, { fontSize: 16, letterSpacing: "-0.02em" }],
});

export const text = styleVariants({
  body: [baseUI, { fontSize: 13, fontWeight: 500 }],
  bodyLg: [baseUI, { fontSize: 14, fontWeight: 500 }],
  bodySm: [baseUI, { fontSize: 12.5, fontWeight: 500 }],
});

export const caption = style([
  baseUI,
  {
    fontSize: 10.5,
    fontWeight: 700,
    textTransform: "uppercase",
    letterSpacing: "0.10em",
    color: vars.inkSoft,
    opacity: 0.85,
  },
]);

export const statusTag = style([
  baseUI,
  {
    fontSize: 9.5,
    fontWeight: 700,
    textTransform: "uppercase",
    letterSpacing: "0.06em",
  },
]);
```

---

## `lib/theme/effects.ts`

```ts
// Named backdrop-filter presets. Single source of truth for the frosted-glass
// blur+saturation pairs the rest of the app sets via inline strings.
//
// `WebkitBackdropFilter` should be set alongside `backdropFilter` to the same
// value — Safari ships the unprefixed property only behind a flag.
export const backdropFilters = {
  panel: "blur(28px) saturate(180%)",
  button: "blur(12px) saturate(140%)",
  event: "blur(12px) saturate(160%)",
  scrollbar: "blur(14px) saturate(160%)",
  palette: "blur(8px)",
  modal: "blur(4px)",
  confirm: "blur(2px)",
} as const;

export type BackdropFilterKey = keyof typeof backdropFilters;

// Named opacity percentages for `color-mix(in srgb, X N%, transparent)` calls.
// Names describe the visual role, not the numeric value, so tweaking a
// hierarchy step shifts every consumer at once.
export const colorMixAlpha = {
  subtleFill: 10, // soft category fills, alt-row hovers
  lightFill: 14, // badge backgrounds, gentle category tints, status accents
  hoverFill: 22, // drag/hover scrims, focused-emphasis fills
  selectedFill: 28, // selected/focused tile fills
  alertFill: 78, // travel-alert color saturation
  denseFill: 94, // event tile fills (near-opaque)
} as const;

export type ColorMixAlphaKey = keyof typeof colorMixAlpha;
```

---

## `lib/theme/transitions.ts`

```ts
// Single source of truth for transition durations (in seconds).
// Tweak any value here to retune that category of motion across the app.
export const DURATIONS = {
  // Light/dark color, border, shadow swaps.
  theme: 0.3,

  // Button hover/state changes.
  buttonState: 1,

  // :active press scale feedback on buttons.
  press: 0.12,

  // Quick hover/swap transitions inside popovers and pickers.
  interactive: 0.12,
  interactive2: 0.14,

  // Sidebar collapse, label fade, panel slide-in animations.
  collapse: 0.22,

  // Modal/dialog/sheet entrance.
  modal: 0.18,

  // Progress bar width fills.
  progress: 0.25,
} as const;

const themeProperties = [
  "background-color",
  "color",
  "border-color",
  "box-shadow",
  "fill",
  "stroke",
];

export const themeTransition = themeProperties
  .map((p) => `${p} ${DURATIONS.theme}s ease`)
  .join(", ");

export const buttonTransition = `transform ${DURATIONS.press}s ease, ${themeTransition}`;

export const collapseTransition = [
  `width ${DURATIONS.collapse}s ease`,
  `max-width ${DURATIONS.collapse}s ease`,
  `opacity ${DURATIONS.collapse}s ease`,
  `padding ${DURATIONS.collapse}s ease`,
  `gap ${DURATIONS.collapse}s ease`,
  `transform ${DURATIONS.collapse}s ease`,
  themeTransition,
].join(", ");

export const progressTransition = `width ${DURATIONS.progress}s ease`;

export const interactiveTransition = (...properties: string[]) =>
  properties.map((p) => `${p} ${DURATIONS.interactive}s ease`).join(", ");

export const interactive2Transition = (...properties: string[]) =>
  properties.map((p) => `${p} ${DURATIONS.interactive2}s ease`).join(", ");

export const TRANSITION_SPEED = DURATIONS.theme;
```

---

## `lib/theme/fonts.ts`

```ts
import localFont from "next/font/local";

export const fontDisplay = localFont({
  src: [
    { path: "../../public/fonts/clash-display/ClashDisplay-Extralight.otf", weight: "200", style: "normal" },
    { path: "../../public/fonts/clash-display/ClashDisplay-Light.otf",      weight: "300", style: "normal" },
    { path: "../../public/fonts/clash-display/ClashDisplay-Regular.otf",    weight: "400", style: "normal" },
    { path: "../../public/fonts/clash-display/ClashDisplay-Medium.otf",     weight: "500", style: "normal" },
    { path: "../../public/fonts/clash-display/ClashDisplay-Semibold.otf",   weight: "600", style: "normal" },
    { path: "../../public/fonts/clash-display/ClashDisplay-Bold.otf",       weight: "700", style: "normal" },
  ],
  variable: "--app-font-display",
  display: "swap",
  fallback: ["system-ui", "sans-serif"],
});

export const fontUI = localFont({
  src: [
    { path: "../../public/fonts/hubot-sans/HubotSans-Regular.ttf",  weight: "400", style: "normal" },
    { path: "../../public/fonts/hubot-sans/HubotSans-Medium.ttf",   weight: "500", style: "normal" },
    { path: "../../public/fonts/hubot-sans/HubotSans-SemiBold.ttf", weight: "600", style: "normal" },
    { path: "../../public/fonts/hubot-sans/HubotSans-Bold.ttf",     weight: "700", style: "normal" },
  ],
  variable: "--app-font-ui",
  display: "swap",
  fallback: ["system-ui", "sans-serif"],
});
```
