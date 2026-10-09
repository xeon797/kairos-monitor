# DESIGN.md — Kairos Monitor UI, Wording & Style Guide

> Midnight-ink mission console — a near-black canvas where measurements glow in sky and teal, and one indigo pulse marks every action.

**Theme:** dark only (v1). **Typeface:** Satoshi. **Palette:** the team color scheme (5 colors) plus a small set of derived and added tokens, all listed in §2.

Goal: a calm, credible, mission-control feel that makes the **story** obvious in 90 seconds. Cautious language, no diagnosis, clear provenance.

Style structure adapted from a reference style guide (Impilo: dark canvas, pill geometry, tight display tracking, data-only accent colors). Its violet palette and Gilroy font are replaced with ours. Its marketing-site elements (hero, compliance badges, 92–124 px display type) are dropped or scaled to an app.

---

## 1. Principles
1. **Evidence before verdict.** Show numbers, baseline and window beside every label.
2. **Calm, not alarming.** No red, no sirens. Warm colors (amber, coral) mean "look closer", never "danger".
3. **Never imply clearance.** Teal means only "no sustained change found in the available data".
4. **Provenance visible.** Dashed-outline `Synthetic` badge on simulated data. Source labels on every chart.
5. **Color is meaning, never decoration.** Sky = data and links. Teal = within usual range. Indigo = actions and selection. Amber/coral = review states. Nothing else gets an accent.
6. **One idea per screen.** Today = what changed, Check = measure, Trends = how, Mission = so what.
7. **Mobile-first widths.** Design for 360 px, scale up to 1100 px max content width.

---

## 2. Visual tokens (`src/styles/tokens.css`)

### 2.1 Palette

**Given by the team (colorschemes.pdf):**

| Name | Hex | Token | Role |
|---|---|---|---|
| Deep Ink | `#171D1C` | `--color-ink` | Page canvas. Near-black with a green tint — never swap for pure black or neutral gray |
| Moon Lavender | `#EFE9F4` | `--color-lavender` | Primary text on dark; the inverted surface (About dialog, print) |
| Signal Sky | `#5FBFF9` | `--color-sky` | Data, chart strokes, links, focus ring, Synthetic badge |
| Kairos Teal | `#16BAC5` | `--color-teal` | "Within your usual range", baseline band, positive/stable markers |
| Pulse Indigo | `#5863F8` | `--color-indigo` | Filled primary buttons, active tab, selected state, ambient glow |

**Derived from the palette (tints of the same hues, so surfaces stay in the ink family):**

| Name | Hex | Token | Role |
|---|---|---|---|
| Ink 1 | `#1F2827` | `--surface-1` | Cards on canvas |
| Ink 2 | `#283332` | `--surface-2` | Raised panels, inputs, tab strip track |
| Hairline | `#3A3E3F` | `--border` | 1 px card edges, gridlines (= lavender at 16% over ink) |
| Muted text | `#B3B0B8` | `--text-muted` | Secondary text, axis labels (= lavender at 72%) |
| Faint text | `#8E8D93` | `--text-faint` | Captions on canvas or Ink 1 only (never on Ink 2) |
| Deep Indigo | `#3F49D1` | `--link-on-inverse` | Links and accents on the lavender surface only |

**Added outside the palette (needed for the review ladder — five cool colors cannot express "change noted" vs "review recommended"):**

| Name | Hex | Token | Role |
|---|---|---|---|
| Amber | `#F2C35B` | `--status-change` | "Change noted"; criterion-met markers; criterion lines on charts |
| Coral | `#FF9E5E` | `--status-review` | "Review recommended" |
| Mist Gray | `#9AA6A5` | `--status-insufficient` | "Insufficient data" — gray, never teal |

If the team wants the pure 5-color palette, drop the three added colors and distinguish states by icon, label, and fill pattern only (icons and labels already carry the meaning). Not recommended.

