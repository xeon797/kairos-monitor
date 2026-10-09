# DEMO.md - Kairos Monitor Synthetic Scenario and Acceptance Contract

Version: proposed synthetic v1, 09 October 2026.
Project: Kairos Monitor, Team Requiem_SUST.

**Provenance:** This is a newly authored, deterministic demonstration fixture. It is not a recovered original DEMO.md, NASA dataset, medical forecast or measured project result. Its expected software outputs were calculated from the supplied SPEC.md rules. Feeding this file to the coding agent authorizes adopting these values as the demo fixture; it does not validate the rules scientifically.

SPEC.md remains the source of truth for behavior and thresholds. This file supplies the previously missing scenario values and reproducible acceptance expectations. Do not alter engine thresholds to force this scenario to pass.

## 1. Exact synthetic mission data

One astronaut: Alex. Mission days 1-17. Days 1-7 form the frozen baseline. Start at day 7. Only observations at or before currentDay may appear in charts, evidence or detection windows, even if all 17 days are stored.

| Day | sleepHours | midpointMinutes | medianRtMs | lapses | commissionErrors |
|---|---:|---:|---:|---:|---:|
| 1 | 7.2 | 180 | 260 | 1 | 1 |
| 2 | 7.4 | 180 | 270 | 1 | 2 |
| 3 | 7.1 | 180 | 265 | 1 | 1 |
| 4 | 7.3 | 180 | 255 | 1 | 1 |
| 5 | 7.0 | 180 | 275 | 1 | 2 |
| 6 | 7.2 | 180 | 260 | 1 | 1 |
| 7 | 7.3 | 180 | 270 | 1 | 1 |
| 8 | 7.1 | 180 | 268 | 1 | 1 |
| 9 | 6.0 | 180 | 275 | 1 | 2 |
| 10 | 5.9 | 180 | 295 | 3 | 4 |
| 11 | 5.7 | 180 | 305 | 4 | 4 |
| 12 | 5.4 | 180 | 312 | 5 | 5 |
| 13 | 6.6 | 180 | 300 | 3 | 4 |
| 14 | 7.0 | 180 | 280 | 2 | 2 |
| 15 | 7.2 | 180 | 270 | 1 | 1 |
| 16 | 7.3 | 180 | 265 | 1 | 1 |
| 17 | 7.2 | 180 | 260 | 1 | 1 |

### 1.1 Complete record construction

For each table row construct one SleepObservation and one CheckObservation. These are synthetic daily summaries, not raw trial recordings.

SleepObservation:
- day: table day.
- sleepHours and midpointMinutes: exact table values.
- source: 'synthetic'.
- quality: 'good'.

CheckObservation:
- id: `synthetic-check-DD`, with two-digit day, e.g. synthetic-check-01.
- day: table day; timestamp: null.
- medianRtMs, lapses, commissionErrors: exact table values.
- falseStarts: 0; omissionErrors: 0; interruptions: 0.
- validTrials: 40.
- source: 'synthetic'; quality: 'good'.

The aggregate `validTrials:40` is synthetic quality metadata chosen to satisfy both specified minimum-count checks. It is NOT a claim that a 25-trial reaction test produced 40 valid trials. The scenario combines reaction and attention summaries in the current SPEC model. Record this limitation in NOTES.md. Do not infer a live test kind from this number. Live individual tests must retain their actual trial counts and explicit test kind when that model is resolved before persistence/scoring.

Do not synthesize raw trials, HRV, subjective mood, cabin noise or wearable measurements. None is supplied here. The sleep midpoint stays fixed, so this fixture demonstrates the sleep-duration branch, not the circadian-shift branch.

### 1.2 Exact baseline oracle

Use all seven good-quality rows from days 1-7, arithmetic means, full precision:

| Baseline field | Exact expression | Expected value |
|---|---|---:|
| sleepMeanHours | 50.5 / 7 | 7.214285714285714 |
| midpointMeanMinutes | 1260 / 7 | 180 |
| rtMeanMs | 1855 / 7 | 265 |
| lapsesMean | 7 / 7 | 1 |
| errorsMean | 9 / 7 | 1.2857142857142858 |
| validSleepNights | count | 7 |
| validChecks | count | 7 |
| window | inclusive days | [1, 7] |

