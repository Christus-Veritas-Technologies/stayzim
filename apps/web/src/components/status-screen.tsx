"use client";

import { cn } from "@stayzim/ui/lib/utils";
import { motion } from "framer-motion";
import Link from "next/link";
import type { ReactNode } from "react";

import { KARIBA_GRADIENT, Place, Rings } from "@/components/auth/kariba-panel";
import { Wordmark } from "@/components/landing/brand";
import { EASE_OUT } from "@/components/motion";

/**
 * A whole-page message on the Kariba backdrop: page not found, or an error the
 * app couldn't recover from. A white card with what happened and what to do next.
 */
export function StatusScreen({
  badge,
  title,
  children,
  actions,
  footnote,
}: {
  /** Big text or an icon above the title, e.g. "404" */
  badge: ReactNode;
  title: ReactNode;
  children: ReactNode;
  actions: ReactNode;
  /** Small print under the card, e.g. an error reference */
  footnote?: ReactNode;
}) {
  return (
    <main className={cn("relative flex min-h-svh flex-col items-center justify-center overflow-hidden px-4 py-24 text-white", KARIBA_GRADIENT)}>
      <Rings className="top-1/2 left-1/2" sizes={[980, 700, 440]} />
      <Place name="Kariba" className="top-[16%] left-[10%] max-sm:hidden" delay={0.4} />
      <Place name="Nyanga" className="top-[22%] right-[12%]" tone="peach" delay={0.55} />
      <Place name="Vic Falls" className="bottom-[14%] left-[16%]" delay={0.7} />

      <Link href="/" className="absolute top-5 left-5 text-lg text-white no-underline sm:top-7 sm:left-8" aria-label="StayZim home">
        <Wordmark size={30} />
      </Link>

      <motion.div
        initial={{ opacity: 0, y: 28, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.7, ease: EASE_OUT }}
        className="relative flex w-full max-w-[440px] flex-col items-center gap-3 rounded-[28px] bg-white px-6 pt-8 pb-7 text-center text-ink shadow-[0_30px_70px_rgba(0,40,60,0.35)] sm:px-9"
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.85 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: "spring", stiffness: 260, damping: 20, delay: 0.15 }}
          className="font-display text-[56px] leading-none font-bold tracking-[-0.04em] text-brand"
        >
          {badge}
        </motion.div>
        <h1 className="mt-1 font-display text-2xl leading-8 font-semibold tracking-[-0.02em] text-balance">{title}</h1>
        <div className="text-[15px] leading-[22px] text-muted">{children}</div>
        <div className="mt-3 flex w-full flex-col gap-2 sm:flex-row sm:justify-center">{actions}</div>
      </motion.div>

      {footnote ? (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6, duration: 0.6 }}
          className="relative mt-5 text-xs text-brand-tint"
        >
          {footnote}
        </motion.p>
      ) : null}
    </main>
  );
}
