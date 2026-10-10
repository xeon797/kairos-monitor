export function startUpdateServer(): Promise<{ origin: string; update: () => void; close: () => Promise<void> }>;