Unit-test caller timestamp: `2026-10-09T00:00:00.000Z`. Runtime initialization may supply its own ISO timestamp; do not call the clock inside the engine.

For tests, use tolerance 1e-9 for the non-integer means. The PLAN's +/-0.001 acceptance remains satisfied. Display rounding must never change detection.

Effective full-precision criteria:
- Sleep duration <= 6.214285714285714 h, OR absolute midpoint shift >= 90 min.
- Reaction >= 286.2 ms.
- Lapses >= 3, OR commission errors >= 3.2857142857142856 (therefore integer errors >= 4).
- Sustained: at least 3 criterion-met days in the last 5 calendar mission days, inclusive.
- Evaluable: at least 3 valid days for the domain in that same window.

### 1.3 Tasks

| Instance id | Task type | Scheduled day | Demand | Relevant domains |
|---|---|---:|---|---|
| EVA-07 | EVA | 14 | high | sleep, reaction, attention |
| INV-03 | INV | 14 | low | sleep, attention |
| MAINT-11 | MAINT | 15 | medium | attention, sleep |
| DOCK-02 | DOCK | 16 | high | reaction, attention, sleep |

Sort by scheduled day; for same-day ties use instance ID for deterministic ordering. Next upcoming task is the earliest task with scheduledDay >= currentDay. Do not show completed/past tasks as upcoming. For a past task use 'N days ago', never 'in -N days'. On day 17 there is no upcoming task.

Concern is evaluated from CURRENT observations, not predicted observations on the task's scheduled day.

## 2. Acceptance table and additional checks

All rows below have good data, established baseline and 5 valid days per domain. Counts are criterion-met days, not percentage scores. `r` counts sustained relevant domains. Task labels are exact enum values.

| Current day | Sleep met / 5 | Reaction met / 5 | Attention met / 5 | Sustained domains | Overall status | EVA r / concern | INV r / concern |
|---|---:|---:|---:|---|---|---|---|
| 7 | 0 | 0 | 0 |  | WITHIN_USUAL | 0 / NO_RELEVANT_CHANGE | 0 / NO_RELEVANT_CHANGE |
| 8 | 0 | 0 | 0 |  | WITHIN_USUAL | 0 / NO_RELEVANT_CHANGE | 0 / NO_RELEVANT_CHANGE |
| 9 | 1 | 0 | 0 |  | WITHIN_USUAL | 0 / NO_RELEVANT_CHANGE | 0 / NO_RELEVANT_CHANGE |
| 10 | 2 | 1 | 1 |  | WITHIN_USUAL | 0 / NO_RELEVANT_CHANGE | 0 / NO_RELEVANT_CHANGE |
| 11 | 3 | 2 | 2 | sleep | CHANGE_NOTED | 1 / CHANGE_NOTED | 1 / CHANGE_NOTED |
| 12 | 4 | 3 | 3 | sleep, reaction, attention | REVIEW_RECOMMENDED | 3 / REVIEW_RECOMMENDED | 2 / CHANGE_NOTED |
| 13 | 4 | 4 | 4 | sleep, reaction, attention | REVIEW_RECOMMENDED | 3 / REVIEW_RECOMMENDED | 2 / CHANGE_NOTED |
| 14 | 3 | 4 | 4 | sleep, reaction, attention | REVIEW_RECOMMENDED | 3 / REVIEW_RECOMMENDED | 2 / CHANGE_NOTED |
| 15 | 2 | 3 | 3 | reaction, attention | REVIEW_RECOMMENDED | 2 / REVIEW_RECOMMENDED | 1 / CHANGE_NOTED |
| 16 | 1 | 2 | 2 |  | WITHIN_USUAL | 0 / NO_RELEVANT_CHANGE | 0 / NO_RELEVANT_CHANGE |
| 17 | 0 | 1 | 1 |  | WITHIN_USUAL | 0 / NO_RELEVANT_CHANGE | 0 / NO_RELEVANT_CHANGE |

