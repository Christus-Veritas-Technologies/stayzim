"use client";

import { cn } from "@stayzim/ui/lib/utils";
import { motion } from "framer-motion";
import Link from "next/link";
import type { ReactNode } from "react";

import { Wordmark } from "@/components/landing/brand";
import { EASE_OUT } from "@/components/motion";

export const START_STEPS = ["Your lodge", "Photos", "Rooms", "Live"] as const;

/** The start screen's frame: wordmark, the four steps with progress, and a white card. */
export function StartFrame({ step, children }: { step: number; children: ReactNode }) {
  return (
    <div className="min-h-svh bg-surface-2 pb-[env(safe-area-inset-bottom)]">
      <header className="mx-auto flex max-w-[560px] items-center justify-between px-4 pt-5 sm:pt-8">
        <Link href="/" aria-label="StayZim home" className="text-ink no-underline">
          <Wordmark size={28} />
        </Link>
        <span className="text-[13px] font-medium text-muted">
          Step {step + 1} of {START_STEPS.length}
        </span>
      </header>

      <div className="mx-auto max-w-[560px] px-4 pt-5">
        <ol className="grid grid-cols-4 gap-1.5" aria-label="Progress">
          {START_STEPS.map((label, index) => (
            <li key={label} className="flex flex-col gap-1.5" aria-current={index === step ? "step" : undefined}>
              <span className="h-1.5 overflow-hidden rounded-full bg-line">
                <motion.span
                  className="block h-full origin-left rounded-full bg-brand"
                  initial={false}
                  animate={{ scaleX: index <= step ? 1 : 0 }}
                  transition={{ duration: 0.5, ease: EASE_OUT }}
                />
              </span>
              <span className={cn("truncate text-[11.5px] font-medium", index === step ? "text-ink" : "text-muted-2")}>{label}</span>
            </li>
          ))}
        </ol>
      </div>

      <main className="mx-auto max-w-[560px] px-4 pt-5 pb-10">
        <motion.div
          key={step}
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: EASE_OUT }}
          className="rounded-[20px] bg-white p-5 shadow-card sm:p-7"
        >
          {children}
        </motion.div>
      </main>
    </div>
  );
}

/** Title and a line under it, at the top of each step. */
export function StepHeading({ title, children }: { title: ReactNode; children?: ReactNode }) {
  return (
    <div className="mb-5 flex flex-col gap-1.5">
      <h1 className="font-display text-[24px] leading-[30px] font-semibold tracking-[-0.02em] text-ink sm:text-[28px] sm:leading-[34px]">{title}</h1>
      {children ? <p className="text-[14.5px] leading-[21px] text-muted">{children}</p> : null}
    </div>
  );
}
