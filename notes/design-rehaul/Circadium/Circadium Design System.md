# Circadium — Design System Documentation

This documents the **wireframe design system** that powers `Circadium Wireframes.html` — a deliberately **low-fidelity, hand-drawn ("sketchy")** kit used to explore IA, flows, and layout without committing to final visuals. It is defined in `sketchy.css` (tokens + utility classes) and `wireframes-shared.jsx` (React component primitives).

> **Fidelity note:** This is an *intentionally low-fi* system. Its job is to communicate structure and behavior while signaling "not final design," so reviewers comment on flow and content rather than pixels. A separate **hi-fi production direction ("Lumen")** also lives in the project — documented in the **Appendix** at the end.

---

## 1. Design principles

1. **Honestly unfinished.** The wobbly borders, hand fonts, and paper texture make it unmistakably a wireframe — nobody mistakes it for shipping UI.
2. **Structure over polish.** Spacing, hierarchy, and grouping are real; color and ornament are minimal.
3. **One accent, used sparingly.** Red-ink is reserved for emphasis, warnings, and annotations — never decoration.
4. **Monospace = metadata.** Anything in Special Elite is a tag, label, count, or system message — not body content.
5. **Per-area color is the only "real" color.** Life-area swatches are the single semantic color dimension; everything else is paper/ink/pencil.

---

## 2. Color tokens

All colors are CSS custom properties on `:root` (`sketchy.css`). Warm paper/ink neutrals + a single red accent + a yellow highlight.

### Neutrals (paper & ink)
| Token | Value | Role |
|---|---|---|
| `--paper` | `#f5f1e8` | Primary surface (warm off-white) |
| `--paper-2` | `#ede8db` | Secondary/recessed surface, fills |
| `--ink` | `#1c1a17` | Primary text, borders, filled buttons |
| `--ink-soft` | `#3a3833` | Secondary text |
| `--pencil` | `#6e6b64` | Muted text, captions |
| `--pencil-light` | `#a6a39b` | Dashed dividers, placeholder fills |
| `--pencil-faint` | `#d4d0c4` | Faint gridlines, hairlines |

### Accent & status
| Token | Value | Role |
|---|---|---|
| `--red-ink` | `#b73a2a` | Accent: warnings, annotations, emphasis, NOW line, danger actions |
| `--red-ink-faint` | `#e8c5bf` | Error/late backgrounds |
| `--highlight` | `#f0e25a` | Yellow highlight (selection, "save" affordance) |
| `--highlight-soft` | `#f6ecae` | Soft yellow — active/current row backgrounds |

### Life-area palette (semantic, pastel)
Applied as `Swatch` color, event fills, and category tints. Stable mapping across the product:

| Area | Hex |
|---|---|
| 🌅 Career | `#9bb8d6` (blue) |
| 🧘 Health | `#b6cfa7` (green) |
| 🏠 Home | `#d6b9a2` (tan) |
| ❤️ Relationships | `#d6a2b9` (rose) |
| 💰 Finance | `#d6cea2` (sand) |
| 🌱 Growth | `#a2c8d6` (sky) |
| (extra slots) | `#bba2d6` (violet), `#cccccc` (travel/neutral grey) |

**Usage rules:** text & structure use ink/pencil; backgrounds use paper/paper-2; red-ink only for warning/danger/emphasis; area colors only for area identity (swatches, event blocks, tints).

---

## 3. Typography

Four families, each with a fixed job. Loaded via Google Fonts in `sketchy.css`.

| Family | Class | Role |
|---|---|---|
| **Patrick Hand** | `.sk-hand` | **Body / default UI text** — labels, list rows, buttons. Base size 17px. |
| **Caveat** | `.sk-script` | **Display / headings** — big titles, greetings, numbers, logo. Bold (700) at large sizes. |
| **Special Elite** | `.sk-mono` / `.sk-mono-tag` | **Metadata / tags** — monospace; uppercase, letter-spaced, pencil-colored small labels. |
| **Kalam** | `.sk-loose` | Light handwriting (rarely used). |

### Type roles observed in the wireframe
- **Page/greeting display:** Caveat, ~36–48px, 700.
- **Section titles:** Caveat, ~22–30px, 700.
- **Body / rows:** Patrick Hand, 13–17px.
- **Metadata tag (`.sk-mono-tag`):** Special Elite, 9–11px, uppercase, `letter-spacing: 0.5px`, color `--pencil`.
- **Hand lettering accents** (icons, single letters in glyphs/nav): Caveat.

> **Minimum sizes:** body text never below ~13px in dense tables; tag text 9–11px is acceptable *only* for monospace metadata.

---

## 4. Shape & "wobble" language

The signature of the system: asymmetric, hand-drawn border-radii so nothing looks machine-perfect.

