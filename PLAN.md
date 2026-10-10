# PLAN.md — Ordered task list for the coding agent (Kairos Monitor)

Rules: do the **first unchecked task only** unless the master prompt names a different task, then follow the loop in `AGENTS.md §4`. Each task has a **Done when** condition. Do not start the next task until the current one is committed. Task order below matches the order of the 11 master prompts, so "first unchecked task" and the prompt always agree.

Time target: finish all three windows tonight. If time runs short, cut in this order: stretch items, polish items (T31), PWA (T30). Never cut P1–P10 or the README (T32). Gemini (T16–T19) is core, but the template fallback must keep the demo working if the API fails.

## Prompt map

| Prompt | Tasks | Window | Checkpoint |
|---|---|---|---|
| P1 Foundation | T01–T03 | 1 | Deployed shell loads in the new colors and font |
| P2 Engine base | T04–T07 | 1 | Baseline values correct |
| P3 Engine core | T08–T11 | 1 | **Checkpoint A**: every row of the DEMO.md day table passes |
| P4 State layer | T12–T13 | 1 | Reload keeps day and responses |
| P5 Today + Mission | T14–T15 | 2 | Day 12: EVA vs INV differ |
| P6 Gemini layer | T16–T19 | 2 | Real AI text on deployed day 12, fallback verified |
| P7 Trends + About | T20–T21 | 2 | Charts correct at 360 px |
| P8 Checks (scoring + test UIs) | T22–T24 | 2 | Both tests produce results |
| P9 Check screen + redeploy | T25–T26 | 3 | **Checkpoint B**: full DEMO.md script works live |
| P10 Verification | T27–T29 | 3 | Unit + e2e green |
| P11 Offline, polish, docs | T30–T33 | 3 | **Checkpoint C**: offline works, README/LICENSE done |

---

## P1 — Foundation

- [x] **T01 Scaffold**
  (Before this task, the user places the Satoshi `.woff2` files in `public/fonts/`. If they are not there yet, continue; the fallback stack is used.)
  Create a Vite + React + TypeScript (strict) app in the current folder, titled "Kairos Monitor". Add scripts: `dev`, `build`, `typecheck`, `test`, `e2e`, `preview`. Install only the allowed dependencies. Add `.gitignore` (node_modules, dist, .env). Add `NOTES.md` (empty with header) and `.env.example` listing `GEMINI_API_KEY=` and `GEMINI_MODEL=`.
  **Done when:** `npm run dev` shows a placeholder page, `npm run typecheck` and `npm run build` pass, first commit exists.

- [x] **T02 Tokens, fonts and app shell**
  Create `src/styles/tokens.css` (exact copy of DESIGN.md §2.7), `src/styles/fonts.css` (DESIGN.md §2.4), `App.tsx` with `react-router-dom`, four empty routes (Today, Check, Trends, Mission), top bar with the "Kairos Monitor" wordmark and orbit mark (DESIGN.md §9) and "Mission day N / 17" placeholder, tab bar (bottom on mobile, top on desktop), and the footer disclaimer constant.
  **Done when:** four routes render at 360 px and 1100 px with Deep Ink background, Satoshi (or fallback), footer visible, no hex values outside `tokens.css`.

- [x] **T03 First deploy**
  Deploy to Vercel (personal GitHub repo or Vercel CLI; Hobby cannot import org-owned repos). The user sets `GEMINI_API_KEY` and `GEMINI_MODEL` in the Vercel project's environment variables (placeholders are fine until the key exists).
  **Done when:** the public URL loads the shell and the four routes work after a hard refresh (SPA rewrite configured in `vercel.json`).

**Window 1 continues below.**

---

## P2 — Engine base

