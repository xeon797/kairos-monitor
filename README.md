# Kairos Monitor — Personalized Astronaut Functional Readiness & Early-Warning System

> Readiness before the next task. (*Kairos*: the right moment.)
> NASA Space Apps Challenge 2026 prototype · Team Requiem_SUST

**One sentence:** Compare each astronaut with their own stable baseline, connect changes in sleep and measured cognitive performance to upcoming mission tasks, and prompt a human review before demanding work such as an EVA.

⚠️ **This is a research and demonstration prototype. It does not diagnose, prescribe, or decide whether anyone is cleared for duty. All mission telemetry is synthetic.**

---

## The problem
An astronaut can feel capable while sleep and attention are deteriorating. A dashboard of isolated measurements leaves the crew to work out what those changes mean for the next task.

## Our approach
1. **Personal baseline** — a frozen baseline from the astronaut's own stable period (days 1–7).
2. **Sustained-change detection** — a deviation counts only when it appears on at least 3 of the last 5 days, so one bad night does not trigger anything.
3. **Task-aware context** — the same observations produce different guidance for an EVA than for routine inventory.
4. **Explainable by design** — every status shows its numbers, thresholds, window, and data provenance.
5. **Human review** — the system prompts reassessment and logging of rest or workload adjustments. It never gives clearance decisions.
6. **Offline-first** — checks, storage, calculations and template explanations run without internet once the app is loaded. Offline page reload requires the planned PWA shell (T30).

## What you can do in the demo
- Step through a 17-day synthetic mission (Advance / Back / Jump / Reset).
- Watch status move from *Within your usual range* → *Change noted* (day 11) → *Review recommended* (day 12) → back to usual (day 16).
- Compare **EVA-07** and **INV-03** on day 12 and see different task-context explanations.
- Run a real **reaction check** and **attention (go/no-go) check** in your browser; results stay on your device.
- Log a rest adjustment and view the recovery comparison (no causation claimed).

See [`DEMO.md`](DEMO.md) for the 90-second script and the full acceptance table.

## Screens

The public introduction is at `/`. **Launch demo** opens `/today` while preserving the saved mission day. The console wordmark returns to the introduction. Direct `/today`, `/check`, `/trends` and `/mission` routes support hard refreshes. The landing page does not initialize mission storage or request Gemini. Landing asset provenance and the pending video slot are documented in [public/images/README.md](public/images/README.md).

| Screen | Job |
|---|---|
| Today | Current status, evidence by domain, next task, data availability |
| Check | Reaction and attention tests, history, quality flags |
| Trends | Sleep, reaction and attention vs baseline with criterion lines |
| Mission | Upcoming tasks with task-specific concern and review prompts |

## How the engine works
`Collect → Compare → Detect → Contextualize → Explain`

- **Collect:** timestamps/days, units, source labels (`synthetic` / `live`), quality flags.
- **Compare:** deviations against the frozen baseline.
- **Detect:** sleep (≥ 1.0 h below baseline or ≥ 90 min midpoint shift), reaction (median RT ≥ 8% above baseline), attention (lapses or commission errors ≥ 2 above baseline). A domain is *sustained* when met on ≥ 3 of the last 5 days.
- **Contextualize:** each task has a demand level and relevant domains; low-demand tasks are capped at "Change noted".
- **Explain:** deterministic templates by default; Gemini rephrases the same evidence when online (every output is validated; the template is the fallback) and can never change the classification, invent numbers, or decide clearance.

All thresholds are in `src/engine/config.ts` and are **experimental and illustrative**.

## Tech stack
| Layer | Choice |
|---|---|
| Interface + logic | React, TypeScript, Vite |
| Local storage | IndexedDB via Dexie |
| Offline shell | Planned in T30; no service worker yet |
| Graphs | Recharts |
| Typography | Satoshi (self-hosted, so it works offline) |
| AI explanation | Server-side Gemini API (plain `fetch`) with validated template fallback |
| Verification | Vitest + Playwright |
| Engineering | Git, Codex for implementation, Claude for review |

