import { useCallback, useSyncExternalStore } from "react";

const KEY = "s2-api-key";

const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

/**
 * An optional personal Semantic Scholar API key, kept only in this browser.
 * Without one we share the anonymous rate-limit pool with the whole internet.
 */
export function useApiKey(): [string, (value: string) => void] {
  const key = useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => localStorage.getItem(KEY) ?? "",
    () => "",
  );
  const setKey = useCallback((value: string) => {
    if (value) localStorage.setItem(KEY, value);
    else localStorage.removeItem(KEY);
    emit();
  }, []);
  return [key, setKey];
}
