import type { Metadata } from "next";

import { MetaPixel } from "@/components/meta-pixel";

export const metadata: Metadata = {
  title: "Make your lodge's website",
  description: "Your lodge's own website, booked on WhatsApp. For lodges, guesthouses, B&Bs and holiday homes in Zimbabwe: live in about a minute, free for 2 days.",
  // The ads and the landing page send people here, and people search for it
  robots: { index: true, follow: true },
};

export default function CreateLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <MetaPixel />
    </>
  );
}
