"use client";

import { cn } from "@stayzim/ui/lib/utils";
import { motion } from "framer-motion";
import { ArrowLeft, Check, Clock, Rocket, ShieldCheck } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

import { Wordmark } from "@/components/landing/brand";
import { EASE_OUT } from "@/components/motion";

/** Three steps, then the site is live. The time left keeps people going: they can see the end. */
export const CREATE_STEPS = [
  { title: "Pick a look", detail: "Nine designs to choose from", left: "about 90 seconds left" },
  { title: "Your lodge", detail: "Its name and WhatsApp", left: "about 60 seconds left" },
  { title: "Photos", detail: "Three from your phone", left: "about 30 seconds left" },
] as const;

/** 0–2: the steps above. 3: the site is live. */
export type CreateStepIndex = 0 | 1 | 2 | 3;

/** Number, title and detail for each step, joined by a line: the frame's sidebar on wide screens. */
function StepList({ step }: { step: CreateStepIndex }) {
  const items = [...CREATE_STEPS, { title: "You're live", detail: "Share your link" }];
  return (
    <ol className="flex flex-col" aria-label="Steps">
      {items.map((item, index) => {
        const done = index < step || step === 3;
        const current = index === step;
        const last = index === items.length - 1;
        return (
          <li key={item.title} aria-current={current ? "step" : undefined} className="flex gap-3.5">
            <span className="flex flex-col items-center">
              <span
                className={cn(
                  "relative flex size-8 shrink-0 items-center justify-center rounded-full text-[13px] font-semibold tabular-nums transition-colors duration-300",
                  done ? "bg-success-wash text-success" : current ? "bg-brand text-white" : "border border-line-2 bg-white text-muted-2",
                )}
              >
                {current && !done ? (
                  <motion.span
                    layoutId="create-step-halo"
                    transition={{ type: "spring", stiffness: 380, damping: 32 }}
                    className="absolute -inset-1 rounded-full ring-4 ring-brand-wash"
                  />
                ) : null}
                {done ? <Check className="size-4" strokeWidth={2.5} /> : last ? <Rocket className="size-3.5" /> : index + 1}
              </span>
              {last ? null : (
                <span className="my-1 block min-h-6 w-px flex-1 overflow-hidden bg-line">
                  <motion.span
                    className="block h-full w-full origin-top bg-success/50"
                    initial={false}
                    animate={{ scaleY: done ? 1 : 0 }}
                    transition={{ duration: 0.45, ease: EASE_OUT }}
                  />
                </span>
              )}
            </span>
            <span className={cn("flex min-w-0 flex-col pt-1", last ? "pb-0" : "pb-5")}>
              <span className={cn("text-[14px] leading-5 font-semibold", current || done ? "text-ink" : "text-muted")}>{item.title}</span>
              <span className="text-[12.5px] leading-[18px] text-muted-2">{item.detail}</span>
            </span>
          </li>
        );
      })}
    </ol>
  );
}

/** Phones: a pill of dots, the current step drawn longer. */
function StepDots({ step }: { step: CreateStepIndex }) {
  if (step === 3) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-success-wash px-3 py-1.5 text-[12.5px] font-semibold text-success">
        <Check className="size-3.5" strokeWidth={2.5} />
        You&apos;re live
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-surface px-3 py-2.5" role="img" aria-label={`Step ${step + 1} of ${CREATE_STEPS.length}`}>
      {CREATE_STEPS.map((item, index) => (
        <motion.span
          key={item.title}
          initial={false}
          animate={{ width: index === step ? 20 : 8 }}
          transition={{ duration: 0.35, ease: EASE_OUT }}
          className={cn("block h-2 rounded-full transition-colors duration-300", index === step ? "bg-brand" : index < step ? "bg-brand/40" : "bg-line-2")}
        />
      ))}
    </span>
  );
}

/**
 * /create's frame, after the step-by-step forms owners already know: the
 * steps down the side on wide screens (a pill of dots on phones), then the
 * step's card with "Step 1 of 3 · about 90 seconds left" and a thin bar, and
 * the live preview on the right once there is something to show. Phones get
 * the whole white screen, with Back at the top.
 */
