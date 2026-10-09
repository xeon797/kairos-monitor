import { Link } from 'react-router-dom';

export function Wordmark() {
  return <Link className="wordmark home-link" to="/" aria-label="Kairos Monitor home">
    <svg className="orbit-mark" viewBox="0 0 32 32" aria-hidden="true">
      <circle cx="16" cy="17" r="11" fill="none" stroke="var(--color-sky)" strokeWidth="1.5"/>
      <path d="M16 2v7" stroke="var(--color-sky)" strokeWidth="1.5" strokeLinecap="round"/>
      <circle cx="26" cy="21.6" r="2.5" fill="var(--color-teal)"/>
    </svg><span>Kairos Monitor</span>
  </Link>;
}
