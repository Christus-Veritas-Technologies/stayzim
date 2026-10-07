"use client";

import { includesBookingCalendar } from "@stayzim/sites";
import { buttonVariants } from "@stayzim/ui/components/button";
import { CopyButton } from "@stayzim/ui/components/copy-button";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight, ArrowUpRight, PartyPopper } from "lucide-react";
import Link from "next/link";

import { useLodge } from "@/components/dashboard/lodge-provider";
import { WhatsAppIcon } from "@/components/landing/brand";
import { EASE_OUT } from "@/components/motion";
import { StepHeading } from "@/components/start/frame";
import { formatClock, formatLongDate } from "@/lib/format";
import { shareMessage, siteHost, siteUrl } from "@/lib/lodge";
import { whatsappTextUrl } from "@/lib/whatsapp";

const BURST = ["#0096BE", "#25D366", "#755EAF", "#F2A65A", "#78CBE7", "#0096BE", "#25D366", "#F2A65A"];

/** A few dots that pop out of the icon once. Nothing with reduce motion on. */
function Burst() {
  const reduce = useReducedMotion();
  if (reduce) return null;
  return (
    <span aria-hidden="true" className="pointer-events-none absolute inset-0">
      {BURST.map((color, index) => {
        const angle = (index / BURST.length) * Math.PI * 2;
        return (
          <motion.span
            key={index}
            className="absolute top-1/2 left-1/2 size-2 rounded-full"
            style={{ backgroundColor: color }}
            initial={{ x: 0, y: 0, opacity: 1, scale: 0.6 }}
            animate={{ x: Math.cos(angle) * 46, y: Math.sin(angle) * 46, opacity: 0, scale: 1 }}
            transition={{ duration: 0.9, delay: 0.25, ease: EASE_OUT }}
          />
        );
      })}
    </span>
  );
}

/** Step 4: the site is live. Open it, share it, then on to the dashboard. */
export function LiveStep() {
  const { lodge } = useLodge();
  const url = siteUrl(lodge);
  return (
    <>
      <div className="relative mb-4 flex size-14 items-center justify-center">
        <motion.span
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 320, damping: 18 }}
          className="flex size-14 items-center justify-center rounded-2xl bg-success-wash text-success"
        >
          <PartyPopper className="size-7" />
        </motion.span>
        <Burst />
      </div>
      <StepHeading title={`${lodge.name} is live`}>
        {includesBookingCalendar(lodge.plan)
          ? "Guests can see your rooms and book on your site or on WhatsApp right now."
          : "Guests can see your rooms and book on WhatsApp right now."}
        {lodge.demoEndsAt ? ` It's a free demo until ${formatLongDate(lodge.demoEndsAt)} at ${formatClock(lodge.demoEndsAt)}.` : null}
      </StepHeading>

      <div className="flex items-center gap-2 rounded-2xl border border-line bg-surface-2 p-2 pl-4">
        <span className="min-w-0 flex-1 truncate text-[15px] font-semibold text-ink">{siteHost(lodge)}</span>
        <CopyButton value={url} size="sm" copiedLabel="Copied">
          Copy
        </CopyButton>
      </div>

      <div className="mt-4 grid gap-2.5 sm:grid-cols-2">
        <a href={url} target="_blank" rel="noreferrer" className={buttonVariants({ variant: "outline", size: "lg" })}>
          Open my site
          <ArrowUpRight />
        </a>
        <a href={whatsappTextUrl(shareMessage(lodge))} target="_blank" rel="noreferrer" className={buttonVariants({ variant: "whatsapp", size: "lg" })}>
          <WhatsAppIcon size={18} />
          Share on WhatsApp
        </a>
      </div>
      <Link href="/dashboard" className={buttonVariants({ size: "lg", className: "mt-2.5 w-full" })}>
        Go to my dashboard
        <ArrowRight />
      </Link>
      <p className="mt-4 text-center text-[12.5px] leading-[18px] text-muted-2">
        Your site shows small &quot;demo&quot; badges until you pay for a plan. Pay any time from Billing.
      </p>
    </>
  );
}
