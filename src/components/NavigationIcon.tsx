import type { ReactNode } from 'react';

export type ScreenName = 'Today' | 'Check' | 'Trends' | 'Mission';

export function NavigationIcon({ screen }: { screen: ScreenName }) {
  const paths: Record<ScreenName, ReactNode> = {
    Today: <><circle cx="12" cy="12" r="4" /><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5" /></>,
    Check: <><circle cx="12" cy="12" r="8" /><circle cx="12" cy="12" r="3" /><path d="M12 2v3m0 14v3M2 12h3m14 0h3" /></>,
    Trends: <path d="M4 4v16h16M7 15l4-5 4 2 5-7" />,
    Mission: <><rect x="3" y="5" width="18" height="16" rx="3" /><path d="M7 3v4m10-4v4M3 11h18m-13 4h2m4 0h2" /></>,
  };
  return <svg viewBox="0 0 24 24" fill="none" stroke="var(--nav-icon-color, var(--text-muted))" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[screen]}</svg>;
}
