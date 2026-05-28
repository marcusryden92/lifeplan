# Circadium — Lumen Design System

**Lumen** is Circadium's high-fidelity production visual language: a frosted-glass ("liquid glass") aesthetic with editorial typography, a full light/dark theme pair, and per-area accent colors. It is defined in `lumen-base.css` (fonts, resets, canvas) and `lumen-theme.jsx` (tokens, primitives, shell, nav), and demonstrated on the Today, Calendar, and Goal-detail screens in `lumen-screens.jsx`.

> **Status:** Today, Calendar, and Item/Goal detail are converted to Lumen; remaining surfaces (Inbox, Items, Categories, Locations) are still low-fi wireframes rendered through a `LumenStub` placeholder until migrated. Lumen currently routes on the **v1 IA** (Today / Calendar / Inbox / Items / Categories / Locations).

---

## 1. Design principles

1. **Liquid glass.** Surfaces are translucent, blurred panels layered over a paper backdrop — depth comes from blur, light strokes, and soft shadows, not borders or fills.
2. **Editorial type.** A display serif-grade sans (Clash Display) for headlines and numbers, paired with a precise UI sans (Hubot Sans). Big, tight, confident headings; a "Vol./Iss./date" masthead motif gives it a periodical feel.
3. **Dual-theme native.** Every token has a light and dark value; the two themes are first-class, not an afterthought. Theme choice persists.
4. **Accent = life area.** Color is carried by the six life-area hues and a single conic-gradient "spark" used for AI / engine moments. Neutrals do the rest.
5. **Numbers are tabular.** Times, counts, and stats use `font-variant-numeric: tabular-nums` so figures align and don't jitter.

---

## 2. Theme tokens

Two complete token objects: `lumenLight` and `lumenDark` (`lumen-theme.jsx`). The active theme object is passed as `t` to every component. Persisted to `localStorage` (`lumen.dark`).

### Accent & brand
| Token | Light | Dark | Role |
|---|---|---|---|
| `accent` / `lavender` / `sky` / `info` | `#3b82f6` | `#60a5fa` | Primary accent (blue) |
| `peach` / `butter` / `coral` | `#6366f1` | `#818cf8` | Indigo — **`coral` is the active/NOW highlight** & focus tint |
| `mint` | `#8b5cf6` | `#a78bfa` | Violet — used for "done" check fills |

> Note: the palette is intentionally **cool/indigo-blue**; the token names (peach, coral, butter, mint) are historical labels, not literal colors.

### Status
| Token | Light | Dark |
|---|---|---|
| `success` | `#22c55e` | `#34d399` |
| `warning` | `#f59e0b` | `#fbbf24` |
| `error` | `#ef4444` | `#f87171` |
| `info` | `#3b82f6` | `#60a5fa` |

### Neutrals & surface
| Token | Light | Dark | Role |
|---|---|---|---|
| `paper` | `#fdfaf8` | `#12141a` | App canvas (inside bezel) |
| `bezel` | `#e4dad0` | `#06080b` | Outer device bezel |
| `ink` | `#16142a` | `#e6e8ec` | Primary text |
| `inkSoft` | `#3c3a52` | `rgba(230,232,236,0.65)` | Secondary text |
| `muted` | `#7a7890` | `rgba(230,232,236,0.42)` | Tertiary / captions |
| `rule` | `rgba(22,20,42,0.12)` | `rgba(230,232,236,0.10)` | Hairline dividers |

### Glass scale (the heart of the system)
| Token | Light | Dark | Role |
|---|---|---|---|
| `glassBg` | `rgba(255,255,255,0.42)` | `rgba(230,232,236,0.05)` | Standard panel fill |
| `glassBgDeep` | `rgba(255,255,255,0.58)` | `rgba(230,232,236,0.09)` | Deeper fill (buttons, emphasis) |
| `glassBgSoft` | `rgba(255,255,255,0.25)` | `rgba(230,232,236,0.025)` | Subtle fill (masthead, chips) |
| `glassStroke` | `rgba(255,255,255,0.72)` | `rgba(230,232,236,0.16)` | Panel border |
| `glassHi` | `rgba(255,255,255,0.85)` | `rgba(230,232,236,0.20)` | Inner top highlight (`inset 0 1px 0`) |

### Shadows & atmosphere
| Token | Light | Dark |
|---|---|---|
| `shadow` | `0 14px 40px rgba(40,30,60,0.10), inset 0 1px 0 rgba(255,255,255,0.85)` | `0 14px 40px rgba(0,0,0,0.45), inset 0 1px 0 rgba(230,232,236,0.14)` |
| `shadowSm` | `0 6px 20px rgba(40,30,60,0.08), inset …0.7` | `0 6px 20px rgba(0,0,0,0.40), inset …0.12` |
| `noiseOpacity` | `0.18` | `0.22` |
| `noiseBlend` | `overlay` | `soft-light` |
| `blobOpacity` | `0.55` | `0.48` |

