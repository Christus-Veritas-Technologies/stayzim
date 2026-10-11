"use client";

import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight } from "lucide-react";

import { FOUNDING_END_SHORT, FoundingCountdown, useFounding } from "@/components/founding";
import { EASE_OUT } from "@/components/motion";

/**
 * The strip at the very top of StayZim's pages while founding prices last:
 * when they end and the time left, linking to the prices. Gone at the deadline.
 */
export function FoundingBar({ pricingHref = "/#pricing" }: { pricingHref?: string }) {
  const { open } = useFounding();
  return (
    <AnimatePresence initial={false}>
      {open ? (
        <motion.a
          key="founding-bar"
          href={pricingHref}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.4, ease: EASE_OUT }}
          className="flex h-9 w-full items-center justify-center gap-2 overflow-hidden bg-purple px-4 text-[13px] font-medium whitespace-nowrap text-white no-underline hover:text-white sm:text-[13.5px]"
        >
          <span>
            <span className="sm:hidden">Founding prices end in</span>
            <span className="hidden sm:inline">Founding prices end {FOUNDING_END_SHORT}:</span>
          </span>
          <FoundingCountdown className="text-white" />
          <span className="hidden items-center gap-1 font-semibold underline-offset-2 sm:inline-flex">
            <span className="mx-1 opacity-50">·</span>
            See prices
            <ArrowRight size={14} strokeWidth={2} />
          </span>
        </motion.a>
      ) : null}
    </AnimatePresence>
  );
}
