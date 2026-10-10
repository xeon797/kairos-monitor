# Kairos Monitor ? Third-party materials

Verified 2026-10-10 against the installed, pinned package metadata and actual package LICENSE files (local evidence `.local/p11-thirdparty-licenses.json`). Versions match package-lock.json; source/license links below identify upstream projects. This table covers all direct dependencies, generated-worker libraries, project assets and referenced services. Transitive dependency declarations remain in package-lock.json and their upstream distributions; keep their notices when redistributing built dependencies. This project does not own or relicense those materials.

| Material / version | Purpose and use | License / terms | Upstream source and license |
|---|---|---|---|
| React / React DOM 18.3.1 | UI rendering | MIT | [React LICENSE](https://github.com/facebook/react/blob/main/LICENSE) |
| Dexie 4.4.6 | Local IndexedDB persistence | Apache-2.0 | [Dexie LICENSE](https://github.com/dexie/Dexie.js/blob/master/LICENSE) |
| React Router DOM 7.18.4 | Client routes | MIT | [React Router LICENSE](https://github.com/remix-run/react-router/blob/main/LICENSE.md) |
| Recharts 3.10.1 | Synthetic evidence charts | MIT | [Recharts LICENSE](https://github.com/recharts/recharts/blob/main/LICENSE) |
| Vite 7.3.7 | Development/build/preview | MIT; bundled dependency notices in its LICENSE.md | [Vite license](https://github.com/vitejs/vite/blob/main/LICENSE) |
| vite-plugin-pwa 2.0.0 | Manifest and production worker build | MIT | [Plugin LICENSE](https://github.com/vite-pwa/vite-plugin-pwa/blob/main/LICENSE) |
| Workbox 7.4.1 (build/window/core/precaching/routing) | Plugin build tooling and generated shell precaching/navigation worker; window helper is not imported by app | MIT | [Workbox LICENSE](https://github.com/GoogleChrome/workbox/blob/v7.4.1/LICENSE) |
| TypeScript 5.9.3 | Strict typechecking | Apache-2.0 | [TypeScript license](https://github.com/microsoft/TypeScript/blob/main/LICENSE.txt) |
| @vitejs/plugin-react 5.2.0 | React build integration | MIT | [Plugin LICENSE](https://github.com/vitejs/vite-plugin-react/blob/main/LICENSE) |
| @types/react 18.3.31; @types/react-dom 18.3.7 | Build type declarations | MIT | [DefinitelyTyped LICENSE](https://github.com/DefinitelyTyped/DefinitelyTyped/blob/master/LICENSE) |
| Vitest 4.1.11 | Unit runner | MIT; bundled dependency notices in its LICENSE.md | [Vitest LICENSE](https://github.com/vitest-dev/vitest/blob/main/LICENSE) |
| @playwright/test 1.64.0 | Browser verification and local capture | Apache-2.0 | [Playwright LICENSE](https://github.com/microsoft/playwright/blob/main/LICENSE) |
| fake-indexeddb 6.2.5 | Unit-only in-memory IndexedDB | Apache-2.0 | [fake-indexeddb LICENSE](https://github.com/dumbmatter/fakeIndexedDB/blob/master/LICENSE) |
| Satoshi Regular/Medium/Bold (400/500/700), unmodified WOFF2 | Locally installed/self-hosted typography; binaries **not committed** | **ITF Free Font License v2.0, 17 Aug 2026**, not MIT/OFL. Own-site self-hosting and normal logos/images allowed; font redistribution/modification restricted. Obtain your own copy and read included FFL.txt. | [Official family](https://www.fontshare.com/fonts/satoshi), [official download](https://api.fontshare.com/v2/fonts/download/satoshi); license inside downloaded Satoshi_Complete/License/FFL.txt |
| Google's Gemini API | Optional server-only synthetic evidence rephrasing; no SDK/model bundled | Hosted service under [Google API Terms](https://developers.google.com/terms) and [Gemini additional terms](https://ai.google.dev/gemini-api/terms), not an open-source dependency/model license. Free-service input/output may be used to improve Google products; send synthetic evidence only. | [Gemini documentation](https://ai.google.dev/gemini-api/docs), [service terms](https://ai.google.dev/gemini-api/terms) |
| Codex | Development assistance only; no Codex SDK/model/runtime dependency bundled | Hosted tool, applicable [OpenAI terms](https://openai.com/policies/terms-of-use/); not a project dependency license | [Codex](https://developers.openai.com/codex/) |
| NASA sleep-risk reference and TechPort 23228 | External scientific context links only; no text/images/logos/data copied | External NASA sources; not assigned MIT. NASA media guidance applies if media is added, with third-party exceptions and no endorsement. | [Sleep risk](https://www.nasa.gov/reference/risk-from-inadequate-sleep-and-irregular-schedules/), [TechPort](https://techport.nasa.gov/projects/23228), [NASA media guidance](https://www.nasa.gov/nasa-brand-center/images-and-media/) |

## Project-owned assets

The inline orbit/functional markers, static landing artwork, 192/512 raster K icons and synthetic dashboard screenshot `public/images/kairos-day12.jpg` originate in this project. The dashboard is an isolated synthetic day-12 capture, not NASA telemetry. Its source/size are recorded in [images README](public/images/README.md); icon generation is documented in [icons README](public/icons/README.md). Satoshi normal creative use permits the raster artwork; no embedded font source is redistributed in the icons. Original project code/artwork remains subject to the project owner's pending MIT/Apache-2.0 choice.

No supplied looping-video asset is present. No arbitrary video, photography, NASA logo, wearable data or third-party dataset was fetched or bundled. Add future assets only with known provenance/redistribution rights; do not infer rights from public availability.

## Verification basis and limits

Direct packages' license identifiers were checked against their installed license files, not guessed from familiarity (notably Dexie/fake-indexeddb/Playwright are Apache-2.0). Official Fontshare archive's FFL.txt was read; the dynamic terms page alone does not supply its text. Gemini terms and NASA media guidance were consulted at their authoritative URLs. Upstream main branches/services can change; the installed version/license record is the release evidence. This table documents used materials, not a claim that NASA/Gemini/Codex endorses the prototype.