- [x] **T04 Types and config**
  Create `src/engine/types.ts` (all types from SPEC.md §4 and §9) and `src/engine/config.ts` (all thresholds from SPEC.md §7 and §8, each commented `experimental, illustrative`).
  **Done when:** typecheck passes; config exports `SLEEP_DEFICIT_HOURS=1.0`, `MIDPOINT_SHIFT_MIN=90`, `RT_INCREASE_FACTOR=1.08`, `LAPSES_INCREASE=2`, `ERRORS_INCREASE=2`, `WINDOW_DAYS=5`, `MIN_MET_DAYS=3`, `MIN_VALID_DAYS=3`.

- [x] **T05 Synthetic scenario data**
  Create `src/engine/scenarios.ts` with the 17-day table from DEMO.md §1 as typed arrays of `SleepObservation` and `CheckObservation` (source `synthetic`, quality `good`), plus the task schedule from SPEC.md §8.3 and the task library from §8.1.
  **Done when:** a unit test asserts 17 sleep rows, 17 check rows, and exact values for days 1, 12, and 17.
  **P2 dependency resolved:** user-adopted synthetic v1 DEMO.md supplies the exact 17-day table and aggregate metadata. All rows, provenance, task profiles and schedule are tested; this fixture is not measured mission data.

- [x] **T06 Quality rules**
  Implement `isCheckValid(check)` and `isSleepValid(sleep)` per SPEC.md §5 in `src/engine/quality.ts`.
  **Done when:** unit tests cover poor (interruptions 3, validTrials 10, falseStarts 6) and missing cases.

- [x] **T07 Baseline**
  Implement `computeBaseline(sleep[], checks[], window)` per SPEC.md §6 in `src/engine/baseline.ts`, returning `Baseline | null` (null when under 5 valid nights or 5 valid checks).
  **Done when:** for the synthetic data the baseline equals 7.214 (±0.001), 265.0, 1.000, 1.286; a test with only 4 valid nights returns null.
  **P2 verification completed:** independent fixture tests and the adopted DEMO scenario-baseline oracle pass. All 7 baseline nights/checks contribute; means match DEMO §1.2 within 1e-9 and SPEC's ±0.001 targets. Caller supplies `frozenAt` and explicit check kind; no baseline storage or automatic update is implemented.

---

## P3 — Engine core

- [x] **T08 Domain detection**
  Implement `criterionMet(domain, day, baseline, obs)` and `evaluateDomains(day, baseline, sleep[], checks[])` per SPEC.md §7.1–7.2 in `src/engine/detect.ts`, returning for each domain: `sustained`, `evaluable`, `metDaysInWindow`, `latest` values. Poor and missing days never count as met.
  **Done when:** unit tests reproduce the sustained columns of the DEMO.md §2 table for days 7–17.

- [x] **T09 Overall status**
  Implement `overallStatus(domains, baseline)` per SPEC.md §7.3 with the `INSUFFICIENT_DATA` precedence rule.
  **Done when:** tests reproduce the "Overall status" column for days 7–17, plus the missing-data case from DEMO.md §2 check 3.

- [x] **T10 Task context**
  Implement `evaluateTask(task, domains)` per SPEC.md §8.2 in `src/engine/taskContext.ts`, including the low-demand cap and the insufficient-data rule.
  **Done when:** tests reproduce the EVA and INV columns (concern and `r`) for days 7–17.

- [x] **T11 Evidence packet and templates**
  Implement `buildEvidencePacket(...)` (SPEC.md §9) and `src/engine/templates.ts` with `explain(packet)` using the exact patterns in DESIGN.md §5.2, plus the trend-chip logic from SPEC.md §7.4. Put the disclaimer string in one exported constant.
  **Done when:** tests pass for: day 12 EVA text differs from day 12 INV text and each names its own task; trend chip appears on days 15 and 16 (response logged day 13) and not on day 14; **no template output contains a banned word** (DESIGN.md §5.3 list).

**Checkpoint A:** PASS for P3 engine scope: all DEMO day-table rows and applicable additional pure-engine checks pass (266 unit tests); typecheck/build pass. Persistence, simulator/screens, API, live scoring/history, browser demo flow and offline/PWA acceptance remain deferred to their planned milestones.

