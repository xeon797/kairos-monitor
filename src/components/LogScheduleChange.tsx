import { useRef } from 'react';
import { SCHEDULE_CHANGE_MIN_DAY } from '../engine/config';
import { useApp } from '../state/useApp';

export function LogScheduleChange() {
  const app = useApp();
  const submitting = useRef(false);
  const disabled = app.loading || app.mutating || !!app.error || app.currentDay === null || app.currentDay < SCHEDULE_CHANGE_MIN_DAY;
  const submit = async () => {
    // Protect events arriving before React renders disabled.
    if (disabled || submitting.current) return;
    submitting.current = true;
    try { await app.logResponse(); } finally { submitting.current = false; }
  };
  return <button className="pill-button primary-button" disabled={disabled} onClick={() => void submit()}>Log schedule change</button>;
}
