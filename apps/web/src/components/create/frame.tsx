"use client";

import { cn } from "@stayzim/ui/lib/utils";
import { motion } from "framer-motion";
import { Clock } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

import { Wordmark } from "@/components/landing/brand";
import { EASE_OUT } from "@/components/motion";

/** Two steps, then the site is live. The time left keeps people going: they can see the end. */
const STEPS = [
  { label: "Your lodge", left: "about 60 seconds left" },
  { label: "Photos", left: "about 30 seconds left" },
] as const;

/**
 * /create's frame: the wordmark, "Step 1 of 2 · about 60 seconds left", a
 * two-part progress bar, the step's card, and the live preview beside it on
 * wide screens. `step` 2 is "live": the bar is full and the header says so.
 */
export function CreateFrame({ step, preview, children }: { step: 0 | 1 | 2; preview?: ReactNode; children: ReactNode }) {
  const live = step === 2;
  return (
    <div className="min-h-svh bg-surface-2 pb-[env(safe-area-inset-bottom)]">
      <header className="mx-auto flex max-w-[980px] items-center justify-between gap-3 px-4 pt-5 sm:pt-8">
        <Link href="/" aria-label="StayZim home" className="text-ink no-underline">
          <Wordmark size={28} />
        </Link>
        <span className="inline-flex items-center gap-1.5 text-right text-[13px] font-medium text-muted">
          {live ? (
            "You're live"
          ) : (
            <>
              <Clock className="size-3.5 shrink-0" />
              <span>
                Step {step + 1} of {STEPS.length} · {STEPS[step].left}
              </span>
            </>
          )}
        </span>
      </header>

      <div className="mx-auto max-w-[980px] px-4 pt-4">
        <ol className="grid grid-cols-2 gap-1.5" aria-label="Progress">
          {STEPS.map((entry, index) => (
            <li key={entry.label} aria-current={index === step ? "step" : undefined}>
              <span className="block h-1.5 overflow-hidden rounded-full bg-line">
                <motion.span
                  className="block h-full origin-left rounded-full bg-brand"
                  initial={false}
                  animate={{ scaleX: index < step || live ? 1 : index === step ? 0.5 : 0 }}
                  transition={{ duration: 0.5, ease: EASE_OUT }}
                />
              </span>
            </li>
          ))}
        </ol>
      </div>

      <div className={cn("mx-auto grid max-w-[980px] grid-cols-[minmax(0,1fr)] gap-6 px-4 pt-5 pb-10", preview && "lg:grid-cols-[minmax(0,1fr)_320px] lg:gap-10")}>
        <motion.main
          key={step}
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: EASE_OUT }}
          className="h-fit rounded-[20px] bg-white p-5 shadow-card sm:p-7"
        >
          {children}
        </motion.main>
        {preview ? <aside className="hidden lg:sticky lg:top-6 lg:block lg:h-fit">{preview}</aside> : null}
      </div>
    </div>
  );
}

/** Title and a line under it, at the top of each step. */
export function CreateHeading({ title, children }: { title: ReactNode; children?: ReactNode }) {
  return (
    <div className="mb-5 flex flex-col gap-1.5">
      <h1 className="font-display text-[24px] leading-[30px] font-semibold tracking-[-0.02em] text-ink sm:text-[28px] sm:leading-[34px]">{title}</h1>
      {children ? <p className="text-[14.5px] leading-[21px] text-muted">{children}</p> : null}
    </div>
  );
}
