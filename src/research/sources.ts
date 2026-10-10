// Published context only. Never import these facts into the engine, scoring,
// simulator, database initialization or Gemini evidence packets.
export interface PublishedStatement {
  readonly text: string;
  readonly pdfPages: readonly number[];
}
export interface PublishedFact {
  readonly label: string;
  readonly value: string;
  readonly pdfPages: readonly number[];
}
export interface ResearchSource {
  readonly id: 'hera' | 'iss';
  readonly title: string;
  readonly authors: readonly string[];
  readonly year: number;
  readonly publication: string;
  readonly identifier: { readonly label: string; readonly value: string };
  readonly officialUrl: string;
  readonly pdfFile: string;
  readonly relevantPdfPages: readonly number[];
  readonly overview: string;
  readonly findings: readonly PublishedStatement[];
  readonly kairosUse: string;
  readonly limitations: readonly PublishedStatement[];
  readonly dataAccess: PublishedStatement;
  readonly rights: { readonly label: string; readonly url: string; readonly adaptation: string };
  readonly facts?: readonly PublishedFact[];
}

export const RESEARCH_DATA_LABEL = 'Synthetic demonstration data—not NASA participant measurements.';
export const RESEARCH_DATA_ACCESS = 'These PDFs provide published research evidence and protocol descriptions. Participant-level NASA data are not imported.';
export const PROTOTYPE_METHOD_LIMIT = 'The frozen personal-baseline method, thresholds and EVA/Inventory rules are prototype design choices, not validated by these PDFs.';
export const PROTOTYPE_CHECK_LIMIT = 'Kairos’s browser checks are prototype adaptations, not validated replicas of NASA instruments. The reaction check uses 25 trials; the attention check uses 40 go/no-go stimuli. Neither is directly comparable with these studies, and Kairos has no NASA-norm score.';

export const RESEARCH_SOURCES: readonly ResearchSource[] = [
  {
    id: 'hera',
    title: 'Changes in performance and bio-mathematical model performance predictions during 45 days of sleep restriction in a simulated space mission',
    authors: ['Erin E. Flynn-Evans', 'Crystal Kirkley', 'Millennia Young', 'Nicholas Bathurst', 'Kevin Gregory', 'Verena Vogelpohl', 'Albert End', 'Steven Hillenius', 'Yvonne Pecena', 'Jessica J. Marquez'],
    year: 2020,
    publication: 'Scientific Reports 10, 15594',
    identifier: { label: 'DOI', value: '10.1038/s41598-020-71929-4' },
    officialUrl: 'https://www.nature.com/articles/s41598-020-71929-4',
    pdfFile: 's41598-020-71929-4.pdf',
    relevantPdfPages: [1, 2, 3, 5, 6, 8, 12, 14],
    overview: 'HERA studied sleep restriction and objective vigilance performance in an Earth-based spaceflight analog. Individual responses varied.',
    findings: [
      { text: 'Average reaction time, response speed and fastest-response performance worsened over the mission; lapses did not show a significant mission-long increase.', pdfPages: [6] },
      { text: 'Individual performance trajectories differed: some remained stable while others declined.', pdfPages: [6, 8] },
    ],
    kairosUse: 'Motivates showing sleep context alongside objective checks and explaining individual change. It does not establish Kairos’s baseline window or decision rules.',
    limitations: [
      { text: 'This was a ground analog, not a microgravity study. PVT performance may not represent more complex mission tasks.', pdfPages: [12] },
      { text: 'No objective sleep data were collected. Scheduled sleep opportunity is not measured sleep duration.', pdfPages: [12] },
      { text: 'The study used a five-minute PVT, not Kairos’s trial-count reaction check or go/no-go task.', pdfPages: [3, 5] },
    ],
    dataAccess: { text: 'The paper says study datasets are available by request from the NASA Life Sciences Data Archive. No participant data have been requested or imported into Kairos.', pdfPages: [12] },
    rights: {
      label: 'CC BY 4.0', url: 'https://creativecommons.org/licenses/by/4.0/',
      adaptation: 'Credit: Flynn-Evans and coauthors (2020). Team Requiem_SUST paraphrased findings and selected published facts; no figures or participant records were reproduced. Article license notice: PDF p. 14.',
    },
    facts: [
      { label: 'Participants', value: '20', pdfPages: [1, 5] },
      { label: 'Planned mission duration', value: '45 days', pdfPages: [3] },
      { label: 'Missions completed / stopped', value: 'Four complete missions; one stopped after 20 days', pdfPages: [5] },
      { label: 'Scheduled sleep opportunity', value: '5 hours on weekdays; 8 hours on weekends', pdfPages: [3] },
      { label: 'PVT duration', value: '5 minutes', pdfPages: [3] },
    ],
  },
  {
    id: 'iss',
    title: 'Psychomotor Vigilance Self Test on ISS (Reaction Self Test on Expeditions 21 and 22)',
    authors: ['David F. Dinges', 'Daniel Mollicone', 'Adrian Ecker'],
    year: 2009,
    publication: 'NASA NTRS presentation, JSC-CN-18714',
    identifier: { label: 'NASA NTRS', value: '20090029851' },
    officialUrl: 'https://ntrs.nasa.gov/citations/20090029851',
    pdfFile: '20090029851.pdf',
    relevantPdfPages: [1, 3, 5, 6, 7, 14, 15],
    overview: 'NASA’s ISS Reaction Self Test motivates brief objective vigilance monitoring with attention to sleep, workload and mission context.',
    findings: [
      { text: 'The presentation describes a three-minute vigilance test after two minutes of activity questions: a five-minute session overall.', pdfPages: [3] },
      { text: 'The planned measurement schedule includes observations around EVA and sleep shifts as well as regular mission days.', pdfPages: [6, 7] },
    ],
    kairosUse: 'Motivates brief objective monitoring and keeping mission context visible. The presentation’s EVA hypotheses do not validate Kairos’s EVA/Inventory classification rules.',
    limitations: [
      { text: 'This is a protocol and objectives presentation, not a report of completed ISS study outcomes.', pdfPages: [6, 7, 15] },
      { text: 'Its astronaut-norm feedback and optimized instrument are not implemented or reproduced in Kairos. Browser/device timing and scoring differ.', pdfPages: [3, 5] },
    ],
    dataAccess: { text: 'The PDF describes data storage and downlink, not a participant-level dataset download. Kairos imports no ISS participant measurements.', pdfPages: [14] },
    rights: {
      label: 'NASA STI reuse information', url: 'https://sti.nasa.gov/disclaimers/',
      adaptation: 'Credit: Dinges, Mollicone and Ecker (2009), NASA NTRS 20090029851. NTRS lists Public Use Permitted. This summary is paraphrased; the PDF and instrument screenshots are not bundled. No NASA endorsement is implied.',
    },
  },
];
