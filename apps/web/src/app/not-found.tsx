import { buttonVariants } from "@stayzim/ui/components/button";
import type { Metadata } from "next";
import Link from "next/link";

import { StatusScreen } from "@/components/status-screen";

export const metadata: Metadata = {
  title: { absolute: "Page not found · StayZim" },
  robots: { index: false },
};

/** Any address on stayzim.co.zw or app. that doesn't exist (lodge sites have their own). */
export default function NotFound() {
  return (
    <StatusScreen
      badge="404"
      title="This page has checked out"
      actions={
        <>
          <Link href="/dashboard" className={buttonVariants({ size: "lg" })}>
            Open my dashboard
          </Link>
          <Link href="/" className={buttonVariants({ variant: "outline", size: "lg" })}>
            Go to the homepage
          </Link>
        </>
      }
    >
      The link may be old, or there's a typo in the address. Let's get you back somewhere useful.
    </StatusScreen>
  );
}
