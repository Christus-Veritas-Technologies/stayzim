"use client";

import { buttonVariants } from "@stayzim/ui/components/button";
import { Card, CardAction, CardHeader, CardTitle } from "@stayzim/ui/components/card";
import { CopyButton } from "@stayzim/ui/components/copy-button";
import { EmptyState } from "@stayzim/ui/components/empty-state";
import { Lock, Radar } from "lucide-react";
import { useState } from "react";

import { useLodge } from "@/components/dashboard/lodge-provider";
import { Page, PageHeader, PageSection } from "@/components/dashboard/page";
import { useShareLink } from "@/components/dashboard/share";
import { PeriodTabs, StatCards, VisitsCard } from "@/components/dashboard/visit-stats";
import { WhatsAppIcon } from "@/components/landing/brand";
import { hasAnalytics, PLANS, siteHost } from "@/lib/lodge";
import { PERIODS, visitStats, type Period } from "@/lib/stats";
import { stayzimChatUrl } from "@/lib/whatsapp";

/** Hours of one day say little here; the overview has Today. */
const ANALYTICS_PERIODS = PERIODS.filter((period) => period.value !== "today");

/** Made-up rows behind the blur on Starter, to show what Growth unlocks. */
const SAMPLE_VISITS = [
  { when: "Today, 10:42", country: "ZA", name: "South Africa", page: "/", device: "Phone" },
  { when: "Today, 10:38", country: "ZW", name: "Zimbabwe", page: "/#rooms", device: "Phone" },
  { when: "Today, 09:51", country: "ZW", name: "Zimbabwe", page: "/", device: "Computer" },
  { when: "Today, 08:20", country: "GB", name: "United Kingdom", page: "/#gallery", device: "Phone" },
  { when: "Today, 07:03", country: "ZM", name: "Zambia", page: "/", device: "Phone" },
];

function LockedPreview() {
  const { lodge } = useLodge();
  const growth = PLANS.GROWTH;
  return (
    <Card className="relative overflow-hidden">
      <div aria-hidden="true" className="pointer-events-none blur-[3px] select-none">
        <div className="grid grid-cols-[1.2fr_1fr_0.8fr_1fr] border-b border-line-3 bg-surface px-5 py-2.5 text-xs font-semibold text-muted">
          <span>Date</span>
          <span>Country</span>
          <span>Page</span>
          <span>Device</span>
        </div>
        {SAMPLE_VISITS.map((visit) => (
          <div key={visit.when} className="grid grid-cols-[1.2fr_1fr_0.8fr_1fr] border-b border-line-3 px-5 py-3 text-[13px]">
            <span>{visit.when}</span>
            <span>
              <strong className="font-semibold">{visit.country}</strong> {visit.name}
            </span>
            <span className="font-mono text-xs">{visit.page}</span>
            <span>{visit.device}</span>
          </div>
        ))}
      </div>
      <div className="absolute inset-0 flex items-center justify-center bg-white/55 p-4">
        <div className="flex max-w-sm flex-col items-center gap-3 rounded-[20px] bg-white p-6 text-center shadow-pop animate-in fade-in-0 zoom-in-95 duration-500">
          <span className="flex size-11 items-center justify-center rounded-full bg-purple-wash text-purple">
            <Lock className="size-5" />
          </span>
          <span className="text-xs font-semibold tracking-[0.06em] text-purple uppercase">{growth.name} plan</span>
          <p className="font-display text-lg leading-6 font-semibold">See who visits your site, and from where</p>
          <a
            href={stayzimChatUrl(`Hi StayZim, I'd like to move ${lodge.name} to the ${growth.name} plan ($${growth.price}/month).`)}
            target="_blank"
            rel="noreferrer"
            className={buttonVariants({ variant: "accent", size: "lg", className: "w-full" })}
          >
            Upgrade to {growth.name} (${growth.price}/mo)
          </a>
        </div>
      </div>
    </Card>
  );
}

export default function AnalyticsPage() {
  const { lodge } = useLodge();
  const share = useShareLink();
  const [period, setPeriod] = useState<Period>("7d");
  const stats = visitStats(period);
  const unlocked = hasAnalytics(lodge);

  return (
    <Page>
      <PageHeader
        title="Analytics"
        description={
          <>
            Visits to <span className="font-semibold text-ink">{siteHost(lodge)}</span>. Your own visits are not counted.
          </>
        }
        actions={unlocked ? <PeriodTabs value={period} onChange={setPeriod} periods={ANALYTICS_PERIODS} /> : null}
      />

      {unlocked ? (
        <>
          <PageSection>
            <StatCards stats={stats} period={period} />
          </PageSection>
          <PageSection>
            <VisitsCard stats={stats} period={period} />
          </PageSection>
          <PageSection>
            <Card>
              <CardHeader className="border-b border-line-3">
                <CardTitle>Recent visits</CardTitle>
                <CardAction className="text-[13px] text-muted-2">Newest first</CardAction>
              </CardHeader>
              <EmptyState
                icon={<Radar />}
                title="No visits yet. Share your link to get started"
                description="Every visit shows here with its date, country, page and device, and whether the guest tapped Book on WhatsApp."
                action={
                  <>
                    <CopyButton value={share.url} onCopied={share.markShared} copiedLabel="Link copied">
                      Copy link
                    </CopyButton>
                    <a
                      href={share.whatsappUrl()}
                      target="_blank"
                      rel="noreferrer"
                      onClick={share.markShared}
                      className={buttonVariants({ variant: "whatsapp" })}
                    >
                      <WhatsAppIcon size={16} />
                      Share on WhatsApp
                    </a>
                  </>
                }
              />
            </Card>
          </PageSection>
        </>
      ) : (
        <PageSection>
          <LockedPreview />
        </PageSection>
      )}
    </Page>
  );
}
