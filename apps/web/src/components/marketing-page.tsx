import type { ReactNode } from "react";

import { FoundingProvider } from "@/components/founding";
import { FoundingBar } from "@/components/landing/founding-bar";

/** StayZim's own pages other than the landing page (/lodges, Privacy, Terms): the founding strip on top while it lasts. */
export function MarketingPage({ children }: { children: ReactNode }) {
  return (
    <FoundingProvider serverNow={Date.now()}>
      <div className="sticky top-0 z-50">
        <FoundingBar />
      </div>
      {children}
    </FoundingProvider>
  );
}