For Docking, r and concern equal EVA in every row. For Maintenance, r equals INV's r, but its medium-demand rule allows REVIEW_RECOMMENDED when r >= 2. Therefore Maintenance concerns on days 7-17 are:
`NO_RELEVANT_CHANGE, NO_RELEVANT_CHANGE, NO_RELEVANT_CHANGE, NO_RELEVANT_CHANGE, CHANGE_NOTED, REVIEW_RECOMMENDED, REVIEW_RECOMMENDED, REVIEW_RECOMMENDED, CHANGE_NOTED, NO_RELEVANT_CHANGE, NO_RELEVANT_CHANGE`.

### 2.1 Required additional checks

1. **Day 12 task difference.** Overall and EVA: REVIEW_RECOMMENDED, r=3. Inventory: CHANGE_NOTED, r=2, capped by low demand. Explain each task by its own name/instance ID and demand. Do not give both the same review prompt.
2. **Recovery chip.** Log a rest_adjustment on day 13 with note 'Protected sleep window; EVA prep moved'. Sustained domain count drops from 3 to 2 on day 15 and 2 to 0 on day 16. Show 'Measures moving toward baseline' only on those days. No chip on days 13, 14 or 17 under SPEC's day-to-day rule. Always show: 'This comparison does not show that the adjustment caused the change.' Without a response log, no chip.
3. **Missing checks.** On a COPY of the scenario remove check rows for days 10, 11, 12, then evaluate day 12. Only days 8 and 9 have valid checks in the window: reaction and attention are not evaluable. Overall, EVA, Docking, Inventory and Maintenance must be INSUFFICIENT_DATA. Sleep remains evaluable and sustained. Do not mutate the original fixture.
4. **Poor checks.** Mark those same three check rows poor using interruptions=3. Expectations equal check 3. Exclusion reasons remain available. Repeat with falseStarts=6 and insufficient trial counts using the explicit test-kind validator.
5. **Missing sleep.** Set sleepHours=null and quality='missing' on days 10-12 in a copy. Sleep becomes not evaluable, overall and all four tasks become INSUFFICIENT_DATA.
6. **Baseline unavailable.** Fewer than 5 valid baseline sleep nights OR fewer than 5 valid baseline checks -> baseline null and overall INSUFFICIENT_DATA. A task must not return a positive label when no baseline exists.
7. **Frozen baseline.** Initialize at day 7, then advance to day 17. All baseline values, window and frozenAt remain unchanged. Changing later observations does not update the saved baseline. Explicit re-baselining is out of this acceptance flow.
8. **Future-data isolation.** Alter days 13-17 arbitrarily in a copy; results at day 12 must remain identical. Baseline sees days 1-7 only; windows use days currentDay-4 through currentDay only.
9. **Live-check isolation.** Add a live observation with day=null and an ISO timestamp. It is stored/shown separately and does not change synthetic baseline, day, status, charts or task concerns. Live data must never reach Gemini.
10. **Reset/persistence.** Reload preserves current day and response logs. Reset returns to day 7 and removes response logs, while retaining live checks and cached explanations. Repeated initialization must not duplicate scenario rows.
11. **Baseline arithmetic.** Test exact oracle values in section 1.2 independently of any production helper. Do not generate expected values by calling the function being tested.
12. **Single-day change.** At day 9 sleep meets its criterion once, but no domain is sustained. Overall remains WITHIN_USUAL. Raw differences must remain visible; the label is not a statement that every measurement is unchanged.
13. **Circadian branch.** Separate fixture: midpoint=270 versus baseline 180 meets the inclusive 90-minute boundary even if sleepHours=7.2. Midpoint=269 does not. This does not add a circadian episode to the official 17-day timeline. Midnight wrap-around policy remains a separate SPEC clarification; this test does not resolve it.
14. **Boundaries.** Use full-precision baseline to test inclusive cutoffs for sleep, RT, lapses and errors. The display value '6.21 h' is not the exact comparison threshold.
15. **Provenance.** Every simulated surface shows the Synthetic badge; real test history says 'Live browser test'. Poor/missing values show a gap/reason and never masquerade as valid zero values.
16. **Wording.** Scan all engine explanation outputs against DESIGN's banned-word list. The exact footer is the only explicit exemption. Do not scan scientific source documentation as if it were app UI copy.
17. **Performance.** Record engine timings under the stated <20 ms target on the test machine; report measured environment/results, not an assumed pass.

