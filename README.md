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
6. **Offline-first** — checks, storage, calculations and template explanations run without internet.

## What you can do in the demo
- Step through a 17-day synthetic mission (Advance / Back / Jump / Reset).
- Watch status move from *Within your usual range* → *Change noted* (day 11) → *Review recommended* (day 12) → back to usual (day 16).
- Compare **EVA-07** and **INV-03** on day 12 and see different task-context explanations.
- Run a real **reaction check** and **attention (go/no-go) check** in your browser; results stay on your device.
- Log a rest adjustment and view the recovery comparison (no causation claimed).

See [`DEMO.md`](DEMO.md) for the 90-second script and the full acceptance table.

## Screens
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
| Offline shell | PWA + service worker (`vite-plugin-pwa`) |
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

## Foundation setup (P1)

The current milestone contains the application shell only. The demo features described above are planned, not yet implemented. Canonical project documents live in the workspace root; the supplied originals remain under `Kairos Monitor/MD files/`.

Use Node.js 22.12 or newer (Node 24 was used here), then `npm ci` and `npm run dev`. Run `npm run typecheck`, `npm run test`, and `npm run build`; `npm run preview` serves `dist/`. Vitest currently reports zero unit tests honestly. Playwright is configured separately; the future full demo flow has not been implemented or verified.

Add the licensed Satoshi Regular, Medium, and Bold `.woff2` files manually to `public/fonts/` with the filenames from DESIGN §2.4. Until then, the prescribed system fallback is used. DEMO.md is missing and must be supplied before T05.

Future Gemini configuration uses server-only `GEMINI_API_KEY` and `GEMINI_MODEL`. The P1 shell needs neither variable, contains no endpoint, and makes no model requests. Keep local values in an ignored `.env` file; never use a `VITE_` prefix.

The P1 shell now has Today, Check, Trends and Mission placeholder routes. The mission simulator is not connected yet. About is visibly unavailable until P7. Satoshi files are still absent; the system fallback is used.

For foundation browser checks, run `npx playwright install chromium`, `npm run build`, then `npm run e2e`. The two shell checks exercise every route at 360 px and 1100 px and save screenshots to ignored `test-results/`. They do not exercise the future demo, engine, cognitive tests or offline PWA.

The verified P1 production shell is at https://kairos-monitor-gamma.vercel.app. Vercel builds with `npm ci` and `npm run build`, serves `dist/`, and rewrites the four shell routes for direct entry and refresh. `/api/*` is excluded; Gemini integration remains a later milestone.

For an already linked project, deploy with `vercel deploy --prod --scope team_DUWOMMwlvCPNLaA6EusnFka2`. Verify the public site with `PLAYWRIGHT_BASE_URL` set to its production URL and `npm run e2e` (the checks use a fresh browser context with no protection bypass). Local Vercel metadata and environment files are ignored. Deployment details and outstanding document/font gaps are recorded in NOTES.md.
