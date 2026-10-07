"use client";

import { Button, buttonVariants } from "@stayzim/ui/components/button";
import { CopyButton } from "@stayzim/ui/components/copy-button";
import { FormMessage } from "@stayzim/ui/components/field";
import { includesBookingCalendar } from "@stayzim/sites";
import { ArrowUpRight, RotateCcw } from "lucide-react";
import { useState } from "react";

import { ComingUpCard } from "@/components/dashboard/coming-up";
import { useLodge } from "@/components/dashboard/lodge-provider";
import { ActivityCard, RoomsSummaryCard } from "@/components/dashboard/overview-cards";
import { Page, PageHeader, PageSection } from "@/components/dashboard/page";
import { SetupChecklist } from "@/components/dashboard/setup-checklist";
import { TodayStrip } from "@/components/dashboard/today-strip";
import { ShareCard, useShareLink } from "@/components/dashboard/share";
import { AnalyticsUpsell, PeriodTabs, StatCards, VisitsCard } from "@/components/dashboard/visit-stats";
import { WhatsAppIcon } from "@/components/landing/brand";
import { authClient } from "@/lib/auth-client";
import { hasAnalytics, siteHost, siteUrl } from "@/lib/lodge";
import { useVisitStats, type Period } from "@/lib/stats";

/** Phones: the link, View site and Share, at the top where thumbs reach. */
function MobileSiteCard() {
  const { lodge } = useLodge();
  const share = useShareLink();
  return (
    <div className="flex flex-col gap-2.5 rounded-[20px] bg-white p-3 shadow-card lg:hidden">
      <div className="flex h-11 items-center gap-2 rounded-xl bg-surface pr-1 pl-3 text-[13.5px]">
        <span className="size-[7px] shrink-0 rounded-full bg-success shadow-[0_0_0_3px_var(--color-success-wash)]" />
        <span className="min-w-0 flex-1 truncate">{siteHost(lodge)}</span>
        <CopyButton value={siteUrl(lodge)} size="sm" onCopied={share.markShared} copiedLabel="Copied">
          Copy
        </CopyButton>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <a href={siteUrl(lodge)} target="_blank" rel="noreferrer" className={buttonVariants({ variant: "outline", size: "lg" })}>
          View site
          <ArrowUpRight />
        </a>
        <a
          href={share.whatsappUrl()}
          target="_blank"
          rel="noreferrer"
          onClick={share.markShared}
          className={buttonVariants({ variant: "whatsapp", size: "lg" })}
        >
          <WhatsAppIcon size={17} />
          Share
        </a>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { lodge } = useLodge();
  const { data: session } = authClient.useSession();
  const [period, setPeriod] = useState<Period>("7d");
  const { stats, loading, locked, error, retry } = useVisitStats(period, hasAnalytics(lodge));
  // A guest account from /create has no real name yet ("Lodge owner")
  const firstName = session?.user.isAnonymous ? "" : (session?.user.name.split(" ")[0] ?? "");

  return (
    <Page>
      <PageHeader
        title={firstName ? `Hi, ${firstName}` : "Welcome"}
        description={`Here is how ${lodge.name} is doing.`}
        actions={locked ? null : <PeriodTabs value={period} onChange={setPeriod} className="hidden sm:flex" />}
      />

      <PageSection className="lg:hidden">
        <MobileSiteCard />
      </PageSection>

      <TodayStrip lodge={lodge} />

      <PageSection>
        <SetupChecklist />
      </PageSection>

      {locked ? (
        <PageSection className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
          <AnalyticsUpsell className="self-start" />
          <ShareCard className="hidden lg:flex" />
        </PageSection>
      ) : (
        <>
          <PageSection className="sm:hidden">
            <PeriodTabs value={period} onChange={setPeriod} />
          </PageSection>

          {error ? (
            <PageSection>
              <FormMessage className="items-center">
                <span className="flex-1">Visits didn&apos;t load. {error}</span>
                <Button variant="outline" size="sm" onClick={retry} className="shrink-0">
                  <RotateCcw />
                  Try again
                </Button>
              </FormMessage>
            </PageSection>
          ) : null}

          <PageSection>
            <StatCards stats={stats} period={period} loading={loading} />
          </PageSection>

          {includesBookingCalendar(lodge.plan) ? (
            <PageSection>
              <ComingUpCard />
            </PageSection>
          ) : null}

          <PageSection className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
            <VisitsCard
              stats={stats}
              period={period}
              loading={loading}
              empty={
                <>
                  <strong className="block font-semibold text-ink">No visits counted yet</strong>
                  Visits show here once guests open {siteHost(lodge)}.
                </>
              }
            />
            <ShareCard className="hidden lg:flex" />
          </PageSection>
        </>
      )}

      <PageSection className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
        <RoomsSummaryCard />
        <ActivityCard />
      </PageSection>

      <PageSection className="lg:hidden">
        <ShareCard />
      </PageSection>
    </Page>
  );
}
