import { ArrowRight, Sparkles } from "lucide-react";

import { MAIN_URL } from "@/lib/site-host";

const SIGNUP = `${MAIN_URL}/signup`;

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

export function DemoPill() {
  return (
    <span
      aria-hidden="true"
      className="pointer-events-none fixed bottom-[calc(5.75rem+env(safe-area-inset-bottom))] left-3 z-40 inline-flex items-center gap-1.5 rounded-full bg-[#0C181F]/85 px-2.5 py-1 text-[11px] font-bold tracking-[0.08em] text-white uppercase shadow-lg backdrop-blur lg:bottom-4 lg:left-4"
    >
      <span className="size-1.5 rounded-full bg-[#78CBE7]" />
      Demo
    </span>
  );
}

export function DemoBand() {
  return (
    <aside className="bg-[#0C181F] px-4 pt-8 pb-[calc(7rem+env(safe-area-inset-bottom))] text-center text-white lg:pb-8">
      <p className="mx-auto max-w-md text-[15px] leading-6 text-white/80">
        This is a free demo site, made with <strong className="font-semibold text-white">StayZim</strong> in about a minute.
      </p>
      <a
        href={SIGNUP}
        className="mt-3 inline-flex h-11 items-center gap-2 rounded-full bg-white px-5 text-sm font-semibold text-[#0C181F] hover:bg-white/90"
      >
        Make a site like this for your lodge
        <ArrowRight className="size-4" />
      </a>
    </aside>
  );
}