### 2.2 Verified contrast (WCAG)
| Pair | Ratio | Use |
|---|---|---|
| Lavender on Ink | 14.4 | body text |
| Lavender on Ink 1 / Ink 2 | 12.7 / 11.0 | body text on cards |
| Muted on Ink 1 / Ink 2 | 7.1 / 6.1 | secondary text |
| Faint on Ink 1 | 4.6 | captions only |
| Sky on Ink / Ink 1 / Ink 2 | 8.4 / 7.4 / 6.4 | links, data text |
| Teal on Ink 1 / Ink 2 | 6.4 / 5.5 | status text |
| Amber / Coral / Mist Gray on Ink 1 | 9.2 / 7.4 / 6.0 | status text |
| **White on Indigo** | **4.6** | **button text (pure `#FFFFFF` only)** |
| Lavender on Indigo | 3.9 | ❌ do not use for text |
| Indigo on Ink / Ink 1 | 3.7 / 3.3 | graphics, fills, borders only — **never text** |
| Ink on Lavender | 14.4 | text on the inverted surface |
| Deep Indigo on Lavender | 5.7 | links on the inverted surface |

### 2.3 Status mapping (never color alone)
| Status | Label | Icon | Color token |
|---|---|---|---|
| INSUFFICIENT_DATA | Insufficient data | ○ dashed circle | `--status-insufficient` |
| WITHIN_USUAL | Within your usual range | ✓ check | `--status-usual` (teal) |
| CHANGE_NOTED | Change noted | ◐ half circle | `--status-change` (amber) |
| REVIEW_RECOMMENDED | Review recommended | ⚑ flag | `--status-review` (coral) |
| Task: NO_RELEVANT_CHANGE | No relevant change found | ✓ check | `--status-usual` |

### 2.4 Typography — Satoshi (sole typeface)
- **Family:** Satoshi (Fontshare). Geometric, friendly, readable at small sizes. No second typeface anywhere, including numbers.
- **Weights:** 400 body · 500 UI (buttons, labels, tabs, chips) · 700 headings and big metrics. If you download the Variable font, still use only these three values.
- **Self-host (required for offline use):** download Satoshi from fontshare.com, check the license terms, put the `.woff2` files in `public/fonts/`, and declare them in `src/styles/fonts.css`:
  ```css
  @font-face { font-family: "Satoshi"; src: url("/fonts/Satoshi-Regular.woff2") format("woff2"); font-weight: 400; font-style: normal; font-display: swap; }
  @font-face { font-family: "Satoshi"; src: url("/fonts/Satoshi-Medium.woff2") format("woff2"); font-weight: 500; font-style: normal; font-display: swap; }
  @font-face { font-family: "Satoshi"; src: url("/fonts/Satoshi-Bold.woff2") format("woff2"); font-weight: 700; font-style: normal; font-display: swap; }
  ```
  (If you use the variable file instead, declare one `@font-face` with `font-weight: 300 900`.) Adjust file names to match your download. The PWA task must precache `/fonts/*`.
- **Fallback stack:** `ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif`. The app must stay usable if the font files are missing.
- **Numbers:** `font-variant-numeric: tabular-nums` on all metrics, tables and chart labels.

| Role | Size / line height | Weight | Tracking | Token |
|---|---|---|---|---|
| caption | 12 / 1.44 | 500 | +0.02em | `--text-caption` |
| body-sm | 14 / 1.44 | 400–500 | +0.02em | `--text-body-sm` |
| body | 16 / 1.5 | 400 | 0 | `--text-body` |
| subheading | 18 / 1.44 | 500 | -0.02em | `--text-subheading` |
| heading-sm | 24 / 1.3 | 700 | -0.03em | `--text-heading-sm` |
| heading | 32 / 1.1 | 700 | -0.04em | `--text-heading` |
| metric | 48 / 1.0 (64 on ≥ 900 px) | 700 | -0.05em | `--text-metric` |

Rhythm: tight negative tracking grows with size so headings and metrics feel engineered; the smallest sizes get slight positive tracking for legibility. The status label and the "Day N" value are the only text above 32 px.

### 2.5 Shapes, spacing, layout
- **Base unit:** 4 px. **Spacing scale:** 4, 8, 12, 16, 20, 24, 32, 40, 48, 64.
- **Radius:** buttons, tabs, chips, badges `9999px` · cards `24px` · elevated cards and dialogs `32px` · inputs `16px` · icon containers `8px`. **Nothing under 8 px.**
- **Layout:** max content width 1100 px · section gap 32 px mobile / 48 px desktop · card padding 20 px mobile / 24 px desktop · element gap 8 px.