## Getting started
```bash
npm install
npm run dev          # http://localhost:5173
npm run test         # unit tests (engine + scenario acceptance)
npm run build && npm run preview
npm run e2e          # Playwright end-to-end flow
```

AI explanation via Gemini (server-side only; never commit keys; set the same variables in your Vercel project settings):
```bash
cp .env.example .env
# set GEMINI_API_KEY and GEMINI_MODEL in .env or in your host's environment variables
```
Without a key or without network, the app uses template explanations automatically.

## Project docs
| File | Purpose |
|---|---|
| `SPEC.md` | Behavior, data model, detection rules |
| `DESIGN.md` | Screens, wording, palette, Satoshi typography, components |
| `DEMO.md` | Scenario data, acceptance table, 90-second script |
| `PLAN.md` | Ordered build tasks |
| `AGENTS.md` | Instructions for the coding agent |

## Scientific grounding and honesty notes
- NASA identifies sleep loss, circadian disruption and work overload as risks to health and performance [1]. NASA has also developed *Cognition*, a computerized neurocognitive assessment toolkit [2]. This project builds on those established problem areas; it does not invent sleep monitoring or cognitive testing.
- **Thresholds and task classifications are experimental.** They are not validated clinical or flight criteria.
- **A short browser assessment is not NASA Cognition** and is not a validated flight assessment. Device latency, practice effects and interruptions affect results.
- **Mission telemetry is synthetic** and labeled as such. The recovery scenario is illustrative and is **not** evidence that an intervention works.
- **HRV**, where mentioned, is supporting context and not a standalone measure of readiness.
- **Novelty** relative to prior work remains a claim to test.
- Missing or poor-quality data shows as *Insufficient data*, never as nominal readiness.

## Future work
Wearable integration · cloud synchronization · multiple crew members · validated, task-specific thresholds with domain experts · working-memory (n-back) check · HRV as supporting context · formal usability testing.

## Team roles
- Science/product owners: define what signals mean and the thresholds
- Implementation: Codex, following `SPEC.md` and `PLAN.md`
- Reviewer: checks logic and edge cases
- Design/demo owners: make the astronaut story clear

## References
1. NASA — Risk from Inadequate Sleep and Irregular Schedules (nasa.gov sleep risk overview).
2. NASA TechPort — Individualized Real-Time Neurocognitive Assessment Toolkit for Space Flight Fatigue: https://techport.nasa.gov/projects/23228

## License
Add a license of your choice (e.g. MIT) before publishing, as required by the challenge rules.

## Current implementation and verification

Tasks T01–T26 are complete. The deployed demo is [Kairos Monitor](https://kairos-monitor-gamma.vercel.app). It includes all four console screens, the frozen synthetic baseline, task explanations with optional Gemini rephrasing, response logging, and complete live reaction and attention checks. Live history and separate first-three-valid-check baselines stay on this device and never enter mission calculations or Gemini requests.

Use Node.js 22.12 or newer, then `npm ci`. Install the test browser with `npx playwright install chromium`. Run `npm run typecheck`, `npm run test`, `npm run build`, then `npm run e2e`. Playwright starts the production preview automatically. Its default suite uses mocked AI and controlled clocks; explicit opt-in provider and real-clock tests are documented in their test files and NOTES.md. Unit tests cover engine scenario acceptance, scoring, persistence and explanation validation. Browser tests cover both 360 px and 1100 px layouts, navigation, full checks and the demo script.

Add Satoshi Regular, Medium and Bold `.woff2` files manually to `public/fonts/` using the filenames in DESIGN §2.4. Font files are not committed; the system fallback works without them. No fonts are loaded from a CDN.

Plain `npm run dev` serves the client without the serverless endpoint and uses templates. For Gemini, configure `GEMINI_API_KEY` and `GEMINI_MODEL` only in the server environment of the existing Vercel project. Never prefix the key with `VITE_`. The endpoint accepts only synthetic evidence; unavailable, timed-out or invalid responses silently retain the template.

The app currently supports in-session operation without API calls or network access. A fresh offline visit or offline reload is not supported until T30 adds the service worker. Remaining verification, polish and final documentation tasks stay tracked in PLAN.md. Historical verification results and known limitations are in NOTES.md.