### Life-area colors (`lumenArea(t)`)
Keyed by `career / health / home / growth / rel / finance`; brighter in dark mode.

| Area | Light | Dark |
|---|---|---|
| Career | `#3b82f6` | `#60a5fa` |
| Health | `#22c55e` | `#34d399` |
| Home | `#8b5cf6` | `#a78bfa` |
| Growth | `#6366f1` | `#818cf8` |
| Relationships (`rel`) | `#06b6d4` | `#22d3ee` |
| Finance | `#f59e0b` | `#fbbf24` |

Area color renders as: solid pill badges (white text), glowing 9px dots (`box-shadow: 0 0 8px {ac}88`), progress-bar gradients (`linear-gradient(90deg, {ac}, {ac}cc)`), and calendar event fills (templates use `{ac}33` tint + colored text).

---

## 3. Typography

Two families (`lumen-base.css` + constants `CD` / `HS` in theme). Body sets `font-feature-settings: 'cv11','ss01'`.

| Family | Const | Role |
|---|---|---|
| **Clash Display** | `CD` = `'Clash Display', sans-serif` | Display & numerals — page titles, greetings, big stats, section headers, calendar day numbers. Weight **500**, tight letter-spacing **-0.02 to -0.045em**. |
| **Hubot Sans** | `HS` = `'Hubot Sans', system-ui, sans-serif` | UI & body — buttons, list rows, captions, metadata. Weights 400–700. |

### Type scale (observed)
| Role | Family | Size / weight | Tracking |
|---|---|---|---|
| Hero greeting / detail title | CD | 56px / 500 | -0.045em |
| Big stat number (goal %) | CD | 44px / 500 | -0.045em |
| Page title (calendar range) | CD | 32px / 500 | -0.03em |
| Stat card value | CD | 26px / 500 | -0.04em |
| Section heading | CD | 17–22px / 500 | -0.02em |
| List item title | CD | 16px / 500 | -0.02em |
| Body / row text | HS | 12.5–14px / 500 | — |
| **Caption (`LCaption`)** | HS | 10.5px / 700, UPPERCASE | 0.10em |
| Status tag (LATE/OVERDUE/FAIL) | HS | 9.5–10px / 700 | 0.04–0.08em |

`LCaption` is the canonical small-label component: uppercase, letter-spaced, `inkSoft` at 0.85 opacity.

---

## 4. Core primitives (`lumen-theme.jsx`)

All registered to `window`; screens receive `t` (active theme) and call these.

### `makeGlass(t, deep)` — the glass recipe
Returns the style object every panel uses:
```js
{
  background: deep ? t.glassBgDeep : t.glassBg,
  backdropFilter: 'blur(28px) saturate(180%)',
  border: `1px solid ${t.glassStroke}`,
  boxShadow: t.shadow
}
```
Apply with a rounded radius (panels use **18–24px**; the bezel canvas uses **30px**).

### Buttons
- **`btnGlass(t)`** — frosted pill: `glassBgDeep`, `blur(12px) saturate(140%)`, glass stroke, `inset 0 1px 0 glassHi`, radius `999`, 12px/600. Secondary actions.
- **`btnSolid(t, small)`** — ink-filled pill: `background: t.ink`, `color: t.paper`, radius `999`; dark-mode glow shadow (`0 6px 20px {lavender}33`). Primary actions.

### Decoration & text
- **`LGrain({ t })`** — full-bleed SVG fractal-noise overlay; `opacity: noiseOpacity`, `mixBlendMode: noiseBlend`. Adds film grain to every screen.
- **`ConicDot({ t, size })`** — conic-gradient dot (`from 210deg, lavender → coral → mint → lavender`). The **AI / engine "spark"** marker.
- **`LCaption({ t, children })`** — uppercase caption (see §3).
- **`LMast({ t, children })`** — top masthead bar: `glassBgSoft` + `blur(20px)`, bottom `rule`. Holds the "Vol. 2026 · Iss. 148 · {date} … ⌘K capture · {user}" periodical strip.

---

## 5. Shell & navigation

### `LumenShell({ t, active, onNav, onToggleTheme, children })`
- Outer **bezel** (`t.bezel`, 10px padding) wrapping a **`.tc` canvas** (`t.paper`, **30px radius**, `overflow: hidden`, `isolation: isolate`).
- Renders `LGrain`, then a flex row of **`LNav`** + the screen's main column (children).
- Screens supply only their main column; the shell owns chrome, grain, and nav.

### `LNav({ t, active, onNav, onToggleTheme })`
- 208px frosted sidebar (`glassBg`, `blur(28px) saturate(180%)`, right `rule`).
- Wordmark "circadium" (Clash Display, 19px/500, -0.03em).
- Nav items (`LUMEN_NAV`): **Today ◐ · Calendar ▦ · Inbox ☰ · Items ✦ · Categories ◉ · Locations ⌖** — pill buttons; selected = `glassBgDeep` + glass stroke + `inset` highlight + `ink` text.
- **Theme toggle** pill (☾ / ☀) above the footer.
- Footer: gradient avatar (`linear-gradient(135deg, peach, lavender)`, glow in dark) + name + "Beta member" caption.
- `.noscroll` utility hides scrollbars while keeping scroll.

