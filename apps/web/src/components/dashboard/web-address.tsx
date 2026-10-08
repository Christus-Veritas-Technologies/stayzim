"use client";

import { Badge } from "@stayzim/ui/components/badge";
import { buttonVariants } from "@stayzim/ui/components/button";
import { CopyButton } from "@stayzim/ui/components/copy-button";
import { InfoTip } from "@stayzim/ui/components/info-tip";
import { includesFreeDomain } from "@stayzim/sites";
import { ArrowUpRight, Globe } from "lucide-react";
import Link from "next/link";

import { Reveal } from "@/components/motion";
import { ownerSiteUrl, type Lodge } from "@/lib/lodge";
import { siteHost, siteUrl, subdomainHost } from "@/lib/site-host";

/** The change requests an owner sends to ask for their own domain: the free .co.zw (Growth, Pro), or one they have. */
export const FREE_DOMAIN_REQUEST = "I'd like the free .co.zw web address that comes with my plan. The address I'd like: ";
export const OWN_DOMAIN_REQUEST = "I have my own domain and I'd like my lodge site on it. The domain is: ";

/**
 * Where guests find the site. A lodge's own domain shows as connected, with the
 * stayzim.co.zw address that keeps working underneath. Without one: Growth and
 * Pro ask for their free .co.zw, Starter can connect a domain it has, and a demo
 * learns that own domains come once it's paid for.
 */
export function WebAddress({ lodge }: { lodge: Lodge }) {
  const own = Boolean(lodge.customDomain);
  return (
    <Reveal className="flex flex-col gap-3 rounded-2xl border border-line bg-white p-4 sm:flex-row sm:items-center sm:gap-4 sm:p-5">
      <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-brand-tint text-brand">
        <Globe className="size-5" />
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="flex flex-wrap items-center gap-2 text-[13px] font-semibold text-muted">
          Your web address
          <InfoTip>Guests find your site here. On a paid plan you can use your own domain, like yourlodge.co.zw; this address keeps working underneath.</InfoTip>
          {own ? (
            <Badge status variant="success">
              Your own domain
            </Badge>
          ) : null}
        </span>
        <a href={ownerSiteUrl(lodge)} target="_blank" rel="noreferrer" className="truncate text-[17px] font-semibold text-ink hover:text-brand">
          {siteHost(lodge)}
        </a>
        {own ? (
          <span className="text-[13px] text-muted">
            {subdomainHost(lodge)} still works, and opens the same site.
          </span>
        ) : lodge.status === "DEMO" ? (
          <span className="text-[13px] text-muted">
            Your own domain, like {lodge.slug}.co.zw, comes with any plan once you&apos;ve paid.{" "}
            <Link href="/dashboard/billing" className="-my-2.5 py-2.5 font-semibold text-brand hover:text-brand-dark">
              Billing
            </Link>
          </span>
        ) : includesFreeDomain(lodge.plan) ? (
          <span className="text-[13px] text-muted">
            Your plan includes a free .co.zw address, like {lodge.slug}.co.zw.{" "}
            <Link
              href={{ pathname: "/dashboard/requests", query: { topic: "OTHER", message: FREE_DOMAIN_REQUEST } }}
              className="-my-2.5 py-2.5 font-semibold text-brand hover:text-brand-dark"
            >
              Ask for it
            </Link>
          </span>
        ) : (
          <span className="text-[13px] text-muted">
            Have your own domain? We&apos;ll connect it.{" "}
            <Link
              href={{ pathname: "/dashboard/requests", query: { topic: "OTHER", message: OWN_DOMAIN_REQUEST } }}
              className="-my-2.5 py-2.5 font-semibold text-brand hover:text-brand-dark"
            >
              Ask us
            </Link>{" "}
            <span className="text-muted-2">(Growth and Pro include a free .co.zw)</span>
          </span>
        )}
      </div>
      <div className="flex gap-2">
        <CopyButton value={siteUrl(lodge)} size="sm" copiedLabel="Copied">
          Copy link
        </CopyButton>
        <a href={ownerSiteUrl(lodge)} target="_blank" rel="noreferrer" className={buttonVariants({ variant: "outline", size: "sm" })}>
          Open
          <ArrowUpRight />
        </a>
      </div>
    </Reveal>
  );
}
