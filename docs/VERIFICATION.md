# Kairos Monitor — Verification & Release Status

Recorded results below refer to their stated application revisions. They are historical evidence, not a claim that every check was rerun for each documentation update. Fresh results are logged in [NOTES.md](../NOTES.md).

## Recorded verification and presentation

P11's recorded local gate: **583 unit tests /26 files and 54 browser checks PASS**, eight explained opt-ins skipped; typecheck/build PASS. Includes actual network-blocked offline journeys at both widths, two-version/multiple-tab worker lifecycle, cold-first-visit limit, contrast/focus/reduced motion/system-font fallback. The full-suite/deployment/recording result is recorded under [P11 in NOTES](../NOTES.md#p11-offline-polish-documentation-and-recording-2026-10-10). Application `7d07a85` was verified then: **24 public browser checks PASS**, all 16 runtime asset hashes matched, and two isolated local recordings play. The research-context update `faf5189` is now deployed and verified: fresh typecheck/583 unit tests/build, 12 public browser checks at 360/1100 px and all 16 runtime asset hashes PASS; see R01 in NOTES for evidence and the earlier interrupted connection failures. The old captures do not demonstrate the new About cards. **P11 remains PARTIAL** pending the project LICENSE choice and by-hand public rehearsal. P10's 21 distinct public passing checks span recorded runs and retain their disclosed timing failures; they are not a fabricated single clean run.

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

The broad legacy `deployedGemini.spec.ts`/`publicDeployment.spec.ts` gate is `PLAYWRIGHT_REAL_GEMINI=1`; it can consume additional provider quota and is not needed for normal verification. Follow [DEMO.md](../DEMO.md) and [recording checklist](../docs/RECORDING.md). Use an isolated profile/context, never reset a user's saved data for presentation. A full live check belongs before/after the 90-second pitch.

For closeout, use the [short manual public-rehearsal checklist](../docs/RECORDING.md#short-manual-public-rehearsal-checklist). Recorded automated tests, matching deployment assets and playable local automated captures have separate evidence; the required by-hand public rehearsal and its capture/evidence remain **unverified**, so T33 stays partial. Physical-device installation is also unverified, but is not required for this browser-demo acceptance. The missing looping video is optional; retain the finished static fallback.

## Release acceptance

| Requirement | Recorded status | Evidence / next step |
|---|---|---|
| Local typecheck, unit tests and production build | Passed for research application `faf5189` | R01 in [NOTES](../NOTES.md). |
| Public research, core demo and offline checks | 12 passed at 360 / 1100 px for `faf5189` | R01 public browser evidence in NOTES. |
| Deployed runtime assets | All 16 matched the reviewed build | R01 deployment evidence in NOTES. |
| Original-code license | Pending owner selection | T32 remains partial. |
| By-hand public rehearsal and its capture | Unverified | Follow the [recording checklist](RECORDING.md). T33 remains partial. |
| Physical-device installation | Unverified | Separate from browser-demo acceptance. |
| Decorative looping video | Optional; no supplied asset | Static orbit fallback is implemented. |

Keep T32, T33 and Checkpoint C partial until their remaining required conditions are fulfilled. Automated captures, mocked AI and previous provider outputs must retain their actual provenance.
