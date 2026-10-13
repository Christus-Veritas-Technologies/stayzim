"use client";

import { useCallback, useEffect, useState } from "react";

import { api, outreachApi, type ApiResult } from "@/lib/api";

/** Loads `path` from the API (or this app's outreach routes) and reloads on `reload()` or when the path changes. */
export function useApi<T>(path: string | null, { outreach = false }: { outreach?: boolean } = {}) {
  const [state, setState] = useState<{ path: string | null; result: ApiResult<T> | null }>({ path: null, result: null });
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!path) return;
    let cancelled = false;
    void (outreach ? outreachApi<T>(path) : api<T>(path)).then((result) => {
      if (!cancelled) setState({ path, result });
    });
    return () => {
      cancelled = true;
    };
  }, [outreach, path, tick]);

  const reload = useCallback(() => setTick((value) => value + 1), []);
  const current = state.path === path ? state.result : null;
  return {
    data: current?.data,
    error: current?.error,
    loading: path !== null && current === null,
    reload,
    /** Swap in a fresher copy (e.g. what a save returned) without loading again */
    set: (data: T) => setState({ path, result: { data, status: 200 } }),
  };
}
