"use client";

import { Button } from "@stayzim/ui/components/button";
import { EmptyState } from "@stayzim/ui/components/empty-state";
import { WifiOff } from "lucide-react";
import { useRouter } from "next/navigation";
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";

import { api, type ApiResult } from "@/lib/api";
import type { Lodge } from "@/lib/lodge";

type Method = "POST" | "PATCH" | "PUT" | "DELETE";

type LodgeContextValue = {
  lodge: Lodge;
  /** Replace the lodge, e.g. with the copy an upload returned */
  setLodge: (lodge: Lodge) => void;
  refresh: () => Promise<void>;
  /**
   * Calls a lodge route that answers with the whole lodge and shows the result.
   * Returns the error sentence, or null when it saved.
   */
  save: (path: string, method: Method, json?: unknown) => Promise<string | null>;
  /** Like `save`, for routes that answer `{ lodge, ... }` and something else the caller needs */
  saveWith: <T extends { lodge: Lodge }>(path: string, method: Method, json?: unknown) => Promise<ApiResult<T>>;
};

const LodgeContext = createContext<LodgeContextValue | null>(null);

export function useLodge() {
  const value = useContext(LodgeContext);
  if (!value) throw new Error("useLodge must be used inside <LodgeProvider>");
  return value;
}

type LoadState = { kind: "loading" } | { kind: "ready"; lodge: Lodge } | { kind: "missing" } | { kind: "error"; message: string };

/** Loads the signed-in owner's lodge once; every edit returns it fresh, so screens never go stale. */
export function LodgeProvider({
  loading,
  missing,
  children,
}: {
  loading: ReactNode;
  /** Shown when the owner has no lodge yet; by default they're sent to /start to make one */
  missing?: ReactNode;
  children: ReactNode;
}) {
  const router = useRouter();
  const [state, setState] = useState<LoadState>({ kind: "loading" });

  const load = useCallback(async () => {
    const result = await api<Lodge>("/api/lodge");
    if (result.data) setState({ kind: "ready", lodge: result.data });
    else if (result.status === 404) setState({ kind: "missing" });
    else setState({ kind: "error", message: result.error });
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const setLodge = useCallback((lodge: Lodge) => setState({ kind: "ready", lodge }), []);

  const save = useCallback(
    async (path: string, method: Method, json?: unknown) => {
      const result = await api<Lodge>(`/api/lodge${path}`, { method, json });
      if (result.error !== undefined) return result.error;
      setLodge(result.data);
      return null;
    },
    [setLodge],
  );

  const saveWith = useCallback(
    async <T extends { lodge: Lodge }>(path: string, method: Method, json?: unknown) => {
      const result = await api<T>(`/api/lodge${path}`, { method, json });
      if (result.data) setLodge(result.data.lodge);
      return result;
    },
    [setLodge],
  );

  if (state.kind === "loading") return loading;

  if (state.kind === "missing") return missing ?? <SendToStart fallback={loading} router={router} />;

  if (state.kind === "error") {
    return (
      <div className="flex min-h-svh items-center justify-center bg-surface-2 p-4">
        <EmptyState
          className="rounded-[20px] bg-white shadow-card"
          icon={<WifiOff />}
          title="Your dashboard didn't load"
          description={state.message}
          action={
            <Button
              onClick={() => {
                setState({ kind: "loading" });
                void load();
              }}
            >
              Try again
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <LodgeContext.Provider value={{ lodge: state.lodge, setLodge, refresh: load, save, saveWith }}>
      {children}
    </LodgeContext.Provider>
  );
}

/** A signed-in owner without a lodge (they signed up, then left before making it): back to /start. */
function SendToStart({ fallback, router }: { fallback: ReactNode; router: ReturnType<typeof useRouter> }) {
  useEffect(() => {
    router.replace("/start");
  }, [router]);
  return fallback;
}
