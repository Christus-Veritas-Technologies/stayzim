"use client";

import { usePathname } from "next/navigation";
import Script from "next/script";
import { useEffect } from "react";

import { META_PIXEL_ID, metaEvent } from "@/lib/meta-pixel";

/** The page last reported, for this page load (survives React re-running effects). */
let lastPath: string | null = null;

/**
 * Loads the Meta Pixel on the page it's placed in (landing, sign-up, start,
 * dashboard) and reports a PageView on each route change. Nothing at all when
 * NEXT_PUBLIC_META_PIXEL_ID isn't set. Meta's standard snippet, as Meta gives it.
 */
export function MetaPixel() {
  const pathname = usePathname();

  useEffect(() => {
    // The snippet reports the first page itself; each later page once
    if (lastPath === null || lastPath === pathname) {
      lastPath = pathname;
      return;
    }
    lastPath = pathname;
    metaEvent("PageView");
  }, [pathname]);

  if (!META_PIXEL_ID) return null;
  return (
    <Script id="meta-pixel" strategy="afterInteractive">
      {`!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init','${META_PIXEL_ID}');fbq('track','PageView');`}
    </Script>
  );
}
