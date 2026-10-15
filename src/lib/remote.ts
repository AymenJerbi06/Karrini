"use client";

import { useCallback, useEffect, useState } from "react";

/**
 * Minimal data hook: runs `fetcher` when `key` changes, exposes loading/error and a reload,
 * and reloads when `window` receives `qarrini:changed:<topic>` (fired after local writes).
 */
export function useRemote<T>(key: string | null, fetcher: () => Promise<T>, initial: T, topic?: string) {
  const [state, setState] = useState<{ key: string | null; data: T; loading: boolean; error: boolean }>({
    key: null,
    data: initial,
    loading: true,
    error: false,
  });
  const [tick, setTick] = useState(0);
  const reload = useCallback(() => setTick((t) => t + 1), []);

  useEffect(() => {
    if (key === null) return;
    let alive = true;
    fetcher()
      .then((data) => alive && setState({ key, data, loading: false, error: false }))
      .catch(() => alive && setState((s) => ({ key, data: s.key === key ? s.data : initial, loading: false, error: true })));
    return () => {
      alive = false;
    };
    // `fetcher` is recreated every render; `key` and `tick` decide when to refetch.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, tick]);

  useEffect(() => {
    if (!topic) return;
    const name = `qarrini:changed:${topic}`;
    window.addEventListener(name, reload);
    return () => window.removeEventListener(name, reload);
  }, [topic, reload]);

  const current = state.key === key;
  return {
    data: current ? state.data : initial,
    loading: key !== null && (!current || state.loading),
    error: current && state.error,
    reload,
  };
}

export const announceChange = (topic: string) => window.dispatchEvent(new Event(`qarrini:changed:${topic}`));
