# Kairos Monitor — Foundation notes

- P1 scope is T01–T03 only. The master prompt authorizes tooling and sequential task commits, overrides per-task stops, and requires no Gemini credentials or dummy secrets for the shell.
- Supplied documents were found in `Kairos Monitor/MD files/`. Canonical copies were created in the current workspace root without changing their contents; original copies remain untouched. No prior app, lockfile, Git repository, remote, or deployment configuration existed.
- DEMO.md is absent. P1 may proceed; its exact 17-day dataset and acceptance table must be supplied before T05. No dataset has been invented.
- Before P8: SPEC §11 specifies green/red cognitive stimuli, DESIGN §4.2 specifies sky/lavender, and AGENTS prohibits red. Resolve before implementing cognitive tests.
- Before T11/P3 and T21/P7: future disclaimer/About wording (including “clearance”, “diagnose”, “prescribe”, “cleared”, and “predict”) conflicts with DESIGN §5.3's banned-word list. Supplied documentation is preserved. Only the exact footer has an explicit exemption; do not extend it to other UI text.
- Satoshi files are absent. T02 will retain DESIGN §2.4 declarations for weights 400/500/700 and use the prescribed fallback; Satoshi itself has not been verified. No replacement or CDN fonts will be downloaded.
- Git author name was absent. Used the matching authenticated GitHub profile name `ankonsinha` with the existing email `ankonsinha797@gmail.com`, configured locally only. No remote was invented.
- T01 unit-test command permits an empty suite. Zero unit tests exist; execution of the command does not verify application behavior. Playwright discovery is separate.
- T01 verification: typecheck and build passed; Vitest executed and reported no test files (0 unit tests). Installed Chrome rendered the Vite dev page with the correct title and heading.
- Tooling is pinned in package-lock.json: React 18.3.1, TypeScript 5.9.3, Vite 7.3.7, React plugin 5.2.0, Vitest 4.1.11, Playwright 1.64.0. Node 24.20.0 satisfies the tooling requirements. References: https://v7.vite.dev/guide/migration and https://vitest.dev/config/passwithnotests.