| Class | Radius | Use |
|---|---|---|
| `.wob` | `8px 12px 6px 10px / 10px 6px 12px 8px` | Default box / card |
| `.wob-sm` | `5px 7px 4px 6px / 6px 4px 7px 5px` | Small controls, nav items, chips |
| `.wob-lg` | `14px 18px 12px 16px / 16px 12px 18px 14px` | Large panels, palettes, floating bars |
| `.wob-pill` | `40px 38px 42px 36px / 18px 22px 18px 20px` | Pills, input fields, capture bars |

**Borders / strokes:**
- `.sk-stroke` — `2px solid --ink` (primary)
- `.sk-stroke-thin` — `1.5px solid --ink`
- `.sk-stroke-soft` — `1.5px solid --pencil`
- `.sk-stroke-faint` — `1.5px dashed --pencil-light` (dividers, "draft"/placeholder containers)

**Convention:** solid ink borders = real structure; **dashed** borders = placeholders, drafts, dividers, or empty/optional zones.

---

## 5. Texture & fill patterns

Subtle SVG/gradient fills that reinforce the paper feel and encode meaning.

| Class | Effect | Meaning |
|---|---|---|
| `.sk-page::before` | faint radial dots, 80–110px tiles | Paper grain on every surface |
| `.sk-hatch` | 45° lines @ `rgba(28,26,23,0.35)` | **Strict** state, busy/blocked time |
| `.sk-hatch-soft` | 45° lines @ `0.16` | Strict-area time windows on calendars (softer) |
| `.sk-dots` | dotted grid | Generic texture / scribble panel |
| `.sk-fade-b` | bottom gradient fade | "More content below" scroll hint |

---

## 6. Component primitives (`wireframes-shared.jsx`)

The shared React kit. All registered to `window` so screen files can use them globally.

### Containers
- **`Card`** — sketchy box (`sk-box wob`). Props: `filled` (paper-2 bg), `dark` (ink bg / paper text), `className`, `style`.
- **`Section`** — boxed group with a small monospace title label. Props: `title`, `tight` (less padding), `style`. Used for form/identity groupings.
- **`ScribblePanel`** — hatched placeholder box with a centered monospace label. Stand-in for imagery/charts ("product shot").

### Text & decoration
- **`SketchyUnderline`** — hand-drawn SVG underline (red-ink). Props: `width`, `color`, `strokeWidth`. Sits under display titles.
- **`SketchyArrow`** — curved hand arrow with arrowhead marker. Props: `length`, `angle`, `color`, `label`.
- **`Anno`** — red-ink handwritten annotation note (Caveat). Used in margins to explain intent. Props: `width`, `style`.
- **`Lines`** — fake "lorem" text lines (placeholder body). Props: `count`, `width`, `gap`. Last line shortened to 62%.

### Controls & atoms
- **`Badge`** — pill label (`sk-badge`). Variants via `kind`: `''` (default outline), `red`, `dark`, `dim` (pencil), `yel` (yellow). Holds swatches, counts, status.
- **`Glyph`** — small circular (or `square`) bordered glyph for avatars/icons/single letters.
- **`Swatch`** — sketchy filled square for life-area color. Prop: `color`.
- **`Check`** — hand-drawn checkbox; `on` renders a red Caveat ✓.
- **`Stat`** — labeled metric block (mono label + big Caveat value + pencil sub-line).

### Layout helpers
- **`FieldRow`** — two-column form row: 90px pencil label + flexible control area (wraps).
- **`AppTop`** — *legacy* top-nav chrome (logo + horizontal tabs + ⌘K + avatar). Superseded by the left-nav `Shell` (see §7), retained for reference.
- Utility classes: `.sk-row`, `.sk-col`, `.sk-grow` (flex helpers).

---

## 7. Navigation shells

Two shells exist; the **left-nav `Shell`** is the current standard.

### `Shell` / `LeftNav` (web — `v2-shell.jsx`)
- Collapsible left sidebar: **224px expanded** (icon + label + sub-caption) / **60px collapsed** (icons only).
- Items: Today, Capture, Library, Calendar, Life Areas, Places. Selected = ink fill + inverted text.
- Logo "circadium" (collapses to "c"); footer avatar + settings.
- `Shell` wraps `LeftNav` + a flex content column; takes `active`, `collapsed`, `contentStyle`.

### Mobile shell (`mobile-shell.jsx`)
- **`SketchPhone`** — 380×800 bezel with wobble radius, notch, status row, home indicator.
- **`MobileNav`** — bottom tab bar (Today / Library / **Capture** raised center / Calendar / More). Capture = ink circle, red-ink shadow.
- **`MobileScreen`** — body (scroll) + fixed bottom nav; `hideNav` for modal/full-screen views.
- **`MTop`** — mobile header: optional back chevron, Caveat title + mono sub, right slot.

---

## 8. Patterns & conventions

