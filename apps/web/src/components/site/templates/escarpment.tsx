import { formatPostDate } from "@stayzim/sites";
import { cn } from "@stayzim/ui/lib/utils";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import type { CSSProperties, ReactNode } from "react";

import { Reveal } from "@/components/motion";
import { ClampedText } from "@/components/site/clamped-text";
import { EnquiryBar } from "@/components/site/enquiry-bar";
import { RoomPhotos, SiteGallery } from "@/components/site/gallery";
import { journalUrl } from "@/components/site/journal";
import { Parallax } from "@/components/site/parallax";
import {
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
  SocialLinks,
  StayDetails,
  WhatsAppFab,
} from "@/components/site/parts";
import { QuoteRotator } from "@/components/site/quote-rotator";
import { cormorantGaramond } from "@/components/site/template-fonts";
import { BookLink } from "@/components/site/tracking";
import { AMENITIES, formatPhone, formatPrice } from "@/lib/lodge";
import { bookingUrl, type LiveSite } from "@/lib/site";
import { countWords, scoreWord, splitIntro } from "@/lib/site-content";

const SERIF = "font-[family-name:var(--font-cormorant)] font-normal";

function Eyebrow({ children, className }: { children: ReactNode; className?: string }) {
  return <span className={cn("text-[12px] font-semibold tracking-[0.24em] uppercase", className)}>{children}</span>;
}

function Heading({ children, className }: { children: ReactNode; className?: string }) {
  return <h2 className={cn(SERIF, "text-[46px] leading-[50px] tracking-[-0.01em] sm:text-[64px] sm:leading-[68px]", className)}>{children}</h2>;
}

/**
 * Escarpment (Pro, 3a): a cinematic hero with the enquiry bar on its edge,
 * Stay / See / Read tiles, editorial room spreads, the guests' reviews on a
 * dark band, the journal, and the map. Cormorant Garamond over Instrument
 * Sans; the photo drifts as the page scrolls.
 */
