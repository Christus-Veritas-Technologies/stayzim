"use client";

import { useEffect } from "react";

import { trackPageView } from "@/lib/track";

// Module-level so React's dev double-mount doesn't record two views
let recorded = false;

export function PageView() {
  useEffect(() => {
    if (recorded) return;
    recorded = true;
    trackPageView();
  }, []);

  return null;
}
