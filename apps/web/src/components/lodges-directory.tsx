"use client";

import { SETTINGS, type DirectoryLodge } from "@stayzim/sites";
import { buttonVariants } from "@stayzim/ui/components/button";
import { ArrowLeft, ArrowUpRight, MapPin } from "lucide-react";
import Link from "next/link";

import { Wordmark } from "@/components/landing/brand";
import { Appear, Item, riseIn } from "@/components/motion";
import { siteHost, siteUrl } from "@/lib/site-host";

/** One lodge: its photo, name, place and price from, opening its own site. */
function LodgeCard({ lodge }: { lodge: DirectoryLodge }) {
  const place = [lodge.town, lodge.region].filter(Boolean).join(", ");
  return (
    <a
      href={siteUrl(lodge)}
      className="group flex flex-col overflow-hidden rounded-[20px] bg-white text-ink no-underline shadow-card transition-shadow outline-none hover:shadow-[0_18px_40px_-18px_rgba(12,24,31,0.35)] focus-visible:ring-3 focus-visible:ring-ring/30"
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-surface-2">
        {lodge.hero ? (
          // eslint-disable-next-line @next/next/no-img-element -- lodge photos come with their own srcset from the API
          <img
            src={lodge.hero.url}
            srcSet={lodge.hero.srcSet ?? undefined}
            sizes="(min-width: 1024px) 340px, (min-width: 640px) 50vw, 100vw"
            alt=""
            loading="lazy"
            className="size-full object-cover transition-transform duration-500 group-hover:scale-[1.03] motion-reduce:transition-none motion-reduce:group-hover:scale-100"
          />
        ) : (
          <span
            aria-hidden="true"
            className="flex size-full items-center justify-center font-display text-[64px] font-semibold text-white/85"
            style={{ background: `linear-gradient(135deg, ${lodge.themeColor}, color-mix(in srgb, ${lodge.themeColor} 70%, #0C181F))` }}
          >
            {lodge.name.charAt(0)}
          </span>
        )}
        {lodge.priceFrom ? (
          <span className="absolute bottom-3 left-3 rounded-full bg-white/95 px-3 py-1 text-[13px] font-semibold text-ink shadow-xs">From ${lodge.priceFrom} a night</span>
        ) : null}
      </div>
      <div className="flex flex-col gap-1 p-4">
        <span className="flex items-center justify-between gap-2">
          <span className="font-display text-[18px] leading-6 font-semibold tracking-[-0.01em]">{lodge.name}</span>
          <ArrowUpRight className="size-4 shrink-0 text-muted-2 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-brand" />
        </span>
        {place ? (
          <span className="flex items-center gap-1.5 text-[13.5px] text-muted">
            <MapPin className="size-3.5" />
            {place}
            {lodge.setting ? <span className="text-muted-2">· {SETTINGS[lodge.setting].label}</span> : null}
          </span>
        ) : null}
        <span className="truncate text-[12.5px] text-muted-2">{siteHost(lodge)}</span>
      </div>
    </a>
  );
}

/** StayZim's lodge directory: every paid lodge, by town, each opening its own site. */
export function LodgesDirectory({ groups }: { groups: [string, DirectoryLodge[]][] }) {
  return (
    <div className="min-h-svh bg-surface">
      <header className="border-b border-line-3 bg-white">
        <div className="mx-auto flex h-16 max-w-[1120px] items-center justify-between px-5">
          <Link href="/" className="text-lg text-ink no-underline" aria-label="StayZim home">
            <Wordmark size={30} />
          </Link>
          <Link href="/" className="group -my-2.5 inline-flex items-center gap-1.5 py-2.5 text-[13.5px] font-semibold text-muted transition-colors hover:text-ink">
            <ArrowLeft className="size-4 transition-transform group-hover:-translate-x-0.5" />
            Home
          </Link>
        </div>
      </header>

      <Appear className="mx-auto flex max-w-[1120px] flex-col gap-10 px-5 pt-10 pb-20 lg:pt-14" stagger={0.05}>
        <Item variants={riseIn} className="flex max-w-2xl flex-col gap-3">
          <h1 className="font-display text-[32px] leading-[38px] font-semibold tracking-[-0.025em] text-ink sm:text-[40px] sm:leading-[46px]">Lodges on StayZim</h1>
          <p className="text-[16px] leading-[26px] text-muted">
            Lodges, guesthouses and holiday homes across Zimbabwe, each on its own website. Book with them directly, on their site or on WhatsApp, with no booking fees.
          </p>
        </Item>

        {groups.length === 0 ? (
          <Item variants={riseIn} className="rounded-[20px] bg-white p-6 text-[15px] text-muted shadow-card">
            The first lodges are setting up their sites. Check back soon, or{" "}
            <Link href="/create" className="font-semibold text-brand hover:text-brand-dark">
              make one for your lodge
            </Link>
            .
          </Item>
        ) : (
          groups.map(([town, lodges]) => (
            <Item key={town} variants={riseIn} className="flex flex-col gap-4">
              <h2 className="font-display text-[22px] leading-7 font-semibold tracking-[-0.01em] text-ink">
                {town} <span className="text-[15px] font-medium text-muted-2">{lodges.length}</span>
              </h2>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {lodges.map((lodge) => (
                  <LodgeCard key={lodge.slug} lodge={lodge} />
                ))}
              </div>
            </Item>
          ))
        )}

        <Item variants={riseIn} className="flex flex-col items-start gap-3 rounded-[20px] bg-ink p-6 text-white sm:flex-row sm:items-center sm:justify-between">
          <span className="text-[15px] leading-6">Own a lodge? Get a site like these, booked on WhatsApp, in about a minute.</span>
          <Link href="/create" className={buttonVariants({ variant: "outline", className: "rounded-full" })}>
            Try it free
          </Link>
        </Item>
      </Appear>
    </div>
  );
}