---

## 6. Component & pattern catalog

### Cards / panels
Every content block is a `makeGlass` panel with an 18–24px radius. Nested panels (e.g. Subtasks inside detail) use a header row (`borderBottom: 1px solid rule`) + body.

### Pills & badges
- **Area badge:** `padding: 3px 10px`, `borderRadius: 999`, `background: areaColor`, white text, 10.5px/700 uppercase, 0.06em tracking.
- **Type badge (GOAL/TASK):** same shape, `background: t.ink`, `color: t.paper`.
- **Glass chip (AI actions, filters):** `glassBgDeep` + glass stroke pill; AI chips prefixed with **✦**.

### Status semantics
- **NOW / current:** `coral` text + `{coral}1a–1f` tinted background + `{coral}55–66` border (Today row, calendar event).
- **LATE:** `warning`-colored 10px/700 tag. **OVERDUE:** `error`-colored tag.
- **Calendar warn event:** `2px solid coral` border.
- **Travel event:** transparent, `1px dashed glassStroke`, italic, `muted` text.
- **Template event:** `{areaColor}33` fill + colored text, 0.75 opacity.
- **Done subtask:** 16px box filled `mint` with white ✓; label `muted` + strikethrough.
- **Engine message tag:** pill colored by tone — fail→`error`, warn→`warning`, info→`success`; "See fixes →" glass button on actionable ones.

### Progress bars
6–8px track (`rgba(...,0.08)`), fill = area-color gradient, radius 999; goal bar overlays subtask **tick marks** (`width:1px`, `background: paper`, opacity 0.8).

### Masthead motif
`LMast` carries the editorial "Vol. / Iss. / date" strip on every primary screen, with `⌘K capture` and the user name right-aligned.

---

## 7. Layout & spacing

- **Two-pane screens:** CSS grid. Today & Goal `1.4fr 1fr`; Calendar `1fr 340px` (grid + engine console).
- **Calendar grid:** `56px repeat(7, 1fr)` columns; `44px` hour rows; events absolutely positioned by `(start-7)*hourHeight`; strict windows as faint `rgba(...,0.025)` bands; NOW line = 1.5px `coral` with a dot + time label.
- **Padding rhythm:** screen headers ~`20–30px 28–32px`; panels `14–24px`; gaps `8 / 10 / 14 / 16 / 18px`.
- **Radii:** chips/pills `999`; small cards `16px`; panels `18–22px`; hero panels `22–24px`; canvas `30px`.
- Use grid/flex `gap` for all sibling spacing.

---

## 8. Theming & state behavior

- **Theme:** `dark` boolean in `LumenApp` selects `lumenLight`/`lumenDark`; toggled via `onToggleTheme`; persisted to `localStorage('lumen.dark')`.
- **Routing:** `screen` key in `LumenApp` (`today/calendar/item/...`) selects the body; persisted to `localStorage('lumen.screen')`. `SCREEN_LABEL` maps key → nav label.
- **Converted screens:** `LumenToday`, `LumenCalendar`, `LumenGoal`. **Unconverted** routes render `LumenStub` (centered glass card explaining the surface is pending migration).
- Each screen body accepts `{ t, onNav }` and returns the main column only.

---

## 9. Iconography & imagery

- **Nav icons:** simple unicode glyphs (◐ ▦ ☰ ✦ ◉ ⌖) — no custom icon set.
- **AI / engine spark:** the conic-gradient `ConicDot` and **✦** glyph denote AI helpers, the engine, and proposed-action moments.
- **Texture:** the `LGrain` noise overlay is the only "imagery" baked in; real content imagery would sit inside glass panels.
- **Emoji** appear only as inline content accents (e.g. 📍 for places), not as a primary icon system.

---

## Appendix · Implementation quick-reference

```jsx
// A standard Lumen panel
const g = makeGlass(t);
<div style={{ ...g, borderRadius: 22, padding: '16px 20px' }}> … </div>

// Primary / secondary buttons
<button style={btnSolid(t)}>Open calendar →</button>
<button style={btnGlass(t)}>Full week →</button>

// Caption + area dot + AI spark
<LCaption t={t}>scheduler order · 6 items</LCaption>
<span style={{ width:9, height:9, borderRadius:999, background: area.health,
               boxShadow:`0 0 8px ${area.health}88` }} />
<ConicDot t={t} size={12} />
```

**Files:** `lumen-base.css` (fonts/reset/`.tc` canvas/`.noscroll`) · `lumen-theme.jsx` (tokens, primitives, shell, nav) · `lumen-data.jsx` (sample data) · `lumen-screens.jsx` (Today / Calendar / Goal / Stub) · `lumen-app.jsx` (router + theme state) · `Circadium (Lumen).html` (entry).
