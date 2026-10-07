"use client";

import { includesBookingCalendar } from "@stayzim/sites";
import { buttonVariants } from "@stayzim/ui/components/button";
import { CopyButton } from "@stayzim/ui/components/copy-button";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight, ArrowUpRight, CircleCheck, PartyPopper, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import { ClaimForm } from "@/components/create/claim-form";
import { CreateHeading } from "@/components/create/frame";
import { useLodge } from "@/components/dashboard/lodge-provider";
import { WhatsAppIcon } from "@/components/landing/brand";
import { EASE_OUT } from "@/components/motion";
import { authClient } from "@/lib/auth-client";
import { formatClock, formatLongDate } from "@/lib/format";
import { shareMessage, siteHost, siteUrl } from "@/lib/lodge";
import { metaCreateStep } from "@/lib/meta-pixel";
import { trackCreateStep } from "@/lib/track";
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

/**
 * The site is live: open it, share it, and "Claim my site" (an email and
 * password, or Google) so it's theirs to log in to from any phone. Rooms,
 * the logo and the rest are on the dashboard's checklist.
 */
export function LiveStep() {
  const { lodge } = useLodge();
  const { data: session } = authClient.useSession();
  const [claimedAs, setClaimedAs] = useState<string | null>(null);
  const tracked = useRef(false);
  const url = siteUrl(lodge);
  const guest = session?.user.isAnonymous === true && claimedAs === null;

  useEffect(() => {
    if (tracked.current) return;
    tracked.current = true;
    trackCreateStep("live");
    metaCreateStep("live");
  }, []);

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
      <CreateHeading title={`${lodge.name} is live`}>
        {includesBookingCalendar(lodge.plan) ? "Guests can book on your site or on WhatsApp right now." : "Guests can book on WhatsApp right now."}
        {lodge.demoEndsAt ? ` It's a free demo until ${formatLongDate(lodge.demoEndsAt)} at ${formatClock(lodge.demoEndsAt)}.` : null}
      </CreateHeading>

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

      {guest ? (
        <section className="mt-6 rounded-2xl border border-brand/25 bg-brand-wash/40 p-4 sm:p-5" aria-labelledby="claim-title">
          <div className="mb-4 flex gap-3">
            <ShieldCheck className="mt-0.5 size-5 shrink-0 text-brand" />
            <div>
              <h2 id="claim-title" className="text-[16px] font-semibold text-ink">
                Claim your site
              </h2>
              <p className="text-[13.5px] leading-5 text-muted">Add your email, so it&apos;s yours to log in to from any phone. Your site stays exactly as it is.</p>
            </div>
          </div>
          <ClaimForm onClaimed={setClaimedAs} />
        </section>
      ) : claimedAs ? (
        <p className="mt-5 flex items-center gap-2 rounded-xl bg-success-wash px-3.5 py-3 text-[13.5px] text-success">
          <CircleCheck className="size-4 shrink-0" />
          Saved. Log in with {claimedAs} from now on.
        </p>
      ) : null}

      <Link href="/dashboard" className={buttonVariants({ size: "lg", variant: guest ? "ghost" : "default", className: "mt-4 w-full" })}>
        {guest ? "Not now, open my dashboard" : "Go to my dashboard"}
        <ArrowRight />
      </Link>
      <p className="mt-3 text-center text-[12.5px] leading-[18px] text-muted-2">
        Rooms, prices, your town and logo are next, on your dashboard. Small &quot;demo&quot; badges show until you pay for a plan.
      </p>
    </>
  );
}
