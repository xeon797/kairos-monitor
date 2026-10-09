# SPEC.md — Kairos Monitor Product & Engine Specification

Status: v1 for the NASA Space Apps demo. **All thresholds are experimental and illustrative.** They are not validated clinical or flight criteria.

---

## 1. Purpose
Help a crew member notice **sustained, personal changes** in sleep and measured cognitive performance, and see them **in the context of the next mission task**, so a human can review rest and workload before a demanding task.

It does **not** diagnose, prescribe, predict accidents, or issue fitness-for-duty decisions.

## 2. Scope (v1)
In scope:
- One astronaut ("Alex"), one frozen baseline
- Four screens: Today, Check, Trends, Mission
- Two browser checks: reaction time and go/no-go attention
- Synthetic 17-day mission timeline with a simulator (advance, reset, jump)
- Task library: EVA, Docking, Maintenance, Inventory
- Local persistence (IndexedDB), offline operation
- Deterministic engine + template explanations; Gemini rephrasing (core feature, always with template fallback)
- Response logging (rest or workload adjustment) and recovery comparison

Out of scope: wearables, cloud sync, accounts, multiple users, real NASA datasets, diagnosis, working-memory test (stretch goal only, see §14).

## 3. Glossary
- **Observation**: one day's recorded values (sleep, check results) with provenance.
- **Domain**: one of `sleep`, `reaction`, `attention`.
- **Criterion met** (for a day): that day's value crosses the domain threshold versus baseline.
- **Sustained**: criterion met on at least 3 of the last 5 days (rolling window, including today).
- **Status**: overall state for the astronaut, derived from how many domains are sustained.
- **Task concern**: status computed for a specific task, using only that task's relevant domains and demand level.

## 4. Data model

```ts
type Source = 'synthetic' | 'live';
type Quality = 'good' | 'poor' | 'missing';

interface SleepObservation {
  day: number;                 // mission day, integer 1..17 (synthetic)
  sleepHours: number | null;   // total sleep time, hours
  midpointMinutes: number | null; // sleep midpoint, minutes after local midnight (e.g. 180 = 03:00)
  source: Source;
  quality: Quality;
}

interface CheckObservation {
  id: string;
  day: number | null;          // set for synthetic; null for live
  timestamp: string | null;    // ISO UTC for live checks
  medianRtMs: number | null;   // median reaction time, ms
  lapses: number | null;       // count of RTs > 500 ms
  falseStarts: number | null;  // count of responses < 100 ms (excluded from median)
  commissionErrors: number | null; // taps on no-go stimuli (go/no-go)
  omissionErrors: number | null;   // missed go stimuli
  validTrials: number;
  interruptions: number;       // tab/window blur events during test
  source: Source;
  quality: Quality;
}

interface Baseline {
  window: [number, number];    // [1, 7]
  sleepMeanHours: number;
  midpointMeanMinutes: number;
  rtMeanMs: number;
  lapsesMean: number;
  errorsMean: number;          // commission errors
  validSleepNights: number;
  validChecks: number;
  frozenAt: string;            // ISO
}

interface ResponseLog {
  id: string;
  day: number;
  type: 'rest_adjustment' | 'workload_adjustment';
  note: string;                // free text, <= 200 chars
}
```

Dexie tables: `sleep`, `checks`, `responses`, `settings` (holds `currentDay`, `baseline`, `scenarioLoaded`).

## 5. Quality rules
A **check** is `poor` (excluded from calculations) if any is true:
- `validTrials` < 20 for reaction test (of 25 trials) or < 30 for go/no-go (of 40 stimuli)
- `interruptions` > 2
- `falseStarts` > 5

A **sleep night** is `missing` if `sleepHours` is null, and `poor` if `sleepHours` < 2 or > 14 (treated as sensor/entry error).

Poor and missing observations are shown in the UI as gaps with a reason. They count as "not evaluable", never as "criterion not met".

