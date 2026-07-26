"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useAuth } from "@/lib/providers/auth-provider";
import { getRegionPreference, updateRegionPreference } from "@/lib/actions/settings";

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
  const { user, loading: authLoading } = useAuth();
  // Which user id's profile we've already pulled a region from — guards
  // against re-fetching on every render and against writing the
  // just-fetched value straight back to the server.
  const syncedUserIdRef = useRef<string | null>(null);
  const skipNextServerSaveRef = useRef(false);

  // Hydrate from localStorage once on mount.
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<Region>;
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setRegionState({
          country: parsed.country ?? DEFAULT_REGION.country,
          currency: parsed.currency ?? DEFAULT_REGION.currency,
        });
      }
    } catch {
      // localStorage unavailable or corrupted — stick with defaults.
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setHydrated(true);
  }, []);

  // Once a user is signed in, their saved country/currency (set at
  // registration or in Settings) takes over as the source of truth from
  // whatever was in localStorage — e.g. a guest's local pick, or a stale
  // value from a previously signed-in device.
  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      syncedUserIdRef.current = null;
      return;
    }
    if (syncedUserIdRef.current === user.id) return;
    syncedUserIdRef.current = user.id;

    getRegionPreference()
      .then((pref) => {
        if (!pref) return;
        skipNextServerSaveRef.current = true;
        setRegionState({ country: pref.countryCode, currency: pref.currencyCode });
      })
      .catch(() => {
        // Network/auth hiccup — keep whatever's in localStorage.
      });
  }, [user, authLoading]);

  // Persist on change, but skip the initial render before hydration.
  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(region));
    } catch {
      // Quota exceeded or disabled — silently ignore; in-memory state still works.
    }

    if (!user) return;
    if (skipNextServerSaveRef.current) {
      skipNextServerSaveRef.current = false;
      return;
    }
    updateRegionPreference(region.country, region.currency).catch(() => {
      // Best-effort — the picker already reflects the choice locally.
    });
  }, [region, hydrated, user]);

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