---

## P4 — State layer

- [x] **T12 Persistence**
  Create `src/db/db.ts` with Dexie tables `sleep`, `checks`, `responses`, `settings`, and `explanations` (key, text, model, createdAt; used by T18). On first run, seed days 1–17 of synthetic data, set `currentDay = 7`, and freeze the baseline into `settings`. Export helpers: `getState()`, `setDay(n)`, `addResponse()`, `addLiveCheck()`, `resetSimulation()`.
  **Done when:** a Vitest test using `fake-indexeddb` seeds, reads, and resets correctly; reset returns to day 7 and clears responses but keeps live checks and cached explanations.

- [x] **T13 App state and simulator**
  Create `src/state/useApp.ts` (loads DB state, runs the engine for the current day, exposes `packet`, `taskPackets`, `advance`, `back`, `jump`, `reset`, `logResponse`) and the `SimControls` component (DESIGN.md §6). Wire the day indicator in the top bar.
  **Done when:** advancing and going back changes the day indicator and recomputed status; reload keeps the day; Reset returns to day 7.

---

## P5 — Today and Mission (Window 2 starts)

- [x] **T14 Today screen**
  Build `Today.tsx` and components `StatusCard`, `EvidenceRow`, `TaskCard`, `ConcernChip`, `SyntheticBadge`, per DESIGN.md §4.1. The explanation box shows the template text for now (T18 adds the AI text).
  **Done when:** advancing from day 7 to day 12 shows `Change noted` at day 11 and `Review recommended` at day 12 with the correct evidence rows and the next task card.

- [x] **T15 Mission screen**
  Build `Mission.tsx` per DESIGN.md §4.4: all four tasks, days-until, concern chips, per-task explanation, response log, **Log schedule change** (enabled from day 12), and the trend chip with the non-causation line.
  **Done when:** at day 12, EVA-07 shows "Review recommended" and INV-03 shows "Change noted" with different explanations; logging a response on day 13 and advancing to day 15 shows the chip.

---

## P6 — Gemini explanation layer (core)