## 6. Baseline
- Baseline window: days 1–7.
- Required: at least **5 valid sleep nights** and **5 valid checks** within the window. Otherwise status is `INSUFFICIENT_DATA` with reason `Baseline not yet established`.
- Baseline values are the arithmetic means of valid observations in the window.
- **Frozen**: computed once and stored. Never recalculated automatically. A "Re-baseline" button exists in Trends (secondary style) behind a confirm dialog; it recomputes from the most recent 7 days and writes a new `frozenAt`. (Stretch; may be omitted tonight.)
- For the synthetic scenario the baseline is: sleep 7.214 h, RT 265.0 ms, lapses 1.000, commission errors 1.286.

## 7. Detection rules (all numbers live in `src/engine/config.ts`)

### 7.1 Per-day criteria (experimental, illustrative)
| Domain | Criterion met on a day when… | Threshold (config key) |
|---|---|---|
| sleep | `baseline.sleepMeanHours − sleepHours ≥ 1.0` **OR** `abs(midpoint − baseline.midpoint) ≥ 90` min | `SLEEP_DEFICIT_HOURS = 1.0`, `MIDPOINT_SHIFT_MIN = 90` |
| reaction | `medianRtMs ≥ baseline.rtMeanMs × 1.08` | `RT_INCREASE_FACTOR = 1.08` |
| attention | `lapses ≥ baseline.lapsesMean + 2` **OR** `commissionErrors ≥ baseline.errorsMean + 2` | `LAPSES_INCREASE = 2`, `ERRORS_INCREASE = 2` |

With the synthetic baseline the effective cutoffs are: sleep ≤ 6.21 h, RT ≥ 286.2 ms, lapses ≥ 3.0, commission errors ≥ 3.29 (i.e. ≥ 4 in whole counts).

### 7.2 Sustained
`sustained(domain, day)` is true when, among the last 5 days ending at `day` (inclusive), **at least 3** have the criterion met. Days that are `poor`/`missing` do not count as met.

Evaluability: a domain is **evaluable** at `day` only if at least **3 of the last 5 days** have valid data for it. If not evaluable → that domain contributes `INSUFFICIENT_DATA`.

Config: `WINDOW_DAYS = 5`, `MIN_MET_DAYS = 3`, `MIN_VALID_DAYS = 3`.

### 7.3 Overall status
Let `n` = number of sustained domains among `sleep`, `reaction`, `attention`.

| Condition | Status | Label (see DESIGN.md §5) |
|---|---|---|
| Baseline not established, or any domain not evaluable | `INSUFFICIENT_DATA` | "Insufficient data" |
| `n = 0` | `WITHIN_USUAL` | "Within your usual range" |
| `n = 1` | `CHANGE_NOTED` | "Change noted" |
| `n ≥ 2` | `REVIEW_RECOMMENDED` | "Review recommended" |

`INSUFFICIENT_DATA` takes precedence and must never be rendered in a green/positive style.

### 7.4 Trend label (display only; does not change status)
If a response was logged on or before `day` **and** `n(day) < n(day−1)`, show the chip **"Measures moving toward baseline"**. Always accompanied by the line: "This comparison does not show that the adjustment caused the change."

## 8. Task context

### 8.1 Task library
| Task id | Name | Demand | Relevant domains | Review cap |
|---|---|---|---|---|
| `EVA` | EVA (spacewalk) | high | sleep, reaction, attention | REVIEW_RECOMMENDED |
| `DOCK` | Docking | high | reaction, attention, sleep | REVIEW_RECOMMENDED |
| `MAINT` | Maintenance | medium | attention, sleep | REVIEW_RECOMMENDED |
| `INV` | Inventory | low | sleep, attention | CHANGE_NOTED |

### 8.2 Task concern calculation
Let `r` = number of **sustained domains among the task's relevant domains**.

| Demand | `r` → concern |
|---|---|
| high | 0 → `NO_RELEVANT_CHANGE`; 1 → `CHANGE_NOTED`; ≥ 2 → `REVIEW_RECOMMENDED` |
| medium | 0 → `NO_RELEVANT_CHANGE`; 1 → `CHANGE_NOTED`; ≥ 2 → `REVIEW_RECOMMENDED` *(config key allows raising to 3)* |
| low | 0 → `NO_RELEVANT_CHANGE`; ≥ 1 → `CHANGE_NOTED` (never higher) |

