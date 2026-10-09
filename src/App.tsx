import { useRef, useState } from 'react';
import { BrowserRouter, Navigate, NavLink, Route, Routes, useLocation } from 'react-router-dom';
import { AboutDialog } from './components/AboutDialog';
import { NavigationIcon, type ScreenName } from './components/NavigationIcon';
import { FOOTER_DISCLAIMER } from './content';
import Today from './screens/Today';
import Check from './screens/Check';
import Trends from './screens/Trends';
import Mission from './screens/Mission';
import { AppProvider, useApp } from './state/useApp';
import { SIMULATION_MAX_DAY } from './engine/config';
import { SimControls } from './components/SimControls';

const screens: ScreenName[] = ['Today', 'Check', 'Trends', 'Mission'];

function AppShell() {
  const [aboutOpen,setAboutOpen]=useState(false);
  const aboutTrigger=useRef<HTMLButtonElement>(null);
  const { pathname } = useLocation();
  const app = useApp();
  const missionDay = `Mission day ${app.currentDay ?? '—'} / ${SIMULATION_MAX_DAY}`;
  const storageNote = app.loading ? 'Loading local mission storage…' : app.error ? 'Local mission storage unavailable' : 'Synthetic · stored on this device';
  return (
    <div className="app-shell">
      <a className="skip-link" href="#main-content">Skip to content</a>
      <header className="app-header page-width">
        <div className="topbar">
          <div className="wordmark">
            <svg className="orbit-mark" viewBox="0 0 32 32" aria-hidden="true">
              <circle cx="16" cy="17" r="11" fill="none" stroke="var(--color-sky)" strokeWidth="1.5" />
              <path d="M16 2v7" stroke="var(--color-sky)" strokeWidth="1.5" strokeLinecap="round" />
              <circle cx="26" cy="21.6" r="2.5" fill="var(--color-teal)" />
            </svg>
            <span>Kairos Monitor</span>
          </div>
          <div className="mission-context">
            <span className="mission-day">{missionDay}</span>
            <span className="simulator-note">{storageNote}</span>
          </div>
          <button className="about-button" ref={aboutTrigger} onClick={()=>setAboutOpen(true)} aria-haspopup="dialog">About</button>
        </div>
        <div className="mobile-mission-context">
          <span className="mission-day">{missionDay}</span>
          <span className="simulator-note">{storageNote}</span>
        </div>
      </header>
      <nav className="primary-navigation" aria-label="Main navigation">
        <div className="navigation-track">
          {screens.map((screen) => (
            <NavLink key={screen} to={`/${screen.toLowerCase()}`} className="navigation-link">
              <NavigationIcon screen={screen} /><span>{screen}</span>
            </NavLink>
          ))}
        </div>
      </nav>
      <div className="content-region" key={pathname}>
        <main className="page-content page-width" id="main-content" tabIndex={-1}>
        <Routes>
          <Route path="/" element={<Navigate to="/today" replace />} />
          <Route path="/today" element={<Today />} />
          <Route path="/check" element={<Check />} />
          <Route path="/trends" element={<Trends />} />
          <Route path="/mission" element={<Mission />} />
          <Route path="*" element={<Navigate to="/today" replace />} />
        </Routes>
        <div className="simulator-region"><SimControls showLogAction={pathname !== '/today' && pathname !== '/mission'} showResponses={pathname !== '/mission'} /></div>
        </main>
        <footer className="app-footer page-width"><p>{FOOTER_DISCLAIMER}</p></footer>
      </div>
      {aboutOpen&&<AboutDialog onClose={()=>setAboutOpen(false)} trigger={aboutTrigger}/>}
    </div>
  );
}

export default function App() {
  return <AppProvider><BrowserRouter><AppShell /></BrowserRouter></AppProvider>;
}
