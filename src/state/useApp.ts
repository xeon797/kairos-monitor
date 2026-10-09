import { createContext, createElement, useContext, useEffect, useSyncExternalStore, type ReactNode } from 'react';
import { AppStore } from './appStore';

const sharedStore = new AppStore();
const AppContext = createContext<AppStore | null>(null);

export function AppProvider({children,store = sharedStore}:{children:ReactNode;store?:AppStore}) {
  useEffect(() => { void store.load(); },[store]);
  return createElement(AppContext.Provider,{value:store},children);
}
export function useApp() {
  const store = useContext(AppContext);
  if (!store) throw new Error('AppProvider is required.');
  const snapshot = useSyncExternalStore(store.subscribe,store.getSnapshot,store.getSnapshot);
  return {...snapshot,advance:store.advance,back:store.back,jump:store.jump,reset:store.reset,logResponse:store.logResponse};
}
