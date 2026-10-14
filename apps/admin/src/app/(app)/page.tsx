"use client";

import { Badge } from "@stayzim/ui/components/badge";
import { buttonVariants } from "@stayzim/ui/components/button";
import { Plus } from "lucide-react";
import Link from "next/link";

import { LoadError, LoadingCards, Page, PageHeader, PageSection, Panel, Stat } from "@/components/page";
import { formatShortWhen } from "@/lib/format";
import { PLAN_NAMES, SITE_STATES } from "@/lib/labels";
import { formatCents } from "@/lib/money";
import type { Overview } from "@/lib/types";
import { useApi } from "@/lib/use-api";

const STEP_NAMES: Record<string, string> = { open: "Opened /create", look: "Picked a look", place: "Their place", lodge: "Name and WhatsApp", photo: "Photos", live: "Site live", claim: "Claimed" };

export default function OverviewPage() {
  const { data, error, loading, reload } = useApi<Overview>("/api/admin/overview");

  return (
    <Page>
      <PageHeader
        title="Overview"
        description="Sign-ups, sites and money across StayZim."
        actions={
          <Link href="/sites/new" className={buttonVariants({ size: "sm" })}>
            <Plus />
            New sites
          </Link>
        }
      />
      {loading ? <LoadingCards /> : null}
      {error ? <LoadError message={error} onRetry={reload} /> : null}
      {data ? (
        <>
          <PageSection className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Stat label="Sign-ups today" value={data.signups.today} hint={`${data.signups.week} this week · ${data.signups.month} in 30 days`} tone="brand" />
            <Stat label="Monthly revenue" value={formatCents(data.money.mrrCents)} hint="Active sites, at their own prices" tone="success" />
            <Stat label="Paid in 30 days" value={formatCents(data.money.paid30Cents)} hint={`${data.money.paid30Count} payments · ${data.money.pending} waiting`} />
            <Stat label="Leads" value={data.leads} hint={`${data.sites.leadSites} sites made for leads`} tone="purple" />
          </PageSection>

          <PageSection className="grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
            <Panel title="Sites" description="Sites people made themselves, by where they stand.">
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {(Object.keys(SITE_STATES) as (keyof typeof SITE_STATES)[]).map((state) => (
                  <Link key={state} href={`/sites?state=${state}`} className="flex flex-col gap-1 rounded-[14px] bg-surface-2 p-3 no-underline transition-colors hover:bg-surface">
                    <Badge variant={SITE_STATES[state].badge} className="w-fit">
                      {SITE_STATES[state].label}
                    </Badge>
                    <span className="font-display text-2xl font-semibold text-ink tabular-nums">{data.sites[state]}</span>
                  </Link>
                ))}
                <div className="flex flex-col gap-1 rounded-[14px] bg-purple-tint p-3">
                  <Badge variant="purple" className="w-fit">
                    Founding price
                  </Badge>
                  <span className="font-display text-2xl font-semibold text-ink tabular-nums">{data.sites.founding}</span>
                </div>
              </div>
              <p className="text-[12.5px] text-muted">
                Owners who claimed their site: {data.users.owners} · guests who haven&apos;t yet: {data.users.guests} · team: {data.users.team}
              </p>
            </Panel>

            <Panel title="The /create funnel" description="Visitors who reached each step in the last 30 days.">
              <ol className="flex flex-col gap-2">
                {data.funnel.map((row) => {
                  const top = Math.max(1, data.funnel[0]?.visitors ?? 1);
                  return (
                    <li key={row.step} className="flex items-center gap-3 text-[13.5px]">
                      <span className="w-36 shrink-0 text-muted">{STEP_NAMES[row.step] ?? row.step}</span>
                      <span className="relative h-6 flex-1 overflow-hidden rounded-md bg-surface-2">
                        <span className="absolute inset-y-0 left-0 rounded-md bg-brand/80" style={{ width: `${(row.visitors / top) * 100}%` }} />
                      </span>
                      <span className="w-10 text-right font-semibold tabular-nums">{row.visitors}</span>
                    </li>
                  );
                })}
              </ol>
              {data.sources.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {data.sources.map((source) => (
                    <Badge key={source.source} variant="neutral">
                      {source.source}: {source.sites}
                    </Badge>
                  ))}
                </div>
              ) : null}
            </Panel>
          </PageSection>

          <PageSection className="grid gap-4 xl:grid-cols-2">
            <Panel title="Latest sign-ups" actions={<Link href="/sites" className="text-[13px] font-semibold text-brand hover:text-brand-dark">All sites</Link>}>
              <ul className="flex flex-col divide-y divide-line-3">
                {data.recentSites.length === 0 ? <li className="py-2 text-[13.5px] text-muted">No sites yet.</li> : null}
                {data.recentSites.map((site) => (
                  <li key={site.id} className="flex items-center justify-between gap-3 py-2.5">
                    <Link href={`/sites/${site.slug}`} className="flex min-w-0 flex-col no-underline">
                      <span className="truncate text-[14px] font-semibold text-ink">{site.name}</span>
                      <span className="truncate text-[12.5px] text-muted">
                        {site.owner.guest ? "Guest, not claimed" : (site.owner.email ?? site.owner.name)} · {PLAN_NAMES[site.plan]} · {site.source ?? "direct"}
                      </span>
                    </Link>
                    <span className="flex shrink-0 flex-col items-end gap-1">
                      <Badge variant={SITE_STATES[site.state].badge}>{SITE_STATES[site.state].label}</Badge>
                      <span className="text-[12px] text-muted-2">{formatShortWhen(site.createdAt)}</span>
                    </span>
                  </li>
                ))}
              </ul>
            </Panel>
            <Panel title="Latest payments" actions={<Link href="/billing" className="text-[13px] font-semibold text-brand hover:text-brand-dark">Billing</Link>}>
              <ul className="flex flex-col divide-y divide-line-3">
                {data.recentPayments.length === 0 ? <li className="py-2 text-[13.5px] text-muted">No payments yet.</li> : null}
                {data.recentPayments.map((payment) => (
                  <li key={payment.id} className="flex items-center justify-between gap-3 py-2.5">
                    <Link href={`/sites/${payment.lodge.slug}`} className="flex min-w-0 flex-col no-underline">
                      <span className="truncate text-[14px] font-semibold text-ink">{payment.lodge.name}</span>
                      <span className="text-[12.5px] text-muted">
                        {PLAN_NAMES[payment.plan]}, {payment.months} {payment.months === 1 ? "month" : "months"} · {payment.channel}
                      </span>
                    </Link>
                    <span className="flex shrink-0 flex-col items-end">
                      <span className="text-[14px] font-semibold tabular-nums">{formatCents(payment.amountCents)}</span>
                      <span className="text-[12px] text-muted-2">{formatShortWhen(payment.paidAt)}</span>
                    </span>
                  </li>
                ))}
              </ul>
            </Panel>
          </PageSection>
        </>
      ) : null}
    </Page>
  );
}
