# AGENTS.md — Instructions for the coding agent

Project: **Kairos Monitor — Personalized Astronaut Functional Readiness & Early-Warning System**
(NASA Space Apps prototype by Team Requiem_SUST. Offline-first, explainable, synthetic demo data.)
Use the name **Kairos Monitor** in all UI text, the page title, the PWA manifest and the README.

## 0. Read these first, in this order
1. `AGENTS.md` (this file)
2. `SPEC.md` — source of truth for behavior and numbers
3. `PLAN.md` — ordered task list; do the first unchecked task only
4. `DESIGN.md` — screens, wording, visual rules
5. `DEMO.md` — the 90-second demo script and acceptance checks

If any file conflicts with another, `SPEC.md` wins, then `DEMO.md`, then `DESIGN.md`.
If something is not specified, **pick the simplest option, note it in `NOTES.md`, and continue**. Do not stop to ask unless a task is blocked.

## 1. Stack (do not change without asking)
- React 18 + TypeScript (strict) + Vite
- Dexie (IndexedDB) for local persistence
- `vite-plugin-pwa` for offline shell (LAST priority, see PLAN.md)
- Recharts for graphs
- Vitest for unit tests, Playwright for one end-to-end flow
- AI explanation: one serverless function `api/explain.ts` calling the Gemini REST API with plain `fetch` (no SDK, no new dependency). Key and model come only from server environment variables. Always with a template fallback.
- Plain CSS (CSS variables in `src/styles/tokens.css`, copied from `DESIGN.md §2.7`). No UI framework, no Tailwind, no component library.
- Font: **Satoshi**, self-hosted from `public/fonts/` via `src/styles/fonts.css` (see `DESIGN.md §2.4`). The user adds the font files manually from Fontshare. If the files are missing, write the `@font-face` rules anyway and rely on the fallback stack. Never load fonts from a CDN (the app must work offline). Only weights 400, 500, 700.

Do **not** add dependencies beyond: `react`, `react-dom`, `dexie`, `recharts`, `vite-plugin-pwa`, `vitest`, `@playwright/test`, `fake-indexeddb` (tests only), and `react-router-dom`. Ask before adding anything else.

## 2. Folder structure
```
src/
  engine/            # pure TypeScript, NO React, NO browser APIs, NO network
    types.ts
    baseline.ts
    detect.ts
    taskContext.ts
    templates.ts     # template explanations
    validateExplanation.ts # pure checks on LLM text (banned words, foreign numbers, length) + cache key
    scenarios.ts     # synthetic 17-day timeline (exact numbers from SPEC.md / DEMO.md)
    config.ts        # ALL thresholds live here and nowhere else
  db/
    db.ts            # Dexie schema + helpers
  checks/
    ReactionTest.tsx
    GoNoGoTest.tsx
    scoring.ts       # pure functions scoring raw trials
  screens/
    Today.tsx
    Check.tsx
    Trends.tsx
    Mission.tsx
  components/        # StatusCard, TaskCard, EvidenceList, SyntheticBadge, SimControls, TrendChart
  ai/
    explainClient.ts # calls /api/explain (4 s timeout), caches in Dexie, validates, falls back to template
  state/
    useApp.ts        # simple store (React context or zustand-free custom hook)
  styles/
    tokens.css       # exact copy of DESIGN.md §2.7
    fonts.css        # Satoshi @font-face rules
    app.css
  App.tsx
  main.tsx
api/
  explain.ts         # optional Gemini call (server side only)
tests/
  unit/              # vitest
  e2e/               # playwright
public/
  icons/             # PWA icons
  fonts/             # Satoshi .woff2 files (added by the user)
```

