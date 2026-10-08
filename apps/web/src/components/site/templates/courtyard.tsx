import { formatPostDate, isSamplePhoto } from "@stayzim/sites";
import { cn } from "@stayzim/ui/lib/utils";
import { ArrowRight, Plus } from "lucide-react";
import type { CSSProperties, ReactNode } from "react";

import { WhatsAppIcon } from "@/components/landing/brand";
import { Reveal } from "@/components/motion";
import { Carousel } from "@/components/site/carousel";
import { ClampedText } from "@/components/site/clamped-text";
import { RoomPhotos } from "@/components/site/gallery";
import { journalUrl } from "@/components/site/journal";
import { SampleBadge } from "@/components/site/sample-badge";
import { Parallax } from "@/components/site/parallax";
import {
  AllRoomsLink,
  AmenityIcon,
  BookLabel,
  bookTone,
  Emphasis,
  FindUsLinks,
  HeroPhoto,
  MadeWith,
  MapView,
  MessageUs,
  MobileBookBar,
  Photo,
  Questions,
  siteBasics,
  sleepsRange,
  SocialLinks,
  StayDetails,
  WhatsAppFab,
} from "@/components/site/parts";
import { QuoteRotator } from "@/components/site/quote-rotator";
import { tenorSans } from "@/components/site/template-fonts";
import { BookLink } from "@/components/site/tracking";
import { AMENITIES, formatPhone, formatPrice } from "@/lib/lodge";
import { bookingUrl, type LiveSite } from "@/lib/site";
import { roomsEmpty } from "@/lib/site-content";
import { hasPage, pageOr, pageUrl } from "@/lib/site-pages";

const DISPLAY = "font-[family-name:var(--font-tenor)] font-normal uppercase";

function Eyebrow({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-4 text-[12px] tracking-[0.28em] text-[var(--tan)] uppercase", className)}>
      {children}
      <span className="h-px w-10 bg-current opacity-60" aria-hidden="true" />
    </span>
  );
}

/** The word the footer sets huge: the name's first real word ("The Courtyard House" → COURTYARD). */
function footerWord(name: string) {
  const words = name.split(/\s+/).filter((word) => !/^(the|a)$/i.test(word));
  return (name.length <= 12 ? name : (words[0] ?? name)).toUpperCase();
}

/**
 * Courtyard (Pro, 3b): a dark split hero, the house in one statement with
 * its numbers, rooms as a list that opens one at a time, a photo strip, a
 * guest's words, the journal as a list, and a dark map. Tenor Sans capitals
 * over Instrument Sans.
 */
