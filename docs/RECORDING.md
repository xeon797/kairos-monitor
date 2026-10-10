# Kairos Monitor — Recording checklist and walkthrough

Use this alongside DEMO.md §3–4. A full cognitive check belongs **outside** the 90-second pitch; do not truncate the protocol or invent a result.

## Prepare an isolated state

- Build the reviewed revision with the three local Satoshi fonts, then run `npm run preview -- --host 127.0.0.1 --port 4173`. Keep this server running.
- Open a **new isolated browser context/profile**. Do not press Reset or clear site storage in a user's existing profile. The recording script creates fresh in-memory Playwright contexts and closes them afterward; generated videos stay under ignored `.local/p11-recording/`.
- First visit online. Wait for **Available offline on this browser after the initial online visit.** Confirm the worker controls the page before disconnecting. Check all fonts are loaded; keep the tab visible during measured checks.
- Launch demo: mission day 7, no schedule-change responses, frozen baseline days 1–7. Confirm **Within your usual range** and **Synthetic**.
- For a public presentation, previsit day-12 EVA/Inventory online if validated AI is desired; preserve the cached output and return to day 7 in **this isolated context only**. If provider output is unavailable, present the deterministic template honestly. Do not call it real Gemini unless the response was actually provider-generated and validated. Do not repeatedly retry quota failures.
- Keep developer consoles, credentials, account pages and other people's data out of the capture. No external publication is performed by the script.

## 90-second pitch (exact application wording)

| Time | On-screen action | Suggested narration / exact result |
|---|---|---|
| 0–10 s | Today, day 7 | Isolated measurements need personal and task context. Alex's synthetic reference is **frozen from days 1–7**, not a moving population average. **Within your usual range** does not mean every individual measurement is unchanged. |
| 10–25 s | Jump 11, then Advance day to 12 | **Change noted** becomes **Review recommended**. Sleep/reaction/attention criteria are met on **4/5, 3/5, 3/5** days; at least 3 of 5 makes a sustained change. All thresholds are experimental and illustrative. |
| 25–45 s | Mission, compare EVA-07 / INV-03 | Same observations: **EVA-07: Review recommended** (high demand, 3 relevant sustained domains), **INV-03: Change noted** (low demand, 2 relevant sustained domains). Both are scheduled on day 14, **In 2 days**. No mission decision is issued. |
| 45–55 s | Explain source; use template toggle only if present | **Template explanation** is the deterministic local text. **AI-rephrased from the same evidence** identifies validated Gemini rephrasing, possibly cached. **Show template version** exposes the underlying template. Classification always comes from the deterministic engine. Local capture uses templates; no provider success is implied. |
| 55–65 s | Day 13, **Log schedule change** | Record **Protected sleep window; EVA prep moved**. This is a human-entered log, not a prescription or proof an adjustment works. |
| 65–80 s | Day 15, then 16; Today | Day 15 still has reaction/attention sustained (2 domains); day 16 has 0 and **Within your usual range**. **Measures moving toward baseline** / **This comparison does not show that the adjustment caused the change.** |
| 80–90 s | Check choices/history | **Live browser test** results remain on this device, separate from synthetic mission data. A full check takes longer than this pitch; demonstrate it separately. |

## Separate live-check/offline supplement

1. With online installation complete, block the **actual browser network** (DevTools Offline or Playwright `context.setOffline(true)`). Refresh `/check`; show that the document comes from the worker. An offline label alone is not evidence.
2. Open/start a reaction check. Wait for **Go · Tap or press Space** and respond once. Complete all **25 trials**, including the random waits. Inspect quality/counts; choose **Save result**, then **Return to Check**. Do not promise a fixed duration or describe automated inputs as a human performance measurement.
3. Complete all **40 attention stimuli**: respond to the sky circle, withhold on the lavender square. Shapes/text, not color alone, identify stimuli. Explicitly save and return. Practice is never saved.
4. Reload offline; inspect both saved kinds, **Live browser test**, no mission day, real UTC timestamps and quality. Explain device latency/practice/interruptions and the separate first-three-valid-check baselines of each kind.
5. Offline, navigate Today/Mission/Trends/About. Day-12 counts/concerns and the frozen synthetic baseline remain unchanged by the live results. New uncached evidence uses **Template explanation**; a previously validated AI cache retains its AI label. Never claim local templates are real provider output.
6. Return online and reload. Confirm the saved results/day/responses remain. An update waits while tabs are open; finish/save checks before closing all tabs. Physical phone installation has not been tested.

## Reproduce a local capture

After building and starting preview, run:

```sh
node scripts/record-demo.mjs
```

The script records actual local application UI in fresh contexts: a guided pitch and a separate full-protocol, actual-network-blocked supplement. Pointer/keyboard inputs are automated and seeded; clocks remain real. There is no human/device accuracy or real-provider claim. It does not use or reset your browser profile, fake a saved record, shorten trials, or publish videos. See the generated `evidence.json` for revision, paths, measured durations and verified saved-state/network details. Captures are silent; use this narration/checklist for a final human voiceover if desired.

Before sharing: check recordings play, text is readable, no data/credentials outside the isolated demo appears, the captured revision matches the report, and the commentary does not imply clinical validation or recovery causation. Keep optional video/polish and physical-device installation limitations visible.