export function CreateFrame({
  step,
  preview,
  onBack,
  children,
}: {
  step: CreateStepIndex;
  preview?: ReactNode;
  /** Shows Back (top left on phones, beside Next on wide screens) */
  onBack?: () => void;
  children: ReactNode;
}) {
  const live = step === 3;
  return (
    <div className="min-h-svh bg-white sm:bg-surface-2">
      <div
        className={cn(
          "mx-auto grid max-w-[1240px] grid-cols-[minmax(0,1fr)] gap-6 px-4 pt-3 pb-8 sm:px-6 sm:pt-8 lg:grid-cols-[272px_minmax(0,1fr)] lg:gap-8",
          preview && "xl:grid-cols-[272px_minmax(0,1fr)_300px]",
        )}
      >
        <aside className="hidden lg:sticky lg:top-8 lg:flex lg:h-fit lg:flex-col lg:gap-6 lg:rounded-[24px] lg:bg-white lg:p-6 lg:shadow-card">
          <Link href="/" aria-label="StayZim home" className="text-ink no-underline">
            <Wordmark size={28} />
          </Link>
          <div className="flex flex-col gap-1">
            <p className="font-display text-[19px] leading-6 font-semibold tracking-[-0.01em] text-ink">Your lodge&apos;s website</p>
            <p className="text-[13px] leading-[19px] text-muted">Live in about 90 seconds, made from your phone.</p>
          </div>
          <StepList step={step} />
          <p className="flex items-start gap-2 border-t border-line-3 pt-4 text-[12.5px] leading-[18px] text-muted-2">
            <ShieldCheck className="mt-px size-4 shrink-0 text-success" />
            Free for 2 days. No card, and no email until you claim it.
          </p>
        </aside>

        <div className="flex min-w-0 flex-col gap-3">
          <header className="flex h-11 items-center justify-between gap-3 lg:hidden">
            {onBack ? (
              <button
                type="button"
                onClick={onBack}
                aria-label="Back"
                className="flex size-10 items-center justify-center rounded-full border border-line bg-white text-ink shadow-xs transition-colors outline-none hover:bg-surface focus-visible:ring-3 focus-visible:ring-ring/30"
              >
                <ArrowLeft className="size-[18px]" />
              </button>
            ) : (
              <Link href="/" aria-label="StayZim home" className="text-ink no-underline">
                <Wordmark size={26} />
              </Link>
            )}
            <StepDots step={step} />
          </header>

          <motion.main
            key={step}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: EASE_OUT }}
            className="flex h-fit flex-col sm:rounded-[24px] sm:bg-white sm:p-8 sm:shadow-card"
          >
            <div className="mb-5 flex flex-col gap-2.5 sm:mb-6">
              <p className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-brand">
                {live ? (
                  "You're live"
                ) : (
                  <>
                    <Clock className="size-3.5 shrink-0" />
                    <span>
                      Step {step + 1} of {CREATE_STEPS.length} · {CREATE_STEPS[step].left}
                    </span>
                  </>
                )}
              </p>
              <span className="hidden h-1 overflow-hidden rounded-full bg-line-3 sm:block" aria-hidden="true">
                <motion.span
                  className="block h-full origin-left rounded-full bg-brand"
                  initial={{ scaleX: step / CREATE_STEPS.length }}
                  animate={{ scaleX: live ? 1 : (step + 1) / CREATE_STEPS.length }}
                  transition={{ duration: 0.6, ease: EASE_OUT }}
                />
              </span>
            </div>
            {children}
          </motion.main>
        </div>

        {preview ? <aside className="hidden xl:sticky xl:top-8 xl:block xl:h-fit">{preview}</aside> : null}
      </div>
    </div>
  );
}

/** A big question at the top of each step, the line under it, and a divider on wide screens. */
export function CreateHeading({ title, children }: { title: ReactNode; children?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-col gap-2 sm:mb-7 sm:border-b sm:border-line-3 sm:pb-6">
      <h1 className="font-display text-[28px] leading-[33px] font-semibold tracking-[-0.025em] text-ink sm:text-[32px] sm:leading-[38px]">{title}</h1>
      {children ? <p className="text-[15px] leading-[22px] text-muted">{children}</p> : null}
    </div>
  );
}

/**
 * The step's buttons: the main one full width on phones (kept in view at the
 * bottom with `sticky` when the step is long), Back beside it on wide
 * screens, and a short note.
 */
export function CreateActions({ onBack, note, sticky = false, children }: { onBack?: () => void; note?: ReactNode; sticky?: boolean; children: ReactNode }) {
  return (
    <div
      className={cn(
        "mt-6 flex flex-col gap-2.5 sm:mt-7 sm:border-t sm:border-line-3 sm:pt-6",
        sticky &&
          "max-sm:sticky max-sm:bottom-0 max-sm:z-10 max-sm:-mx-4 max-sm:border-t max-sm:border-line-3 max-sm:bg-white/95 max-sm:px-4 max-sm:pt-3 max-sm:pb-[max(12px,env(safe-area-inset-bottom))] max-sm:backdrop-blur",
      )}
    >
      <div className="flex items-center gap-3">
        {onBack ? (
          <button
            type="button"
            onClick={onBack}
            className="hidden h-11 items-center gap-1.5 rounded-[10px] px-3 text-sm font-semibold text-slate transition-colors outline-none hover:bg-secondary hover:text-ink focus-visible:ring-3 focus-visible:ring-ring/30 lg:inline-flex"
          >
            <ArrowLeft className="size-4" />
            Back
          </button>
        ) : null}
        {note ? <p className="hidden min-w-0 flex-1 text-[12.5px] leading-[18px] text-muted-2 sm:block">{note}</p> : <span className="hidden flex-1 sm:block" />}
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:min-w-[220px]">{children}</div>
      </div>
      {note ? <p className="text-center text-[12.5px] leading-[18px] text-muted-2 sm:hidden">{note}</p> : null}
    </div>
  );
}
