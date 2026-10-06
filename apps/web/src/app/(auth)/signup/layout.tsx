import type { Metadata } from "next";

import { MetaPixel } from "@/components/meta-pixel";

export const metadata: Metadata = {
  title: "Try StayZim free",
  description: "Your lodge's own website, booked on WhatsApp. Sign up and your site is live in 5 minutes, free for 2 days.",
  // Unlike the other account screens, people search for this one
  robots: { index: true, follow: true },
};

export default function SignupLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <MetaPixel />
    </>
  );
}
