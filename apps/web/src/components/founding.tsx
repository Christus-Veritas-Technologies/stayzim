"use client";

import { FOUNDING_ENDS_AT } from "@stayzim/sites";
import { cn } from "@stayzim/ui/lib/utils";
import { AnimatePresence, motion } from "framer-motion";
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

import { EASE_OUT } from "@/components/motion";
import { splitTimeLeft } from "@/lib/lodge";

/** The deadline as the marketing pages say it. */
export const FOUNDING_END_SHORT = "22 Oct";

type Founding = {
  /** Founding prices are still on: new lodges get them */
  open: boolean;
  /** Milliseconds until they end (0 once they have) */
  left: number;
};

const FoundingContext = createContext<Founding | null>(null);

/**
 * Founding prices and their countdown on the marketing pages, on the server's
 * clock, so a wrong clock on the visitor's phone can't move the deadline. The
 * page passes the time it was made; /server-time corrects it (a cached page is
 * older than now). At the deadline every countdown goes, and the prices turn
 * into the normal ones, without a reload.
 */
export function FoundingProvider({ serverNow, children }: { serverNow: number; children: ReactNode }) {
  const [now, setNow] = useState(serverNow);

  useEffect(() => {
    // Until the server answers: the page's time, moved on by how long it's been open
    let offset = serverNow - Date.now();
    let cancelled = false;
    const sent = Date.now();
    fetch("/server-time", { cache: "no-store" })
      .then((response) => (response.ok ? (response.json() as Promise<{ now: number }>) : null))
      .then((body) => {
        if (cancelled || !body || typeof body.now !== "number") return;
        const received = Date.now();
        offset = body.now + (received - sent) / 2 - received;
        setNow(Date.now() + offset);
      })
      .catch(() => {});
    const timer = setInterval(() => setNow(Date.now() + offset), 1000);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [serverNow]);

  const left = Math.max(0, FOUNDING_ENDS_AT.getTime() - now);
  return <FoundingContext.Provider value={{ open: left > 0, left }}>{children}</FoundingContext.Provider>;
}

export function useFounding() {
  const founding = useContext(FoundingContext);
  if (!founding) throw new Error("useFounding needs a <FoundingProvider> around it");
  return founding;
}

/** A number that slides when it changes. */
function Rolling({ value, className }: { value: string; className?: string }) {
  return (
    <span className={cn("relative inline-flex overflow-hidden", className)}>
      <AnimatePresence initial={false} mode="popLayout">
        <motion.span
          key={value}
          className="block"
          initial={{ y: "-60%", opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: "60%", opacity: 0 }}
          transition={{ duration: 0.28, ease: EASE_OUT }}
        >
          {value}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}

function parts(left: number) {
  const { days, hours, minutes } = splitTimeLeft(left);
  return [
    { value: days, short: "d", label: days === 1 ? "day" : "days" },
    { value: hours, short: "h", label: hours === 1 ? "hour" : "hours" },
    { value: minutes, short: "m", label: minutes === 1 ? "min" : "mins" },
  ];
}

/** Read out once, instead of a number that changes every minute. */
function SpokenDeadline() {
  return <span className="sr-only">Founding prices end on 22 October 2026 at 23:59, Zimbabwe time.</span>;
}

/**
 * Days, hours and minutes to the end of founding prices, in Jacaranda so it
 * stands apart from the brand blue. Nothing once they've ended.
 *
 * - `inline`: "10d 4h 12m", inside a sentence or a bar.
 * - `boxes`: a box each, for the pricing section and the closing call.
 */
export function FoundingCountdown({ variant = "inline", tone = "light", className }: { variant?: "inline" | "boxes"; tone?: "light" | "dark"; className?: string }) {
  const { open, left } = useFounding();
  if (!open) return null;

  if (variant === "inline") {
    return (
      <span className={cn("inline-flex items-baseline gap-1 font-semibold whitespace-nowrap tabular-nums", className)}>
        <SpokenDeadline />
        <span aria-hidden="true" className="inline-flex items-baseline gap-1">
          {parts(left).map((part) => (
            <span key={part.short} className="inline-flex items-baseline">
              <Rolling value={String(part.value)} />
              {part.short}
            </span>
          ))}
        </span>
      </span>
    );
  }

  return (
    <span className={cn("inline-flex items-center gap-1.5", className)}>
      <SpokenDeadline />
      <span aria-hidden="true" className="contents">
        {parts(left).map((part) => (
          <span
            key={part.short}
            className={cn(
              "flex min-w-[54px] flex-col items-center rounded-[12px] px-2 pt-1.5 pb-1",
              tone === "light" ? "border border-purple-line bg-white shadow-xs" : "border border-white/15 bg-white/10",
            )}
          >
            <Rolling
              value={String(part.value).padStart(2, "0")}
              className={cn("h-8 font-display text-[26px] leading-8 font-semibold tabular-nums", tone === "light" ? "text-purple-ink" : "text-white")}
            />
            <span className={cn("text-[10.5px] font-semibold tracking-[0.06em] uppercase", tone === "light" ? "text-purple" : "text-purple-wash")}>
              {part.label}
            </span>
          </span>
        ))}
      </span>
    </span>
  );
}
