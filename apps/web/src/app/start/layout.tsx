import type { Metadata } from "next";

import { MetaPixel } from "@/components/meta-pixel";

export const metadata: Metadata = {
  title: "Make your site",
  robots: { index: false, follow: false },
};

export default function StartLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <MetaPixel />
    </>
  );
}
