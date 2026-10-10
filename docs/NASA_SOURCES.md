# NASA research behind Kairos Monitor

These PDFs provide published research evidence and protocol descriptions. Participant-level NASA data are not imported.

The mission scenario remains **Synthetic demonstration data—not NASA participant measurements.** Live browser results are separate measurements on the user's device. Research facts appear only in About and documentation; they are not observations, a baseline, status inputs, Gemini evidence or a NASA-norm comparison. No NASA endorsement is implied.

## Reading copies and page convention

The supplied local reading copies are `DATASETS/s41598-020-71929-4.pdf` (14 pages) and `DATASETS/20090029851.pdf` (15 pages/slides). Page references below are one-based PDF pages, including the title page. The HERA PDF's printed pages agree with that numbering; ISS references are slide/PDF positions.

Verified reading-copy SHA-256:

- HERA: `6d7708bc60c3020de6522ccc56a23086a7d919005be4c4daf51101a9c8eef230`.
- ISS: `6d84c2d07a566c690b20a85f40ee8f9c1f32be1ae383f205ca5de70b6fd3864b`.

The PDFs remain local, excluded from Git/Vercel upload, and are not served or precached. Bundled paraphrases render offline after the existing initial online installation. Official source/license links require a network; no PDF, image, graph or participant record is embedded. `src/research/sources.ts` is a presentation-only source catalogue; no engine, scoring, simulator or persistence path imports it.

## 1. HERA sleep restriction and objective vigilance

**Title:** Changes in performance and bio-mathematical model performance predictions during 45 days of sleep restriction in a simulated space mission.

**Authors:** Erin E. Flynn-Evans; Crystal Kirkley; Millennia Young; Nicholas Bathurst; Kevin Gregory; Verena Vogelpohl; Albert End; Steven Hillenius; Yvonne Pecena; Jessica J. Marquez.

**Publication:** Scientific Reports 10, 15594 (2020). **DOI:** `10.1038/s41598-020-71929-4`.