### 2.6 Elevation
- Cards: **no shadow**. Depth = lighter ink fill + 1 px `--border` hairline.
- Primary button: `0 0 20px rgba(88, 99, 248, 0.4)` — ambient indigo glow, never a neutral drop shadow.
- Dialog: Ink scrim at 70% opacity, dialog itself on the lavender inverted surface.

### 2.7 `tokens.css` (copy as-is into `src/styles/tokens.css`)
```css
:root {
  /* Team palette */
  --color-ink: #171D1C;
  --color-lavender: #EFE9F4;
  --color-sky: #5FBFF9;
  --color-teal: #16BAC5;
  --color-indigo: #5863F8;

  /* Surfaces */
  --surface-0: var(--color-ink);
  --surface-1: #1F2827;
  --surface-2: #283332;
  --surface-metric: color-mix(in srgb, var(--color-indigo) 16%, var(--surface-1));
  --surface-inverse: var(--color-lavender);

  /* Lines and text */
  --border: #3A3E3F;
  --border-accent: color-mix(in srgb, var(--color-sky) 35%, var(--surface-1));
  --text: var(--color-lavender);
  --text-muted: #B3B0B8;
  --text-faint: #8E8D93;
  --text-on-inverse: var(--color-ink);
  --link: var(--color-sky);
  --link-on-inverse: #3F49D1;
  --focus-ring: 2px solid var(--color-sky);

  /* Actions */
  --action: var(--color-indigo);
  --action-text: #FFFFFF;
  --action-glow: 0 0 20px rgba(88, 99, 248, 0.4);

  /* Status */
  --status-usual: var(--color-teal);
  --status-change: #F2C35B;
  --status-review: #FF9E5E;
  --status-insufficient: #9AA6A5;
  --synthetic: var(--color-sky);

  /* Chart series */
  --chart-series-1: var(--color-sky);
  --chart-series-2: var(--color-lavender);
  --chart-baseline: var(--text-muted);
  --chart-criterion: var(--status-change);
  --chart-baseline-band: color-mix(in srgb, var(--color-teal) 12%, transparent);
  --chart-grid: var(--border);

  /* Typography */
  --font-sans: "Satoshi", ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
  --weight-regular: 400;
  --weight-medium: 500;
  --weight-bold: 700;
  --text-caption: 12px;  --leading-caption: 1.44;  --tracking-caption: 0.02em;
  --text-body-sm: 14px;  --leading-body-sm: 1.44;  --tracking-body-sm: 0.02em;
  --text-body: 16px;     --leading-body: 1.5;      --tracking-body: 0;
  --text-subheading: 18px; --leading-subheading: 1.44; --tracking-subheading: -0.02em;
  --text-heading-sm: 24px; --leading-heading-sm: 1.3;  --tracking-heading-sm: -0.03em;
  --text-heading: 32px;    --leading-heading: 1.1;     --tracking-heading: -0.04em;
  --text-metric: 48px;     --leading-metric: 1;        --tracking-metric: -0.05em;

  /* Spacing */
  --space-1: 4px;  --space-2: 8px;  --space-3: 12px; --space-4: 16px; --space-5: 20px;
  --space-6: 24px; --space-8: 32px; --space-10: 40px; --space-12: 48px; --space-16: 64px;

  /* Radius */
  --radius-pill: 9999px;
  --radius-card: 24px;
  --radius-card-elevated: 32px;
  --radius-input: 16px;
  --radius-icon: 8px;

  /* Layout */
  --page-max: 1100px;
  --card-padding: 20px;
  --element-gap: 8px;
}
@media (min-width: 900px) {
  :root { --text-metric: 64px; --card-padding: 24px; }
}
html { background: var(--surface-0); color: var(--text); font-family: var(--font-sans); font-size: var(--text-body); line-height: var(--leading-body); font-variant-numeric: tabular-nums; }
```

---