### Status & semantics
- **NOW** — red-ink label + `--highlight-soft` background + 2px ink border; on calendars a red dashed line with a timestamp pill.
- **Overdue / Late** — `red` Badge; `--red-ink-faint` banner background, `--red-ink` border.
- **Selected** — ink fill + inverted text (nav, type pickers, list selection) OR `--highlight-soft` / yellow tint (rows), OR red left-border (tree node, search result).
- **Strict** — hatched fill (`.sk-hatch-soft`) on time windows/calendar bands.
- **Travel** — dashed transparent event blocks, dimmed (~0.7 opacity).
- **Disabled** — `--pencil-light` text + "n/a" mono note (e.g. Subtasks tab on a task).

### Buttons (by emphasis)
- **Primary:** `sk-box wob-sm tight`, `background: --ink`, `color: --paper`.
- **Secondary:** `sk-box wob-sm tight` default (paper + ink border).
- **Danger:** ink/paper button with `color: --red-ink` + `borderColor: --red-ink`.
- **Save/confirm affordance:** may use `--highlight` (yellow) background.

### Cards & elevation
- Elevation is faked with **hard offset shadows** in ink or red-ink (e.g. `box-shadow: 6px 8px 0 var(--ink)`), not blurred shadows — keeps the hand-drawn feel. Floating/overlay surfaces (palette, bulk bar, popovers) use larger blurred shadows for separation.

### Tags & metadata
- Counts, ages ("2d", "14m"), timestamps, system stats, and field labels are always `.sk-mono-tag` (Special Elite, uppercase, pencil).

### Annotations
- Margin commentary uses `Anno` (red Caveat), often rotated ~1–2° (`transform: rotate(-1deg)`) and paired with `SketchyArrow` to point at things.

---

## 9. Spacing & layout

- **Base unit:** ~4px rhythm; common gaps 4 / 6 / 8 / 10 / 14 / 18 / 22px.
- **Section padding:** `Section`/box default `14–16px`; `tight` ~`12px`.
- **Page padding:** content areas ~`20–32px` (web), `10–16px` (mobile).
- **Multi-pane web layouts:** CSS grid with a fixed sidebar + fluid main, e.g. `grid-template-columns: 260px 1fr` (Library), `240px 1fr` (detail), `1fr 340px` (calendar + console), `1fr 480px` (slide-overs).
- **Always use flex/grid `gap`** for sibling spacing (rows, chips, toolbars) — not margins on inline elements.

---

## 10. Iconography & imagery

- **Icons:** emoji as area glyphs (🌅🧘🏠❤️💰🌱) + simple Caveat symbols for nav (◐ ✎ ☰ ▦ ✦ ◉). No custom SVG icon set at wireframe stage.
- **Imagery:** never hand-drawn; use `ScribblePanel` (hatched placeholder + mono label) where a real image/chart will go.
- **AI marker:** the **✦** sparkle denotes anything AI-driven (coach, helper, AI-suggested actions).

---

## Appendix · "Lumen" — hi-fi production direction

A parallel, **high-fidelity** visual system also lives in the project (`Circadium (Lumen).html`, `lumen-base.css`, `lumen-theme.jsx`). It represents the intended *production* look and is a completely different aesthetic from the wireframe kit. Summary for reference:

### Aesthetic
- **Glassmorphism** — frosted translucent panels (`backdrop-filter: blur(28px) saturate(180%)`), thin light strokes, layered soft shadows, SVG **grain** overlay, rounded 30px device bezel.
- **Light & dark themes** (`lumenLight` / `lumenDark`) with a full parallel token set.

### Typography
- **Clash Display** (`CD`) — display/headings (logo, large titles), weights 400–600, tight letter-spacing.
- **Hubot Sans** (`HS`) — UI/body, weights 400–700; OpenType features `cv11`, `ss01`.

### Color (token highlights)
- Light: `paper #fdfaf8`, `ink #16142a`, accent/indigo `#6366f1`, plus a glass scale (`glassBg`, `glassBgDeep`, `glassStroke`, `glassHi`).
- Dark: `paper #12141a`, `ink #e6e8ec`, accent `#818cf8`, bezel `#06080b`.
- Status: success `#22c55e`, warning `#f59e0b`, error `#ef4444`, info `#3b82f6`.
- **Life areas (Lumen):** career `#3b82f6`, health `#22c55e`, home `#8b5cf6`, growth `#6366f1`, relationships `#06b6d4`, finance `#f59e0b` (with brighter dark-mode variants).

### Primitives
- `makeGlass(t, deep)` — the frosted panel recipe; `btnGlass` / `btnSolid` — pill buttons; `ConicDot` — conic-gradient accent dot; `LCaption` — uppercase caption; `LGrain` — noise overlay; `LMast` — top masthead; `LNav` / `LumenShell` — frosted left-nav + bezel shell with theme toggle.
- Nav routes on keys: Today / Calendar / Inbox / Items / Categories / Locations.

> The Lumen system reflects the v1 IA (Inbox / Items / Categories / Locations), while the sketchy wireframes explore the **v2 IA** (Today / Library / Calendar / Life Areas + ambient Capture). If Lumen is taken forward as the visual language, its tokens/components would need to be re-mapped onto the v2 IA documented in the main outline.
