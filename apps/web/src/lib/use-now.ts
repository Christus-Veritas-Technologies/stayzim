"use client";

import { useEffect, useState } from "react";

/** The current time, refreshed every `everyMs` (a minute by default), for countdowns. */
export function useNow(everyMs = 60_000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), everyMs);
    return () => clearInterval(timer);
  }, [everyMs]);
  return now;
}
