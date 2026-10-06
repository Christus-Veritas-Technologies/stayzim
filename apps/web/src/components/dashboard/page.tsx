"use client";

import { Badge } from "@stayzim/ui/components/badge";
import { cn } from "@stayzim/ui/lib/utils";
import type { Route } from "next";
import type { ReactNode } from "react";

import { BackLink } from "@/components/dashboard/back-link";
import { SitePagesNav } from "@/components/dashboard/topbar";
import { Appear, Item, riseIn } from "@/components/motion";

/** A dashboard screen. Its sections rise in one after another. */
export function Page({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <Appear className={cn("mx-auto flex w-full max-w-[1180px] flex-col gap-4 lg:gap-5", className)} stagger={0.05}>
      {children}
    </Appear>
  );
}

/** One block of a screen, rising in with the rest. */
export function PageSection({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <Item variants={riseIn} className={className}>
      {children}
    </Item>
  );
}

/**
 * Title, count and one line under it, with the screen's actions at the right.
 * `sitePage` adds the My site pills on phones, and `back` a "‹ My site" link
 * above the title (phones only).
 */
export function PageHeader({
  title,
  count,
  description,
  actions,
  sitePage = false,
  back,
}: {
  title: ReactNode;
  count?: number;
  description?: ReactNode;
  actions?: ReactNode;
  sitePage?: boolean;
  back?: { label: string; href: Route };
}) {
  return (
    <PageSection className="flex flex-col gap-4">
      {sitePage ? <SitePagesNav /> : null}
      <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-3">
        <div className="flex min-w-0 flex-col gap-1">
          {back ? <BackLink label={back.label} href={back.href} /> : null}
          <h1 className="flex items-center gap-2.5 font-display text-2xl leading-8 font-semibold tracking-[-0.02em] text-ink lg:text-[28px] lg:leading-[34px]">
            {title}
            {count !== undefined ? <Badge className="h-6 text-[13px]">{count}</Badge> : null}
          </h1>
          {description ? <p className="text-[13.5px] leading-5 text-muted lg:text-sm">{description}</p> : null}
        </div>
        {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
      </div>
    </PageSection>
  );
}
