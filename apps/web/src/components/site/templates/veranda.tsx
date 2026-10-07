import { cn } from "@stayzim/ui/lib/utils";
import type { CSSProperties, ReactNode } from "react";

import { ClampedText } from "@/components/site/clamped-text";
import { RoomPhotos, SiteGallery } from "@/components/site/gallery";
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
  Questions,
  siteBasics,
  SocialLinks,
  StayDetails,
  WhatsAppFab,
} from "@/components/site/parts";
import { urbanist } from "@/components/site/template-fonts";
import { BookLink } from "@/components/site/tracking";
import { AMENITIES, formatPrice } from "@/lib/lodge";
import { bookingUrl, type LiveSite } from "@/lib/site";
import { roomFacts, splitIntro } from "@/lib/site-content";

/** A soft tint of the lodge's colour, for chips and panels. */
const TINT = "bg-[color-mix(in_oklab,var(--theme)_7%,white)]";

function Heading({ children, className }: { children: ReactNode; className?: string }) {
  return <h2 className={cn("text-[30px] leading-9 font-bold tracking-[-0.02em] text-[var(--ink)] sm:text-[36px] sm:leading-[42px]", className)}>{children}</h2>;
}

/**
 * Veranda (Starter, 1a): a rounded hero card with a price pill, a centred
 * welcome, room cards, gallery and a tinted Find us panel. One font (Urbanist),
 * one colour, nothing moves.
 */
