import type { Metadata } from "next";

import { FoundingProvider } from "@/components/founding";
import { MetaPixel } from "@/components/meta-pixel";

export const metadata: Metadata = {
  title: "Make your lodge's website",
  description: "Your lodge's own website, booked on WhatsApp. For lodges, guesthouses, B&Bs and holiday homes in Zimbabwe: built free, live in about a minute.",
  // The ads and the landing page send people here, and people search for it
  robots: { index: true, follow: true },
};

export default function CreateLayout({ children }: { children: React.ReactNode }) {
  return (
    <FoundingProvider serverNow={Date.now()}>
      {children}
      <MetaPixel />
    </FoundingProvider>
  );
}
