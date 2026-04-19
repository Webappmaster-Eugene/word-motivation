import { createContext, useContext, useMemo, type ReactNode } from 'react';

import { createServiceBundle } from './container';
import type { ServiceBundle } from './types';

const ServicesContext = createContext<ServiceBundle | null>(null);

interface ServicesProviderProps {
  readonly children: ReactNode;
  readonly override?: Partial<ServiceBundle>;
}

export function ServicesProvider({ children, override }: ServicesProviderProps) {
  const services = useMemo<ServiceBundle>(() => {
    const base = createServiceBundle();
    return override ? { ...base, ...override } : base;
  }, [override]);

  return <ServicesContext.Provider value={services}>{children}</ServicesContext.Provider>;
}

export function useServices(): ServiceBundle {
  const ctx = useContext(ServicesContext);
  if (!ctx) {
    throw new Error('useServices вызван вне ServicesProvider');
  }
  return ctx;
}

export function useService<K extends keyof ServiceBundle>(key: K): ServiceBundle[K] {
  return useServices()[key];
}
