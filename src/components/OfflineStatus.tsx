import { useEffect, useState } from 'react';

let registration: Promise<ServiceWorkerRegistration> | undefined;

export function OfflineStatus() {
  const [status, setStatus] = useState<'preparing' | 'ready' | 'update' | 'failed'>('preparing');
  useEffect(() => {
    if (!import.meta.env.PROD || !('serviceWorker' in navigator)) return;
    let mounted = true;
    const cleanups: Array<() => void> = [];
    const listen = (target: EventTarget, event: string, listener: EventListener) => {
      target.addEventListener(event, listener);
      cleanups.push(() => target.removeEventListener(event, listener));
    };
    registration ??= navigator.serviceWorker.register('/sw.js', { updateViaCache: 'none' });
    void registration.then(worker => {
      if (!mounted) return;
      const inspect = () => {
        if (mounted) setStatus(worker.waiting ? 'update' : worker.active ? 'ready' : 'preparing');
      };
      const trackInstall = () => {
        inspect();
        if (worker.installing) listen(worker.installing, 'statechange', inspect);
      };
      listen(worker, 'updatefound', trackInstall);
      listen(navigator.serviceWorker, 'controllerchange', inspect);
      trackInstall();
      void navigator.serviceWorker.ready.then(inspect);
    }).catch(() => { if (mounted) setStatus('failed'); });
    return () => { mounted = false; cleanups.forEach(cleanup => cleanup()); };
  }, []);
  if (!import.meta.env.PROD || !('serviceWorker' in navigator)) return null;
  return <aside className="offline-status page-width" aria-label="Offline availability">
    <p role="status">{status === 'ready' ? 'Available offline on this browser after the initial online visit.'
      : status === 'update' ? 'An update is ready. Finish and save your checks, then close all Kairos Monitor tabs and reopen online to use it.'
      : status === 'failed' ? 'Offline setup is unavailable. An online visit is required; reload online to retry.'
      : 'Preparing offline access. Keep this first visit online until setup finishes.'}</p>
  </aside>;
}
