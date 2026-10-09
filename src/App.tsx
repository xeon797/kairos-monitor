import { lazy, Suspense } from 'react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import Landing from './screens/Landing';

// Loading the introduction must not construct the mission store or open its database.
const MissionShell=lazy(()=>import('./components/MissionShell'));

export default function App() {
  return <BrowserRouter><Routes>
    <Route path="/" element={<Landing/>}/>
    <Route path="/*" element={<Suspense fallback={<main className="page-width page-content"><p role="status">Loading Kairos Monitor…</p></main>}><MissionShell/></Suspense>}/>
  </Routes></BrowserRouter>;
}
