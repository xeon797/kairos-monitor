import type { KeyboardEvent } from 'react';

export function keepDialogFocus(event:KeyboardEvent<HTMLDialogElement>) {
  if(event.key!=='Tab')return;
  const controls=Array.from(event.currentTarget.querySelectorAll<HTMLButtonElement>('button:not(:disabled)')).filter(element=>element.getClientRects().length&&getComputedStyle(element).visibility!=='hidden');
  const first=controls[0],last=controls[controls.length-1];
  if(event.shiftKey&&document.activeElement===first){event.preventDefault();last?.focus();}
  else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first?.focus();}
}
