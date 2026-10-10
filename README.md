# Kairos Monitor

Personalized Astronaut Functional Readiness & Early-Warning System ? NASA Space Apps prototype by **Team Requiem_SUST**.

Compare observations with a frozen personal baseline, identify sustained changes and explain their relevance to upcoming tasks. **All mission telemetry is synthetic; thresholds and task classifications are experimental and illustrative.** Task decisions remain with the crew and mission team.

[Open the demo](https://kairos-monitor-gamma.vercel.app) ? [Scenario and 90-second script](DEMO.md) ? [Verification and limitations](NOTES.md) ? [Third-party materials](THIRD_PARTY.md)

## Run from a fresh checkout

Use **Node.js >=22.12.0** and npm. The pinned versions are in package-lock.json.

```sh
npm ci
npx playwright install chromium
```

Obtain your own official Satoshi webfonts before building/testing the final presentation. On Windows, from the repository root:

```powershell
powershell -File scripts/install-satoshi.ps1
```

On other systems, download [Satoshi from Fontshare](https://www.fontshare.com/fonts/satoshi), read its included ITF Free Font License, and copy the unmodified `Satoshi-Regular.woff2`, `Satoshi-Medium.woff2` and `Satoshi-Bold.woff2` to `public/fonts/`. Only weights 400/500/700 are used. The installer retains the license in `.local/satoshi-download/Satoshi_Complete/License/FFL.txt`. Binaries are Git-ignored: each recipient obtains their own copy. Self-hosting for the licensee's own app and normal logo/image use are permitted; repository redistribution/modification is restricted. See [font instructions](public/fonts/README.md) and [third-party terms](THIRD_PARTY.md). No runtime CDN fonts. Without fonts the app uses its system fallback, but final font/offline acceptance checks expect the three installed weights.

```sh
npm run dev
```

Open the URL Vite prints (usually http://localhost:5173). Development deliberately has **no service worker**. Vite dev and preview are static client servers; neither runs `api/explain.ts`. They use templates unless a test explicitly mocks AI. Gemini is optional for explanations, never needed for classification.

```sh
npm run typecheck
npm run test
npm run build
npm run e2e
npm run preview -- --host 127.0.0.1 --port 4173
```

Playwright starts production preview automatically for `npm run e2e`; build first. Default checks use fresh browser storage, mocked AI and controlled cognitive clocks at 360/1100 px. The production worker remains enabled for offline tests. Tests never reset your regular browser's data. Unit tests cover the full scenario, scoring, malformed storage, quality exclusions, frozen baseline and explanation contracts. Offline cases use **actual browser network blocking**, remove AI mocks before disconnecting, and assert service-worker document responses.

## What the demo shows

The landing `/` opens independently of mission storage; **Launch demo** enters Today and preserves existing saved state. Console routes `/today`, `/mission`, `/trends`, `/check` support direct loads and hard refreshes. About discloses provenance and limitations.

Synthetic days 1?7 establish one frozen baseline: sleep **7.214285714 h**, midpoint **180 min**, reaction **265 ms**, lapses **1**, commission errors **1.285714286**. Full-precision calculations, not rounded displayed cutoffs, drive the engine. Advancing days does not roll or replace the baseline. Reset returns to day 7 and clears schedule-change responses, retaining the frozen baseline, live results and explanation cache.

A criterion must be met on at least **3 of the last 5 days**, with at least 3 evaluable observations per domain. Poor/missing data is excluded with a reason; unavailable evidence shows **Insufficient data**. At day 11: **Change noted**. Day 12: **Review recommended**, with sleep/reaction/attention counts **4/5, 3/5, 3/5**. On Mission, **EVA-07: Review recommended**, **INV-03: Change noted**, both in 2 days: task demands/relevant domains differ. Log a schedule change on day 13; day 15 has 2 sustained domains, day 16 has 0 and Today shows **Within your usual range**. The recovery chip says **Measures moving toward baseline**, alongside **This comparison does not show that the adjustment caused the change.**

Checks measure on this browser: 25 reaction trials with random 1.5?4 s waits; 40 attention stimuli (circle go, square no-go; 800 ms exposure/400 ms gap). Reaction duration varies; do not promise a 45-second run. A result is stored only after **Save result**; practice and cancelled/unfinished sessions are never saved. Blur/visibility interruptions affect quality; missing results are not normal results. Live records keep actual UTC timestamps, explicit test kinds and no mission day. Separate live comparison baselines use the first three valid results **of that same kind**. Live results never enter the synthetic baseline, charts, task calculations or Gemini requests.

## Gemini and deployment

`api/explain.ts` calls Gemini REST with plain fetch, using server-only **GEMINI_API_KEY** and **GEMINI_MODEL**. `.env.example` lists names, never values. Never use a `VITE_` key, commit credentials or copy them into client build configuration. Plain Vite does not run this function; use the deployed Vercel project or a separately configured Vercel development environment for the endpoint.

The deterministic template renders immediately. The model can only rephrase structured synthetic evidence; client/server validation rejects changed statuses, foreign numbers, prohibited claims or excessive text. Bounded provider/client timeouts, rate limits and invalid/unavailable responses silently retain the template. A validated response is cached in Dexie by the versioned canonical evidence key with model/time metadata, at most 50 entries and seven days; cache entries are revalidated on read. UI tags are **Template explanation** or **AI-rephrased from the same evidence**, with **Show template version** when AI is available. Cached AI retains its AI source offline; an uncached packet uses the template. A tag is not proof of a fresh provider call.

Deploy to the **existing** Vercel project `kairos-monitor`; preserve its Production server variables. Install fonts locally first. The Vercel CLI is an external deployment tool, not an app dependency:

```sh
vercel deploy --prod --yes --scope team_DUWOMMwlvCPNLaA6EusnFka2
```

The repository is already locally linked through ignored `.vercel/project.json`; a new machine must link/select that existing project before deploying, not create another one. `vercel.json` selects Vite/npm ci/build/dist and rewrites only the documented SPA routes; API/static/worker paths remain independent. CLI uploads include the locally installed fonts; a Git-based build must arrange its own permitted font installation or will use fallback. Verify the deployed index, hashed assets, fonts, icons, manifest and worker against the reviewed build. Do not expose environment values while checking configuration.

## Offline capabilities and updates

**An initial online visit is required.** On HTTPS (or localhost), wait for **Available offline on this browser after the initial online visit.** The production worker precaches the app shell, every lazy route chunk, local fonts, icons, manifest and static preview. Then landing/console route reloads, navigation, simulator, Trends, About, both checks and explicit local saves work with the browser network blocked. Dexie state and the frozen baseline survive offline/online reloads. The worker never caches `/api/*`; no general runtime API/credential caching. Offline explanation retrieval uses the existing validated Dexie cache or deterministic templates.

A worker update waits while any controlled Kairos Monitor tab remains open. The notice asks you to finish/save checks, close **all** tabs and reopen online. The app does not force skipWaiting, activation or a reload during a test or unsaved result. Saved Dexie data is independent of shell cache cleanup. Keep an active check tab visible; opening other tabs can itself count as a check interruption.

A cold first offline visit cannot install the app. Clearing/evicting browser site storage removes cached access/local data; private sessions may be ephemeral. Installation availability varies by browser/platform. Verified Chromium viewport/PWA behavior is **not physical-device installation evidence**. Development has no offline shell. Large decorative video is not cached; no supplied looping-video asset currently exists, so the finished static orbit fallback remains.

## Verification and presentation

Current local final gate: **583 unit tests /26 files and 54 browser checks PASS**, eight explained opt-ins skipped; typecheck/build PASS. Includes actual network-blocked offline journeys at both widths, two-version/multiple-tab worker lifecycle, cold-first-visit limit, contrast/focus/reduced motion/system-font fallback. The final full-suite/deployment/recording result is recorded under [P11 in NOTES](NOTES.md#p11--offline-polish-documentation-and-recording-2026-10-10). P10's 21 distinct public passing checks span recorded runs and retain their disclosed timing failures; they are not a fabricated single clean run.

Eight inherited opt-in cases remain explicit: two optional broad Gemini diagnostics, two older public diagnostics replaced by current equivalent evidence, two required bounded real-Gemini cases covered by unchanged-path evidence, and two real-clock checks covered by unchanged-protocol evidence. Default mocked AI is never counted as a real provider result. Required real day-12 EVA/Inventory outputs were verified at `45975f5` / `dpl_22HxNAPPvmeioDmN6nvfkvVJtcQN`; relevant AI/scoring behavior is unchanged. Exact samples, timing limits and dispositions are in NOTES. Provider calls are not routinely repeated for UI/PWA/docs changes.

PowerShell examples for intentional verification (environment variables for this process; enable provider calls only when needed):

```powershell
$env:PLAYWRIGHT_BASE_URL='https://kairos-monitor-gamma.vercel.app'
npx playwright test tests/e2e/demo.spec.ts tests/e2e/offline.spec.ts --workers=1
# Bounded real provider: two task outputs per width, explicit quota use
$env:PLAYWRIGHT_P9_PROVIDER='1'
npx playwright test tests/e2e/p9Provider.spec.ts --workers=1
Remove-Item Env:PLAYWRIGHT_P9_PROVIDER
# Real clock: both complete protocols; optional rerun when timing changes
$env:PLAYWRIGHT_P9_REALTIME='1'
npx playwright test tests/e2e/p9Realtime.spec.ts --workers=1
Remove-Item Env:PLAYWRIGHT_P9_REALTIME
Remove-Item Env:PLAYWRIGHT_BASE_URL
```

The broad legacy `deployedGemini.spec.ts`/`publicDeployment.spec.ts` gate is `PLAYWRIGHT_REAL_GEMINI=1`; it can consume additional provider quota and is not needed for normal verification. Follow [DEMO.md](DEMO.md) and [recording checklist](docs/RECORDING.md). Use an isolated profile/context, never reset a user's saved data for presentation. A full live check belongs before/after the 90-second pitch.

## Honest limitations and references

This prototype is not NASA Cognition or a validated clinical/flight assessment. Browser/device latency, practice effects and interruptions affect measurements. Thresholds/task classifications are illustrative, not validated warning criteria. The recovery scenario does not establish causation or intervention effectiveness. HRV is unavailable and supporting context only. Novelty versus prior work remains a claim to investigate. Tests establish software consistency, not astronaut performance, accident prediction or mission suitability. Public loading and acceptable Gemini generation are not guaranteed on every network/request. Corrupt records are preserved and reported unavailable rather than silently erased.

NASA research informs the problem context, without endorsement or NASA data ingestion: [Risk from Inadequate Sleep and Irregular Schedules](https://www.nasa.gov/reference/risk-from-inadequate-sleep-and-irregular-schedules/), [TechPort project 23228](https://techport.nasa.gov/projects/23228). No NASA imagery, logos, datasets or source text are bundled.

## Team roles and AI disclosure

Team **Requiem_SUST** owns the project and presentation. Responsibilities: science/product review of illustrative requirements; design/story and presentation; engineering/testing/deployment; independent review of logic, accessibility and evidence. Individual role assignments are not supplied in this repository, so names/credentials are not invented. Codex assisted implementation, tests, review and documentation under the project instructions. Google's Gemini rephrases synthetic evidence at runtime, always behind validation/template fallback. Neither supplies clinical validation or changes the deterministic classification. Earlier README's unsupported claim of Claude review was removed.

## License and third-party materials

**Project license selection is pending.** PLAN T32 allows MIT or Apache-2.0 but selects neither; a proposed MIT text for original project code/artwork has been prepared for the owner's explicit choice. No existing project license is replaced and no third-party rights are relicensed. [Third-party materials](THIRD_PARTY.md) lists actual package versions, sources, licenses and asset/service restrictions.

## Future work

Wearable integration, cloud sync, multiple crew members, authentication, real NASA data ingestion, model training, notifications, working-memory checks, HRV context, domain-expert validation and formal usability/physical-device testing remain outside this demo. A user-supplied licensed looping-video clip is optional polish, not an implemented feature.

## Project documents

[AGENTS.md](AGENTS.md) defines working rules; [SPEC.md](SPEC.md) is the behavioral/numeric source of truth; [DEMO.md](DEMO.md) gives the authoritative synthetic scenario and pitch; [DESIGN.md](DESIGN.md) records the UI/checklist; [PLAN.md](PLAN.md) tracks task status; [NOTES.md](NOTES.md) records evidence, fixes and limitations.
