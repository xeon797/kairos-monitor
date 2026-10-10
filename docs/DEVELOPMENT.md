# Kairos Monitor — Development & Operations

Practical instructions for local development, browser verification, deployment and offline operation. For the project overview, see the [README](../README.md); for change requirements, see [CONTRIBUTING](../CONTRIBUTING.md).

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

On other systems, download [Satoshi from Fontshare](https://www.fontshare.com/fonts/satoshi), read its included ITF Free Font License, and copy the unmodified `Satoshi-Regular.woff2`, `Satoshi-Medium.woff2` and `Satoshi-Bold.woff2` to `public/fonts/`. Only weights 400/500/700 are used. The installer retains the license in `.local/satoshi-download/Satoshi_Complete/License/FFL.txt`. Binaries are Git-ignored: each recipient obtains their own copy. Self-hosting for the licensee's own app and normal logo/image use are permitted; repository redistribution/modification is restricted. See [font instructions](../public/fonts/README.md) and [third-party terms](../THIRD_PARTY.md). No runtime CDN fonts. Without fonts the app uses its system fallback, but final font/offline acceptance checks expect the three installed weights.

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

## Gemini and deployment

The public repository [xeon797/kairos-monitor](https://github.com/xeon797/kairos-monitor) is connected to the existing Vercel project `kairos-monitor`. Its production branch is `main`; pushes to that branch use Vercel's Git deployment integration. The live alias is [kairos-monitor-gamma.vercel.app](https://kairos-monitor-gamma.vercel.app). Keep the root directory at the repository root and retain the project's server-side Gemini environment variables.

`api/explain.ts` calls Gemini REST with plain fetch, using server-only **GEMINI_API_KEY** and **GEMINI_MODEL**. `.env.example` lists names, never values. Never use a `VITE_` key, commit credentials or copy them into client build configuration. Plain Vite does not run this function; use the deployed Vercel project or a separately configured Vercel development environment for the endpoint.

The deterministic template renders immediately. The model can only rephrase structured synthetic evidence; client/server validation rejects changed statuses, foreign numbers, prohibited claims or excessive text. Bounded provider/client timeouts, rate limits and invalid/unavailable responses silently retain the template. A validated response is cached in Dexie by the versioned canonical evidence key with model/time metadata, at most 50 entries and seven days; cache entries are revalidated on read. UI tags are **Template explanation** or **AI-rephrased from the same evidence**, with **Show template version** when AI is available. Cached AI retains its AI source offline; an uncached packet uses the template. A tag is not proof of a fresh provider call.

Deploy to the **existing** Vercel project `kairos-monitor`; preserve its Production server variables. Install fonts locally first. The Vercel CLI is an external deployment tool, not an app dependency:

```sh
vercel deploy --prod
```

The original development workspace is locally linked through ignored `.vercel/project.json`; a new machine must link/select that existing project before deploying, not create another one. `vercel.json` selects Vite/npm ci/build/dist and rewrites only the documented SPA routes; API/static/worker paths remain independent. Its build command runs `node scripts/install-satoshi.mjs` before `npm run build`: when fonts are absent, the script obtains the official Fontshare archive, installs only unmodified weights 400/500/700 and retains the license under ignored `.local/`. Linux builds use the builder's `unzip`; Windows uses the existing PowerShell installer. Existing valid local WOFF2 files are reused. Download/extraction/verification failure stops the deployment rather than publishing a changed font presentation. No font CDN request occurs at runtime. Verify the deployed index, hashed assets, fonts, icons, manifest and worker against the reviewed build. Do not expose environment values while checking configuration.

## Offline capabilities and updates

**An initial online visit is required.** On HTTPS (or localhost), wait for **Available offline on this browser after the initial online visit.** The production worker precaches the app shell, every lazy route chunk, local fonts, icons, manifest and static preview. Then landing/console route reloads, navigation, simulator, Trends, About, both checks and explicit local saves work with the browser network blocked. Dexie state and the frozen baseline survive offline/online reloads. The worker never caches `/api/*`; no general runtime API/credential caching. Offline explanation retrieval uses the existing validated Dexie cache or deterministic templates.

A worker update waits while any controlled Kairos Monitor tab remains open. The notice asks you to finish/save checks, close **all** tabs and reopen online. The app does not force skipWaiting, activation or a reload during a test or unsaved result. Saved Dexie data is independent of shell cache cleanup. Keep an active check tab visible; opening other tabs can itself count as a check interruption.

A cold first offline visit cannot install the app. Clearing/evicting browser site storage removes cached access/local data; private sessions may be ephemeral. Installation availability varies by browser/platform. Verified Chromium viewport/PWA behavior is **not physical-device installation evidence**. Development has no offline shell. Large decorative video is not cached; no supplied looping-video asset currently exists, so the finished static orbit fallback remains.

## Troubleshooting

| Symptom | Action |
|---|---|
| `npm ci` fails with an unsupported engine | Use Node.js 22.12.0 or newer and retry with the committed lockfile. |
| Satoshi requests return 404 | Install the three official font files; the system fallback remains usable. |
| Local explanations stay on templates | Expected with Vite dev/preview. These servers do not execute the serverless function. |
| Browser tests cannot start Chromium | Run `npx playwright install chromium` and build before starting the suite. |
| Offline reload fails after a first visit | Use a production build over HTTPS or localhost and wait for the offline availability notice before disconnecting. |
| A service-worker update remains pending | Save any results, close all Kairos Monitor tabs and reopen online. |

Use an isolated browser profile for demonstrations and verification. Preserve user data when investigating storage or update issues.