If any relevant domain is not evaluable → `INSUFFICIENT_DATA` for that task.

Each task card shows: task name, scheduled day, demand, concern label, the relevant sustained domains, and the review prompt from templates.

### 8.3 Mission schedule (synthetic)
| Id | Task | Scheduled day |
|---|---|---|
| EVA-07 | EVA | 14 |
| DOCK-02 | Docking | 16 |
| MAINT-11 | Maintenance | 15 |
| INV-03 | Inventory | 14 |

Mission screen shows every task with a "days until" value relative to the simulated current day and its concern at the current day.

## 9. Evidence packet (engine output → UI and optional LLM)

```ts
interface EvidencePacket {
  day: number;
  status: Status;
  taskId?: string;
  taskConcern?: Concern;
  domains: Array<{
    domain: 'sleep'|'reaction'|'attention';
    sustained: boolean;
    evaluable: boolean;
    metDaysInWindow: number;     // e.g. 3
    windowDays: number;          // 5
    latest: { value: number; unit: string; baseline: number; deltaPct?: number; deltaAbs?: number };
  }>;
  dataQuality: { validSleepDays: number; validCheckDays: number; windowDays: number; notes: string[] };
  provenance: Array<{ label: string; source: Source }>;
  reviewPrompt: string;          // from template
}
```

The UI renders the packet directly. The template explanation is a pure function `explain(packet): string`.

## 10. Explanation layer
1. **Template (default, offline)**: deterministic strings assembled from the packet. Always available.
2. **Gemini rephrase (on by default when online)**: only if online and `api/explain.ts` is reachable. Request body is the packet as JSON. Response is plain text of at most ~70 words.
   - System prompt rules: use only numbers in the packet; do not change status; do not diagnose, prescribe, or say anyone is fit/unfit; end with a review prompt; neutral tone.
   - Post-validation in the client: reject the LLM text and fall back to the template if it contains any banned word (see DESIGN.md §5), contains a number that is not in the packet, or the call takes > 4 s.
3. UI shows a small tag `Template explanation` or `AI-rephrased from the same evidence`, and a `Show template version` toggle so a reader can always see the deterministic text.
4. **Never blocks the UI:** the template text renders immediately; the AI text replaces it when it arrives and passes validation. No layout shift (reserve height).
5. **Caching:** results are stored in IndexedDB keyed by a stable hash of the packet (`explanationCacheKey`), so repeated visits are instant and previously fetched text still shows offline. The service worker never caches `/api/*`.
6. **Endpoint safeguards** (the endpoint is public, so protect the free quota): POST only; hand-validated packet shape; body cap 8 KB; best-effort per-IP rate limit; low temperature and a small output cap; server timeout 3.5 s; never log the key or packet contents; key and model only in server environment variables (`GEMINI_API_KEY`, `GEMINI_MODEL`).
7. **Data sent to the model:** only the structured evidence packet for synthetic data. Live browser-test results are never sent. The About dialog discloses that Gemini may rephrase explanations.
8. **Local development:** plain `npm run dev` has no `/api` route, so the client falls back to the template. Test the real call on the deployed Vercel site (or with `vercel dev`).

## 11. Browser checks

### 11.1 Reaction test (simple RT, ~45 s)
- 25 trials. A large circle turns from grey to green after a random delay of 1.5–4.0 s. User taps / presses Space as fast as possible.
- RT = time from green to response. Responses < 100 ms = `falseStart` (excluded). RT > 500 ms = `lapse` (included in median, counted as lapse). No response within 2000 ms counts as a lapse with RT = 2000 and is excluded from the median.
- Output: `medianRtMs` (median of valid non-false-start RTs), `lapses`, `falseStarts`, `validTrials`.
- Delays are generated from a seeded PRNG passed into `scoring.ts` so tests are deterministic.

