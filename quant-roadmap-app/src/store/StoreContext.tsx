import React, { createContext, useContext } from 'react';
import { useStore } from './useStore';

type StoreType = ReturnType<typeof useStore>;

export const StoreContext = createContext<StoreType | null>(null);

export function useAppStore(): StoreType {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('No StoreContext');
  return ctx;
}