## 3. Layout
- App shell: top bar (80 px desktop / 64 px mobile) with the **Kairos Monitor** wordmark + orbit mark on the left, "Mission day 12 / 17" in the center-right, and an "About" ghost pill. Bottom tab bar on mobile / top tabs on desktop with four tabs: **Today, Check, Trends, Mission**.
- Content: single column on mobile; two columns (2:1) on ≥ 900 px.
- Persistent footer strip on every screen: `Synthetic mission telemetry · Not a medical or flight-clearance tool`.
- Canvas is always Deep Ink, edge to edge. The only light surface in the app is the About dialog (hard cut, no gradient).

---

## 4. Screens

### 4.1 Today
Top to bottom:
1. **Status card** (highlighted metric style, `--surface-metric`, 32 px radius): status icon + label in the status color at heading size; one-line summary in muted text ("Sleep, reaction and attention have changed on 3 of the last 5 days"); a large **Day 12** metric (48/64 px, weight 700, sky) with a caption "of 17".
2. **Evidence list** — three rows (Sleep, Reaction, Attention). Each row: domain name, latest value vs baseline (`5.4 h vs 7.2 h usual`), delta, "met on 4 of last 5 days", status icon + text (Sustained / Not sustained / Insufficient data) and a `ProvenanceTag`.
3. **Next task card**: nearest upcoming task (EVA-07, in 2 days), its concern chip, one-sentence explanation, buttons **Repeat check** (ghost pill, goes to Check) and **Log schedule change** (indigo pill, enabled from day 12).
4. **Explanation box**: text + tag (`Template explanation` or `AI-rephrased from the same evidence`) and a small ghost-pill toggle `Show template version`. Template text shows first and is replaced by the AI text when it arrives; reserve the box height so nothing jumps.
5. **Data availability strip**: `Sleep 5/5 days · Checks 5/5 days · Baseline: days 1–7`.
6. **Simulation panel** (collapsible, open by default): Advance day (indigo pill), Back, Jump to day, Reset (ghost pills). Dashed sky `Synthetic` badge on the panel title.

### 4.2 Check
- Two large cards: **Reaction check (≈45 s)** and **Attention check (≈50 s)**, each with a thin-stroke icon in an 8 px container.
- Test screen is full-viewport on Deep Ink, minimal, one large target. Target circle: neutral Ink 2 while waiting, **sky** when "go". No-go stimulus in the attention test is a **lavender square** (shape, not color, distinguishes it). Big "Tap or press Space" hint in muted text. Progress dots at the bottom. Cancel ghost pill top-left.
- Result screen: metrics table (median RT, lapses, false starts / commission errors, omissions), quality chip (Good / Poor with reason), and the comparison note:
  - fewer than 3 live checks: "Live results are shown as raw values. Compare after 3 checks."
  - 3+ live checks: comparison against the live personal baseline.
- History list (latest 10): timestamp, test type, headline metric, quality, `Live browser test` label.
- Persistent note: "A short browser test is not NASA Cognition and is not a validated flight assessment. Device latency, practice effects and interruptions affect results."
- Note: "Browser test results cannot be compared with the synthetic mission data."

### 4.3 Trends
- Three stacked Recharts charts in `--surface-1` cards, sharing the x-axis (mission day 1–17, only up to the current day plotted):
  1. Sleep hours (sky line) + dashed baseline + dotted amber criterion line at 6.21 h
  2. Median reaction time (sky line) + baseline + criterion line at 286.2 ms
  3. Lapses (sky line, round markers) and commission errors (lavender line, square markers) + criterion lines at 3.0 and 3.29
- Shaded vertical band for the baseline window (days 1–7) in 12% teal, labeled "Baseline (frozen)".
- Dot markers where the criterion is met: larger, amber fill with a lavender ring (shape and size, not only color).
- Gridlines in `--border`, axis labels 12 px lavender-muted with units.
- Under each chart: "Criterion met on N of last 5 days → Sustained / Not sustained".
- Domain tab strip above the charts is optional on mobile: pill tabs, active = indigo fill + white text, inactive = transparent + muted text.
- Small muted card: "HRV — supporting context only. Not available in this prototype."

