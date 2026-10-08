"use client";

import { DEMO_KEEP_DAYS } from "@stayzim/sites";
import { buttonVariants } from "@stayzim/ui/components/button";
import { cn } from "@stayzim/ui/lib/utils";
import { AnimatePresence, motion } from "framer-motion";
import { Clock, TriangleAlert } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

import { useLodge } from "@/components/dashboard/lodge-provider";
import { formatMoney } from "@/lib/billing";
import { formatClock, formatLongDate } from "@/lib/format";
import { demoTimeLeft, formatCountdown, PLANS, splitTimeLeft, type Lodge } from "@/lib/lodge";

const HOUR = 3600_000;

/** The time now, ticking on each new second (aligned to the clock, so every countdown on screen turns together). */
export function useSecondNow() {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const tick = () => {
      setNow(Date.now());
      timer = setTimeout(tick, 1000 - (Date.now() % 1000) + 5);
    };
    timer = setTimeout(tick, 1000 - (Date.now() % 1000) + 5);
    return () => clearTimeout(timer);
  }, []);
  return now;
}

/** A live demo's time left to the second; 0 once it's over (also when it runs out on screen). */
export function useDemoLeft(lodge: Lodge) {
  const now = useSecondNow();
  return lodge.status === "DEMO" && !lodge.demoEnded ? demoTimeLeft(lodge, now) : 0;
}

/** "1 day 08:12:45 left", ticking: for the top bar and the phone strip. */
export function DemoClock({ lodge }: { lodge: Lodge }) {
  const left = useDemoLeft(lodge);
  return (
    <time suppressHydrationWarning dateTime={lodge.demoEndsAt ?? undefined} className="font-semibold tabular-nums">
      {left > 0 ? `${formatCountdown(left)} left` : "ended"}
    </time>
  );
}

/** One box of the big countdown; the number slides when it changes. */
function Unit({ value, label, tone }: { value: number; label: string; tone: "light" | "dark" }) {
  const text = String(value).padStart(2, "0");
  return (
    <span
      className={cn(
        "flex min-w-[58px] flex-col items-center rounded-[12px] px-2 pt-1.5 pb-1 sm:min-w-[68px]",
        tone === "light" ? "border border-purple-line bg-white shadow-xs" : "border border-white/12 bg-white/8",
      )}
    >
      <span className="relative h-9 overflow-hidden font-display text-[30px] leading-9 font-semibold tabular-nums sm:h-10 sm:text-[34px] sm:leading-10">
        <AnimatePresence initial={false} mode="popLayout">
          <motion.span
            key={text}
            suppressHydrationWarning
            className="block"
            initial={{ y: "-60%", opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: "60%", opacity: 0 }}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
          >
            {text}
          </motion.span>
        </AnimatePresence>
      </span>
      <span className={cn("text-[11px] font-semibold tracking-[0.06em] uppercase", tone === "light" ? "text-purple" : "text-[#9FB2BB]")}>{label}</span>
    </span>
  );
}

/** Days, hours, minutes and seconds in boxes. Screen readers get the end time instead of a number that changes every second. */
export function CountdownUnits({ ms, endsAt, tone = "light", className }: { ms: number; endsAt: string; tone?: "light" | "dark"; className?: string }) {
  const { days, hours, minutes, seconds } = splitTimeLeft(ms);
  return (
    <div className={cn("flex items-center gap-1.5 sm:gap-2", className)}>
      <span className="sr-only">
        Ends {formatLongDate(endsAt)} at {formatClock(endsAt)}
      </span>
      <span aria-hidden="true" className="contents">
        <Unit value={days} label={days === 1 ? "day" : "days"} tone={tone} />
        <Unit value={hours} label="hrs" tone={tone} />
        <Unit value={minutes} label="min" tone={tone} />
        <Unit value={seconds} label="sec" tone={tone} />
      </span>
    </div>
  );
}

/**
 * On the dashboard home while the lodge is a demo: how long until the site
 * goes offline, to the second, and the way to keep it. Turns red in the last hour.
 */
export function DemoCountdownCard() {
  const { lodge } = useLodge();
  const left = useDemoLeft(lodge);
  if (lodge.status !== "DEMO" || !lodge.demoEndsAt) return null;
  const plan = PLANS[lodge.plan];
  const ended = left <= 0;
  const urgent = !ended && left < HOUR;

  return (
    <motion.section
      aria-label="Demo time left"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      className={cn(
        "relative flex flex-col gap-4 overflow-hidden rounded-[20px] border p-4 sm:p-5 lg:flex-row lg:items-center lg:justify-between",
        ended || urgent ? "border-danger-line bg-danger-tint" : "border-purple-line bg-purple-tint",
      )}
    >
      <div className="flex flex-col gap-3">
        <p className={cn("flex items-center gap-2 text-[14px] font-semibold", ended || urgent ? "text-danger" : "text-purple-ink")}>
          {ended ? <TriangleAlert className="size-4" /> : <Clock className="size-4" />}
          {ended ? `Your ${plan.name} demo has ended` : `Your ${plan.name} demo ends in`}
        </p>
        {ended ? null : <CountdownUnits ms={left} endsAt={lodge.demoEndsAt} />}
        <p className="max-w-[460px] text-[13px] leading-5 text-muted">
          {ended
            ? `Your site is offline. Pay to bring it back; we keep everything you added for ${DEMO_KEEP_DAYS} days.`
            : `Ends ${formatLongDate(lodge.demoEndsAt)} at ${formatClock(lodge.demoEndsAt)}. Then your site goes offline until you pay; we keep everything for ${DEMO_KEEP_DAYS} days.`}
        </p>
      </div>
      <div className="flex flex-col gap-1.5 lg:items-end">
        <Link
          href="/dashboard/billing"
          className={buttonVariants({ variant: ended || urgent ? "destructive" : "accent", size: "lg", className: "w-full lg:w-auto" })}
        >
          {ended ? "Pay to bring it back" : "Pay to keep it"}
        </Link>
        <span className="text-center text-[12.5px] text-muted lg:text-right">{formatMoney(plan.price)} a month, by EcoCash, InnBucks or card</span>
      </div>
    </motion.section>
  );
}