export function VerandaTemplate({ site }: { site: LiveSite }) {
  const { place, book, online, stats, amenities, mapsLink } = siteBasics(site);
  const intro = splitIntro(site.description);
  const tone = bookTone(online);
  const nav = [
    { href: "#rooms", label: "Rooms" },
    site.gallery.length > 0 ? { href: "#gallery", label: "Gallery" } : null,
    { href: "#location", label: "Location" },
  ].filter((link) => link !== null);

  return (
    <div
      style={
        {
          "--theme": site.themeColor,
          "--ink": "color-mix(in oklab, var(--theme) 14%, #15121C)",
          "--muted": "color-mix(in oklab, var(--theme) 14%, #5F6670)",
        } as CSSProperties
      }
      className={cn(urbanist.className, "min-h-svh bg-white pb-24 text-[var(--ink)] lg:pb-0")}
    >
      <header className="mx-auto grid h-[72px] max-w-[1240px] grid-cols-[1fr_auto] items-center gap-4 px-4 sm:h-[84px] sm:px-8 lg:grid-cols-[1fr_auto_1fr]">
        <nav className="hidden items-center gap-7 text-[15px] font-medium lg:flex" aria-label="Sections">
          {nav.map((link) => (
            <a key={link.href} href={link.href} className="hover:text-[var(--theme)]">
              {link.label}
            </a>
          ))}
        </nav>
        <a href="#top" className="flex min-w-0 flex-col items-start gap-1.5 lg:items-center">
          <span className="truncate text-[19px] font-bold tracking-[-0.01em] sm:text-[21px]">{site.name}</span>
          <span className="flex gap-1" aria-hidden="true">
            <span className="h-[3px] w-3.5 rounded-full bg-[var(--theme)]" />
            <span className="h-[3px] w-3.5 rounded-full bg-[var(--theme)] opacity-50" />
            <span className="h-[3px] w-3.5 rounded-full bg-[var(--theme)] opacity-25" />
          </span>
        </a>
        {book ? (
          <BookLink href={book} className={cn("inline-flex h-11 items-center gap-2 justify-self-end rounded-full px-4 text-sm font-semibold sm:px-5", tone)}>
            <BookLabel online={online} size={16} />
          </BookLink>
        ) : null}
      </header>

      <main id="top">
        {/* Hero card */}
        <section className="px-3 sm:px-8">
          <div className="relative mx-auto flex min-h-[540px] max-w-[1240px] flex-col items-center justify-center overflow-hidden rounded-[28px] px-5 pt-16 pb-36 text-center text-white sm:min-h-[580px] sm:pb-32">
            <HeroPhoto site={site} />
            <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,0.12)_0%,rgba(0,0,0,0.05)_35%,color-mix(in_oklab,var(--theme)_60%,#000)_100%)] opacity-85" />
            <div className="relative flex max-w-3xl flex-col items-center gap-5">
              {place ? (
                <span className="rounded-full border border-white/45 bg-white/10 px-4 py-1.5 text-sm font-semibold backdrop-blur-sm">{place}</span>
              ) : null}
              <h1 className="text-[42px] leading-[46px] font-light tracking-[-0.02em] text-balance sm:text-[68px] sm:leading-[72px]">
                <Emphasis text={site.hero.headline} em="font-bold" />
              </h1>
              <p className="max-w-xl text-[16px] leading-7 text-white/90 sm:text-[18px]">{site.hero.subline}</p>
            </div>
            {stats || book ? (
              <div className="absolute inset-x-4 bottom-6 flex justify-center sm:bottom-8">
                <div className="flex w-full max-w-md items-center justify-between gap-3 rounded-full bg-white p-1.5 pl-6 text-left text-[var(--ink)] shadow-[0_18px_40px_-18px_rgba(0,0,0,0.5)] sm:w-auto sm:max-w-none sm:gap-6">
                  {stats ? (
                    <span className="flex flex-col py-1">
                      <span className="text-[13px] text-[var(--muted)]">
                        {stats.count} {stats.count === 1 ? "room" : "rooms"}
                      </span>
                      <span className="text-[16px] font-bold whitespace-nowrap sm:text-[18px]">From {formatPrice(stats.from)} a night</span>
                    </span>
                  ) : (
                    <span />
                  )}
                  {book ? (
                    <BookLink href={book} className={cn("inline-flex h-12 shrink-0 items-center gap-2 rounded-full px-5 text-[15px] font-semibold", tone)}>
                      <span className="contents sm:hidden">
                        <BookLabel online={online} size={18} short />
                      </span>
                      <span className="hidden sm:contents">
                        <BookLabel online={online} size={18} />
                      </span>
                    </BookLink>
                  ) : null}
                </div>
              </div>
            ) : null}
          </div>
        </section>

        <div className="mx-auto flex max-w-[1240px] flex-col gap-20 px-4 py-16 sm:gap-24 sm:px-8 sm:py-24">
          {/* Welcome */}
          {site.description || stats ? (
            <section className="mx-auto flex max-w-3xl flex-col items-center gap-4 text-center">
              <span className="text-[13px] font-bold tracking-[0.14em] text-[var(--theme)] uppercase">Welcome</span>
              <h2 className="text-[30px] leading-9 font-semibold tracking-[-0.02em] text-balance sm:text-[40px] sm:leading-[48px]">
                {intro.heading ?? `Welcome to ${site.name}`}
              </h2>
              {intro.body ? <p className="max-w-2xl text-[16px] leading-7 text-[var(--muted)] sm:text-[17px]">{intro.body}</p> : null}
              {stats ? (
                <ul className="mt-2 flex flex-wrap justify-center gap-2 text-[14.5px] font-semibold">
                  <li className={cn("rounded-full px-4 py-2.5", TINT)}>
                    {stats.count} {stats.count === 1 ? "room" : "rooms"}
                  </li>
                  <li className={cn("rounded-full px-4 py-2.5", TINT)}>Sleeps up to {stats.most}</li>
                  {amenities.slice(0, 2).map((entry) => (
                    <li key={entry.key} className={cn("inline-flex items-center gap-1.5 rounded-full px-4 py-2.5", TINT)}>
                      <AmenityIcon amenity={entry.key} className="size-4 text-[var(--theme)]" />
                      {AMENITIES[entry.key]?.label}
                    </li>
                  ))}
                </ul>
              ) : null}
            </section>
          ) : null}

          {/* Rooms */}
          <section id="rooms" className="scroll-mt-6">
            <div className="mb-7 flex flex-wrap items-end justify-between gap-2">
              <Heading>Rooms</Heading>
              <span className="text-[15px] text-[var(--muted)]">Prices are per room, per night</span>
            </div>
            {site.rooms.length === 0 ? (
              <p className="text-[var(--muted)]">Rooms are coming soon. Message us on WhatsApp to book.</p>
            ) : (
              <ul className="grid gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
                {site.rooms.map((room) => {
                  const roomBook = bookingUrl(site, room.name);
                  const facts = [...roomFacts(room), ...room.amenities.slice(0, 4).map((key) => AMENITIES[key]?.label)].filter(Boolean);
                  return (
                    <li key={room.id} className="flex flex-col gap-3">
                      <div className="relative">
                        <RoomPhotos photos={room.photos} name={room.name} theme={site.themeColor} className="aspect-[4/3] rounded-[22px]" />
                        <span className="pointer-events-none absolute top-3 left-3 rounded-full bg-white px-3 py-1.5 text-[15px] font-bold text-[var(--theme)] shadow-sm">
                          {formatPrice(room.price)} / night
                        </span>
                      </div>
                      <div className="flex flex-col gap-1 px-1">
                        <h3 className="text-[23px] leading-8 font-bold tracking-[-0.01em]">{room.name}</h3>
                        <p className="text-[15px] leading-6 text-[var(--muted)]">{facts.join(" · ")}</p>
                        {room.description ? <ClampedText text={room.description} className="mt-1 text-[15px] leading-6 text-[var(--muted)]" /> : null}
                      </div>
                      {roomBook ? (
                        <BookLink roomId={room.id} href={roomBook} className={cn("ml-1 inline-flex h-11 w-fit items-center gap-2 rounded-full px-5 text-sm font-semibold", tone)}>
                          <BookLabel online={online} size={16} />
                        </BookLink>
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          {/* Gallery */}
          {site.gallery.length > 0 ? (
            <section id="gallery" className="scroll-mt-6">
              <Heading className="mb-7">Gallery</Heading>
              <SiteGallery photos={site.gallery} name={site.name} layout="feature" rounded="rounded-[22px]" limit={5} />
            </section>
          ) : null}

          {/* Good to know */}
          {siteBasics(site).stayInfo ? (
            <section id="good-to-know" className="scroll-mt-6">
              <Heading className="mb-7">Good to know</Heading>
              <StayDetails site={site} radius="rounded-[22px]" />
            </section>
          ) : null}

          {/* Questions */}
          {site.faq.length > 0 ? (
            <section id="questions" className="scroll-mt-6">
              <Heading className="mb-7">Questions</Heading>
              <Questions site={site} radius="rounded-[18px]" />
            </section>
          ) : null}

          {/* Find us */}
          <section id="location" className={cn("grid scroll-mt-6 gap-6 rounded-[28px] p-3 sm:p-4 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] lg:items-center", TINT)}>
            <MapView site={site} className="min-h-[300px] rounded-[22px] lg:min-h-[400px]" />
            <div id="contact" className="flex flex-col gap-5 px-3 pb-4 sm:px-6 lg:px-8 lg:py-6">
              <div className="flex flex-col gap-2">
                <Heading>Find us</Heading>
                {place ? <p className="text-[17px] text-[var(--muted)]">{place}</p> : null}
              </div>
              <FindUsLinks site={site} />
              <MessageUs site={site} className="w-full rounded-full" />
              <SocialLinks site={site} button="bg-white hover:bg-white/70 text-[var(--ink)]" />
            </div>
          </section>
        </div>
      </main>

      <footer className="border-t border-black/[0.06]">
        <div className="mx-auto flex max-w-[1240px] flex-col items-center gap-2 px-4 py-6 text-sm text-[var(--muted)] sm:flex-row sm:justify-between sm:px-8">
          <span className="text-[17px] font-bold text-[var(--ink)]">{site.name}</span>
          <span>
            © {new Date().getFullYear()} {site.name}
            {place ? ` · ${place}` : ""}
          </span>
          <MadeWith strong="text-[var(--ink)]" />
        </div>
      </footer>

      <MobileBookBar site={site} />
      <WhatsAppFab site={site} raised={online} />
    </div>
  );
}