### 4.4 Mission
- List of tasks as cards sorted by scheduled day: name, id, "in N days", demand chip (High / Medium / Low), concern chip, relevant domains with sustained marks, review prompt.
- Tapping EVA-07 and INV-03 on day 12 shows **clearly different** explanations (the demo's key moment).
- Response log at the bottom: entries with day and note; **Log schedule change** button.
- After a response is logged and measures improve, the chip "Measures moving toward baseline" appears (teal outline) with the non-causation line.

---

## 5. Wording rules

### 5.1 Status labels (exact strings)
See the table in §2.3. These strings are constants in `templates.ts`.

### 5.2 Template explanation patterns
- **Review (high demand)**: "Over the last {metDays}–{windowDays} days, {domainList} moved away from {name}'s own baseline. {taskName} is a high-demand task, so these changes are relevant. Review recent sleep and repeat the check before {taskId}."
- **Change noted (high demand, 1 domain)**: "{domain} has moved away from baseline on {metDays} of the last {windowDays} days. Consider a closer look before {taskId}."
- **Low demand cap**: "{domainList} changed from baseline. {taskName} is a lower-demand task, so this is noted for routine monitoring. No task-specific review is prompted."
- **Within usual**: "No sustained change from baseline was found in the available data. This does not clear anyone for any task."
- **Insufficient**: "There is not enough valid data to evaluate {domainList}. Complete a check or record sleep to continue."
- **Recovery**: "Measures are moving toward baseline since {logDay}. This comparison does not show that the adjustment caused the change."

### 5.3 Banned words (case-insensitive) — never appear in any UI string, template, or LLM output
`cleared`, `clearance`, `fit for duty`, `unfit`, `safe`, `unsafe`, `diagnos*`, `impaired`, `fatigued`, `disorder`, `prescribe`, `treat`, `medicate`, `dangerous`, `risk of accident`, `predict`.
(Exception: the footer disclaimer may contain "clearance" in the phrase "Not a medical or flight-clearance tool". Keep that exact string in a single constant and exclude it from the test.)

### 5.4 Tone
Second/third person neutral ("Alex's sleep…"), short sentences, numbers with units (`5.4 h`, `312 ms`), no exclamation marks, no emoji in body text.

---

## 6. Components

All components take data via props from the engine's `EvidencePacket`; no component computes thresholds.

| Component | Spec |
|---|---|
| **Primary pill button** | Fill `--action` (indigo), text `#FFFFFF` Satoshi 500 16 px, radius 9999 px, padding 14 × 24 px, `--action-glow`. Hover: lighten fill 6%. Disabled: Ink 2 fill, faint text, no glow. Min height 44 px |
| **Ghost pill button** | Transparent, 1 px border lavender at 40%, lavender text, radius 9999 px, same size. Used for Back, Reset, Repeat check, About |
| **Inverted pill button** | Only inside the About dialog: Ink fill, lavender text, radius 9999 px |
| **Card** | `--surface-1`, radius 24 px, 1 px `--border`, padding `--card-padding`, no shadow |
| **Highlighted metric card (StatusCard)** | `--surface-metric`, radius 32 px, 1 px `--border-accent`; big value in sky weight 700; small label in muted 12–14 px |
| **EvidenceRow** | Row inside a card; 8 px icon container in Ink 2; domain name 500; values in tabular numerals; status chip right-aligned |
| **ConcernChip / StatusChip** | Pill, 1 px outline in the status color, transparent fill, icon + label in the status color, 12–14 px weight 500 |
| **DemandChip** | Pill, Ink 2 fill, muted text ("High demand") |
| **SyntheticBadge** | Pill with **1 px dashed sky outline**, sky text "Synthetic". This is the signature dashed-outline device (replaces the reference's word-highlight box); use it for synthetic provenance only |
| **QualityChip** | Pill: Good = teal outline + ✓; Poor = amber outline + ◐ with reason |
| **ProvenanceTag** | Small muted caption "Synthetic · good quality" / "Live browser test · good quality" |
| **Tab bar / tab strip** | Pill tabs on an Ink 2 track; active = indigo fill + white text; inactive = transparent + muted text; each tab pairs a thin-stroke icon with a 14 px weight 500 label |
| **TrendChart** | Recharts inside a Card, transparent chart background, strokes per §4.3, gridlines `--chart-grid`, axis labels 12 px |
| **SimControls** | Panel in `--surface-2`, radius 24 px, dashed sky `Synthetic` badge in its header |
| **Top bar** | Transparent over Ink, wordmark + orbit mark, day indicator, About ghost pill |
| **AboutDialog** | Inverted surface: Lavender fill, Ink text, radius 32 px, Deep Indigo links, inverted pill close button |
| **Footer** | Muted caption strip with the disclaimer constant |
| **Input / select (Jump to day)** | `--surface-2`, 1 px `--border`, radius 16 px, lavender text, focus ring sky |

---

## 7. Interaction details
- Advancing a day animates the status card with a 200 ms fade only (no flashing, no pulsing alerts).
- Status changes are announced with `aria-live="polite"`.
- Buttons ≥ 44 px height. Focus ring `2px solid var(--color-sky)` with 2 px offset on every interactive element.
- Reaction test: target is ≥ 200 px circle on mobile; Space and pointer both work; ignore double-fires within 50 ms.
- Respect `prefers-reduced-motion`: remove fades.

---

## 8. About dialog content
Title: "About Kairos Monitor". Inverted lavender surface. Bullets: synthetic data; experimental thresholds and task classifications; browser checks are not NASA Cognition or validated flight assessments; device timing, practice effects and interruptions; non-causal recovery comparisons; novelty to investigate; HRV unavailable; Gemini synthetic rephrasing with deterministic classification; live browser results never sent to Gemini; references (two links from SPEC.md §18). Use “Task decisions remain with the crew and mission team.” for the explanatory disclaimer to comply with §5.3. The exact footer remains the only banned-word exemption. Close button: inverted pill. Native modal semantics, background inertness, explicit keyboard focus wrap, Escape/Close and trigger focus restoration are required; content scrolls on mobile.

---

## 9. Assets
- **Logo:** "Kairos Monitor" wordmark in Satoshi 700, tracking -0.03em, lavender, plus an **orbit mark**: a thin (1.5 px) circle in sky with a small filled teal dot on its edge and a short vertical tick at the top (a moment on a loop — kairos means "the right moment"). Build as an inline SVG.
- **Line-art atmosphere (optional):** a large thin-stroke orbit drawing in sky at 30–40% opacity behind the Today status card. 1–2 px strokes, no fills. Skip if short on time.
- **Icons:** thin-stroke (1.5 px), single color, 8 px container radius, used as functional markers only (moon for sleep, gauge for reaction, target for attention, calendar for mission).
- **PWA:** `theme_color` and `background_color` `#171D1C`. Icons 192 and 512 px: indigo `#5863F8` rounded square with a lavender "K" in Satoshi 700. Generate as PNG from SVG.
- **Fonts:** Satoshi files in `public/fonts/` (see §2.4).
- No photography.

---

## 10. Demo polish checklist
- [ ] Day indicator visible on every screen
- [ ] Synthetic badge (dashed sky) visible on Today, Trends, Mission
- [ ] EVA vs Inventory explanation clearly different on day 12
- [ ] No horizontal scroll at 360 px
- [ ] All charts have axis labels with units
- [ ] Footer disclaimer on every screen
- [ ] Satoshi loads (check the Network tab); fallback stack still looks acceptable
- [ ] White text on every indigo button (no lavender on indigo)
- [ ] Indigo never used for text on dark
- [ ] No status communicated by color alone (icon + label present)
- [ ] Contrast spot-check with browser devtools on chips and muted text

---

## 11. Do's and Don'ts

### Do
- Use Deep Ink (`#171D1C`) as the canvas for every screen.
- Use pill geometry (9999 px) for every button, tab, chip and badge.
- Reserve Signal Sky for data, chart strokes, links, focus rings and the Synthetic badge.
- Reserve Kairos Teal for "within usual range", the baseline band and stable markers.
- Use Pulse Indigo only for filled primary buttons, the active tab and selected states.
- Use amber/coral only for "Change noted" / "Review recommended" and criterion-met markers.
- Use tight negative tracking at heading and metric sizes; slight positive tracking at 12–14 px.
- Show icon + label with every status color.

### Don't
- Never use pure black, pure white or neutral gray as a surface on the canvas. Dark surfaces stay in the ink family.
- Never use Pulse Indigo as text on dark (3.7:1 at best), or lavender text on indigo (3.9:1).
- Never use sky or teal as large solid fills or hero blocks — they are data colors.
- Never use red anywhere. Never use teal for insufficient or missing data.
- No second typeface. No weights other than 400, 500, 700.
- No corners under 8 px (inputs 16 px, cards 24 px).
- No gradients between dark and light surfaces; the About dialog is a hard cut.
- No drop shadows on cards; only the indigo glow on primary buttons.
- No decorative color. If a color is on screen it must mean something from §2.

---

## 12. Agent prompt guide

**Quick color reference**
- text: `#EFE9F4` · muted: `#B3B0B8` · canvas: `#171D1C` · card: `#1F2827` · raised: `#283332`
- border: `#3A3E3F` · data/link: `#5FBFF9` · usual/baseline: `#16BAC5` · action: `#5863F8` (white text)
- change: `#F2C35B` · review: `#FF9E5E` · insufficient: `#9AA6A5`

**Example component prompts**
1. **Status card:** `--surface-metric` background, 32 px radius, 1 px `--border-accent`, 24 px padding. Status icon and label in the status color, Satoshi 700 24 px, tracking -0.03em. Summary in `#B3B0B8` 14 px. Right side: "Day 12" in Satoshi 700, 48 px (64 px ≥ 900 px), `#5FBFF9`, tracking -0.05em, with "of 17" caption in muted 12 px.
2. **Dark card with chart:** `#1F2827` background, 24 px radius, 1 px `#3A3E3F`, 20–24 px padding. Pill tab strip on `#283332`: active tab `#5863F8` with `#FFFFFF` 14 px weight 500 text, inactive transparent with `#B3B0B8`. Chart strokes `#5FBFF9` (second series `#EFE9F4`), gridlines `#3A3E3F`, baseline dashed `#B3B0B8`, criterion dotted `#F2C35B`, baseline band teal at 12%, axis labels 12 px `#B3B0B8`.
3. **Primary pill button:** `#5863F8` fill, `#FFFFFF` Satoshi 500 16 px text, 9999 px radius, 14 × 24 px padding, `box-shadow: 0 0 20px rgba(88, 99, 248, 0.4)`, min-height 44 px, sky focus ring.
4. **About dialog:** `#EFE9F4` fill, 32 px radius, `#171D1C` text, headings Satoshi 700 with -0.03em tracking, links `#3F49D1`, close button `#171D1C` fill with `#EFE9F4` text, 9999 px radius, over a 70% ink scrim.

## 13. P7 authorized landing route addition

The public root `/` is now an introduction outside the mission app shell. `/today`, `/check`, `/trends` and `/mission` retain their console layouts, direct navigation and refresh behavior. The console wordmark links back to `/`; Launch demo opens `/today` without resetting saved mission state. The landing route lazy-loads neither the mission provider/database nor Trends/Recharts, and never probes or requests Gemini.

Landing direction: spacious editorial layout on Deep Ink, existing orbit wordmark, Satoshi 400/500/700 and token colors only. A larger 44–76 px hero type scale is explicitly limited to the landing introduction. Sections: hero with synthetic label and demo/anchor actions; isolated-measurement problem; three-step explanation; genuine synthetic day-12 dashboard capture; honest limitations and final action. Preserve the console's existing scale and rules. Static orbit artwork uses the existing mark's visual language; no photography, endorsement badges, invented statistics or testimonials.

No supplied video exists. The static orbit composition is the poster/fallback in both motion preference modes. **looping video asset pending**: reserve `public/media/kairos-loop.mp4` (optional WebM) for a future supplied, licensed, compressed clip; do not reference a nonexistent source. Future media must satisfy the authorized pause/play, reduced-motion/data-saving, viewport/visibility pause and failure handling contract before use. Never precache a large decorative video in the future PWA. The mission console must remain independent of landing media. Asset provenance and sizes: `public/images/README.md`.
