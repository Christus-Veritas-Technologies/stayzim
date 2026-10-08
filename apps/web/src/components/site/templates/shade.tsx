import { cn } from "@stayzim/ui/lib/utils";
import type { CSSProperties, ReactNode } from "react";

import { WhatsAppIcon } from "@/components/landing/brand";
import { ClampedText } from "@/components/site/clamped-text";
import { SiteGallery } from "@/components/site/gallery";
import {
  AllRoomsLink,
  AmenityIcon,
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
import { RoomFilters } from "@/components/site/room-filters";
import { newsreaderBook } from "@/components/site/template-fonts";
import { BookLink } from "@/components/site/tracking";
import { AMENITIES, formatPrice } from "@/lib/lodge";
import { bookingUrl, type LiveSite } from "@/lib/site";
import { filterRooms, roomsEmpty, splitIntro } from "@/lib/site-content";
import { hasPage, pageOr, pageUrl } from "@/lib/site-pages";

const SERIF = "font-[family-name:var(--font-newsreader-book)] font-normal";
const CREAM = "bg-[#F7F4EE]";

function Eyebrow({ children, className }: { children: ReactNode; className?: string }) {
  return <span className={cn("text-[12.5px] font-semibold tracking-[0.18em] text-[var(--gold)] uppercase", className)}>{children}</span>;
}

/** "MV" for Mist Valley Lodge */
function initials(name: string) {
  const words = name.split(/\s+/).filter((word) => !/^(lodge|the|cottages?|cabins?|camp|house|guest)$/i.test(word));
  return (words.length > 0 ? words : name.split(/\s+/))
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase())
    .join("");
}

/**
 * Shade (Starter, 1c): the classic serif lodge. A hero with the words on a
 * shaded side, amenity tiles, the rooms on a band of the lodge's colour with
 * their prices, then gallery and map. Newsreader over Instrument Sans.
 */
