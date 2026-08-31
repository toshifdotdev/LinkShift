# LinkShift Design System — "Route Office"

The design contract for the LinkShift frontend. Every page, primitive, and
interaction derives from this file. It evolves **Ink & Ember** — the ember
brand hue is unchanged; the system around it is disciplined.

## Concept

LinkShift is a routing office. Every link is a **route** with a code and an
aspect; the interface is the desk where routes are opened, watched, and
shifted. Three languages, applied structurally — never decoratively:

| Language | Voice | Carries |
|---|---|---|
| **Code** | JetBrains Mono | slugs, route chips, kickers, KPI values, counts, axes |
| **Lamp** | ringed dot + word | status aspects: active / expiring / inactive / verified / over-limit |
| **Rail** | 1px ember hairline | *current* (active nav), *live* (real-time), or *just changed* (sweep) |

Laws:

1. **Ember is the only fill color.** Status hues tint hairlines, lamps, and
   soft tonal backgrounds — they never fill buttons or large surfaces.
2. **Rails are scarce.** No state to express → no rail.
3. **Instruments, not posters.** Tabular mono numerals at instrument scale;
   Fraunces reserved for thesis lines. Never serif numerals.
4. **Status is lamp + word.** Color is never the only channel.

## Tokens

### Color — Carbon Office (dark, default)

```yaml
canvas:      "#141210"   # --background (Carbon)
surface:     "#1a1713"   # --surface (Char)
elevated:    "#201d18"
raised:      "#27231d"   # inputs, popovers
sunken:      "#0f0d0b"   # empty-state wells
overlay:     "#0c0a08"   # scrim
ink:         "#f1ece3"   # --foreground (Bone)
ink-2:       "#9c9284"   # --fg-secondary
ink-3:       "#8a8172"   # --fg-muted (raised to ~4.8:1 on canvas for AA)
line:        "#2a251f"   # --border
line-strong: "#3d372e"
line-subtle: "#201c17"
ember:       "#e8590c"   # --brand (unchanged)
ember-hover: "#f56d1e"
ember-ink:   "#f56d1e"   # ember as text on dark
lamp-signal: "#3fbf85"   # --success
lamp-amber:  "#e0a83c"   # --warning
lamp-rose:   "#e5484d"   # --destructive
lamp-info:   "#60a5fa"   # --info
```

### Color — Paper Office (light)

```yaml
canvas:      "#f7f6f4"   # Paper — near-neutral warm white, never cream
surface:     "#ffffff"   # Sheet
elevated:    "#f0efec"
sunken:      "#eeece8"
ink:         "#191613"
ink-2:       "#4c463d"
ink-3:       "#6e675c"
line:        "#e4e1db"
line-strong: "#d6d2c9"
ember:       "#c2410c"   # deepened to 5.2:1 on white (AA)
ember-hover: "#a33708"
ember-ink:   "#c2410c"   # ember as text on light
lamp-signal: "#047857"
lamp-amber:  "#b45309"
lamp-rose:   "#dc2626"
lamp-info:   "#2563eb"
```

Soft lamp tints for badge/banner backgrounds: `*-soft` tokens per theme
(`bg-success-soft`, `bg-warning-soft`, `bg-destructive-soft`, `bg-info-soft`).

Primary action plates (ember buttons) carry theme-appropriate ink: **carbon
ink (`#141210`) on ember in dark mode, white on the deepened ember in light
mode** — construction-sign language. Both pairings clear WCAG AA at label
size; white on dark ember measures only 3.6:1 and is never used for text.
Driven by the `--primary-foreground` token.

### Typography

```yaml
display: Fraunces      # brand voice — thesis lines, empty-state titles, italic emphasis. Never numerals.
ui:      Archivo       # human voice — labels, body, table cells (400/500/600/700)
code:    JetBrains Mono # machine voice — route codes, kickers, KPI values, tabular data
```

App scale:

| Role | Setting |
|---|---|
| Page thesis | Fraunces `clamp(1.4rem, 2vw, 1.75rem)`, semibold, tracking-tight |
| KPI value | JetBrains Mono tabular 24–28px |
| Row text | Archivo 13px |
| Secondary | Archivo 12px |
| Micro-label / kicker | JetBrains Mono 10px, uppercase, tracking 0.14em |

### Material

```yaml
radii:   { xs: 3px, sm: 4px, md: 6px, lg: 8px, xl: 12px, 2xl: 18px }
shadow:  shadow-lift  # the ONLY shadow utility; themed per mode
depth:   surface ladder (canvas → surface → elevated → raised) before any shadow
```

No glassmorphism, no gradient fills (1px gradient hairline rules excepted),
no shadows darker than `shadow-lift` in light mode.

### Motion

```yaml
easing:    cubic-bezier(0.22, 1, 0.36, 1)   # one curve everywhere
duration:  { quick: 120ms, standard: 240ms, settle: 400ms }
exits:     ~70% of enter duration
direction: success/creation travel left→right along rails; layout settles vertically
reduced:   every animation honors prefers-reduced-motion (snap to final state)
```

One orchestrated moment per view. Rails draw on state change; lamps pulse only
for genuinely live data; rows flash only when created.

## Signature primitives

| Primitive | Purpose | Status |
|---|---|---|
| `RouteStrip` | page header instrument: `NN · NAME` + context code + lamps + primary action | to build (replaces PageHeader) |
| `Lamp` | status aspect: ringed dot + word | to build (replaces pills/diamonds) |
| `CodeChip` | mono route code (`host/slug`) | to build |
| `Ledger` | column-defined table that reflows to cards below `md`, sticky header, `aria-sort`, density toggle | to build (replaces links grid + card stack) |
| `KpiCell` | mono tabular value + 10px mono label, digit-roll updates | to build |
| `Waybill` | plan card: plan code, renewal, usage lamps | to build (replaces PlanCard) |
| Tabs / Segmented / Select / Switch / Checkbox / Radio(RadioGrid) / Tooltip / Pagination / Banner | missing control layer — Base UI based | to build |
| `EmptyState` / `ErrorState` / skeleton templates | one consolidated treatment each | consolidate |

Existing keepers: Button spine/rule interaction, `FadeIn` / `Stagger` /
`Spine` / `FlashSweep` motion primitives, `ShortenDemo`, ghost numerals,
pricing matrix column tint, EditorialEmpty (as the consolidated base).

## State coverage requirement

Every interactive primitive ships **all** of: hover, focus-visible, active,
disabled, loading/aria-busy, and (where applicable) invalid. Disabled =
opacity ≤ 0.5 + `cursor-not-allowed` + semantic attribute. Focus ring =
2px `ring` token, offset 2px. Touch targets ≥ 44px below `lg`.

Every text/background pairing meets WCAG AA at its rendered size (4.5:1 for
body and labels, 3:1 for large text and non-text UI). Every animation honors
`prefers-reduced-motion` — app-wide via `MotionConfig reducedMotion="user"`,
with CSS keyframes gated behind `motion-safe:` or the reduced-motion block.

## Do / Don't

- **Do** lead rows with route codes; keep numbers in tabular mono; pair every
  status color with a word; test both themes independently.
- **Don't** use serif numerals, pill badges, native `<select>`, raw Tailwind
  palette names (`emerald-400` etc.), hardcoded hex outside this file,
  decorative stripes, or shadows in light mode darker than `shadow-lift`.

## Known debt this system pays down

Badges on raw palette names → lamp tokens · three segmented controls →
`Segmented` · native sort `<select>` → `Select` · three empty states →
one · copy-pasted skeletons → templates · Spinner/FlashSweep reduced-motion
holes · field `aria-describedby` wiring · error boundary `role="alert"` ·
missing tooltips on icon buttons · `aria-sort` on the ledger · logo hardcoded
hex (redesigned with the logo phase, out of scope here).
