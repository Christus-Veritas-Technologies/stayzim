import { formatPostDate } from "@stayzim/sites";
import { cn } from "@stayzim/ui/lib/utils";
import { ArrowUpRight } from "lucide-react";
import type { CSSProperties, ReactNode } from "react";

import { Reveal } from "@/components/motion";
import { Carousel } from "@/components/site/carousel";
import { ClampedText } from "@/components/site/clamped-text";
import { RoomPhotos, SiteGallery } from "@/components/site/gallery";
import { journalUrl } from "@/components/site/journal";
import { SampleBadge } from "@/components/site/sample-badge";
import { Parallax } from "@/components/site/parallax";
import {
  AllRoomsLink,
  amenityLine,
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
import { instrumentSerif } from "@/components/site/template-fonts";
import { BookLink } from "@/components/site/tracking";
import { AMENITIES, formatPhone, formatPrice } from "@/lib/lodge";
import { bookingUrl, type LiveSite } from "@/lib/site";
import { roomsEmpty, scoreWord, splitIntro } from "@/lib/site-content";
import { pageOr } from "@/lib/site-pages";

const SERIF = "font-[family-name:var(--font-instrument-serif)] font-normal";

function Eyebrow({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-3 text-[13px] text-[#6D6457]", className)}>
      <span className="h-px w-7 bg-current opacity-60" aria-hidden="true" />
      {children}
    </span>
  );
}

function Heading({ children, className }: { children: ReactNode; className?: string }) {
  return <h2 className={cn(SERIF, "text-[46px] leading-[48px] tracking-[-0.01em] sm:text-[64px] sm:leading-[66px]", className)}>{children}</h2>;
}

/**
 * Canopy (Pro, 3c): an aerial hero, the place in numbers worked out from the
 * rooms, what's inside on a dark band, an at-a-glance table, the rooms, a
 * guest's words beside a photo, the journal and the map. Instrument Serif
 * over Instrument Sans; the photo drifts as the page scrolls.
 */
export function CanopyTemplate({ site }: { site: LiveSite }) {
  const { place, book, online, stats, amenities, mapsLink, stayInfo } = siteBasics(site);
  const tone = bookTone(online);
  const intro = splitIntro(site.description);
  const photos = [site.gallery[0], site.gallery[1] ?? site.rooms[0]?.photos[0], site.gallery[2] ?? site.rooms[1]?.photos[0], site.gallery[3] ?? site.gallery[0]];
  const nav = [
    { href: pageOr(site, "rooms", "#rooms"), label: "Rooms" },
    site.gallery.length > 0 ? { href: pageOr(site, "gallery", "#gallery"), label: "Gallery" } : null,
    site.journal.length > 0 ? { href: journalUrl(site), label: "Journal" } : null,
    { href: pageOr(site, "contact", "#location"), label: "Find us" },
  ].filter((link) => link !== null);
  const glance = [
    place ? { label: "Location", value: place } : null,
    stats ? { label: "Rooms", value: String(stats.count) } : null,
    stats ? { label: "Sleeps", value: `${sleepsRange(stats).replace("–", " to ")} per room` } : null,
    stats ? { label: "From", value: `${formatPrice(stats.from)} per night` } : null,
    site.checkInFrom ? { label: "Check-in", value: `From ${site.checkInFrom}` } : null,
    site.reviews?.score ? { label: site.reviews.source, value: `${site.reviews.score.toFixed(1)} · ${scoreWord(site.reviews.score)}` } : null,
    site.whatsapp ? { label: "WhatsApp", value: formatPhone(site.whatsapp) } : null,
  ].filter((row) => row !== null);

  return (
    <div
      style={{ "--theme": site.themeColor, "--deep": "color-mix(in oklab, var(--theme) 30%, #241A12)" } as CSSProperties}
      className={cn(instrumentSerif.variable, "min-h-svh bg-[#EFEAE2] font-sans pb-24 text-[#1F1A14] lg:pb-0")}
    >
      {/* Aerial hero */}
      <section id="top" className="relative flex min-h-[640px] flex-col text-white sm:min-h-[760px]">
        <Parallax>
          <HeroPhoto site={site} />
        </Parallax>
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,0.25)_0%,transparent_30%,color-mix(in_oklab,var(--deep)_92%,transparent)_100%)]" />
        <header className="relative z-10 mx-auto flex w-full max-w-[1240px] items-center justify-between gap-4 px-4 pt-6 sm:px-14 sm:pt-8">
          <a href="#top" className={cn(SERIF, "truncate text-[28px] leading-8 sm:text-[32px]")}>
            {site.name}
          </a>
          <span className="flex items-center gap-6">
            <nav className="hidden items-center gap-7 text-[15px] lg:flex" aria-label="Sections">
              {nav.map((link) => (
                <a key={link.href} href={link.href} className="text-white/85 hover:text-white">
                  {link.label}
                </a>
              ))}
            </nav>
            {book ? (
              <BookLink href={book} className={cn("hidden h-12 items-center gap-2 rounded-full px-5 text-[15px] font-semibold sm:inline-flex", tone)}>
                <BookLabel online={online} size={17} />
              </BookLink>
            ) : null}
          </span>
        </header>
        <div className="relative z-10 mx-auto flex w-full max-w-[1240px] flex-1 flex-col justify-end px-4 pt-20 pb-16 sm:px-14 sm:pb-20">
          <Reveal className="flex max-w-3xl flex-col gap-6">
            <h1 className={cn(SERIF, "text-[56px] leading-[54px] tracking-[-0.015em] text-balance sm:text-[92px] sm:leading-[88px]")}>
              <Emphasis text={site.hero.headline} em="italic" />
            </h1>
            <p className="max-w-xl text-[17px] leading-7 text-white/85">{site.hero.subline}</p>
            <a href="#rooms" className="inline-flex h-12 w-fit items-center rounded-full bg-white px-6 text-[15px] font-semibold text-[#1F1A14] hover:bg-white/90">
              Explore our rooms
            </a>
          </Reveal>
        </div>
      </section>

      <main>
        {/* About, with the numbers */}
        <section className="mx-auto grid max-w-[1240px] gap-12 px-4 py-24 sm:px-14 sm:py-28 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] lg:items-center lg:gap-20">
          <Reveal className="flex flex-col gap-7">
            <Eyebrow>About</Eyebrow>
            <Heading>{intro.heading ?? `Welcome to ${site.name}`}</Heading>
            {intro.body ? <p className="max-w-lg text-[17px] leading-7 text-[#6D6457]">{intro.body}</p> : null}
            {stats ? (
              <dl className="mt-4 grid grid-cols-3 gap-4 border-t border-black/10 pt-8">
                {[
                  { value: String(stats.count), label: stats.count === 1 ? "Room" : "Rooms" },
                  { value: sleepsRange(stats), label: "Guests per room" },
                  { value: formatPrice(stats.from), label: "From, per night" },
                ].map((stat) => (
                  <div key={stat.label} className="flex flex-col-reverse gap-2">
                    <dt className="text-[11px] tracking-[0.18em] text-[#6D6457] uppercase sm:text-[12px]">{stat.label}</dt>
                    <dd className={cn(SERIF, "text-[44px] leading-[44px] sm:text-[60px] sm:leading-[60px]")}>{stat.value}</dd>
                  </div>
                ))}
              </dl>
            ) : null}
          </Reveal>
          <Photo photo={photos[0]} alt="" sizes="(min-width: 1024px) 520px, 100vw" className="aspect-[4/5] w-full" />
        </section>

        {/* Inside, on dark */}
        <section className="bg-[var(--deep)] px-4 py-24 text-[#EFE9DF] sm:px-14 sm:py-28">
          <div className="mx-auto flex max-w-[1240px] flex-col gap-24">
            {amenities.length > 0 ? (
              <div className="grid gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:items-center lg:gap-20">
                <Reveal className="flex flex-col gap-6">
                  <Eyebrow className="text-[#C9BEAD]">Inside</Eyebrow>
                  <Heading>Made for slow days</Heading>
                  <p className="max-w-md text-[16px] leading-7 text-[#C9BEAD]">What the rooms have, so you can pack light.</p>
                  <ol className="mt-2 flex flex-col border-t border-white/12">
                    {amenities.slice(0, 3).map((entry, position) => (
                      <li key={entry.key} className="grid grid-cols-[52px_minmax(0,1fr)] gap-3 border-b border-white/12 py-6">
                        <span className="pt-1.5 text-[13px] text-[#C9BEAD]">({String(position + 1).padStart(2, "0")})</span>
                        <span className="flex flex-col gap-1">
                          <span className={cn(SERIF, "text-[28px] leading-8")}>{AMENITIES[entry.key]?.label}</span>
                          <span className="text-[15px] text-[#C9BEAD]">{entry.where}.</span>
                        </span>
                      </li>
                    ))}
                  </ol>
                </Reveal>
                <Photo photo={photos[1]} alt="" sizes="(min-width: 1024px) 560px, 100vw" className="aspect-square w-full" />
              </div>
            ) : null}

            <div className="grid gap-12 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1fr)] lg:gap-20">
              <div className="flex flex-col gap-6">
                <Photo photo={photos[2]} alt="" sizes="(min-width: 1024px) 520px, 100vw" className="aspect-[4/3] w-full" />
                {site.gallery.length > 0 ? (
                  <>
                    <span className={cn(SERIF, "text-[32px] leading-9")}>See the place through photos</span>
                    <a href="#gallery" className="inline-flex h-12 w-fit items-center rounded-full border border-white/40 px-6 text-[15px] font-semibold hover:bg-white/10">
                      Gallery
                    </a>
                  </>
                ) : null}
              </div>
              <Reveal className="flex flex-col gap-8">
                <Heading>{site.town ?? "Our place"} at a glance</Heading>
                <dl className="flex flex-col border-t border-white/12 text-[15.5px]">
                  {glance.map((row) => (
                    <div key={row.label} className="flex items-baseline justify-between gap-6 border-b border-white/12 py-4">
                      <dt className="text-[#C9BEAD]">{row.label}</dt>
                      <dd className="text-right">{row.value}</dd>
                    </div>
                  ))}
                  {mapsLink ? (
                    <div className="flex items-baseline justify-between gap-6 border-b border-white/12 py-4">
                      <dt className="text-[#C9BEAD]">Map</dt>
                      <dd>
                        <a href={mapsLink} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 hover:underline">
                          Open in Google Maps
                          <ArrowUpRight className="size-4" aria-hidden="true" />
                        </a>
                      </dd>
                    </div>
                  ) : null}
                </dl>
              </Reveal>
            </div>
          </div>
        </section>

        {/* Rooms */}
        <section id="rooms" className="mx-auto max-w-[1240px] scroll-mt-4 px-4 py-24 sm:px-14 sm:py-28">
          {site.rooms.length === 0 ? (
            <div className="flex flex-col gap-4">
              <Heading>Our rooms</Heading>
              <p className="text-[#6D6457]">{roomsEmpty(site)}</p>
            </div>
          ) : (
            <Carousel
              label="Rooms"
              itemClassName="w-[82%] sm:w-[calc(50%-12px)] lg:w-[calc(25%-18px)]"
              buttonClassName="border-black/15 bg-transparent"
              activeButtonClassName="border border-black/15 bg-transparent text-[#1F1A14]"
              header={
                <div className="flex flex-col gap-5">
                  <Eyebrow>Stay</Eyebrow>
                  <Heading>Our rooms</Heading>
                </div>
              }
            >
              {site.rooms.map((room) => {
                const roomBook = bookingUrl(site, room.name);
                return (
                  <article key={room.id} className="flex h-full flex-col gap-3">
                    <RoomPhotos photos={room.photos} name={room.name} theme={site.themeColor} sample={room.sample} className="aspect-[4/5]" sizes="(min-width: 1024px) 280px, (min-width: 640px) 50vw, 82vw" />
                    <h3 className={cn(SERIF, "mt-1 text-[30px] leading-8")}>{room.name}</h3>
                    <p className="text-[14px] text-[#6D6457]">{[`Sleeps ${room.sleeps}`, room.beds, amenityLine(room.amenities, 3)].filter(Boolean).join(" · ")}</p>
                    {room.description ? <ClampedText text={room.description} className="text-[14px] leading-6 text-[#6D6457]" /> : null}
                    <div className="mt-auto flex items-center justify-between gap-3 border-t border-black/10 pt-4">
                      <span className="text-[15px]">
                        <strong className="font-semibold text-[var(--theme)]">{formatPrice(room.price)}</strong> / night
                      </span>
                      {roomBook ? (
                        <BookLink roomId={room.id} href={roomBook} className={cn("inline-flex h-10 items-center gap-2 rounded-full px-4 text-[14px] font-semibold", tone)}>
                          <BookLabel online={online} size={16} short />
                        </BookLink>
                      ) : null}
                    </div>
                  </article>
                );
              })}
            </Carousel>
          )}
          <AllRoomsLink site={site} className="mt-10" />
        </section>

        {/* A guest's words beside a photo */}
        {site.reviews && site.reviews.quotes.length > 0 ? (
          <section className="bg-[#F6F2EB] px-4 py-20 sm:px-14 sm:py-24">
            <div className="mx-auto grid max-w-[1240px] gap-10 lg:grid-cols-[360px_minmax(0,1fr)] lg:items-center lg:gap-16">
              <Photo photo={photos[3]} alt="" sizes="360px" className="aspect-[9/10] w-full max-lg:hidden" />
              <Reveal className="flex flex-col gap-6">
                <span className={cn(SERIF, "text-[72px] leading-[40px] text-[var(--theme)]")} aria-hidden="true">
                  “
                </span>
                <QuoteRotator
                  quotes={site.reviews.quotes}
                  source={site.reviews.source}
                  sample={site.samples.reviews}
                  marks={false}
                  quoteClassName="text-[22px] leading-[34px] sm:text-[28px] sm:leading-[42px]"
                  byClassName="text-[14.5px] text-[#6D6457]"
                  buttonClassName="border-black/15 hover:bg-black/5"
                />
              </Reveal>
            </div>
          </section>
        ) : null}

        <div className="mx-auto flex max-w-[1240px] flex-col gap-24 px-4 py-24 sm:gap-28 sm:px-14 sm:py-28">
          {site.gallery.length > 0 ? (
            <section id="gallery" className="flex scroll-mt-4 flex-col gap-10">
              <div className="flex flex-col gap-5">
                <Eyebrow>Gallery</Eyebrow>
                <Heading>Around {site.name}</Heading>
              </div>
              <SiteGallery photos={site.gallery} name={site.name} layout="grid4" rounded="rounded-none" limit={8} />
            </section>
          ) : null}

          {site.journal.length > 0 ? (
            <section id="journal" className="flex scroll-mt-4 flex-col gap-10">
              <div className="flex flex-wrap items-end justify-between gap-4">
                <div className="flex flex-col gap-5">
                  <Eyebrow>Journal</Eyebrow>
                  <Heading>Read our latest notes</Heading>
                </div>
                <a href={journalUrl(site)} className="inline-flex items-center gap-1.5 text-[15px] font-semibold hover:text-[var(--theme)]">
                  All posts
                  <ArrowUpRight className="size-4" aria-hidden="true" />
                </a>
              </div>
              <ul className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
                {site.journal.map((post, position) => (
                  <li key={post.slug}>
                    <Reveal delay={position * 0.08}>
                      <a href={journalUrl(site, post.slug)} className="group flex flex-col gap-3">
                        <div className="relative">
                          <Photo photo={post.cover ?? undefined} alt="" sizes="(min-width: 1024px) 380px, (min-width: 640px) 50vw, 100vw" className="aspect-[4/3] w-full" />
                          {site.samples.journal ? <SampleBadge className="absolute top-3 left-3" /> : null}
                        </div>
                        <span className="text-[13px] text-[#6D6457]">{formatPostDate(post.publishedOn)}</span>
                        <span className={cn(SERIF, "text-[30px] leading-[34px] group-hover:text-[var(--theme)]")}>{post.title}</span>
                      </a>
                    </Reveal>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {stayInfo ? (
            <section id="good-to-know" className="flex scroll-mt-4 flex-col gap-10">
              <div className="flex flex-col gap-5">
                <Eyebrow>Before you come</Eyebrow>
                <Heading>Good to know</Heading>
              </div>
              <StayDetails site={site} radius="rounded-none" heading={SERIF} />
            </section>
          ) : null}

          {site.faq.length > 0 ? (
            <section id="questions" className="flex scroll-mt-4 flex-col gap-10">
              <div className="flex flex-col gap-5">
                <Eyebrow>Asked often</Eyebrow>
                <Heading>Questions</Heading>
              </div>
              <Questions site={site} radius="rounded-none" />
            </section>
          ) : null}

          {/* Find us */}
          <section id="location" className="relative scroll-mt-4">
            <MapView site={site} className="min-h-[360px] sm:min-h-[480px]" />
            <Reveal className="relative mx-3 -mt-16 flex flex-col gap-4 bg-[var(--deep)] p-7 text-[#EFE9DF] sm:absolute sm:right-8 sm:bottom-8 sm:mx-0 sm:mt-0 sm:w-[380px]">
              <div id="contact" className="flex flex-col gap-1.5">
                <h2 className={cn(SERIF, "text-[38px] leading-[42px]")}>Find us</h2>
                {place ? <p className="text-[15px] text-[#C9BEAD]">{place}</p> : null}
              </div>
              <FindUsLinks site={site} className="text-[14.5px]" />
              <MessageUs site={site} className="w-full rounded-full" />
              <SocialLinks site={site} button="border border-white/20 text-white hover:bg-white/10" />
            </Reveal>
          </section>
        </div>
      </main>

      <footer className="bg-[var(--deep)] text-[#C9BEAD]">
        <div className="mx-auto max-w-[1240px] px-4 pt-16 pb-8 sm:px-14">
          <div className="grid gap-10 lg:grid-cols-[minmax(0,1.5fr)_auto_auto] lg:items-end lg:gap-24">
            <span className={cn(SERIF, "text-[56px] leading-[56px] text-[#EFE9DF] sm:text-[84px] sm:leading-[82px]")}>{site.name}</span>
            <nav className="flex flex-col gap-2.5 text-[15px]" aria-label="Footer">
              <span className="text-[#EFE9DF]">Visit</span>
              {nav.map((link) => (
                <a key={link.href} href={link.href} className="hover:text-white">
                  {link.label}
                </a>
              ))}
            </nav>
            <div className="flex flex-col gap-2.5 text-[15px]">
              <span className="text-[#EFE9DF]">Contact</span>
              {site.whatsapp ? <span>WhatsApp {formatPhone(site.whatsapp)}</span> : null}
              {site.email ? (
                <a href={`mailto:${site.email}`} className="hover:text-white">
                  {site.email}
                </a>
              ) : null}
              {place ? <span>{place}</span> : null}
            </div>
          </div>
          <div className="mt-14 flex flex-col gap-3 border-t border-white/12 pt-6 text-[13.5px] sm:flex-row sm:justify-between">
            <span>
              © {new Date().getFullYear()} {site.name}
            </span>
            <MadeWith strong="text-white" />
          </div>
        </div>
      </footer>

      <MobileBookBar site={site} className="bg-[#EFEAE2]/90" />
      <WhatsAppFab site={site} raised={online} />
    </div>
  );
}