### 11.2 Go/No-Go attention test (~50 s)
- 40 stimuli, 25% no-go (10), presented 800 ms each with a 400 ms gap. Go = green circle (tap). No-go = red square (do not tap).
- `commissionErrors` = taps on no-go. `omissionErrors` = missed go stimuli.
- Output also includes `validTrials` (stimuli presented with the tab in focus).

### 11.3 Live results
- Saved with `source: 'live'`, `timestamp` set, `day: null`.
- Shown in Check history with raw metrics and quality.
- A **live personal baseline** is used only after ≥ 3 valid live checks (mean of the first 3). Until then the Check screen says: "Live results are shown as raw values. Compare after 3 checks." Live results never enter the synthetic timeline or the synthetic baseline, and the UI says so ("Browser test results cannot be compared with the synthetic mission data").
- A short browser test is **not** NASA Cognition and is not a validated flight assessment. This sentence appears on the Check screen.

## 12. Simulator
- State: `currentDay` (1–17), persisted in `settings`.
- On first load, days 1–7 are preloaded (baseline established) and `currentDay = 7`.
- Controls (in a "Simulation" panel, always visible, clearly labeled **Synthetic mission telemetry**):
  - **Advance day** (+1, max 17)
  - **Back one day** (−1, min 7)
  - **Reset** (back to day 7, clears responses)
  - **Jump to day** (select 7–17)
- Advancing reveals that day's synthetic sleep and check values, then everything recomputes.
- **Log schedule change** button is enabled from day 12 onward on Today and Mission. It writes a `ResponseLog` (type `rest_adjustment`, default note "Protected sleep window; EVA prep moved") on the current day. In the demo script it is pressed on **day 13**.

## 13. Screens (summary; layout in DESIGN.md)
- **Today**: status card, per-domain evidence, next task with its concern, data availability, sim controls, explanation.
- **Check**: run reaction or go/no-go, see results, history, disclaimer.
- **Trends**: Recharts line charts for sleep hours, median RT, lapses+errors over days with baseline line and a shaded "criterion met" marker; "met days in window" legend; optional HRV placeholder labeled "supporting context, not available in this prototype".
- **Mission**: task list with concern per task, "days until", review prompts, "Repeat check" shortcut, response log and the "Log schedule change" action.

## 14. Stretch (only after everything else is done)
In order: (1) re-baseline button, (2) working-memory n-back check, (3) HRV supporting context chart using synthetic values. (The PWA offline shell and Gemini rephrase are core tasks in PLAN.md, not stretch.)

## 15. Non-functional requirements
- Loads and runs core flow with no network after first load (PWA task) — or at minimum never fails when offline.
- Interactions respond in < 100 ms; all engine calls complete in < 20 ms.
- Works on a current desktop browser and a phone-width viewport (360 px).
- Accessibility: status is never conveyed by color alone (icon + text); text contrast ≥ 4.5:1; reaction test usable by keyboard (Space) and tap.
- Persistent data survives page reload.

## 16. Acceptance (summary — full table in DEMO.md)
- Day 11: status = `CHANGE_NOTED` (sleep sustained).
- Day 12: status = `REVIEW_RECOMMENDED`; EVA-07 concern = `REVIEW_RECOMMENDED`; INV-03 concern = `CHANGE_NOTED` with a different explanation.
- Day 15: two domains sustained (reaction, attention).
- Day 16: status = `WITHIN_USUAL`; trend chip shown if a response was logged.
- Removing check data in a window makes the affected domain not evaluable and status `INSUFFICIENT_DATA`.

## 17. Honest limitations (must appear in README and in an "About this prototype" dialog)
- Thresholds are experimental and illustrative.
- Short browser tests are affected by device latency, practice effects, and interruptions.
- Mission telemetry is synthetic. The recovery scenario is illustrative and does not show that any intervention works.
- HRV (if shown) is supporting context only.
- Novelty versus prior work remains a claim to test.

## 18. References
- NASA: Risk from Inadequate Sleep and Irregular Schedules (nasa.gov sleep risk overview).
- NASA TechPort project 23228: Individualized Real-Time Neurocognitive Assessment Toolkit for Space Flight Fatigue.
