"use client";

import { Badge } from "@stayzim/ui/components/badge";
import { buttonVariants } from "@stayzim/ui/components/button";
import { CopyButton } from "@stayzim/ui/components/copy-button";
import { ArrowUpRight, Globe } from "lucide-react";
import Link from "next/link";

import type { Lodge } from "@/lib/lodge";
import { Reveal } from "@/components/motion";
import { siteHost, siteUrl, subdomainHost } from "@/lib/site-host";

/** The change request an owner sends to ask for their own domain. */
export const OWN_DOMAIN_REQUEST = "I'd like my own web address for my lodge site, like mylodge.co.zw. ";

/**
 * Where guests find the site. A lodge's own domain shows as connected, with the
 * stayzim.co.zw address that keeps working underneath; without one, a way to ask.
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
          {own ? (
            <Badge status variant="success">
              Your own domain
            </Badge>
          ) : null}
        </span>
        <a href={siteUrl(lodge)} target="_blank" rel="noreferrer" className="truncate text-[17px] font-semibold text-ink hover:text-brand">
          {siteHost(lodge)}
        </a>
        {own ? (
          <span className="text-[13px] text-muted">
            {subdomainHost(lodge)} still works, and opens the same site.
          </span>
        ) : (
          <span className="text-[13px] text-muted">
            Want your own, like {lodge.slug}.co.zw?{" "}
            <Link
              href={{ pathname: "/dashboard/requests", query: { topic: "OTHER", message: OWN_DOMAIN_REQUEST } }}
              className="-my-2.5 py-2.5 font-semibold text-brand hover:text-brand-dark"
            >
              Ask us
            </Link>
          </span>
        )}
      </div>
      <div className="flex gap-2">
        <CopyButton value={siteUrl(lodge)} size="sm" copiedLabel="Copied">
          Copy link
        </CopyButton>
        <a href={siteUrl(lodge)} target="_blank" rel="noreferrer" className={buttonVariants({ variant: "outline", size: "sm" })}>
          Open
          <ArrowUpRight />
        </a>
      </div>
    </Reveal>
  );
}
