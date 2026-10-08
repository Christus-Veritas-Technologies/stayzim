import type { SitePage } from "@stayzim/sites";
import { cn } from "@stayzim/ui/lib/utils";
import type { CSSProperties, ReactNode } from "react";

import { bookingSite } from "@/components/site/booking-site";
import { DemoBand, DemoPill, DemoRibbon } from "@/components/site/demo-badges";
import { BookLabel, bookTone, MadeWith, MobileBookBar, siteBasics, WhatsAppFab } from "@/components/site/parts";
import {
  bricolageGrotesque,
  cormorantGaramond,
  gloock,
  hankenGrotesk,
  instrumentSerif,
  newsreaderBook,
  tenorSans,
  urbanist,
} from "@/components/site/template-fonts";
import { BookLink, PageViewTracker, SiteTracking } from "@/components/site/tracking";
import type { LiveSite } from "@/lib/site";
import { hasPage, pageUrl } from "@/lib/site-pages";

/*
 * The pages beyond the home page (rooms, a room, gallery, contact, and on Pro
 * the story, things to do, reviews and the journal) share one frame: the
 * lodge's name and the pages along the top, Book, and the footer. Each design
 * gives it its type, colours and corners, so the pages read like its home page.
 */

export type PageLook = {
  /** The font class (a variable, or the design's whole-page font) */
  font: string;
  /** Headings */
  display: string;
  page: string;
  ink: string;
  muted: string;
  /** Cards and panels on the page */
  card: string;
  /** Corners of photos and cards */
  radius: string;
  /** Corners of buttons and chips */
  pill: string;
};

const LOOKS: Record<string, PageLook> = {
  "starter-veranda": {
    font: urbanist.className,
    display: "font-bold tracking-[-0.01em]",
    page: "bg-white",
    ink: "text-[#15121C]",
    muted: "text-[#5F6670]",
    card: "bg-[color-mix(in_oklab,var(--theme)_7%,white)]",
    radius: "rounded-[22px]",
    pill: "rounded-full",
  },
  "starter-rondavel": {
    font: hankenGrotesk.className,
    display: "font-semibold tracking-[-0.01em]",
    page: "bg-white",
    ink: "text-[#1E1E1C]",
    muted: "text-[#6B6A64]",
    card: "bg-[#F5F3EF]",
    radius: "rounded-none",
    pill: "rounded-none",
  },
  "starter-shade": {
    font: cn(newsreaderBook.variable, "font-sans"),
    display: "font-[family-name:var(--font-newsreader-book)] font-normal",
    page: "bg-white",
    ink: "text-[#172420]",
    muted: "text-[#5D6964]",
    card: "bg-[#F7F4EE]",
    radius: "rounded-none",
    pill: "rounded-lg",
  },
  "growth-shoreline": {
    font: urbanist.className,
    display: "font-bold tracking-[-0.02em]",
    page: "bg-white",
    ink: "text-[#10202A]",
    muted: "text-[#5F6B72]",
    card: "bg-[#F2F5F7]",
    radius: "rounded-[22px]",
    pill: "rounded-full",
  },
  "growth-wordmark": {
    font: cn(bricolageGrotesque.variable, "font-sans"),
    display: "font-[family-name:var(--font-bricolage)] font-bold tracking-[-0.02em]",
    page: "bg-[#EEE7DC]",
    ink: "text-[#231C16]",
    muted: "text-[#6E6459]",
    card: "bg-[#F5F0E8]",
    radius: "rounded-[20px]",
    pill: "rounded-full",
  },
  "growth-overlap": {
    font: cn(gloock.variable, "font-sans"),
    display: "font-[family-name:var(--font-gloock)] font-normal",
    page: "bg-[#FAF7F2]",
    ink: "text-[#22190F]",
    muted: "text-[#6B5F52]",
    card: "bg-[#F2EBE2]",
    radius: "rounded-[22px]",
    pill: "rounded-full",
  },
  "pro-escarpment": {
    font: cn(cormorantGaramond.variable, "font-sans"),
    display: "font-[family-name:var(--font-cormorant)] font-medium",
    page: "bg-[#F4EEE3]",
    ink: "text-[#1A1712]",
    muted: "text-[#6B6458]",
    card: "bg-[#FAF6EE]",
    radius: "rounded-[14px]",
    pill: "rounded-[6px]",
  },
  "pro-courtyard": {
    font: cn(tenorSans.variable, "font-sans"),
    display: "font-[family-name:var(--font-tenor)] uppercase tracking-[0.06em]",
    page: "bg-[#F0EBE3]",
    ink: "text-[#1C1B19]",
    muted: "text-[#6B655B]",
    card: "bg-[#E8E1D5]",
    radius: "rounded-[16px]",
    pill: "rounded-[8px]",
  },
  "pro-canopy": {
    font: cn(instrumentSerif.variable, "font-sans"),
    display: "font-[family-name:var(--font-instrument-serif)]",
    page: "bg-[#EFEAE2]",
    ink: "text-[#1F1A14]",
    muted: "text-[#6D6457]",
    card: "bg-[#F7F3EC]",
    radius: "rounded-none",
    pill: "rounded-full",
  },
};