export function ShadeTemplate({ site }: { site: LiveSite }) {
  const { place, book, online, stats, amenities, mapsLink, stayInfo } = siteBasics(site);
  const intro = splitIntro(site.description);
  const tone = bookTone(online);
  const bandPhoto = site.rooms.find((room) => room.photos[0])?.photos[0] ?? site.gallery[0];
  const nav = [
    { href: pageOr(site, "rooms", "#rooms"), label: "Rooms" },
    site.gallery.length > 0 ? { href: pageOr(site, "gallery", "#gallery"), label: "Gallery" } : null,
    // With a Contact page, Location is on it
    hasPage(site, "contact") ? null : { href: "#location", label: "Location" },
    hasPage(site, "about") ? { href: pageUrl(site, "about"), label: "Our story" } : null,
    { href: pageOr(site, "contact", "#contact"), label: "Contact" },
  ].filter((link) => link !== null);

  return (
    <div
      style={
        {
          "--theme": site.themeColor,
          "--deep": "color-mix(in oklab, var(--theme) 78%, #000)",
          "--gold": "color-mix(in oklab, var(--theme) 25%, #B08A4E)",
          "--gold-light": "color-mix(in oklab, var(--theme) 15%, #E2C892)",
        } as CSSProperties
      }
      className={cn(newsreaderBook.variable, "min-h-svh bg-white font-sans pb-24 text-[#172420] lg:pb-0")}
    >
      <header className="sticky top-0 z-30 border-b border-black/[0.06] bg-white/95 backdrop-blur">
        <div className="mx-auto flex h-[72px] max-w-[1200px] items-center gap-4 px-4 sm:h-20 sm:px-8">
          <a href="#top" className="flex min-w-0 flex-1 items-center gap-3">
            {site.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element -- already resized on upload
              <img src={site.logoUrl} alt="" className="size-10 shrink-0 object-cover sm:size-11" />
            ) : (
              <span className={cn(SERIF, "flex size-10 shrink-0 items-center justify-center bg-[var(--theme)] text-[15px] text-white sm:size-11")} aria-hidden="true">
                {initials(site.name)}
              </span>
            )}
            <span className={cn(SERIF, "truncate text-[21px] sm:text-[24px]")}>{site.name}</span>
          </a>
          <nav className="hidden items-center gap-10 text-[13px] font-semibold tracking-[0.12em] uppercase lg:flex" aria-label="Sections">
            {nav.map((link) => (
              <a key={link.href} href={link.href} className="hover:text-[var(--theme)]">
                {link.label}
              </a>
            ))}
          </nav>
          {book ? (
            <BookLink href={book} className={cn("hidden h-11 items-center gap-2 rounded-lg px-5 text-[15px] font-semibold sm:inline-flex", tone)}>
              <BookLabel online={online} size={17} />
            </BookLink>
          ) : null}
        </div>
      </header>

      <main id="top">
        {/* Hero: the words on the shaded side */}
        <section className="relative flex min-h-[540px] items-center overflow-hidden text-white sm:min-h-[600px]">
          <HeroPhoto site={site} />
          <div className="absolute inset-0 bg-[linear-gradient(90deg,color-mix(in_oklab,var(--deep)_92%,transparent)_0%,color-mix(in_oklab,var(--deep)_55%,transparent)_50%,transparent_100%)]" />
          <div className="absolute inset-0 bg-[linear-gradient(0deg,color-mix(in_oklab,var(--deep)_60%,transparent),transparent_45%)] sm:hidden" />
          <div className="relative mx-auto w-full max-w-[1200px] px-5 py-20 sm:px-[72px]">
            <div className="flex max-w-xl flex-col gap-6">
              {place ? <Eyebrow className="text-[var(--gold-light)]">{place}</Eyebrow> : null}
              <h1 className={cn(SERIF, "text-[44px] leading-[48px] tracking-[-0.02em] text-balance sm:text-[68px] sm:leading-[70px]")}>
                <Emphasis text={site.hero.headline} em="italic" />
              </h1>
              <p className="text-[17px] leading-7 text-white/90 sm:text-[18px]">{site.hero.subline}</p>
              <div className="flex flex-wrap gap-3">
                {book ? (
                  <BookLink href={book} className={cn("inline-flex h-12 items-center gap-2 rounded-lg px-5 text-[15px] font-semibold", tone)}>
                    <BookLabel online={online} />
                  </BookLink>
                ) : null}
                <a href="#rooms" className="inline-flex h-12 items-center rounded-lg border border-white/70 px-5 text-[15px] font-semibold hover:bg-white/10">
                  See rooms
                </a>
              </div>
            </div>
          </div>
        </section>

        {/* Welcome with amenity tiles */}
        <section className={cn(CREAM, "px-4 py-20 sm:px-8 sm:py-24")}>
          <div className="mx-auto flex max-w-[1000px] flex-col items-center gap-5 text-center">
            <Eyebrow>Welcome</Eyebrow>
            <h2 className={cn(SERIF, "max-w-3xl text-[34px] leading-10 tracking-[-0.015em] text-balance sm:text-[46px] sm:leading-[52px]")}>
              {intro.heading ?? `Welcome to ${site.name}`}
            </h2>
            {intro.body ? <p className="max-w-2xl text-[16px] leading-7 text-[#5D6964] sm:text-[17px]">{intro.body}</p> : null}
            {amenities.length > 0 ? (
              <ul className="mt-6 grid w-full grid-cols-3 gap-2.5 sm:grid-cols-6 sm:gap-3">
                {amenities.slice(0, 6).map((entry) => (
                  <li key={entry.key} className="flex flex-col items-center justify-center gap-2.5 bg-white px-2 py-5 text-[14px] font-semibold">
                    <AmenityIcon amenity={entry.key} className="size-6 text-[var(--theme)]" />
                    {AMENITIES[entry.key]?.label}
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        </section>

        {/* Rooms on the lodge's colour */}
        <section id="rooms" className="scroll-mt-20 bg-[var(--theme)] px-4 py-16 text-white sm:px-8 sm:py-24">
          <div className="mx-auto grid max-w-[1200px] gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:items-center lg:gap-14">
            <Photo photo={bandPhoto} alt="" sizes="(min-width: 1024px) 560px, 100vw" className="aspect-square w-full max-lg:hidden" />
            <div className="flex flex-col">
              <Eyebrow className="text-[var(--gold-light)]">Accommodation</Eyebrow>
              <h2 className={cn(SERIF, "mt-3 text-[44px] leading-[48px] sm:text-[56px] sm:leading-[60px]")}>Rooms</h2>
              {stats ? (
                <p className="mt-5 text-[16px] text-white/80">
                  {stats.count} {stats.count === 1 ? "room" : "rooms"}, sleeping {sleepsRange(stats)}. Prices are per room, per night.
                </p>
              ) : null}
              {site.rooms.length === 0 ? (
                <p className="mt-6 text-white/80">{roomsEmpty(site)}</p>
              ) : (
                <RoomFilters rooms={filterRooms(site.rooms)} control="rounded-lg">
                  <ul className="mt-6 flex flex-col divide-y divide-white/15 border-t border-white/15">
                    {site.rooms.map((room) => {
                      const roomBook = bookingUrl(site, room.name);
                      const facts = [`Sleeps ${room.sleeps}`, room.beds, amenityLine(room.amenities, 3)].filter(Boolean).join(" · ");
                      return (
                        <li key={room.id} data-room-id={room.id} className="flex flex-col gap-3 py-5 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
                          <div className="flex min-w-0 flex-col gap-1">
                            <h3 className={cn(SERIF, "text-[26px] leading-8")}>{room.name}</h3>
                            <p className="text-[14px] text-white/75">{facts}</p>
                            {room.description ? <ClampedText text={room.description} className="mt-1 text-[14px] leading-6 text-white/75" /> : null}
                          </div>
                          <div className="flex shrink-0 items-center gap-4">
                            <span className="text-[16px] font-semibold whitespace-nowrap">{formatPrice(room.price)} / night</span>
                            {roomBook ? (
                              <BookLink roomId={room.id} href={roomBook} className={cn("inline-flex h-11 items-center gap-2 rounded-lg px-4 text-[15px] font-semibold", online ? "bg-white text-[var(--theme)]" : tone)}>
                                <BookLabel online={online} size={16} short />
                              </BookLink>
                            ) : null}
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </RoomFilters>
              )}
              <AllRoomsLink site={site} className="mt-10" />
            </div>
          </div>
        </section>

        {/* Gallery */}
        {site.gallery.length > 0 ? (
          <section id="gallery" className={cn(CREAM, "scroll-mt-20 px-4 py-20 sm:px-8 sm:py-24")}>
            <div className="mx-auto max-w-[1200px]">
              <div className="mb-10 flex flex-col items-center gap-3 text-center">
                <Eyebrow>Gallery</Eyebrow>
                <h2 className={cn(SERIF, "text-[38px] leading-[44px] sm:text-[46px] sm:leading-[52px]")}>Around the lodge</h2>
              </div>
              <SiteGallery photos={site.gallery} name={site.name} layout="grid3" rounded="rounded-none" limit={6} />
            </div>
          </section>
        ) : null}

        {/* Good to know and questions */}
        {stayInfo || site.faq.length > 0 ? (
          <section id="good-to-know" className={cn("scroll-mt-20 px-4 py-20 sm:px-8 sm:py-24", site.gallery.length > 0 ? "bg-white" : CREAM)}>
            <div className="mx-auto flex max-w-[1000px] flex-col gap-16">
              {stayInfo ? (
                <div className="flex flex-col gap-8">
                  <div className="flex flex-col items-center gap-3 text-center">
                    <Eyebrow>Before you come</Eyebrow>
                    <h2 className={cn(SERIF, "text-[38px] leading-[44px] sm:text-[46px] sm:leading-[52px]")}>Good to know</h2>
                  </div>
                  <StayDetails site={site} radius="rounded-none" heading={SERIF} />
                </div>
              ) : null}
              {site.faq.length > 0 ? (
                <div id="questions" className="flex scroll-mt-20 flex-col gap-8">
                  <div className="flex flex-col items-center gap-3 text-center">
                    <Eyebrow>Asked often</Eyebrow>
                    <h2 className={cn(SERIF, "text-[38px] leading-[44px] sm:text-[46px] sm:leading-[52px]")}>Questions</h2>
                  </div>
                  <Questions site={site} radius="rounded-none" />
                </div>
              ) : null}
            </div>
          </section>
        ) : null}

        {/* Find us */}
        <section id="location" className="scroll-mt-20 border-t border-black/[0.05] bg-white px-4 py-20 sm:px-8 sm:py-24">
          <div id="contact" className="mx-auto grid max-w-[1200px] gap-10 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:items-center">
            <div className="flex flex-col gap-5">
              <Eyebrow>Find us</Eyebrow>
              <h2 className={cn(SERIF, "text-[38px] leading-[44px] sm:text-[46px] sm:leading-[52px]")}>{place ?? site.name}</h2>
              <FindUsLinks site={site} />
              <MessageUs site={site} className="w-fit rounded-lg">
                <WhatsAppIcon size={18} />
                Message us on WhatsApp
              </MessageUs>
              <SocialLinks site={site} />
            </div>
            <MapView site={site} className="min-h-[320px] lg:min-h-[400px]" />
          </div>
        </section>
      </main>

      <footer className="bg-[var(--deep)] text-white/75">
        <div className="mx-auto flex max-w-[1200px] flex-col items-center gap-3 px-4 py-7 text-[13.5px] sm:flex-row sm:justify-between sm:px-8">
          <span className={cn(SERIF, "text-[22px] text-white")}>{site.name}</span>
          <span>
            © {new Date().getFullYear()} {site.name}
            {site.town ? ` · ${site.town}` : ""}
          </span>
          <MadeWith strong="text-white" />
        </div>
      </footer>

      <MobileBookBar site={site} button="rounded-lg" />
      <WhatsAppFab site={site} raised={online} />
    </div>
  );
}
