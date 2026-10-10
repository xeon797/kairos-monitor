# Contributing to Kairos Monitor

Kairos Monitor is an offline-first NASA Space Apps prototype by Team Requiem_SUST. Changes should remain small, reviewable and consistent with its deterministic evidence model.

## Before making a change

Read [AGENTS.md](AGENTS.md), [SPEC.md](SPEC.md), [PLAN.md](PLAN.md), [DESIGN.md](DESIGN.md) and [DEMO.md](DEMO.md), in that order. SPEC governs behavior and numbers; for conflicting product documents, priority is SPEC, then DEMO, then DESIGN.

Work on the first unchecked PLAN task unless the owner's current request explicitly names a different scope. Implement only that task. Record unspecified choices in NOTES.md and use the simplest solution. Do not start stretch work while required acceptance remains open.

For installation, fonts, endpoint configuration and deployment, follow the [development guide](docs/DEVELOPMENT.md).

## Engineering requirements

| Area | Requirement |
|---|---|
| Engine | Pure deterministic TypeScript. Pass in time/randomness; no React, browser APIs or network calls. |
| Thresholds | Keep every threshold in `src/engine/config.ts`, labeled experimental and illustrative. |
| Baseline | Preserve the stored frozen baseline. Replacement requires an explicit confirmed user action. |
| Quality | Exclude poor/missing observations with reasons; unavailable evidence must show Insufficient data. |
| Provenance | Preserve source, quality, units and mission day or actual UTC timestamp. |
| Live results | Keep test kinds separate; never mix live results into synthetic calculations or Gemini packets. |
| Explanations | Render templates immediately. AI only rephrases validated evidence and never selects a classification. |
| UI | Use approved CSS tokens, exact status wording, visible provenance, icons plus labels and accessible focus. |
| Dependencies | Use only the approved stack; ask before adding anything outside it. |
| Credentials | Keep secrets in ignored environments/server configuration. Never expose a Gemini key through `VITE_`. |
| Assets | Preserve third-party notices. Obtain fonts locally; do not commit restricted font binaries or supplied PDFs. |

[AGENTS.md](AGENTS.md) contains the complete mandatory rules, including prohibited claims and scope boundaries.

## Verify the change

Run from the repository root:

```sh
npm run typecheck
npm run test
```

Run `npm run build` when configuration or routing changes. For user-flow changes, build and run the affected Playwright checks; the default browser suite starts production preview. Use independent expected values for engine tests and retain existing tests. Do not remove or weaken tests to obtain a passing result.

Real-provider and real-clock checks are explicit opt-ins described in [Verification & Release Status](docs/VERIFICATION.md). Mocked text does not count as a provider result; an automated capture does not count as a by-hand public rehearsal. Preserve those distinctions when reporting evidence.

## Record and commit

1. Update PLAN.md with the actual task status and one concise Log entry. Tick a task only after its completion conditions are met.
2. Record relevant decisions, commands, results and remaining limitations in NOTES.md.
3. Review the diff and staged files, including secret and asset exclusions.
4. Commit using the task identifier: `<task id>: <short message>`.
5. Report what changed, what was verified, what is next and any uncertainty in fewer than eight lines.

For a review description, state the problem and resulting behavior, then include relevant validation and unresolved acceptance conditions. Avoid unrelated refactoring, renaming or folder moves.

## Current acceptance boundaries

T32 remains partial until the owner selects the original-code license and the root LICENSE is added. T33 remains partial until the by-hand deployed rehearsal and its capture/evidence are performed. Physical-device installation is unverified; optional looping video is not required for browser-demo acceptance. See [PLAN.md](PLAN.md) and the [recording checklist](docs/RECORDING.md).

Original code, artwork and third-party materials have separate rights. Refer to [THIRD_PARTY.md](THIRD_PARTY.md); no license selection is implied by contributing instructions.
