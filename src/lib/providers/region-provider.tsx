"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

const STORAGE_KEY = "silkroad.region";

export type Region = {
  country: string;
  currency: string;
};

const DEFAULT_REGION: Region = {
  country: "NG",
  currency: "USD",
};

type RegionContextValue = Region & {
  setCountry: (code: string) => void;
  setCurrency: (code: string) => void;
  setRegion: (next: Partial<Region>) => void;
};

const RegionContext = createContext<RegionContextValue | null>(null);

export function RegionProvider({ children }: { children: ReactNode }) {
  const [region, setRegionState] = useState<Region>(DEFAULT_REGION);
  const [hydrated, setHydrated] = useState(false);

  // Hydrate from localStorage once on mount.
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<Region>;
        setRegionState({
          country: parsed.country ?? DEFAULT_REGION.country,
          currency: parsed.currency ?? DEFAULT_REGION.currency,
        });
      }
    } catch {
      // localStorage unavailable or corrupted — stick with defaults.
    }
    setHydrated(true);
  }, []);

  // Persist on change, but skip the initial render before hydration.
  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(region));
    } catch {
      // Quota exceeded or disabled — silently ignore; in-memory state still works.
    }
  }, [region, hydrated]);

  const setCountry = useCallback((code: string) => {
    setRegionState((prev) => ({ ...prev, country: code }));
  }, []);
  const setCurrency = useCallback((code: string) => {
    setRegionState((prev) => ({ ...prev, currency: code }));
  }, []);
  const setRegion = useCallback((next: Partial<Region>) => {
    setRegionState((prev) => ({ ...prev, ...next }));
  }, []);

  const value = useMemo<RegionContextValue>(
    () => ({ ...region, setCountry, setCurrency, setRegion }),
    [region, setCountry, setCurrency, setRegion],
  );

  return <RegionContext.Provider value={value}>{children}</RegionContext.Provider>;
}

export function useRegion(): RegionContextValue {
  const ctx = useContext(RegionContext);
  if (!ctx) {
    // Tolerant fallback so components rendered outside the provider (e.g. tests)
    // don't crash. They get the defaults and noop setters.
    return {
      ...DEFAULT_REGION,
      setCountry: () => {},
      setCurrency: () => {},
      setRegion: () => {},
    };
  }
  return ctx;
}