- [x] **T16 Explanation validator (pure, in the engine)**
  Create `src/engine/validateExplanation.ts`: `validateExplanation(text, packet)` returns `{ ok, reasons }`. Reject if the text contains any banned word (DESIGN.md §5.3), contains a number not derivable from the packet (day, values, baselines, deltas, counts; allow rounding to the packet's displayed precision), exceeds 90 words, or (when status is `CHANGE_NOTED` or `REVIEW_RECOMMENDED`) lacks a review or repeat-check prompt. Also export `explanationCacheKey(packet)` (stable string from day, status, taskId, concern, domain values).
  **Done when:** unit tests cover good text, banned word, foreign number, too long, missing review prompt, and that the same packet always yields the same cache key.

- [x] **T17 Serverless endpoint `api/explain.ts`**
  POST only. Hand-validate the body against the `EvidencePacket` shape (no new dependencies); cap body at 8 KB; reject any packet whose provenance contains `live` (live check data is never sent). Build the prompt with the rules from SPEC.md §10 (use only packet numbers, never change status, no diagnosis, no clearance language, at most about 70 words, end with a review prompt). Call the Gemini REST API with plain `fetch` (no SDK): key from `GEMINI_API_KEY`, model from `GEMINI_MODEL` (verify the current endpoint and model name in the Gemini API docs), temperature 0.2, `maxOutputTokens` about 160, server timeout 3.5 s. Best-effort in-memory per-IP rate limit (about 20 requests per minute, respond 429). Never log the key or packet contents. Responses: `200 {text, model}`, `503 {error:"not_configured"}` without a key, `502 {error:"upstream"}` on failure.
  **Done when:** unit tests with a mocked `fetch` cover success, missing key, upstream failure, oversized body, live-provenance rejection, and rate limiting.

- [x] **T18 Client service and UI integration**
  Create `src/ai/explainClient.ts`: call `/api/explain` only when `navigator.onLine`, with `AbortController` and a 4 s timeout; look up and store results in the Dexie `explanations` table by `explanationCacheKey` so repeated visits (and offline use after a first success) show the same text; run `validateExplanation` on every response and fall back to the template on any failure, silently. Update Today and Mission explanation boxes: show the template text immediately, swap to the AI text when it arrives (reserve height, no layout shift), show the tag `Template explanation` or `AI-rephrased from the same evidence`, and add a `Show template version` toggle. Never send live-check data.
  **Done when:** with the API unreachable the template shows with no error UI; with a mocked good response the AI text shows and is cached; a response with a banned word or a foreign number is rejected and the template shows; the toggle switches text; plain `npm run dev` (no `/api`) still works.

- [x] **T19 Gemini verification on the deployed site**
  Redeploy, confirm the env vars are set in Vercel, and check day 12 EVA and INV return real AI text with the correct tag. Grep the built `dist/` for the key prefix (`AIza`) and confirm it is absent. Check 429 and fallback behavior with a bad key. Record two sample outputs and the model name in `NOTES.md`.
  **Done when:** the deployed day 12 shows AI-rephrased text that passes validation, `dist/` has no key, and a bad key still shows the template.

---

## P7 — Trends and About

- [x] **T20 Trends screen**
  Build `Trends.tsx` with three Recharts charts per DESIGN.md §4.3 (baseline line, criterion line, baseline-window band, highlighted criterion-met dots, "N of last 5 days" captions, HRV placeholder card).
  **Done when:** charts plot up to the current day only, show the correct criterion lines (6.21 h, 286.2 ms, 3.0 lapses), and render at 360 px without horizontal scroll.

- [x] **T21 About dialog and provenance tags**
  Implement `AboutDialog` per DESIGN.md §8 and make sure every limitation in SPEC.md §17 appears. Add this disclosure: explanations may be rephrased by Google's Gemini model from the same synthetic evidence, and the classification always comes from the deterministic engine. Add the `ProvenanceTag` to each evidence row (hover/tap shows source and quality).
  **Done when:** the dialog opens from the top bar, contains the references, all limitations, and the AI disclosure.

- [x] **P7 authorized landing page addition**
  Replace the root redirect with a separate introductory page at `/`, outside mission state/simulator/navigation. Preserve `/today`, `/check`, `/trends`, `/mission`, their direct refreshes and saved state. Launch demo opens Today; the console wordmark returns home. Use a real isolated-context synthetic day-12 dashboard capture, honest limitations, existing palette/font and a static orbit fallback because no supplied video exists. Document the future video slot without a broken source. Verify local/public navigation, zero landing state/AI initialization, both widths, reduced motion, media independence, charts/modal and screenshots; deploy the existing Vercel project before stopping before T22/P8.

---

## P8 — Checks (scoring and test UIs)

- [x] **T22 Scoring functions**
  Create `src/checks/scoring.ts` with pure functions `scoreReaction(trials)` and `scoreGoNoGo(trials)` per SPEC.md §11 plus a seeded PRNG helper for delays.
  **Done when:** unit tests cover median with false starts excluded, lapse counting (>500 ms), timeout handling, commission/omission counting, and quality flags.

- [x] **T23 Reaction test UI**
  Build `ReactionTest.tsx` (25 trials, random 1.5–4.0 s delay, tap or Space) and output a `CheckObservation` via `scoring.ts`. Record tab-blur events as `interruptions`.
  **Done when:** a full run produces a result object; Space and pointer both work; cancelling returns to the Check screen.

- [x] **T24 Go/No-Go test UI**
  Build `GoNoGoTest.tsx` (40 stimuli, 25% no-go, 800 ms stimulus + 400 ms gap) with scoring. The no-go stimulus is a square and go is a circle (shape, not color alone).
  **Done when:** a full run produces commission and omission counts; interruptions are tracked.

---

## P9 — Check screen and redeploy (Window 3 starts)

- [x] **T25 Check screen**
  Build `Check.tsx` per DESIGN.md §4.2: two test cards, result view with quality chip, save live check to Dexie, history list, the three notes (not NASA Cognition, device effects, not comparable with synthetic data), and the "compare after 3 checks" logic.
  **Done when:** a saved live check appears in history after reload and does not change any synthetic status on Today.

- [x] **T26 Redeploy and full-script check**
  Redeploy. Run the full DEMO.md §3 script on the deployed URL at phone width and desktop width.
  **Done when:** every step of the script works live (including the AI explanation tag on day 12), and any defects are logged in `NOTES.md`.

**Checkpoint B:** PASS — the full DEMO script works on the deployed site at 360/1100 px, including validated real day-12 EVA/Inventory AI tags and template toggles. Complete real-clock browser checks save/reload separately from synthetic telemetry. T27/P10 remains unstarted.

- [x] **T26 audit — user-requested review of completed work**
  Review T01–T26, reproduce and fix defects, remove unused scaffolding, and verify regressions. Scope authorized separately by the user; T27–T33 remain unchanged. Findings and verification are recorded in NOTES.md.

---

## P10 — Verification

- [x] **T27 Scenario acceptance tests**
  Write `tests/unit/scenario.test.ts` covering **every row and every additional check** in DEMO.md §2 (including poor-quality, frozen baseline, live-check isolation, banned words).
  **Done when:** all pass and are included in `npm run test`.

- [x] **T28 E2E flow**
  Write one Playwright test (`tests/e2e/demo.spec.ts`) against `npm run preview` that routes `/api/explain` to a fixed mocked response so it is deterministic: load → advance to day 12 → assert "Review recommended" → open EVA-07 and INV-03 and assert different text → assert the AI tag, then the toggle → log schedule change → advance to day 16 → assert "Within your usual range" and the trend chip → reload and assert persistence. Add a second short case where `/api/explain` fails and the template tag shows.
  **Done when:** `npm run e2e` passes headless.

- [x] **T29 Bug-fix and review pass**
  Fix everything logged in `NOTES.md`. Review the full diff since Checkpoint A for logic errors, hard-rule violations (AGENTS.md §3), hex values outside tokens, and banned words.
  **Done when:** `npm run typecheck && npm run test && npm run e2e && npm run build` all pass and `NOTES.md` has no open defects.

---

## P11 — Offline, polish, docs

- [x] **T30 PWA offline shell**
  Add `vite-plugin-pwa` with a precache of the app shell, a manifest (name "Kairos Monitor", `theme_color` and `background_color` `#171D1C`), and two generated icons (192, 512; DESIGN.md §9). Precache `/fonts/*`. The service worker must **never cache `/api/*`** (explanations are cached in Dexie instead). Register the service worker.
  **Done when:** after one online load, turning the network off in DevTools and reloading still shows Today with template or previously cached AI text; checks still run and save.

- [x] **T31 Polish pass**
  Go through the DESIGN.md §10 checklist and fix every item. Verify at 360 px and at 1100 px. Verify keyboard use of the reaction test and focus rings.
  **Done when:** the checklist is fully ticked.

- [ ] **T32 README, LICENSE and third-party table**
  Finish `README.md` (run, test, deploy, offline note, honesty notes, team roles, future work). Add a `LICENSE` file (MIT or Apache-2.0; the Space Apps terms require an OSI-approved license or free availability). Add a "Third-party materials" table with name, purpose and license for React, Vite, Dexie, Recharts, vite-plugin-pwa, react-router-dom, Vitest, Playwright, Satoshi (check the Fontshare license text), the Gemini API (service), and the NASA references. Add a disclosure that Codex and Gemini were used.
  **Done when:** a new reader can run the app from the README alone and every non-NASA material has a license listed.

- [ ] **T33 Final check and recording**
  Run `npm run typecheck && npm run test && npm run build && npm run e2e`. Run the 90-second script by hand once on the deployed URL. Record the screen capture.
  **Done when:** everything passes, the deployed URL matches the local build, and the recording exists.

**Checkpoint C:** PARTIAL - offline support and local recordings verified; project LICENSE choice and by-hand deployed rehearsal remain required and unverified. T32/T33 stay unchecked. Final verification evidence is in NOTES.md.

---

## Stretch (only if all of the above is done)
- [ ] S1 Re-baseline button with confirm dialog (SPEC.md §6)
- [ ] S2 Working-memory (n-back) check (SPEC.md §14)
- [ ] S3 Synthetic HRV supporting-context chart

---

## Log

T33 partial - Final application 7d07a85 deployed READY; 16 public asset hashes and 24 public browser checks pass. Local 583 unit/54 browser checks plus eight explained opt-ins; seven final affected cases pass. Two actual isolated recordings validated. By-hand public rehearsal remains unverified; T32 LICENSE decision still pending, Checkpoint C PARTIAL.

T32 partial - README, verified third-party table and isolated recording checklist prepared; typecheck/583 unit tests pass. Required LICENSE remains pending the owner's MIT/Apache-2.0 choice; task stays unchecked. Authorized independent T33 verification proceeds with this blocker visible.

T31 - Completed DESIGN checklist at 360/1100 px; fixed landing disclaimer, chart-axis units and offline-notice layout. 583 unit tests/typecheck/build, 15 affected browser cases and two final polish cases pass; no supplied video, static fallback retained.

T30 - Production-only manifest/generated icons and precached shell/fonts; API excluded, updates wait for all tabs to close. 583 unit tests, typecheck/build and actual network-blocked offline/check/update browser evidence pass; NOTES records first-visit and device limits.

T27 — Mapped every DEMO acceptance row/additional check to existing evidence; added scenario.test.ts for full-sequence packet values/provenance, poor-window reasons/AI exclusion and persisted later-edit baseline freeze. Typecheck and 574 unit tests pass; current engine timings below 20 ms recorded in NOTES. T28 follows.
T28 — Added fixed-response full journeys at 360/1100 px and API-failure fallback; both complete checks, cache/live isolation, reloads and reset verified. Typecheck, 574 unit tests, build and 46 local browser checks pass; eight opt-ins explained in NOTES. T29 follows.
T29 — Reviewed changes since Checkpoint A, fixed malformed response-log reads without deleting data, and deployed reviewed code 4d1b7e5. Typecheck/build, 583 unit tests and 48 local checks pass; 21 distinct public checks verified across recorded runs, timing limits disclosed. P10 PASS; next P11, T30 not begun.

T26 audit — User-requested review fixed reaction duplicate input, live record validation/ordering/comparison quality and contrast/cursor defects; removed unused scaffold/CSS/save cache and corrected README. Typecheck/build, 558 unit tests, 43 local browser checks and 16 public checks pass; nine relevant local checks repeated after final wording changes. Redeployed the existing demo; T27 remains next.

T15 — Mission renders the sorted current-evidence task comparison, persisted response history/future-entry labels and guarded recovery. 342 unit tests and 12 Chromium checks pass; typecheck/build pass. Screenshots saved, no redeployment; T16/P6 has not begun.

T14 — Today now renders packet status, separate measurement evidence/provenance, next task, template explanation and actual availability; official Satoshi installed locally. 338 unit tests and 8 Chromium checks pass; typecheck/build pass. No T15/P6 work in this commit.

T13 — One shared React store/provider, serialized persisted simulator mutations, filtered engine packets and temporary shell preview; 22 added unit tests (326 total), 5 production/3 StrictMode browser checks, typecheck/build passed — state, preview/controls/badge, shell/CSS, state/browser tests, NOTES, PLAN.

T12 — Transactional Dexie seed/frozen baseline, explicit persisted check kinds, validated helpers and unavailable-storage state; 38 added tests (304 total), typecheck/build passed — db.ts, config input limits, persistence tests, package/lock, NOTES, PLAN.

T11 — Full-precision nullable evidence packets, task-specific neutral templates, exact-footer exemption and non-causal trend guard; 89 added tests (266 total), Checkpoint A engine PASS, typecheck/build passed — evidence.ts, templates.ts, types/config/detection evidence, packet/template/integration tests, NOTES, PLAN.

T10 — Current-evidence task classification, relevant-domain isolation, low-demand cap and instance metadata; 22 added tests (177 total), typecheck/build passed — taskContext.ts, types.ts, domain guard, task tests, NOTES, PLAN.

T09 — Overall status with missing-baseline/domain precedence and complete day-table coverage; 23 added tests (155 total), typecheck/build passed — detect.ts, config.ts, status tests, NOTES, PLAN.

T08 — Pure calendar-window detection, tri-state partial OR criteria and current-day evidence/exclusions; 46 new tests (132 total), typecheck/build passed — detect.ts, types.ts, shared quality filters, detection tests/oracle, NOTES, PLAN.

T07 acceptance completion — Adopted DEMO baseline oracle verified under both explicit quality kinds; source isolation/immutability and insufficient-count tests passed; 5 added tests (86 total), typecheck/build passed — tests/unit/scenario-baseline.test.ts, NOTES, PLAN.

T05 — Adopted supplied DEMO.md verbatim; exact 17-day synthetic records, task library and schedule; 9 new data tests (81 total) and typecheck/build passed — DEMO copies, engine/scenarios.ts, tests/unit/scenario-data.test.ts, NOTES, PLAN.

T07 — Pure caller-timed baseline with full-precision means, source/quality/window/metric exclusions and immutable inputs; 25 fixture baseline tests (72 total) and typecheck/build passed; official scenario verification blocked — engine/baseline.ts, tests/unit/baseline.test.ts, NOTES, PLAN.

T06 — Pure quality/exclusion helpers with explicit test kind, preserved flags and numeric validation; 47 unit tests and typecheck/build passed — engine/quality.ts, tests/unit/quality.test.ts, NOTES, PLAN.

T04 — Strict specification types and centralized detection/baseline/quality/task constants; typecheck/build passed, test command ran (0 unit tests); T05 missing-data dependency recorded — engine/types.ts, engine/config.ts, NOTES, PLAN.

T03 — Vercel production READY, public shell and four hard-refresh routes verified at 360/1100 px; API paths excluded, deployed assets match local build — vercel.json, .vercelignore, README, NOTES.

T02 — Exact tokens, font fallback, responsive four-route shell and footer; typecheck/build and 2 foundation browser checks passed, all route screenshots inspected — styles, shell/screens/components, routing dependency, Playwright checks, README, NOTES.

T01 — React 18 scaffold, strict app/config typecheck, separate test runners, empty unit suite (0 tests), production build and Chrome dev-page check passed — app/config files, package lock, canonical docs, README, NOTES.
T02 — Exact design tokens, local font declarations, responsive shell and four placeholder routes; typecheck/build and 2 foundation browser checks passed at 360/1100 px — src, package lock, Playwright config/checks, NOTES.
(Agent: add one line per completed task: `T## — what changed — files touched`.)

---

## Usage-reset handoff (read this when a fresh session starts)
1. Open `AGENTS.md`, `SPEC.md`, and this file.
2. Run `git log --oneline -10` and `npm run test` to see the current state.
3. Resume at the first unchecked task. Do not redo ticked tasks.
4. If the last commit left tests failing, fix those first.

T16 — Pure conservative explanation validation and versioned canonical cache material added. All original tests preserved; 396 unit tests, typecheck and build pass.

T17 — Server-only Gemini REST endpoint with exact synthetic packet validation, bounded per-IP limiting, deadlines and output validation. 434 unit tests, typecheck and build pass; real calls deferred to T19.

T18 — Immediate templates plus validated synthetic-only AI/cache integration, metadata, bounded requests/cache, stale guards and accessible toggles. 465 unit tests and 16 Chromium checks pass; typecheck/build pass; all original tests intact.

T19 — Deployment/verification attempted on the existing project/domain; local work committed, but task remains unchecked. Public route/font/persistence/fallback checks pass at both widths; real Gemini acceptance fails (upstream errors/deadlines/rejected output), so no validated EVA/Inventory samples are claimed. T20 has not begun.

T19 repair — Completed the task's real day-12 EVA/Inventory acceptance at both widths: validated provider text, accurate source tags, both template toggles and cached reload. Published guarded extraction/prompt/validator repairs; verified free-tier/account generation before changing Production model to gemini-3.5-flash-lite. 485 unit tests, 16 local browser checks and 2 public core checks pass; typecheck/build pass. Broader desktop real-flow assertion for a separate overall AI call hit the client deadline and correctly retained template; detailed outcomes/limits in NOTES.md. T20 has not begun.

T20 — Recharts evidence charts with saved baseline/config references, separate attention criteria, quality gaps, engine window counts and accessible tables; 496 unit tests and 18 local browser checks pass; typecheck/build pass. T21 is next under the sequential P7 authorization; T22 has not begun.

T21 — Inverted lavender About modal with limitations, NASA references, explicit focus wrap/native inertness, Escape/Close/trigger restoration; existing provenance tags now keyboard/tap disclosures. 498 unit tests pass; original 18 browser checks plus 2 About checks pass; typecheck/build pass. Authorized landing addition follows; T22 has not begun.

P7 landing addition — Standalone root introduction, lazy mission/Trends boundaries, preserved console routes/state, real isolated day-12 preview and original static orbit fallback. No supplied clip: looping video asset pending. 498 unit tests, 24 local browser checks, 8 public mocked-AI P7 checks and public route/API/font/image HTTP checks pass; typecheck/build pass; deployed existing Vercel project at https://kairos-monitor-gamma.vercel.app. Screenshots/asset provenance/routing documented. P7 complete; next P8/T22, which has not begun.

T22 — Pure measured-trial reaction/attention scoring and seeded schedules; null unmeasured metrics, explicit denominators and quality/exclusion reasons. Documented SPEC timing constants added without changing existing thresholds. 523 unit tests and typecheck pass; go/no-go false-start quality policy remains an explicit unresolved prerequisite for valid live attention persistence, never filled with a fabricated zero.

T23 — Full-viewport reaction interface, 25 seeded waits with measured monotonic RT, keyboard/pointer guards, frame-gated onset, interruptions/cancel/restart cleanup, raw summaries and explicit idempotent live saving. 529 unit tests, typecheck/build and 3 controlled-timing browser checks pass. T24 follows; T25 has not begun.

T24 — Measured 30-go/10-no-go interface with 800 ms exposure/400 ms gaps, shape cues, focused error denominators and common SPEC false-start quality rule. Final P8: 542 unit tests, 32 local browser checks and typecheck/build pass; four opt-in provider/deployment checks skipped. Typed live saves, reload, duplicate prevention and unchanged synthetic baseline/day-12 task results verified. No deployment; next P9, T25 has not begun.

T25 - Completed Check cards, full-protocol unsaved practice, quality/history/provenance and separate first-three live baselines; focus restoration and reduced-motion interaction feedback. 546 unit tests, 39 local browser checks, typecheck/build pass; four opt-in public/provider checks skipped locally. T26 follows.

T26 — Redeployed the existing public project; full real-provider pitch passes at both widths, five public mocked-AI checks and two real-clock protocol/history checks pass. 546 unit tests, 39 local browser checks and typecheck/build pass; assets/fonts match production. Harness defects corrected and measured durations recorded in NOTES; next T27.
