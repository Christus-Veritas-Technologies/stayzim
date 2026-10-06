"use client";

import { AnimatePresence, motion } from "framer-motion";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { EASE_OUT } from "@/components/motion";

/** Quick page changes finish before the bar would show, so it never flickers. */
const SHOW_AFTER_MS = 120;
/** If a click didn't lead anywhere (e.g. it was cancelled), give up quietly. */
const GIVE_UP_MS = 10_000;

/**
 * A thin Kariba bar across the top of the screen while the next page loads.
 * It starts on clicks on links inside the app and finishes when the address changes.
 */
export function NavigationProgress() {
  const pathname = usePathname();
  const search = useSearchParams().toString();
  const [progress, setProgress] = useState<number | null>(null);
  const timers = useRef<{ show?: number; trickle?: number; giveUp?: number; hide?: number }>({});
  const running = useRef(false);

  function clearTimers() {
    window.clearTimeout(timers.current.show);
    window.clearInterval(timers.current.trickle);
    window.clearTimeout(timers.current.giveUp);
    window.clearTimeout(timers.current.hide);
  }

  function finish() {
    if (!running.current) return;
    running.current = false;
    clearTimers();
    setProgress((current) => (current === null ? null : 1));
    timers.current.hide = window.setTimeout(() => setProgress(null), 250);
  }

  // The address changed: the new page is here
  useEffect(() => {
    finish();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only on navigation
  }, [pathname, search]);

  useEffect(() => {
    function start() {
      clearTimers();
      running.current = true;
      timers.current.show = window.setTimeout(() => {
        setProgress(0.12);
        // Creep towards the end without reaching it, slower as it goes
        timers.current.trickle = window.setInterval(() => setProgress((current) => (current === null ? null : current + (0.9 - current) * 0.1)), 300);
      }, SHOW_AFTER_MS);
      timers.current.giveUp = window.setTimeout(finish, GIVE_UP_MS);
    }

    // Bubble phase: next/link has already started its navigation (and called preventDefault)
    function onClick(event: MouseEvent) {
      if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const anchor = event.target instanceof Element ? event.target.closest("a[href]") : null;
      if (!(anchor instanceof HTMLAnchorElement) || anchor.hasAttribute("download")) return;
      if (anchor.target && anchor.target !== "_self") return;
      const url = new URL(anchor.href, window.location.href);
      if (url.origin !== window.location.origin) return;
      if (url.pathname === window.location.pathname && url.search === window.location.search) return;
      start();
    }

    document.addEventListener("click", onClick);
    return () => {
      document.removeEventListener("click", onClick);
      clearTimers();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- set up once
  }, []);

  return (
    <AnimatePresence>
      {progress === null ? null : (
        <motion.div
          key="navigation-progress"
          role="progressbar"
          aria-label="Loading page"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(progress * 100)}
          exit={{ opacity: 0, transition: { duration: 0.25 } }}
          className="pointer-events-none fixed inset-x-0 top-0 z-[100] h-[3px]"
        >
          <motion.div
            initial={{ scaleX: 0 }}
            animate={{ scaleX: progress }}
            transition={{ duration: 0.35, ease: EASE_OUT }}
            className="h-full origin-left rounded-r-full bg-brand shadow-[0_0_10px_rgba(0,125,162,0.55)]"
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
