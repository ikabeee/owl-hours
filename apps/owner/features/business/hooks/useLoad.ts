import { useCallback, useEffect, useState } from "react";

export type Loadable<T> =
  | { status: "loading" }
  | { status: "failed"; retry: () => Promise<void> }
  | { status: "ready"; value: T };

type Fallible<T> = T | { failed: true };

// Shared load cell behind useBusiness, usePrices and useSettings: runs load
// until it resolves, maps a { failed: true } result to the error state, and
// reloads on retry or when a dep identity changes. replace() swaps the ready
// value after a save, so screens show saved data without another round trip.
export function useLoad<T extends object>(load: () => Promise<Fallible<T>>, deps: readonly unknown[]): {
  state: Loadable<T>;
  reload: () => Promise<void>;
  replace: (next: T) => void;
} {
  const [attempt, setAttempt] = useState(0);
  const [loaded, setLoaded] = useState<Fallible<T> | null>(null);

  useEffect(() => {
    let isCurrent = true;
    load().then((result) => {
      if (isCurrent) setLoaded(result);
    });
    return () => {
      isCurrent = false;
    };
    // load is rebuilt every render on purpose; the dep identities decide.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attempt, ...deps]);

  const reload = useCallback(async () => {
    setAttempt((count) => count + 1);
  }, []);

  const replace = useCallback((next: T) => {
    setLoaded(next);
  }, []);

  if (!loaded) return { state: { status: "loading" }, reload, replace };
  if ("failed" in loaded) return { state: { status: "failed", retry: reload }, reload, replace };
  return { state: { status: "ready", value: loaded }, reload, replace };
}