export function pageLook(template: string): PageLook {
  return LOOKS[template] ?? LOOKS["growth-shoreline"]!;
}

/** The pages along the top, in the order guests look for them. */
const NAV: { page: Exclude<SitePage, "room">; label: string }[] = [
  { page: "home", label: "Home" },
  { page: "rooms", label: "Rooms" },
  { page: "gallery", label: "Gallery" },
  { page: "about", label: "Our story" },
  { page: "experiences", label: "Things to do" },
  { page: "reviews", label: "Reviews" },
  { page: "journal", label: "Journal" },
  { page: "contact", label: "Contact" },
];

export function siteNav(site: LiveSite) {
  return NAV.filter((item) => hasPage(site, item.page)).map((item) => ({ ...item, href: pageUrl(site, item.page) }));
}

/**
 * Header, footer, Book and the demo marks around one of the site's pages.
 * `current` lights up its link. Booking and visit counting work as on the
 * home page.
 */
export function PageShell({ site, current, children }: { site: LiveSite; current: SitePage; children: ReactNode }) {
  const look = pageLook(site.template);
  const { book, online } = siteBasics(site);
  const nav = siteNav(site);
  const active = current === "room" ? "rooms" : current;
  const link = (item: (typeof nav)[number], className?: string) => (
    <a
      key={item.page}
      href={item.href}
      aria-current={item.page === active ? "page" : undefined}
      className={cn("whitespace-nowrap transition-colors hover:text-[var(--theme)] aria-[current=page]:text-[var(--theme)]", className)}
    >
      {item.label}
    </a>
  );
  return (
    <SiteTracking slug={site.slug} enabled booking={bookingSite(site)}>
      <PageViewTracker />
      {site.demo ? <DemoRibbon /> : null}
      <div style={{ "--theme": site.themeColor } as CSSProperties} className={cn(look.font, look.page, look.ink, "min-h-svh pb-24 lg:pb-0")}>
        <header className="border-b border-black/[0.08]">
          <div className="mx-auto flex h-16 max-w-[1180px] items-center justify-between gap-4 px-4 sm:h-20 sm:px-8">
            <a href={pageUrl(site, "home")} className={cn(look.display, "min-w-0 truncate text-[22px] sm:text-[26px]")}>
              {site.name}
            </a>
            <nav aria-label="Pages" className="hidden items-center gap-6 text-[14.5px] font-medium lg:flex">
              {nav.map((item) => link(item))}
            </nav>
            {book ? (
              <BookLink href={book} className={cn("inline-flex h-10 shrink-0 items-center gap-2 px-4 text-[14px] font-semibold", look.pill, bookTone(online))}>
                <BookLabel online={online} size={16} short />
              </BookLink>
            ) : null}
          </div>
          {/* Phones: the pages in a row that scrolls sideways */}
          <nav aria-label="Pages" className="-mt-1 flex gap-5 overflow-x-auto px-4 pb-3 text-[14.5px] font-medium [scrollbar-width:none] sm:px-8 lg:hidden">
            {nav.map((item) => link(item, "py-1"))}
          </nav>
        </header>
        <main className="mx-auto max-w-[1180px] px-4 py-12 sm:px-8 sm:py-16">{children}</main>
        <footer className="border-t border-black/[0.08]">
          <div className={cn("mx-auto flex max-w-[1180px] flex-col items-center gap-2 px-4 py-6 text-[13.5px] sm:flex-row sm:justify-between sm:px-8", look.muted)}>
            <span>
              © {new Date().getFullYear()} {site.name}
            </span>
            <MadeWith strong={look.ink} />
          </div>
        </footer>
        <WhatsAppFab site={site} raised={online} />
        <MobileBookBar site={site} />
      </div>
      {site.demo ? (
        <>
          <DemoBand />
          <DemoPill />
        </>
      ) : null}
    </SiteTracking>
  );
}

/** A page's title block: a small label, the heading and a line under it. */
export function PageHeading({ site, eyebrow, title, intro, className }: { site: LiveSite; eyebrow: string; title: string; intro?: string; className?: string }) {
  const look = pageLook(site.template);
  return (
    <div className={cn("mb-10 flex max-w-[720px] flex-col gap-3 sm:mb-12", className)}>
      <span className="text-[12.5px] font-semibold tracking-[0.2em] text-[var(--theme)] uppercase">{eyebrow}</span>
      <h1 className={cn(look.display, "text-[40px] leading-[46px] text-balance sm:text-[56px] sm:leading-[62px]")}>{title}</h1>
      {intro ? <p className={cn("text-[17px] leading-7", look.muted)}>{intro}</p> : null}
    </div>
  );
}
