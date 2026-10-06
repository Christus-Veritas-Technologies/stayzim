import { Clock, Hourglass, SearchX } from "lucide-react";
import type { ReactNode } from "react";

import { MAIN_URL } from "@/lib/site-host";

function StatePage({ icon, title, children }: { icon: ReactNode; title: string; children: ReactNode }) {
  return (
    <main className="flex min-h-svh flex-col items-center justify-center gap-4 bg-[#FAF9F6] px-6 text-center text-[#0C181F]">
      <span className="flex size-14 items-center justify-center rounded-2xl bg-white text-[#4F5A60] shadow-[0_0_0_1px_rgba(12,24,31,0.06)] animate-in zoom-in-90 duration-500">
        {icon}
      </span>
      <h1 className="max-w-md font-serif text-3xl leading-10 font-semibold animate-in fade-in-0 slide-in-from-bottom-2 duration-500">
        {title}
      </h1>
      <div className="max-w-md text-[15px] leading-6 text-[#4F5A60] animate-in fade-in-0 duration-700">{children}</div>
      <a href="https://stayzim.co.zw" className="mt-6 text-sm text-[#6C767D] hover:text-[#0C181F]">
        Made with <strong className="font-semibold">StayZim</strong>
      </a>
    </main>
  );
}

/** X1: the lodge hasn't paid. Guests see this until it does. */
export function SuspendedSite({ name }: { name: string }) {
  return (
    <StatePage icon={<Clock className="size-6" />} title={`${name} is temporarily unavailable`}>
      This site is taking a short break. Please check back soon.
    </StatePage>
  );
}

/** A demo whose 2 days are up, until the owner pays. */
export function DemoEndedSite({ name }: { name: string }) {
  return (
    <StatePage icon={<Hourglass className="size-6" />} title={`${name} isn't online right now`}>
      This lodge&apos;s demo site has ended. Is it yours?{" "}
      <a href={`${MAIN_URL}/login`} className="font-semibold text-[#0C181F] underline underline-offset-2">
        Log in
      </a>{" "}
      and choose a plan to put it back live, just as you left it.
    </StatePage>
  );
}

/** X2: no lodge has this address. */
export function UnknownSite() {
  return (
    <StatePage icon={<SearchX className="size-6" />} title="We couldn't find that lodge">
      Check the address for typos. If you're a lodge owner, StayZim can give you a site like this one.
    </StatePage>
  );
}