export function CourtyardTemplate({ site }: { site: LiveSite }) {
  const { place, book, online, stats, mapsLink, stayInfo } = siteBasics(site);
  const tone = bookTone(online);
  const thumbs = site.gallery.slice(0, 3);
  const nav = [
    { href: pageOr(site, "rooms", "#rooms"), label: "Rooms" },
    site.description ? { href: "#house", label: "The house" } : null,
    site.gallery.length > 0 ? { href: pageOr(site, "gallery", "#gallery"), label: "Gallery" } : null,
    site.journal.length > 0 ? { href: journalUrl(site), label: "Journal" } : null,
    hasPage(site, "about") ? { href: pageUrl(site, "about"), label: "Our story" } : null,
    { href: pageOr(site, "contact", "#location"), label: "Find us" },
  ].filter((link) => link !== null);

  return (
    <div
      style={{ "--theme": site.themeColor, "--tan": "color-mix(in oklab, var(--theme) 35%, #C29A72)" } as CSSProperties}
      className={cn(tenorSans.variable, "min-h-svh bg-[#1C1B19] font-sans pb-24 text-[#E8E1D5] lg:pb-0")}
    >
      {/* Split hero */}
      <section id="top" className="grid grid-cols-[minmax(0,1fr)] gap-2 p-2 sm:p-3 lg:min-h-[760px] lg:grid-cols-2">
        <div className="flex min-w-0 flex-col rounded-[24px] bg-[#262420] px-5 pt-5 pb-8 sm:rounded-[28px] sm:px-10 sm:pt-8">
          <header className="flex items-center gap-3">
            <a href="#top" aria-label={site.name} className={cn(DISPLAY, "flex size-11 shrink-0 items-center justify-center text-[30px]")}>
              {footerWord(site.name).slice(0, 1)}
            </a>
            <nav className="-mr-5 flex min-w-0 gap-1.5 overflow-x-auto pr-5 [scrollbar-width:none] sm:mr-0 sm:pr-0" aria-label="Sections">
              {nav.map((link) => (
                <a key={link.href} href={link.href} className="shrink-0 rounded-full bg-white/[0.07] px-3.5 py-2 text-[11.5px] tracking-[0.16em] whitespace-nowrap uppercase hover:bg-white/15">
                  {link.label}
                </a>
              ))}
            </nav>
          </header>
          <Reveal className="flex flex-1 flex-col items-center justify-center gap-7 py-14 text-center">
            {thumbs.length > 0 ? (
              <div className="flex gap-2.5" aria-hidden="true">
                {thumbs.map((photo) => (
                  <Photo key={photo.url} photo={photo} alt="" sizes="96px" className="h-[86px] w-[72px] rounded-[10px] sm:h-[112px] sm:w-[96px]" />
                ))}
              </div>
            ) : null}
            <h1 className={cn(DISPLAY, "max-w-[12ch] text-[44px] leading-[48px] tracking-[0.04em] text-balance text-[#F1EBE1] sm:text-[66px] sm:leading-[70px]")}>
              <Emphasis text={site.hero.headline} em="text-[var(--tan)]" />
            </h1>
            <p className="max-w-md text-[16px] leading-7 text-[#CFC7BA]">{site.hero.subline}</p>
            {book ? (
              <BookLink href={book} className={cn("inline-flex h-[52px] items-center gap-2.5 rounded-[8px] px-6 text-[13.5px] font-semibold tracking-[0.14em] uppercase", tone)}>
                <BookLabel online={online} size={18} upper />
              </BookLink>
            ) : null}
            <a href="#house" className="mt-6 text-[11px] tracking-[0.34em] text-white/40 uppercase hover:text-white/70">
              Scroll down
            </a>
          </Reveal>
        </div>
        <div className="relative min-h-[420px] overflow-hidden rounded-[24px] sm:rounded-[28px]">
          <Parallax distance={70}>
            <HeroPhoto site={site} sizes="(min-width: 1024px) 50vw, 100vw" />
          </Parallax>
          <div className="absolute inset-0 bg-[linear-gradient(180deg,transparent_55%,rgba(28,27,25,0.75))]" />
          {site.whatsapp ? (
            <MessageUs site={site} className="absolute top-4 right-4 h-10 gap-2 rounded-full bg-[#141311] px-4 text-[12.5px] tracking-[0.12em] text-white">
              <WhatsAppIcon size={15} color="currentColor" />
              {formatPhone(site.whatsapp)}
            </MessageUs>
          ) : null}
          {place ? <span className={cn(DISPLAY, "absolute bottom-6 left-6 max-w-[12ch] text-[28px] leading-8 text-white sm:text-[34px] sm:leading-10")}>{place}</span> : null}
        </div>
      </section>

      <main>
        {/* The house in one statement, with its numbers */}
        {site.description || stats ? (
          <section id="house" className="mx-auto grid max-w-[1180px] scroll-mt-4 gap-10 px-4 py-24 sm:px-8 sm:py-32 lg:grid-cols-[260px_minmax(0,1fr)]">
            <Eyebrow className="self-end lg:mb-28">The house</Eyebrow>
            <Reveal className="flex flex-col gap-14">
              {site.description ? (
                <p className="font-[family-name:var(--font-tenor)] text-[28px] leading-[40px] tracking-[0.02em] text-[#EFE9DF] sm:text-[38px] sm:leading-[52px]">{site.description}</p>
              ) : null}
              {stats ? (
                <dl className="grid grid-cols-3 border-t border-white/10">
                  {[
                    { value: String(stats.count).padStart(2, "0"), label: stats.count === 1 ? "Room" : "Rooms" },
                    { value: sleepsRange(stats), label: "Guests per room" },
                    { value: formatPrice(stats.from), label: "From, per night" },
                  ].map((stat, position) => (
                    <div key={stat.label} className={cn("flex flex-col-reverse gap-3 pt-6", position > 0 && "border-l border-white/10 pl-4 sm:pl-7")}>
                      <dt className="text-[10.5px] tracking-[0.22em] text-[var(--tan)] uppercase sm:text-[12px]">{stat.label}</dt>
                      <dd className="font-[family-name:var(--font-tenor)] text-[34px] leading-10 sm:text-[56px] sm:leading-[60px]">{stat.value}</dd>
                    </div>
                  ))}
                </dl>
              ) : null}
            </Reveal>
          </section>
        ) : null}

        {/* Rooms: a list that opens one room at a time (no JavaScript needed) */}
        <section id="rooms" className="mx-auto max-w-[1180px] scroll-mt-4 px-4 pb-24 sm:px-8 sm:pb-32">
          <h2 className={cn(DISPLAY, "mb-10 flex items-baseline gap-4 text-[44px] leading-[48px] tracking-[0.06em] sm:text-[56px] sm:leading-[60px]")}>
            Rooms
            <span className="font-sans text-[18px] tracking-normal text-[var(--tan)]">{String(site.rooms.length).padStart(2, "0")}</span>
          </h2>
          {site.rooms.length === 0 ? (
            <p className="text-[#CFC7BA]">{roomsEmpty(site)}</p>
          ) : (
            <div className="border-t border-white/10">
              {site.rooms.map((room, position) => {
                const roomBook = bookingUrl(site, room.name);
                return (
                  <details key={room.id} name="courtyard-rooms" open={position === 0} className="group border-b border-white/10">
                    <summary className="grid cursor-pointer list-none grid-cols-[36px_minmax(0,1fr)_auto] items-center gap-3 py-6 sm:grid-cols-[80px_minmax(0,1fr)_120px_140px_48px] sm:gap-4 [&::-webkit-details-marker]:hidden">
                      <span className="text-[13px] text-[var(--tan)]">{String(position + 1).padStart(2, "0")}</span>
                      <span className={cn(DISPLAY, "text-[21px] leading-7 tracking-[0.08em] sm:text-[28px] sm:leading-9")}>{room.name}</span>
                      <span className="hidden text-[15px] text-[#CFC7BA] sm:block">Sleeps {room.sleeps}</span>
                      <span className="hidden text-[15px] sm:block">{formatPrice(room.price)} / night</span>
                      <span className="flex size-11 items-center justify-center rounded-full border border-white/20 transition-colors group-open:bg-[#EDE6DA] group-open:text-[#1C1B19]">
                        <Plus className="size-4 transition-transform duration-300 group-open:rotate-45 motion-reduce:transition-none" aria-hidden="true" />
                      </span>
                    </summary>
                    <div className="grid gap-8 pb-10 sm:pl-24 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
                      <RoomPhotos photos={room.photos} name={room.name} theme={site.themeColor} sample={room.sample} className="aspect-[4/3] rounded-[16px]" sizes="(min-width: 1024px) 540px, 100vw" />
                      <div className="flex flex-col gap-6">
                        <p className="text-[15px] text-[#CFC7BA] sm:hidden">
                          Sleeps {room.sleeps} · {formatPrice(room.price)} / night
                        </p>
                        {room.description ? <ClampedText text={room.description} className="text-[16px] leading-7 text-[#DCD4C7]" /> : null}
                        {room.amenities.length > 0 ? (
                          <ul className="grid grid-cols-2 gap-x-6 gap-y-3 text-[15px]">
                            {room.amenities.slice(0, 6).map((key) => (
                              <li key={key} className="inline-flex items-center gap-2.5">
                                <AmenityIcon amenity={key} className="size-[18px] text-[var(--tan)]" />
                                {AMENITIES[key]?.label}
                              </li>
                            ))}
                          </ul>
                        ) : null}
                        <div className="mt-auto flex flex-wrap items-center gap-5">
                          {roomBook ? (
                            <BookLink roomId={room.id} href={roomBook} className={cn("inline-flex h-12 items-center gap-2.5 rounded-[8px] px-5 text-[13px] font-semibold tracking-[0.14em] uppercase", tone)}>
                              <BookLabel online={online} size={17} upper />
                            </BookLink>
                          ) : null}
                          {room.photos.length > 1 ? (
                            <span className="text-[12.5px] tracking-[0.2em] text-[var(--tan)] uppercase">{room.photos.length} photos</span>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  </details>
                );
              })}
            </div>
          )}
          <AllRoomsLink site={site} className="mt-10" />
        </section>
      </main>

      {/* Photos and a guest's words, on light */}
      {site.gallery.length > 0 || site.reviews?.quotes.length ? (
        <section className="bg-[#F0EBE3] px-4 py-20 text-[#1C1B19] sm:px-8 sm:py-28">
          <div className="mx-auto flex max-w-[1180px] flex-col gap-20">
            {site.gallery.length > 0 ? (
              <div id="gallery" className="scroll-mt-4">
                <Carousel
                  label="Photos"
                  itemClassName="w-[78%] sm:w-[46%] lg:w-[38%]"
                  buttonClassName="border-[#1C1B19]/20 bg-transparent text-[#1C1B19]"
                  activeButtonClassName="border border-[#1C1B19]/20 bg-transparent text-[#1C1B19]"
                  header={<h2 className={cn(DISPLAY, "text-[34px] leading-10 tracking-[0.06em] sm:text-[48px] sm:leading-[52px]")}>Around the house</h2>}
                >
                  {site.gallery.map((photo, position) => (
                    <figure key={photo.url} className="relative flex flex-col gap-3">
                      <Photo photo={photo} alt={photo.caption || `${site.name}, photo ${position + 1}`} sizes="(min-width: 1024px) 440px, 78vw" className="aspect-[5/4] w-full rounded-[16px]" />
                      {isSamplePhoto(photo.url) ? <SampleBadge className="absolute top-3 left-3" /> : null}
                      {photo.caption ? <figcaption className="text-[14px] text-[#6B655B]">{photo.caption}</figcaption> : null}
                    </figure>
                  ))}
                </Carousel>
              </div>
            ) : null}
            {site.reviews && site.reviews.quotes.length > 0 ? (
              <Reveal className="mx-auto flex max-w-3xl flex-col items-center gap-6 text-center">
                <span className="text-[12px] tracking-[0.3em] text-[#6B655B] uppercase">
                  Guests say
                  {site.reviews.score !== null ? ` · ${site.reviews.score.toFixed(1)} on ${site.reviews.source}` : ""}
                </span>
                <QuoteRotator
                  quotes={site.reviews.quotes}
                  source={site.reviews.source}
                  sample={site.samples.reviews}
                  className="items-center"
                  quoteClassName="font-[family-name:var(--font-tenor)] text-[26px] leading-[36px] tracking-[0.02em] sm:text-[34px] sm:leading-[46px]"
                  byClassName="text-[14.5px] text-[#6B655B]"
                  buttonClassName="border-[#1C1B19]/20 hover:bg-[#1C1B19]/5"
                />
              </Reveal>
            ) : null}
          </div>
        </section>
      ) : null}

      <div className="mx-auto flex max-w-[1180px] flex-col gap-24 px-4 py-24 sm:gap-28 sm:px-8 sm:py-28">
        {/* Journal as a list */}
        {site.journal.length > 0 ? (
          <section id="journal" className="grid scroll-mt-4 gap-8 lg:grid-cols-[260px_minmax(0,1fr)]">
            <div className="flex flex-col gap-6">
              <Eyebrow>Journal</Eyebrow>
              <a href={journalUrl(site)} className="inline-flex items-center gap-2 text-[12.5px] tracking-[0.2em] uppercase hover:text-[var(--tan)]">
                All posts
                <ArrowRight className="size-4" aria-hidden="true" />
              </a>
            </div>
            <ul className="border-t border-white/10">
              {site.journal.map((post) => (
                <li key={post.slug} className="border-b border-white/10">
                  <a href={journalUrl(site, post.slug)} className="group grid gap-2 py-6 sm:grid-cols-[180px_minmax(0,1fr)] sm:items-baseline sm:gap-6">
                    <span className="text-[12.5px] tracking-[0.2em] text-[var(--tan)] uppercase">{formatPostDate(post.publishedOn)}</span>
                    <span className={cn(DISPLAY, "text-[21px] leading-7 tracking-[0.06em] group-hover:text-[var(--tan)] sm:text-[26px] sm:leading-8")}>
                      {post.title}
                      {site.samples.journal ? <SampleBadge className="ml-3 align-middle" /> : null}
                    </span>
                  </a>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {stayInfo ? (
          <section id="good-to-know" className="grid scroll-mt-4 gap-8 lg:grid-cols-[260px_minmax(0,1fr)]">
            <Eyebrow className="self-start">Good to know</Eyebrow>
            <StayDetails site={site} tone="dark" radius="rounded-[16px]" heading="font-[family-name:var(--font-tenor)]" className="md:grid-cols-1 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)]" />
          </section>
        ) : null}

        {site.faq.length > 0 ? (
          <section id="questions" className="grid scroll-mt-4 gap-8 lg:grid-cols-[260px_minmax(0,1fr)]">
            <Eyebrow className="self-start">Questions</Eyebrow>
            <Questions site={site} tone="dark" radius="rounded-[14px]" />
          </section>
        ) : null}

        {/* Find us */}
        <section id="location" className="grid scroll-mt-4 overflow-hidden rounded-[22px] bg-[#25231F] lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
          <MapView site={site} dark pin="bg-[var(--tan)]" className="min-h-[300px] lg:min-h-[440px]" />
          <div id="contact" className="flex flex-col gap-6 p-7 sm:p-12">
            <Eyebrow>Find us</Eyebrow>
            <h2 className={cn(DISPLAY, "text-[32px] leading-[38px] tracking-[0.05em] sm:text-[40px] sm:leading-[46px]")}>{place ?? site.name}</h2>
            <FindUsLinks site={site} className="text-[#CFC7BA]" />
            <div className="mt-auto flex flex-wrap gap-2.5">
              <MessageUs site={site} className="rounded-[8px] text-[13px] tracking-[0.12em] uppercase">
                <WhatsAppIcon size={17} />
                Message us
              </MessageUs>
              {mapsLink ? (
                <a href={mapsLink} target="_blank" rel="noreferrer" className="inline-flex h-12 items-center rounded-[8px] border border-white/20 px-5 text-[13px] font-semibold tracking-[0.12em] uppercase hover:bg-white/5">
                  Directions
                </a>
              ) : null}
            </div>
            <SocialLinks site={site} button="border border-white/20 text-white hover:bg-white/10" />
          </div>
        </section>
      </div>

      <footer className="bg-[#141311]">
        <div className="mx-auto max-w-[1180px] px-4 pt-16 pb-8 sm:px-8">
          <span className={cn(DISPLAY, "block overflow-hidden text-[18vw] leading-[0.95] tracking-[0.03em] text-[#EDE6DA] sm:text-[120px] lg:text-[150px]")}>{footerWord(site.name)}</span>
          <div className="mt-12 flex flex-col gap-4 border-t border-white/10 pt-6 text-[12.5px] tracking-[0.14em] text-white/60 uppercase lg:flex-row lg:items-center lg:justify-between">
            <nav className="flex flex-wrap gap-x-3 gap-y-1" aria-label="Footer">
              {nav.map((link, position) => (
                <span key={link.href} className="flex gap-3">
                  {position > 0 ? <span aria-hidden="true">·</span> : null}
                  <a href={link.href} className="hover:text-white">
                    {link.label}
                  </a>
                </span>
              ))}
            </nav>
            <span>
              © {new Date().getFullYear()} {site.name}
            </span>
            <MadeWith className="normal-case tracking-normal" strong="text-white" />
          </div>
        </div>
      </footer>

      <MobileBookBar site={site} className="border-white/10 bg-[#1C1B19]/90" button="rounded-[8px]" />
      <WhatsAppFab site={site} raised={online} />
    </div>
  );
}
