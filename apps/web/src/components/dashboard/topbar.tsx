"use client";

import { Avatar } from "@stayzim/ui/components/avatar";
import { buttonVariants } from "@stayzim/ui/components/button";
import { CopyButton } from "@stayzim/ui/components/copy-button";
import { cn } from "@stayzim/ui/lib/utils";
import { motion } from "framer-motion";
import { ArrowUpRight, ChevronRight, Clock, TriangleAlert } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

import { AccountMenu } from "@/components/dashboard/account-menu";
import { NavIcon } from "@/components/dashboard/link-pending";
import { useLodge } from "@/components/dashboard/lodge-provider";
import { breadcrumb, isActive, lodgeStatus, navLinks } from "@/components/dashboard/nav";
import { demoTimeLeft, formatTimeLeft, PLANS, siteHost, siteUrl, type Lodge } from "@/lib/lodge";
import { useNow } from "@/lib/use-now";

/** A demo that's still live: purple, with the time left. Everything else that isn't Active is a payment warning. */
function isLiveDemo(lodge: Lodge) {
  return lodge.status === "DEMO" && !lodge.demoEnded;
}

/** "Growth demo: 1 day 4 h left [Pay to keep it]", or a payment warning once the demo or the paid period is over. */
function PlanPill({ lodge, compact = false }: { lodge: Lodge; compact?: boolean }) {
  const now = useNow();
  if (lodge.status === "ACTIVE") return null;

  if (isLiveDemo(lodge)) {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-2 text-[13px] text-purple-ink",
          compact ? "" : "h-9 rounded-full border border-purple-line bg-purple-tint pr-1 pl-3",
        )}
      >
        <Clock className="size-4 text-purple" />
        <span>
          <strong className="font-semibold">{PLANS[lodge.plan].name} demo:</strong> {formatTimeLeft(demoTimeLeft(lodge, now))} left
        </span>
        {compact ? null : (
          <Link href="/dashboard/billing" className={buttonVariants({ variant: "accent", size: "xs", className: "rounded-full" })}>
            Pay to keep it
          </Link>
        )}
      </span>
    );
  }

  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 text-[13px] text-danger",
        compact ? "" : "h-9 rounded-full border border-danger-line bg-danger-tint pr-1 pl-3",
      )}
    >
      <TriangleAlert className="size-4" />
      <strong className="font-semibold">{lodge.status === "DEMO" ? "Demo ended" : lodge.status === "SUSPENDED" ? "Site offline" : "Payment due"}</strong>
      {compact ? null : (
        <Link href="/dashboard/billing" className={buttonVariants({ variant: "destructive", size: "xs", className: "rounded-full" })}>
          Pay now
        </Link>
      )}
    </span>
  );
}

/** Top of the white panel on desktop: where you are, the trial, and your site. */
export function Topbar() {
  const { lodge } = useLodge();
  const pathname = usePathname();
  const trail = breadcrumb(pathname);

  return (
    <header className="sticky top-0 z-30 hidden h-[60px] shrink-0 items-center gap-3 rounded-t-[20px] border-b border-line-3 bg-white/90 pr-4 pl-7 backdrop-blur lg:flex">
      <nav aria-label="Breadcrumb" className="flex min-w-0 items-center gap-2 text-sm text-muted-2">
        {trail.map((crumb, index) => (
          <span key={crumb} className="flex items-center gap-2">
            {index > 0 ? <ChevronRight className="size-3.5" /> : null}
            <span className={index === trail.length - 1 ? "font-semibold text-ink" : undefined}>{crumb}</span>
          </span>
        ))}
      </nav>

      <div className="ml-auto flex items-center gap-2">
        <PlanPill lodge={lodge} />
        <span className="hidden h-9 items-center gap-2 rounded-[10px] border border-line pr-1 pl-3 text-[13px] text-slate xl:inline-flex">
          <span className="size-[7px] rounded-full bg-success shadow-[0_0_0_3px_var(--color-success-wash)]" />
          {siteHost(lodge)}
          <CopyButton value={siteUrl(lodge)} variant="secondary" size="icon-xs" copiedLabel="Link copied" />
        </span>
        <a href={siteUrl(lodge)} target="_blank" rel="noreferrer" className={buttonVariants({ variant: "outline", size: "sm" })}>
          View site
          <ArrowUpRight />
        </a>
      </div>
    </header>
  );
}