Sources: [official publisher article](https://www.nature.com/articles/s41598-020-71929-4), [DOI](https://doi.org/10.1038/s41598-020-71929-4), [official NASA-hosted reading copy](https://humansystems.arc.nasa.gov/publications/s41598-020-71929-4.pdf). Title/authors/DOI/year: PDF p. 1. Research setting: pp. 2-3. Findings: pp. 6, 8. Limitations/data access: p. 12. Reuse: p. 14.

### Exact published-study facts

| Fact | Published value | PDF reference |
|---|---|---|
| Participants | 20 | p. 1 abstract; p. 5 describes 16 completing plus four in the stopped mission |
| Planned mission duration | 45 days | p. 3, Mission schedule and procedures |
| Missions completed / stopped | Four complete missions; one stopped after 20 days | p. 5, Results; the second mission stopped because of a hurricane |
| Scheduled sleep opportunity | 5 hours on weekdays; 8 hours on weekends | p. 3, Mission schedule and procedures |
| PVT duration | 5 minutes | p. 3, Mission schedule and procedures |

These are selected published study-design/completion facts, not participant measurements. **Scheduled sleep opportunity is not measured sleep.** Page 12 explicitly states that objective sleep data were unavailable and actual sleep could be shorter than time in bed. No graph points are digitized or reconstructed and no individual records are manufactured.

### Paraphrased findings and limits

- HERA is an Earth-based spaceflight analog. The study examined sleep restriction and objective vigilance with a PVT (pp. 2-3).
- Average mean reaction time, response speed and fastest 10% reaction-time performance worsened over the mission; a mission-long increase in lapses was not statistically significant (p. 6). Avoid implying that every metric worsened.
- Individual trajectories differed: some participants stayed relatively stable while others declined (pp. 6, 8).
- Earth-based conditions do not include microgravity; PVT performance may not reflect more complex mission tasks; objective sleep data were unavailable (p. 12).

**Relationship to Kairos:** motivates presenting sleep context alongside objective checks and explaining individual change. This is an explicitly attributed design motivation, not proof that Kairos's frozen days 1-7 baseline, thresholds, sustained-change window or EVA/Inventory classifications are valid. The paper does not test those rules.

**Data access:** p. 12 says generated/analysed datasets are available **by request** from the [NASA Life Sciences Data Archive](https://lsda.jsc.nasa.gov). The PDF is not a participant-level data file. Kairos has neither requested nor imported those records; their availability is not misrepresented as an open download.

### Attribution and adaptations

Adapted from Flynn-Evans and all coauthors listed above (2020), the named Scientific Reports article, [official source](https://www.nature.com/articles/s41598-020-71929-4), DOI `10.1038/s41598-020-71929-4`, under [Creative Commons Attribution 4.0 International](https://creativecommons.org/licenses/by/4.0/). **Changes:** Team Requiem_SUST paraphrased findings and selected the five published facts for About/documentation; added Kairos-specific relationships/limitations; reproduced no figures, screenshots, participant records or graph points.

The article's p. 14 notice states CC BY 4.0, with exceptions for third-party material identified by credit lines. It also identifies a U.S. Government work without U.S. copyright protection, with possible foreign protection. Preserve the source's attribution/license notice rather than assigning a blanket project license to the research content. The summaries/facts retain this source attribution and CC BY notice independently of the still-pending license for Kairos's original code.

## 2. ISS Reaction Self Test

**Title:** Psychomotor Vigilance Self Test on ISS (Reaction Self Test on Expeditions 21 and 22).

**Authors/team:** David F. Dinges (principal investigator); Daniel Mollicone; Adrian Ecker (scientific team), PDF p. 1. **Year:** 2009, corroborated by PDF creation metadata and the NTRS publication record. **NASA NTRS identifier:** `20090029851`; report `JSC-CN-18714`.

[Official NASA NTRS source and download record](https://ntrs.nasa.gov/citations/20090029851). This is a **presentation/protocol description**, not evidence of completed ISS outcomes (objectives/hypotheses p. 6; planned measurements p. 7; possible benefits p. 15).

### Paraphrased protocol context and limits

- The motivation is brief objective cognitive monitoring with low crew burden and attention to sleep, circadian disruption and workload (p. 1).
- The described five-minute session includes **three minutes of vigilance testing plus two minutes of activity questions** (p. 3). Do not call it a five-minute PVT like HERA's.
- The planned measurements include regular mission observations and observations around EVA and sleep shifts (pp. 6-7). These are protocol plans/hypotheses, not validated Kairos task rules or completed-result claims.
- The described instrument uses astronaut-norm feedback and optimization from analog data (pp. 3, 5). Kairos does not reproduce that instrument, normative score or its validation.
- The document describes encrypted storage/downlink (p. 14); it does not supply a participant-level dataset download. No ISS participant measurements are imported.

**Relationship to Kairos:** motivates brief objective monitoring and displaying mission context. Kairos's browser checks are prototype adaptations, not validated replicas of NASA instruments. Mentioning EVA in a study hypothesis does not validate the high-demand EVA rule or low-demand Inventory cap in this prototype. No direct comparison of browser results with study results is made.

### Reuse review

On 2026-10-10 the [NTRS record](https://ntrs.nasa.gov/citations/20090029851) lists **Distribution Limits: Public** and **Copyright: Public Use Permitted**. The supplied slide text does not declare CC BY or a blanket public-domain grant. [NASA STI reuse information](https://sti.nasa.gov/disclaimers/) requires checking document/third-party notices, acknowledging NASA as source and avoiding endorsement implications. Do not assume all contractor-authored works/screenshots are public domain simply because NASA hosts them.

Kairos credits Dinges, Mollicone and Ecker (2009), NASA NTRS `20090029851`, and uses an attributed paraphrase plus an external official link. No ISS PDF, instrument screenshot, logo or other slide artwork is bundled or precached. Existing third-party rights/attributions remain separate from original project code.

## Protocol and design boundaries

| Source / prototype | Protocol described | What Kairos does not infer |
|---|---|---|
| HERA paper, p. 3 | Five-minute PVT | No participant reconstruction, outcome norm or change to the browser check |
| ISS presentation, p. 3 | Three-minute vigilance test plus two-minute questions | No astronaut-norm feedback, replica validation or direct study comparison |
| Kairos reaction check | Existing 25 trials, seeded 1.5-4 s waits, median RT/lapses/false starts and browser timing limits | No claim that this equals either published instrument |
| Kairos attention check | Existing 40 go/no-go stimuli, 800 ms exposure/400 ms gap | Neither PDF validates this go/no-go protocol |

The **personal-baseline method and EVA/Inventory rules are prototype design choices, not validated by these PDFs**. DEMO.md records, frozen baseline, engine thresholds, scoring, durations/stimuli, task decisions, Gemini configuration and evidence packets remain unchanged. Research summaries do not enter any calculation or model request. The finished static landing fallback remains; missing video is optional. Physical-device installation and by-hand public rehearsal remain unverified.
