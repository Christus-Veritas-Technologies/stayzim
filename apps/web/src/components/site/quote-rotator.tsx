"use client";

import type { SiteReview } from "@stayzim/sites";
import { cn } from "@stayzim/ui/lib/utils";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { useState } from "react";

/**
 * Guests' words, one at a time, with Back and Next when there are more. The
 * template styles the quote, the name line and the buttons.
 */
export function QuoteRotator({
  quotes,
  source,
  quoteClassName,
  byClassName,
  buttonClassName,
  className,
}: {
  quotes: SiteReview[];
  /** "Booking.com", shown in the name line */
  source?: string;
  quoteClassName?: string;
  byClassName?: string;
  buttonClassName?: string;
  className?: string;
}) {
  const [index, setIndex] = useState(0);
  const reduce = useReducedMotion();
  const quote = quotes[index];
  if (!quote) return null;
  const by = [quote.origin, source ? `via ${source}` : null, quote.stayed, quote.score !== null ? String(quote.score) : null].filter(Boolean);
  const step = (move: number) => setIndex((current) => (current + move + quotes.length) % quotes.length);

  return (
    <figure className={cn("flex flex-col gap-8", className)}>
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={index}
          initial={reduce ? { opacity: 0 } : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={reduce ? { opacity: 0 } : { opacity: 0, y: -12 }}
          transition={{ duration: 0.35 }}
          className="flex flex-col gap-6"
        >
          <blockquote className={quoteClassName}>“{quote.quote}”</blockquote>
          <figcaption className={byClassName}>
            <strong className="font-semibold">{quote.author}</strong>
            {by.length > 0 ? ` · ${by.join(" · ")}` : ""}
          </figcaption>
        </motion.div>
      </AnimatePresence>
      {quotes.length > 1 ? (
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => step(-1)} aria-label="Previous review" className={cn("flex size-12 items-center justify-center rounded-full border transition-colors", buttonClassName)}>
            <ArrowLeft className="size-5" />
          </button>
          <button type="button" onClick={() => step(1)} aria-label="Next review" className={cn("flex size-12 items-center justify-center rounded-full border transition-colors", buttonClassName)}>
            <ArrowRight className="size-5" />
          </button>
          <span className="ml-2 text-sm opacity-70" aria-live="polite">
            {index + 1} / {quotes.length}
          </span>
        </div>
      ) : null}
    </figure>
  );
}
