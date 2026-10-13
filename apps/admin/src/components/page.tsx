"use client";

import { Badge } from "@stayzim/ui/components/badge";
import { Card } from "@stayzim/ui/components/card";
import { EmptyState } from "@stayzim/ui/components/empty-state";
import { Skeleton } from "@stayzim/ui/components/skeleton";
import { cn } from "@stayzim/ui/lib/utils";
import { ChevronLeft, TriangleAlert } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

import { Appear, Item, riseIn } from "@/components/motion";

/** An admin screen, as the owner dashboard lays its screens out: sections rise in one after another. */
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

/** Title, count and one line under it, with the screen's actions at the right. */
export function PageHeader({
  title,
  count,
  description,
  actions,
  back,
}: {
  title: ReactNode;
  count?: number;
  description?: ReactNode;
  actions?: ReactNode;
  back?: { label: string; href: string };
}) {
  return (
    <PageSection className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-3">
        <div className="flex min-w-0 flex-col gap-1">
          {back ? (
            <Link href={back.href} className="-my-1 inline-flex w-fit items-center gap-1 py-1 text-[13px] font-semibold text-muted no-underline transition-colors hover:text-ink">
              <ChevronLeft className="size-4" />
              {back.label}
            </Link>
          ) : null}
          <h1 className="flex items-center gap-2.5 font-display text-2xl leading-8 font-semibold tracking-[-0.02em] text-ink lg:text-[28px] lg:leading-[34px]">
            {title}
            {count !== undefined ? <Badge className="h-6 text-[13px]">{count}</Badge> : null}
          </h1>
          {description ? <p className="text-[13.5px] leading-5 text-muted lg:text-sm">{description}</p> : null}
        </div>
        {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
      </div>
    </PageSection>
  );
}

/** A card with a small heading row, as the dashboard's cards have. */
export function Panel({ title, description, actions, className, children }: { title?: ReactNode; description?: ReactNode; actions?: ReactNode; className?: string; children: ReactNode }) {
  return (
    <Card className={cn("flex flex-col gap-4 p-4 sm:p-5", className)}>
      {title || actions ? (
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex min-w-0 flex-col gap-0.5">
            {title ? <h2 className="font-display text-[17px] leading-6 font-semibold tracking-[-0.01em]">{title}</h2> : null}
            {description ? <p className="text-[13px] leading-5 text-muted">{description}</p> : null}
          </div>
          {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
        </div>
      ) : null}
      {children}
    </Card>
  );
}

/** A number with its label, the overview's tiles. */
export function Stat({ label, value, hint, tone = "default" }: { label: ReactNode; value: ReactNode; hint?: ReactNode; tone?: "default" | "brand" | "purple" | "success" | "warning" | "danger" }) {
  const colors = {
    default: "text-ink",
    brand: "text-brand",
    purple: "text-purple-ink",
    success: "text-success",
    warning: "text-warning",
    danger: "text-danger",
  } as const;
  return (
    <Card className="flex flex-col gap-1 p-4">
      <span className="text-[12.5px] font-medium text-muted">{label}</span>
      <span className={cn("font-display text-[28px] leading-8 font-semibold tracking-[-0.02em] tabular-nums", colors[tone])}>{value}</span>
      {hint ? <span className="text-[12px] text-muted-2">{hint}</span> : null}
    </Card>
  );
}

/** While a screen's data loads. */
export function LoadingCards({ rows = 3 }: { rows?: number }) {
  return (
    <div className="flex flex-col gap-4" role="status" aria-label="Loading">
      <Skeleton className="h-8 w-48" />
      {Array.from({ length: rows }, (_, index) => (
        <Skeleton key={index} className="h-[120px] rounded-[20px]" />
      ))}
    </div>
  );
}

/** When a screen's data didn't load. */
export function LoadError({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <EmptyState
      className="rounded-[20px] bg-white shadow-card"
      icon={<TriangleAlert />}
      title="That didn't load"
      description={message}
      action={
        onRetry ? (
          <button type="button" onClick={onRetry} className="text-sm font-semibold text-brand hover:text-brand-dark">
            Try again
          </button>
        ) : undefined
      }
    />
  );
}