### 2.2 Wording reconciliation for the coding agent

DESIGN's within-usual template says 'This does not clear anyone for any task.' Its ban list prohibits 'cleared' and 'clearance', not every occurrence of 'clear'; still avoid implying approval. A suitable neutral replacement for demo explanations is 'Task decisions remain with the crew and mission team.' Record this as a proposed wording clarification before adoption, rather than silently altering SPEC behavior.

Allowed example outputs (illustrative, not model-generation fixtures):

- Day 12 EVA: 'Sleep, reaction and attention each met a change criterion on at least 3 of the last 5 days. EVA-07 is a high-demand task. Review recent sleep and repeat the check before EVA-07.'
- Day 12 Inventory: 'Sleep and attention show sustained changes from baseline. INV-03 is a lower-demand inventory task, so these changes are noted for routine monitoring. No task-specific review is prompted.'
- Day 16: 'No sustained change from baseline was found in the available data. Task decisions remain with the crew and mission team.'

Use the configured template patterns unless a wording clarification is recorded. AI text is not expected to match an exact sentence; its validation, provenance and underlying status must match.

## 3. The 90-second demo script

Preconditions: scenario loaded, currentDay=7, no response log, public app opened once online. Stable baseline, charts, task cards and template fallback are ready. If AI is available, prefetch validated synthetic day-12 task explanations rather than relying on a live request completing during the presentation.

| Time | Action | Expected story/output |
|---|---|---|
| 0-10 s | Open Today at day 7 | Show Alex, Synthetic badge and 'Within your usual range'; explain the frozen personal baseline. |
| 10-25 s | Jump to day 11, then advance to day 12 | 'Change noted' becomes 'Review recommended'. Show domain counts 4/5, 3/5, 3/5. |
| 25-45 s | Open Mission; compare EVA-07 and INV-03 | Same current observations, different task concern. EVA: Review recommended; Inventory: Change noted. Both scheduled in 2 days. |
| 45-55 s | Show explanation source and template toggle | Classification comes from deterministic rules; AI only rephrases synthetic evidence. If API unavailable, template continues working. |
| 55-65 s | Advance to day 13; log schedule change | The record is a human-entered adjustment, not an automatic prescription. |
| 65-80 s | Jump to day 15, then advance to day 16 | Sustained domains fall to 2, then 0. Recovery chip and non-causation line appear. |
| 80-90 s | Open Check and point out local history/test choices | Real browser measurements stay separate from synthetic telemetry. Explain that a full check takes longer than this pitch. |

A full reaction or attention check is NOT completed within this 90-second script. Run it separately before/after the pitch. Do not fake a live result to fit the time limit.

## 4. Full verification flow (outside the pitch)

- Complete the entire reaction check by keyboard or tap; record actual duration. With 25 random delays of 1.5-4 s, SPEC's '~45 s' estimate is not guaranteed. Avoid promising an exact duration.
- Complete go/no-go: 40 stimuli, 800 ms exposure plus 400 ms gap, approximately 48 s before setup/results overhead. Use shapes and the agreed design palette; resolve SPEC's red/green conflict before implementation.
- Save/reload live results, confirm separation from the synthetic timeline. Do not count different test types as interchangeable live baselines; resolve that model issue before T25.
- Run the section 3 navigation flow at 360 px and 1100 px.
- Exercise API success with valid synthetic evidence; validate text before display; template toggle works.
- Exercise absent key, offline connection, timeout, invalid AI wording and foreign number. All preserve the deterministic evidence and immediate template output.
- Use fixed mocked API responses for automated browser tests. Record actual model/site outputs separately.
- After PWA implementation: load online, disconnect, reload a route, navigate and save a live test. No /api request is needed for core operation; service worker must not cache /api/*.
- Check no horizontal scroll, keyboard focus and icon-plus-label statuses.

## 5. Scope and implementation handoff

Use this file to complete T05 and scenario-baseline verification first. Preserve the 72 existing passing unit tests; add scenario tests. Do not mark T08 complete or begin P3 merely because this document is present.

This fixture tests software consistency, not clinical validity. It cannot establish warning accuracy, reduced errors, causation or mission suitability. README and About must preserve those limits.
