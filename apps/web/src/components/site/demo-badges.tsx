import { ArrowRight, Sparkles } from "lucide-react";

import { LogoMark } from "@/components/landing/brand";
import { MAIN_URL } from "@/lib/site-host";

// Straight to /create, tagged so the funnel shows sign-ups from demo sites
const SIGNUP = `${MAIN_URL}/create?utm_source=demo_site&utm_medium=referral`;

/**
 * The "This is a demo" marks on a lodge site that isn't paid for yet: a ribbon
 * on top, a pill that stays on screen, and a band at the end. Plain HTML and
 * CSS, so they add nothing to guests' data. They go once the lodge pays.
 */
export function DemoRibbon() {
  return (
    <div role="note" className="relative z-40 bg-[#0C181F] px-4 py-2 text-center text-[12.5px] leading-[18px] text-white/85">
      <Sparkles className="mr-1.5 inline size-3.5 -translate-y-px text-[#78CBE7]" aria-hidden="true" />
      <strong className="font-semibold text-white">Demo site.</strong> This lodge is trying StayZim.{" "}
      <a href={SIGNUP} className="-my-2 inline-block py-2 font-semibold whitespace-nowrap text-[#78CBE7] underline-offset-2 hover:underline">
        Make yours free
      </a>
    </div>
  );
}

/**
 * The pill that stays on screen: StayZim's mark, "Demo site", and Make yours
 * free, bottom left (above the phone booking bar), clear of the WhatsApp button.
 */
export function DemoPill() {
  return (
    <a
      href={SIGNUP}
      aria-label="Demo site, made with StayZim. Make yours free"
      className="group fixed bottom-[calc(5.75rem+env(safe-area-inset-bottom))] left-3 z-40 inline-flex items-center gap-2.5 rounded-full bg-[#0C181F] py-1.5 pr-4 pl-1.5 text-white shadow-[0_14px_32px_-12px_rgba(12,24,31,0.65)] ring-1 ring-white/10 transition-transform hover:-translate-y-0.5 motion-reduce:transform-none lg:bottom-5 lg:left-5"
    >
      <LogoMark size={30} />
      <span className="flex flex-col leading-tight">
        <span className="text-[12.5px] font-semibold">
          Demo site<span className="hidden font-normal text-white/70 sm:inline"> · Made with StayZim</span>
        </span>
        <span className="inline-flex items-center gap-1 text-[12px] font-semibold text-[#78CBE7]">
          Make yours free
          <ArrowRight className="size-3 transition-transform group-hover:translate-x-0.5 motion-reduce:transform-none" aria-hidden="true" />
        </span>
      </span>
    </a>
  );
}

/**
 * The band at the end of a demo site: StayZim's mark and name, what this is,
 * and the way to get one. Brand blue on ink: clearly ours, not the lodge's.
 */
export function DemoBand() {
  return (
    <aside className="relative overflow-hidden bg-[#0C181F] px-4 pt-12 pb-[calc(8rem+env(safe-area-inset-bottom))] text-white lg:pb-24">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_120%_at_50%_0%,rgba(0,150,190,0.28),transparent_70%)]" aria-hidden="true" />
      <div className="relative mx-auto flex max-w-[960px] flex-col items-center gap-6 text-center md:flex-row md:justify-between md:text-left">
        <div className="flex flex-col items-center gap-3 md:flex-row md:items-center md:gap-4">
          <LogoMark size={44} />
          <div className="flex flex-col gap-1">
            <p className="font-display text-[20px] leading-7 font-semibold tracking-[-0.01em]">Made with StayZim</p>
            <p className="max-w-md text-[14.5px] leading-6 text-white/75">This free demo site was made in about two minutes. Get one like it for your lodge, with bookings on WhatsApp.</p>
          </div>
        </div>
        <a
          href={SIGNUP}
          className="inline-flex h-12 shrink-0 items-center gap-2 rounded-full bg-[#0096BE] px-6 text-[15px] font-semibold text-white shadow-[0_10px_24px_-10px_rgba(0,150,190,0.8)] transition-colors hover:bg-[#007DA2]"
        >
          Make a site like this, free
          <ArrowRight className="size-4" />
        </a>
      </div>
    </aside>
  );
}