export function EscarpmentTemplate({ site }: { site: LiveSite }) {
  const { place, book, online, stats, amenities, stayInfo } = siteBasics(site);
  const tone = bookTone(online);
  const intro = splitIntro(site.description);
  const spreads = site.rooms.slice(0, 2);
  const others = site.rooms.slice(2);
  const tiles = [
    { href: "#rooms", label: "Stay", line: stats ? `${countWords(stats.count, "room")}, one long view.` : "Rooms with a view.", photo: site.rooms[0]?.photos[0] ?? site.gallery[0] },
    site.gallery.length > 0 ? { href: "#gallery", label: "See", line: "The house, room by room.", photo: site.gallery[0] ?? site.gallery[1] } : null,
    site.journal.length > 0
      ? { href: journalUrl(site), label: "Read", line: `Notes from ${site.town ?? "the mountains"}.`, photo: site.journal[0]?.cover ?? site.gallery[2] }
      : { href: "#location", label: "Find", line: place ? `How to reach ${place.split(",")[0]}.` : "How to reach us.", photo: site.gallery[2] ?? site.gallery[1] },
  ].filter((tile) => tile !== null);
  const index = [
    { href: "#rooms", label: "Stay" },
    site.gallery.length > 0 ? { href: "#gallery", label: "See" } : null,
    site.journal.length > 0 ? { href: "#journal", label: "Read" } : null,
    { href: "#location", label: "Find" },
  ].filter((link) => link !== null);
  const nav = [
    { href: "#rooms", label: "Stay" },
    site.gallery.length > 0 ? { href: "#gallery", label: "Gallery" } : null,
    site.journal.length > 0 ? { href: journalUrl(site), label: "Journal" } : null,
    { href: "#location", label: "Find us" },
  ].filter((link) => link !== null);
  const [first, ...rest] = site.name.split(" ");

  return (
    <div
      style={{ "--theme": site.themeColor, "--gold": "color-mix(in oklab, var(--theme) 20%, #D9BC8C)" } as CSSProperties}
      className={cn(cormorantGaramond.variable, "min-h-svh bg-[#F4EEE3] font-sans pb-24 text-[#1A1712] lg:pb-0")}
    >
      {/* Cinematic hero */}
      <section id="top" className="relative flex min-h-[680px] flex-col text-white sm:min-h-[780px]">
        <Parallax>
          <HeroPhoto site={site} />
        </Parallax>
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(22,19,15,0.82)_0%,rgba(22,19,15,0.45)_55%,rgba(22,19,15,0.2)_100%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(22,19,15,0.5)_0%,transparent_25%,transparent_70%,rgba(22,19,15,0.6)_100%)]" />

        <header className="relative z-10 mx-auto flex w-full max-w-[1240px] items-center justify-between gap-4 px-4 pt-6 sm:px-14 sm:pt-8">
          <a href="#top" className="flex min-w-0 flex-col">
            <span className={cn(SERIF, "truncate text-[22px] leading-7 tracking-[0.22em] uppercase sm:text-[26px]")}>{first}</span>
            <span className="truncate text-[10.5px] tracking-[0.32em] text-white/75 uppercase">{[rest.join(" "), site.town].filter(Boolean).join(" · ")}</span>
          </a>
          <nav className="hidden items-center gap-10 text-[15px] lg:flex" aria-label="Sections">
            {nav.map((link) => (
              <a key={link.href} href={link.href} className="text-white/85 hover:text-white">
                {link.label}
              </a>
            ))}
          </nav>
          {book ? (
            <BookLink href={book} className={cn("hidden h-12 items-center gap-2 rounded-[6px] px-5 text-[15px] font-semibold sm:inline-flex", tone)}>
              <BookLabel online={online} size={17} />
            </BookLink>
          ) : null}
        </header>

        <nav className="absolute top-1/2 right-8 z-10 hidden -translate-y-1/2 flex-col items-center gap-3 lg:flex" aria-label="On this page">
          {index.map((link, position) => (
            <span key={link.href} className="flex flex-col items-center gap-3">
              {position > 0 ? <span className="h-5 w-px bg-white/35" aria-hidden="true" /> : null}
              <a href={link.href} className="text-[11px] tracking-[0.3em] text-white/75 uppercase hover:text-white">
                {link.label}
              </a>
            </span>
          ))}
        </nav>

        <div className="relative z-10 mx-auto flex w-full max-w-[1240px] flex-1 flex-col justify-center px-4 pt-16 pb-36 sm:px-14">
          <Reveal className="flex max-w-2xl flex-col gap-7">
            {place ? <Eyebrow className="text-white/90">{place}</Eyebrow> : null}
            <h1 className={cn(SERIF, "text-[54px] leading-[54px] font-light tracking-[-0.015em] text-balance sm:text-[88px] sm:leading-[88px]")}>
              <Emphasis text={site.hero.headline} em="italic" />
            </h1>
            <p className="max-w-md text-[17px] leading-7 text-white/85 sm:text-[18px]">{site.hero.subline}</p>
            {amenities.length > 1 ? (
              <div className="flex flex-col gap-2">
                <span className="mb-2 h-px w-11 bg-white/50" aria-hidden="true" />
                {amenities.slice(0, 2).map((entry) => (
                  <span key={entry.key} className="text-[12px] tracking-[0.26em] text-white/80 uppercase">
                    {AMENITIES[entry.key]?.label}
                  </span>
                ))}
              </div>
            ) : null}
          </Reveal>
        </div>
      </section>

      {/* Enquiry bar on the hero's edge */}
      {site.rooms.length > 0 && site.whatsapp ? (
        <div className="relative z-10 mx-auto -mt-16 max-w-[1240px] px-4 sm:-mt-12 sm:px-14">
          <Reveal className="rounded-[18px] bg-[#FAF6EE] p-3 shadow-[0_28px_60px_-30px_rgba(22,19,15,0.55)] sm:p-4">
            <EnquiryBar
              online={online}
              lodge={site.name}
              rooms={site.rooms}
              whatsapp={site.whatsapp}
              look={{ layout: "inline", divider: "lg:rounded-none lg:border-r lg:border-black/10", field: "border-0 bg-white lg:bg-transparent", button: "h-14 rounded-[10px]", hint: null }}
            />
          </Reveal>
        </div>
      ) : null}

      <main className="mx-auto flex max-w-[1240px] flex-col gap-24 px-4 py-20 sm:gap-32 sm:px-14 sm:py-24">
        {/* Stay / See / Read */}
        <ul className="grid gap-4 sm:grid-cols-3">
          {tiles.map((tile, position) => (
            <li key={tile.label}>
              <Reveal delay={position * 0.08}>
                <a href={tile.href} className="group relative flex aspect-[4/5] flex-col justify-end overflow-hidden rounded-[14px] text-white sm:aspect-[3/4]">
                  <Photo photo={tile.photo ?? undefined} alt="" sizes="(min-width: 640px) 33vw, 100vw" className="absolute inset-0 size-full transition-transform duration-700 group-hover:scale-[1.04] motion-reduce:transition-none" />
                  <span className="absolute inset-0 bg-[linear-gradient(180deg,transparent_45%,rgba(22,19,15,0.75))]" />
                  <span className="relative flex flex-col gap-1 p-6">
                    <span className={cn(SERIF, "text-[38px] leading-10")}>{tile.label}</span>
                    <span className="text-[15px] text-white/85">{tile.line}</span>
                  </span>
                </a>
              </Reveal>
            </li>
          ))}
        </ul>

        {/* Rooms: editorial spreads, then the rest as cards */}
        <section id="rooms" className="flex scroll-mt-8 flex-col gap-16">
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:items-end">
            <div className="flex flex-col gap-4">
              <Eyebrow className="text-[#6B6458]">Stay</Eyebrow>
              <Heading>{stats ? countWords(stats.count, "room") : "Rooms"}</Heading>
            </div>
            {intro.body || site.description ? (
              <p className="text-[17px] leading-7 text-[#6B6458]">{intro.body ?? site.description}</p>
            ) : null}
          </div>
          {site.rooms.length === 0 ? <p className="text-[#6B6458]">Rooms are coming soon. Message us on WhatsApp to book.</p> : null}
          {spreads.map((room, position) => {
            const roomBook = bookingUrl(site, room.name);
            return (
              <Reveal key={room.id} className="grid items-center gap-8 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)] lg:gap-16">
                <RoomPhotos
                  photos={room.photos}
                  name={room.name}
                  theme={site.themeColor}
                  className={cn("aspect-[4/3] rounded-[14px]", position % 2 === 1 && "lg:order-2")}
                  sizes="(min-width: 1024px) 640px, 100vw"
                />
                <div className="flex flex-col gap-5">
                  <Eyebrow className="text-[#6B6458]">Room {String(position + 1).padStart(2, "0")}</Eyebrow>
                  <h3 className={cn(SERIF, "text-[42px] leading-[46px] sm:text-[52px] sm:leading-[56px]")}>{room.name}</h3>
                  <p className="text-[16px] text-[#6B6458]">
                    Sleeps {room.sleeps} · <strong className="font-semibold text-[var(--theme)]">{formatPrice(room.price)}</strong> a night
                    {room.amenities.includes("breakfast") ? ", breakfast included" : ""}
                  </p>
                  {room.amenities.length > 0 ? (
                    <ul className="flex flex-col border-t border-black/10">
                      {room.amenities.slice(0, 4).map((key) => (
                        <li key={key} className="flex items-center gap-3 border-b border-black/10 py-3 text-[15px]">
                          <AmenityIcon amenity={key} className="size-[18px] text-[var(--theme)]" />
                          {AMENITIES[key]?.label}
                        </li>
                      ))}
                    </ul>
                  ) : null}
                  {room.description ? <ClampedText text={room.description} className="text-[15px] leading-7 text-[#6B6458]" /> : null}
                  {roomBook ? (
                    <BookLink roomId={room.id} href={roomBook} className={cn("inline-flex h-12 w-fit items-center gap-2 rounded-[6px] px-5 text-[15px] font-semibold", tone)}>
                      <BookLabel online={online} size={17} />
                    </BookLink>
                  ) : null}
                </div>
              </Reveal>
            );
          })}
          {others.length > 0 ? (
            <ul className="grid grid-cols-[minmax(0,1fr)] gap-4 md:grid-cols-2">
              {others.map((room, position) => {
                const roomBook = bookingUrl(site, room.name);
                return (
                  <li key={room.id}>
                    <Reveal delay={position * 0.06} className="flex items-center gap-4 rounded-[14px] bg-[#FAF6EE] p-3.5">
                      <Photo photo={room.photos[0]} alt={room.name} sizes="150px" className="aspect-[4/3] w-[120px] shrink-0 rounded-[10px] sm:w-[150px]" />
                      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                        <Eyebrow className="text-[11px] text-[#6B6458]">Room {String(position + 3).padStart(2, "0")}</Eyebrow>
                        <h3 className={cn(SERIF, "truncate text-[26px] leading-8")}>{room.name}</h3>
                        <p className="text-[14px] text-[#6B6458]">
                          Sleeps {room.sleeps} · {formatPrice(room.price)} a night
                        </p>
                      </div>
                      {roomBook ? (
                        <BookLink
                          roomId={room.id}
                          href={roomBook}
                          aria-label={`Book the ${room.name}`}
                          className="flex size-12 shrink-0 items-center justify-center rounded-full border border-[#1A1712]/20 transition-colors hover:bg-[#1A1712] hover:text-white"
                        >
                          <ArrowRight className="size-5" />
                        </BookLink>
                      ) : null}
                    </Reveal>
                  </li>
                );
              })}
            </ul>
          ) : null}
        </section>

        {/* See */}
        {site.gallery.length > 0 ? (
          <section id="gallery" className="flex scroll-mt-8 flex-col gap-10">
            <div className="flex flex-col gap-4">
              <Eyebrow className="text-[#6B6458]">See</Eyebrow>
              <Heading>The house, room by room.</Heading>
            </div>
            <SiteGallery photos={site.gallery} name={site.name} layout="strip" rounded="rounded-[14px]" />
          </section>
        ) : null}
      </main>

      {/* Guests: the score and their words on a dark band */}
      {site.reviews ? (
        <section className="bg-[#16130F] px-4 py-20 text-white sm:px-14 sm:py-28">
          <div className="mx-auto grid max-w-[1240px] gap-12 lg:grid-cols-[minmax(0,0.6fr)_minmax(0,1.4fr)]">
            <div className="flex flex-col gap-2">
              <Eyebrow className="text-[var(--gold)]">Guests</Eyebrow>
              <span className="text-[15px] text-white/65">From our {site.reviews.source} reviews</span>
              {site.reviews.score !== null ? (
                <div className="mt-8 flex flex-col">
                  <span className={cn(SERIF, "text-[88px] leading-[88px] text-[var(--gold)]")}>{site.reviews.score.toFixed(1)}</span>
                  <span className="text-[15px] text-white/80">
                    {scoreWord(site.reviews.score)}
                    {site.reviews.count ? ` · ${site.reviews.count} reviews` : ""}
                  </span>
                </div>
              ) : null}
              {site.reviews.url ? (
                <a href={site.reviews.url} target="_blank" rel="noreferrer" className="mt-6 inline-flex w-fit items-center gap-1.5 text-[14px] font-semibold text-white/85 hover:text-white">
                  Read every review
                  <ArrowUpRight className="size-4" aria-hidden="true" />
                </a>
              ) : null}
            </div>
            {site.reviews.quotes.length > 0 ? (
              <QuoteRotator
                quotes={site.reviews.quotes}
                quoteClassName={cn(SERIF, "text-[30px] leading-[38px] italic sm:text-[42px] sm:leading-[52px]")}
                byClassName="text-[15px] text-white/75"
                buttonClassName="border-white/25 hover:bg-white/10"
              />
            ) : null}
          </div>
        </section>
      ) : null}

      <div className="mx-auto flex max-w-[1240px] flex-col gap-24 px-4 py-20 sm:gap-32 sm:px-14 sm:py-24">
        {/* Read: the journal */}
        {site.journal.length > 0 ? (
          <section id="journal" className="flex scroll-mt-8 flex-col gap-10">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div className="flex flex-col gap-4">
                <Eyebrow className="text-[#6B6458]">Journal</Eyebrow>
                <Heading>Notes from {site.town ?? site.name}</Heading>
              </div>
              <a href={journalUrl(site)} className="inline-flex items-center gap-1.5 text-[15px] font-semibold text-[var(--theme)] hover:underline">
                All posts
                <ArrowRight className="size-4" aria-hidden="true" />
              </a>
            </div>
            <ul className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
              {site.journal.map((post, position) => (
                <li key={post.slug}>
                  <Reveal delay={position * 0.08}>
                    <a href={journalUrl(site, post.slug)} className="group flex flex-col gap-4">
                      <Photo photo={post.cover ?? undefined} alt="" sizes="(min-width: 1024px) 380px, (min-width: 640px) 50vw, 100vw" className="aspect-[4/3] w-full rounded-[14px]" />
                      <span className="text-[13.5px] text-[#6B6458]">
                        {formatPostDate(post.publishedOn)} · {post.readMinutes} min read
                      </span>
                      <span className={cn(SERIF, "text-[30px] leading-[34px] group-hover:text-[var(--theme)]")}>{post.title}</span>
                    </a>
                  </Reveal>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {stayInfo ? (
          <section id="good-to-know" className="flex scroll-mt-8 flex-col gap-10">
            <div className="flex flex-col gap-4">
              <Eyebrow className="text-[#6B6458]">Before you come</Eyebrow>
              <Heading>Good to know</Heading>
            </div>
            <StayDetails site={site} radius="rounded-[14px]" heading={SERIF} />
          </section>
        ) : null}

        {site.faq.length > 0 ? (
          <section id="questions" className="flex scroll-mt-8 flex-col gap-10">
            <div className="flex flex-col gap-4">
              <Eyebrow className="text-[#6B6458]">Asked often</Eyebrow>
              <Heading>Questions</Heading>
            </div>
            <Questions site={site} radius="rounded-[14px]" />
          </section>
        ) : null}

        {/* Find us */}
        <section id="location" className="relative scroll-mt-8">
          <MapView site={site} className="min-h-[360px] rounded-[18px] sm:min-h-[500px]" />
          <Reveal className="relative mx-3 -mt-16 flex flex-col gap-4 rounded-[16px] bg-[#FAF6EE] p-7 shadow-[0_24px_50px_-24px_rgba(22,19,15,0.4)] sm:absolute sm:bottom-8 sm:left-8 sm:mx-0 sm:mt-0 sm:w-[380px]">
            <div id="contact" className="flex flex-col gap-1.5">
              <Eyebrow className="text-[#6B6458]">Find us</Eyebrow>
              <h2 className={cn(SERIF, "text-[38px] leading-[42px]")}>{site.name}</h2>
              {place ? <p className="text-[15px] text-[#6B6458]">{place}</p> : null}
            </div>
            <FindUsLinks site={site} className="text-[14.5px]" />
            <MessageUs site={site} className="w-full rounded-[8px]" />
            <SocialLinks site={site} button="bg-white hover:bg-white/70" />
          </Reveal>
        </section>
      </div>

      <footer className="bg-[#16130F] text-white/70">
        <div className="mx-auto max-w-[1240px] px-4 pt-16 pb-8 sm:px-14">
          <div className="grid gap-10 lg:grid-cols-[minmax(0,1.6fr)_auto_auto] lg:gap-20">
            <span className={cn(SERIF, "text-[54px] leading-[56px] text-white sm:text-[80px] sm:leading-[80px]")}>{site.name}</span>
            <nav className="flex flex-col gap-2.5 text-[15px]" aria-label="Footer">
              <span className="font-semibold text-white">Visit</span>
              {nav.map((link) => (
                <a key={link.href} href={link.href} className="hover:text-white">
                  {link.label}
                </a>
              ))}
            </nav>
            <div className="flex flex-col gap-2.5 text-[15px]">
              <span className="font-semibold text-white">Contact</span>
              {site.whatsapp ? <span>WhatsApp {formatPhone(site.whatsapp)}</span> : null}
              {site.email ? (
                <a href={`mailto:${site.email}`} className="hover:text-white">
                  {site.email}
                </a>
              ) : null}
              {place ? <span>{place}</span> : null}
            </div>
          </div>
          <div className="mt-14 flex flex-col gap-3 border-t border-white/15 pt-6 text-[13.5px] sm:flex-row sm:justify-between">
            <span>
              © {new Date().getFullYear()} {site.name}
            </span>
            <MadeWith strong="text-white" />
          </div>
        </div>
      </footer>

      <MobileBookBar site={site} className="bg-[#F4EEE3]/90" button="rounded-[8px]" />
      <WhatsAppFab site={site} raised={online} />
    </div>
  );
}
