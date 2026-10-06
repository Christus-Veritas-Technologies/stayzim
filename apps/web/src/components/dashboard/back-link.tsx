"use client";

import { ChevronLeft } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef } from "react";

/** Page changes inside the dashboard since it loaded. Above 0, Back stays in the app. */
let navigations = 0;

/** Counts page changes, so a back link knows whether there's a dashboard page to go back to. Render once. */
export function NavigationTracker() {
  const pathname = usePathname();
  const first = useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    navigations += 1;
  }, [pathname]);
  return null;
}

/**
 * "‹ My site" above a sub-screen's title on phones. Goes back when the owner
 * came from another dashboard page, otherwise to `href` (e.g. opened from a link).
 */
export function BackLink({ label, href }: { label: string; href: Route }) {
  const router = useRouter();
  return (
    <Link
      href={href}
      onClick={(event) => {
        if (navigations === 0 || event.metaKey || event.ctrlKey || event.shiftKey) return;
        event.preventDefault();
        router.back();
      }}
      className="group -ml-1 inline-flex w-fit items-center gap-0.5 rounded-md px-1 text-[13px] font-semibold text-brand outline-none hover:text-brand-dark focus-visible:ring-3 focus-visible:ring-ring/30 lg:hidden"
    >
      <ChevronLeft className="size-[15px] transition-transform duration-200 group-hover:-translate-x-0.5 group-active:-translate-x-1 motion-reduce:transition-none" />
      {label}
    </Link>
  );
}