## 3. Hard rules (never break)
1. **Engine is deterministic and pure.** `src/engine/*` must not import React, `window`, `fetch`, `Date.now()`, or `Math.random()`. Time and randomness are passed in as arguments.
2. **All thresholds live in `src/engine/config.ts`.** No magic numbers elsewhere. Every threshold is labeled `experimental, illustrative` in a comment.
3. **Never output "cleared", "fit for duty", "safe", "unfit", "diagnosis", "impaired", "fatigued" (as a medical claim), or any prescription.** Allowed wording is in `DESIGN.md §5`. Add a unit test that scans all template strings for banned words.
4. **Missing or poor-quality data must never look like "all good".** Show `Insufficient data`, never a green state.
5. **The baseline is frozen.** Computed once from days 1–7 (or from the first N valid observations). It never rolls forward automatically. Re-baselining requires an explicit user action with a confirm dialog.
6. **The LLM never decides anything.** The engine produces a structured `EvidencePacket`. The LLM may only rephrase it into plain language. It must not add numbers, change the status, or give advice beyond "review". If the API fails or there is no network, use the template explanation silently.
7. **Synthetic data is always labeled.** Every screen that shows simulated telemetry shows the `SyntheticBadge`. Live browser-test results are labeled `Live browser test`.
8. **No secrets in the repo.** API keys only in `.env` (git-ignored) and the hosting provider's environment variables. Never prefix the Gemini key with `VITE_`.
9. **Offline by design.** Checks, storage, engine and template explanations must work with no network. The app must never block on a network call.
10. **Small changes.** One PLAN.md task at a time. Do not refactor unrelated files. Do not rename files or move folders unless the task says so.
11. **Colors come from tokens only.** No hex values in components or CSS outside `tokens.css`. Use only the tokens in `DESIGN.md §2.7`. Indigo is never text on dark; button text is `#FFFFFF`. No red anywhere. Status is never color alone (icon + label).

## 4. Working loop (every task)
1. Read the first unchecked task in `PLAN.md`.
2. Implement only that task.
3. Run: `npm run typecheck && npm run test` (and `npm run build` if the task touched config or routing).
4. Fix failures. Do not delete or weaken tests to make them pass.
5. Tick the task in `PLAN.md`, add one line under "Log" with what changed.
6. Commit: `git add -A && git commit -m "<task id>: <short message>"`.
7. Stop and report: what was done, what is next, anything uncertain. Keep the report under 8 lines.

## 5. Commands (create these npm scripts in task T01)
- `npm run dev` — Vite dev server
- `npm run build` — production build
- `npm run typecheck` — `tsc --noEmit`
- `npm run test` — `vitest run`
- `npm run e2e` — `playwright test`
- `npm run preview` — serve production build (used by Playwright)

## 6. Code style
- TypeScript strict, no `any` (use `unknown` + narrowing).
- Functions small and named by what they return: `computeBaseline`, `evaluateDomains`, `evaluateTask`.
- Engine functions take plain data in and return plain data out. Write them so a unit test needs no mocking.
- Units in names: `sleepHours`, `rtMs`, `midpointMinutes`.
- Dates: store the simulated mission day as an integer `day` (1–17). Store real timestamps as ISO strings in UTC for live checks.
- Prefer clarity over cleverness. Comments explain *why*, not *what*.

## 7. Data provenance (must be preserved everywhere)
Every observation carries: `source` (`synthetic` | `live`), `quality` (`good` | `poor` | `missing`), `unit`, `timestamp` or `day`. The UI must be able to show where any number came from.

## 8. Things that are out of scope tonight
Wearable integration, cloud sync, multiple astronauts, authentication, real NASA data ingestion, model training, push notifications. Do not build them. Mention them in README "Future work" only.

## 9. If you are stuck
- Time-box any single problem to ~10 minutes. If still stuck, implement the simplest fallback, note it in `NOTES.md`, and move on.
- A working, simple demo beats a clever broken one.

## 10. Definition of done for the whole project
- The `DEMO.md` acceptance table passes (unit-tested for the engine, e2e for the flow).
- `npm run build` succeeds and the deployed site loads.
- Core loop works with the network disabled (after PWA task) or at minimum with no API calls.
- README is complete with honesty notes.
