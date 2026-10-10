import { useEffect, useRef, type RefObject } from 'react';
import { ResearchSources } from './ResearchSources';
import '../styles/about.css';

export const ABOUT_LIMITATIONS = [
  'Mission telemetry is synthetic. It is an illustrative research demo, not recorded astronaut data.',
  'Thresholds and task classifications are experimental and illustrative. Task decisions remain with the crew and mission team.',
  'The short browser checks are not NASA Cognition or validated flight assessments. Device timing, practice effects and interruptions affect results.',
  'Recovery comparisons do not establish causation. The illustrative scenario does not show that a schedule adjustment caused a change.',
  'Novelty versus prior work remains a claim to investigate.',
  'HRV is supporting context only and is unavailable in this version.',
  "Google’s Gemini may rephrase synthetic evidence into explanations. Classification always comes from the deterministic engine. A template remains available when AI cannot provide validated text.",
  'Live browser-check results stay on this device and are not sent to Gemini.',
] as const;
export const NASA_REFERENCES = [
  {label:'NASA — Risk from Inadequate Sleep and Irregular Schedules',href:'https://www.nasa.gov/reference/risk-from-inadequate-sleep-and-irregular-schedules/'},
  {label:'NASA TechPort project 23228 — Individualized Real-Time Neurocognitive Assessment Toolkit',href:'https://techport.nasa.gov/projects/23228'},
] as const;

export function AboutDialog({onClose,trigger}:{onClose:()=>void;trigger:RefObject<HTMLButtonElement>}) {
  const dialog=useRef<HTMLDialogElement>(null);
  const close=useRef<HTMLButtonElement>(null);
  useEffect(()=>{
    const element=dialog.current!;
    element.showModal();
    close.current?.focus();
    return ()=>{if(element.open)element.close();trigger.current?.focus();};
  },[trigger]);
  return <dialog className="about-dialog" ref={dialog} aria-labelledby="about-title" onCancel={event=>{event.preventDefault();onClose();}} onClose={onClose} onKeyDown={event=>{
    if(event.key!=='Tab')return;
    // Native modal inertness covers the background; explicitly wrap before browser chrome.
    // Closed disclosures hide their descendants; only visible controls belong
    // in the modal wrap. Native summaries are keyboard controls too.
    const controls=Array.from(event.currentTarget.querySelectorAll<HTMLElement>('button:not([disabled]), a[href], summary')).filter(element=>element.getClientRects().length>0);
    const first=controls[0],last=controls[controls.length-1];
    if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus();}
    else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}
  }}>
    <header className="about-heading"><div><p className="eyebrow">Synthetic research prototype</p><h2 id="about-title">About Kairos Monitor</h2></div><button className="pill-button inverted-button" ref={close} onClick={onClose}>Close</button></header>
    <p className="about-intro">Personal changes, explained in mission context.</p>
    <ul className="about-limitations">{ABOUT_LIMITATIONS.map(text=><li key={text}>{text}</li>)}</ul>
    <ResearchSources/>
    <section aria-labelledby="about-references"><h3 id="about-references">References and prior work</h3><p>These references inform the research context; they do not imply NASA endorsement of this prototype.</p><ul>{NASA_REFERENCES.map(reference=><li key={reference.href}><a href={reference.href} target="_blank" rel="noreferrer">{reference.label}<span className="external-label"> (opens a new tab)</span></a></li>)}</ul></section>
    <p className="about-credit">Kairos Monitor · By Requiem_SUST</p>
  </dialog>;
}
