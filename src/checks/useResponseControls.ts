import { useEffect, useRef, type RefObject, type PointerEvent } from 'react';

/** A held key or pointer produces one response until its release. Click adds none. */
export function useResponseControls(target:RefObject<HTMLButtonElement>,running:boolean,respond:()=>void,onFocus:(focused:boolean)=>void) {
  const keys=useRef(new Set<string>()),pointers=useRef(new Set<number>());
  const handlers=useRef({running,respond,onFocus});handlers.current={running,respond,onFocus};
  useEffect(()=>{
    const keydown=(event:KeyboardEvent)=>{
      if(event.code!=='Space'&&event.code!=='Enter')return;
      // Cancel/other controls retain native keyboard activation.
      const control=event.target instanceof HTMLElement?event.target.closest('a,button,input,select,textarea'):null;
      if(control&&control!==target.current)return;
      if(!handlers.current.running)return;
      event.preventDefault();if(event.repeat||keys.current.has(event.code))return;
      keys.current.add(event.code);handlers.current.respond();
    };
    const keyup=(event:KeyboardEvent)=>keys.current.delete(event.code);
    const release=(event:globalThis.PointerEvent)=>pointers.current.delete(event.pointerId);
    const blur=()=>{keys.current.clear();pointers.current.clear();handlers.current.onFocus(false);};
    const focus=()=>{if(!document.hidden)handlers.current.onFocus(true);};
    const visibility=()=>handlers.current.onFocus(!document.hidden&&document.hasFocus());
    window.addEventListener('keydown',keydown);window.addEventListener('keyup',keyup);
    window.addEventListener('pointerup',release);window.addEventListener('pointercancel',release);
    window.addEventListener('blur',blur);window.addEventListener('focus',focus);document.addEventListener('visibilitychange',visibility);
    return ()=>{window.removeEventListener('keydown',keydown);window.removeEventListener('keyup',keyup);window.removeEventListener('pointerup',release);window.removeEventListener('pointercancel',release);window.removeEventListener('blur',blur);window.removeEventListener('focus',focus);document.removeEventListener('visibilitychange',visibility);};
  },[target]);
  return (event:PointerEvent<HTMLButtonElement>)=>{
    event.preventDefault();
    if(!running||event.button!==0||pointers.current.has(event.pointerId))return;
    pointers.current.add(event.pointerId);respond();
  };
}