/** Phone header: the lodge, a link to the site, the account menu, then the trial strip. */
export function MobileHeader({ user }: { user: { name: string; email: string } }) {
  const { lodge } = useLodge();
  const status = lodgeStatus(lodge);

  return (
    <header className="sticky top-0 z-30 border-b border-line-3 bg-white/90 backdrop-blur lg:hidden">
      <div className="flex h-14 items-center gap-2.5 px-4">
        <Avatar shape="lodge" name={lodge.name} src={lodge.logoUrl} color={lodge.themeColor} />
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="truncate text-[14px] font-semibold">{lodge.name}</span>
          <span className="inline-flex items-center gap-1.5 text-xs text-muted">
            <span className={cn("size-1.5 shrink-0 rounded-full", status.dot)} />
            <span className="truncate">{status.label}</span>
          </span>
        </span>
        <a
          href={siteUrl(lodge)}
          target="_blank"
          rel="noreferrer"
          aria-label="View your site"
          className={buttonVariants({ variant: "ghost", size: "icon-sm" })}
        >
          <ArrowUpRight />
        </a>
        <AccountMenu name={user.name} email={user.email} />
      </div>
      {lodge.status === "ACTIVE" ? null : (
        <div
          className={cn(
            "flex h-9 items-center justify-between gap-3 px-4 text-[13px]",
            isLiveDemo(lodge) ? "bg-purple-tint" : "bg-danger-tint",
          )}
        >
          <PlanPill lodge={lodge} compact />
          <Link
            href="/dashboard/billing"
            className={cn("-my-2.5 py-2.5 font-semibold underline underline-offset-2", isLiveDemo(lodge) ? "text-purple" : "text-danger")}
          >
            {isLiveDemo(lodge) ? "Pay to keep it" : "Pay now"}
          </Link>
        </div>
      )}
    </header>
  );
}

/** Phone bottom bar: Dashboard, My site, Analytics, Billing. */
export function BottomNav() {
  const { lodge } = useLodge();
  const pathname = usePathname();
  const links = navLinks(lodge);

  return (
    <nav
      aria-label="Dashboard"
      style={{ gridTemplateColumns: `repeat(${links.length}, minmax(0, 1fr))` }}
      className="fixed inset-x-0 bottom-0 z-40 grid border-t border-line-3 bg-white/95 px-2 pt-1.5 pb-[max(0.5rem,env(safe-area-inset-bottom))] backdrop-blur lg:hidden"
    >
      {links.map((link) => {
        const active = isActive(pathname, link.href);
        const Icon = link.icon;
        return (
          <Link
            key={link.href}
            href={link.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex flex-col items-center gap-1 rounded-xl py-1 text-[11.5px] font-medium outline-none focus-visible:ring-3 focus-visible:ring-ring/30",
              active ? "font-semibold text-brand" : "text-muted-2",
            )}
          >
            <span className="relative flex h-7 w-12 items-center justify-center">
              {active ? (
                <motion.span
                  layoutId="bottom-nav-active"
                  transition={{ type: "spring", stiffness: 500, damping: 38 }}
                  className="absolute inset-0 rounded-full bg-brand-wash"
                />
              ) : null}
              <NavIcon icon={Icon} className="relative size-5" />
              {link.attention || (link.badge && !isLiveDemo(lodge)) || link.count ? (
                <span className="absolute top-0.5 right-2.5 size-1.5 rounded-full bg-purple ring-2 ring-white" />
              ) : null}
            </span>
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}

/** The My site pages as pills under the phone header (they share one bottom tab). */
export function SitePagesNav() {
  const pathname = usePathname();
  const { lodge } = useLodge();
  const pages = navLinks(lodge).find((link) => link.children)?.children ?? [];
  const nav = useRef<HTMLElement>(null);

  // On narrow phones the pills scroll sideways: keep the open page's pill in view
  useEffect(() => {
    const current = nav.current?.querySelector<HTMLElement>('[aria-current="page"]');
    if (!current || !nav.current) return;
    const { left, right } = current.getBoundingClientRect();
    const box = nav.current.getBoundingClientRect();
    if (left < box.left || right > box.right) nav.current.scrollLeft += right - box.right + 16;
  }, [pathname]);

  return (
    <nav ref={nav} aria-label="My site" className="-mx-4 flex gap-1.5 overflow-x-auto px-4 pb-1 [scrollbar-width:none] lg:hidden">
      {pages.map((page) => {
        const current = pathname.startsWith(page.href);
        return (
          <Link
            key={page.href}
            href={page.href}
            aria-current={current ? "page" : undefined}
            className={cn(
              "relative inline-flex h-[34px] shrink-0 items-center gap-1.5 rounded-full px-3.5 text-[13.5px] font-medium transition-colors",
              current ? "font-semibold text-white" : "bg-surface-2 text-muted",
            )}
          >
            {current ? (
              <motion.span
                layoutId="site-pages-active"
                transition={{ type: "spring", stiffness: 500, damping: 40 }}
                className="absolute inset-0 rounded-full bg-primary shadow-brand"
              />
            ) : null}
            <span className="relative">{page.label}</span>
            {page.count !== undefined ? <span className={cn("relative text-xs", current ? "text-white/80" : "text-muted-2")}>{page.count}</span> : null}
          </Link>
        );
      })}
    </nav>
  );
}
