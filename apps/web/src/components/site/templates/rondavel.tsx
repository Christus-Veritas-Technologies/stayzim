import { cn } from "@stayzim/ui/lib/utils";
import type { CSSProperties, ReactNode } from "react";

import { WhatsAppIcon } from "@/components/landing/brand";
import { ClampedText } from "@/components/site/clamped-text";
import { RoomPhotos, SiteGallery } from "@/components/site/gallery";
import {
  amenityLine,
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
import { hankenGrotesk } from "@/components/site/template-fonts";
import { BookLink } from "@/components/site/tracking";
import { AMENITIES, formatPhone, formatPrice } from "@/lib/lodge";
import { bookingUrl, type LiveSite } from "@/lib/site";
import { roomsEmpty, roomsIntro, splitIntro } from "@/lib/site-content";

/** "— WELCOME": a short rule, then spaced capitals. */
function Eyebrow({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-3 text-[12.5px] font-semibold tracking-[0.22em] uppercase", className)}>
      <span className="h-px w-7 bg-current opacity-70" aria-hidden="true" />
      {children}
    </span>
  );
}

function Heading({ children, className }: { children: ReactNode; className?: string }) {
  return <h2 className={cn("text-[32px] leading-10 font-semibold tracking-[-0.015em] sm:text-[40px] sm:leading-[48px]", className)}>{children}</h2>;
}

/** Square buttons in spaced capitals, the template's voice. */
const BUTTON = "inline-flex h-12 items-center justify-center gap-2.5 px-6 text-[13px] font-semibold tracking-[0.14em] uppercase";

/**
 * Rondavel (Starter, 1b): a full-bleed hero with the WhatsApp number up the
 * edge, a welcome beside two photos, tall room cards with the price on the
 * photo, a gallery grid and a dark Find us band. Hanken Grotesk, square corners.
 */
export function RondavelTemplate({ site }: { site: LiveSite }) {
  const { place, book, online, amenities, mapsLink, stayInfo } = siteBasics(site);
  const intro = splitIntro(site.description);
  const tone = bookTone(online);
  const welcomePhotos = [site.gallery[0], site.gallery[1] ?? site.rooms[0]?.photos[0]];
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
          "--accent": "color-mix(in oklab, var(--theme) 55%, #F3D9A8)",
        } as CSSProperties
      }
      className={cn(hankenGrotesk.className, "min-h-svh bg-white pb-24 text-[#1E1E1C] lg:pb-0")}
    >
      {/* Hero, with the bar over it */}
      <section className="relative flex min-h-[600px] flex-col text-white sm:min-h-[680px]">
        <HeroPhoto site={site} />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,0.35)_0%,rgba(0,0,0,0.1)_40%,rgba(20,16,12,0.78)_100%)]" />
        <header className="relative z-10 border-b border-white/15">
          <div className="mx-auto flex h-20 max-w-[1240px] items-center gap-4 px-4 sm:h-24 sm:px-14">
            <a href="#top" className="flex min-w-0 flex-1 items-center gap-3">
              {site.logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element -- already resized on upload
                <img src={site.logoUrl} alt="" className="size-11 shrink-0 border border-white/50 object-cover" />
              ) : (
                <span className="flex size-11 shrink-0 items-center justify-center border border-white/60 text-sm font-semibold" aria-hidden="true">
                  {site.name.slice(0, 1).toUpperCase()}
                </span>
              )}
              <span className="flex min-w-0 flex-col">
                <span className="truncate text-[14px] font-semibold tracking-[0.2em] uppercase sm:text-[15px]">{site.name}</span>
                {site.town ? <span className="truncate text-[11px] tracking-[0.3em] text-white/65 uppercase">{site.town}</span> : null}
              </span>
            </a>
            <nav className="hidden items-center gap-8 text-[13px] font-semibold tracking-[0.16em] uppercase lg:flex" aria-label="Sections">
              {nav.map((link) => (
                <a key={link.href} href={link.href} className="text-white/85 hover:text-white">
                  {link.label}
                </a>
              ))}
            </nav>
            {book ? (
              <BookLink href={book} className={cn(BUTTON, "hidden h-11 px-5 sm:inline-flex", tone)}>
                <BookLabel online={online} size={16} upper />
              </BookLink>
            ) : null}
          </div>
        </header>

        {site.whatsapp ? (
          <div className="absolute top-1/2 left-7 z-10 hidden -translate-y-1/2 flex-col items-center gap-5 lg:flex">
            <span className="text-[12px] font-semibold tracking-[0.24em] text-white/85 uppercase [writing-mode:vertical-rl] rotate-180">
              WhatsApp {formatPhone(site.whatsapp)}
            </span>
            <MessageUs site={site} className="size-11 rounded-full border border-white/60 bg-transparent px-0 text-white hover:bg-white/10">
              <WhatsAppIcon size={18} color="currentColor" />
              <span className="sr-only">Message us on WhatsApp</span>
            </MessageUs>
          </div>
        ) : null}

        <div id="top" className="relative z-10 mx-auto flex w-full max-w-4xl flex-1 flex-col items-center justify-center gap-6 px-5 py-20 text-center">
          {place ? <Eyebrow className="text-white/90">{place.replace(", ", " · ")}</Eyebrow> : null}
          <h1 className="text-[40px] leading-[46px] font-semibold tracking-[-0.02em] text-balance sm:text-[60px] sm:leading-[66px]">
            <Emphasis text={site.hero.headline} em="text-[var(--accent)]" />
          </h1>
          <p className="max-w-xl text-[16px] leading-7 text-white/85 sm:text-[17px]">{site.hero.subline}</p>
          <a href="#rooms" className={cn(BUTTON, "border border-white/70 hover:bg-white/10")}>
            See rooms
          </a>
        </div>
      </section>

      <main>
        {/* Welcome */}
        <section className="mx-auto grid max-w-[1100px] gap-12 px-4 py-20 sm:px-8 sm:py-28 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.95fr)] lg:items-center lg:gap-16">
          <div className="flex flex-col gap-6">
            <Eyebrow className="text-[#3C3B37]">Welcome</Eyebrow>
            <Heading className="text-[30px] leading-[38px] sm:text-[38px] sm:leading-[46px]">{intro.heading ?? `Welcome to ${site.name}`}</Heading>
            {intro.body ? <p className="text-[16px] leading-7 text-[#6B6A64]">{intro.body}</p> : null}
            {amenities.length > 0 ? (
              <ul className="grid grid-cols-2 gap-x-6 gap-y-3 text-[15px] font-medium sm:grid-cols-3">
                {amenities.slice(0, 6).map((entry) => (
                  <li key={entry.key} className="inline-flex items-center gap-2">
                    <AmenityIcon amenity={entry.key} className="size-[18px] text-[var(--theme)]" />
                    {AMENITIES[entry.key]?.label}
                  </li>
                ))}
              </ul>
            ) : null}
            {site.whatsapp ? (
              <div className="mt-2 flex items-center gap-4 border-t border-black/10 pt-6">
                <span className="flex size-12 shrink-0 items-center justify-center rounded-full border border-[var(--theme)] text-[var(--theme)]">
                  <WhatsAppIcon size={20} color="currentColor" />
                </span>
                <span className="flex flex-col">
                  <span className="text-[12px] font-semibold tracking-[0.2em] text-[#6B6A64] uppercase">Bookings on WhatsApp</span>
                  <span className="text-[22px] font-medium">{formatPhone(site.whatsapp)}</span>
                </span>
              </div>
            ) : null}
          </div>
          <div className="relative mx-auto h-[380px] w-full max-w-[460px] sm:h-[460px]" aria-hidden="true">
            <Photo photo={welcomePhotos[1]} alt="" sizes="(min-width: 1024px) 260px, 60vw" className="absolute top-[14%] left-0 h-[86%] w-[60%]" />
            <Photo photo={welcomePhotos[0]} alt="" sizes="(min-width: 1024px) 260px, 50vw" className="absolute top-0 right-0 h-[70%] w-[52%] border-[10px] border-white" />
          </div>
        </section>

        {/* Rooms */}
        <section id="rooms" className="scroll-mt-4 bg-[#F5F3EF] py-20 sm:py-24">
          <div className="mx-auto max-w-[1100px] px-4 sm:px-8">
            <div className="mb-10 flex flex-wrap items-end justify-between gap-3">
              <div className="flex flex-col gap-4">
                <Eyebrow className="text-[#3C3B37]">Stay with us</Eyebrow>
                <Heading>Our rooms</Heading>
              </div>
              <span className="text-[14px] text-[#6B6A64]">{roomsIntro(site)}</span>
            </div>
            {site.rooms.length === 0 ? (
              <p className="text-[#6B6A64]">{roomsEmpty(site)}</p>
            ) : (
              <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {site.rooms.map((room) => {
                  const roomBook = bookingUrl(site, room.name);
                  return (
                    <li key={room.id} className="flex flex-col">
                      <div className="relative text-white">
                        <RoomPhotos photos={room.photos} name={room.name} theme={site.themeColor} className="aspect-[4/5]" sizes="(min-width: 1024px) 350px, (min-width: 640px) 50vw, 100vw" />
                        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,transparent_45%,rgba(20,16,12,0.85))]" />
                        <span className="pointer-events-none absolute top-5 right-4 text-[11px] font-semibold tracking-[0.3em] uppercase [writing-mode:vertical-rl]">
                          Sleeps {room.sleeps}
                        </span>
                        <div className="pointer-events-none absolute inset-x-0 bottom-0 flex flex-col gap-1.5 p-6">
                          <span className="text-[12.5px] font-semibold tracking-[0.2em] uppercase">{formatPrice(room.price)} / night</span>
                          <h3 className="text-[26px] leading-8 font-semibold">{room.name}</h3>
                          {room.amenities.length > 0 ? <span className="text-[14px] text-white/85">{amenityLine(room.amenities, 3)}</span> : null}
                        </div>
                      </div>
                      <div className={cn("flex-1", (room.description || room.beds || room.size) && "bg-white px-5 py-4 text-[14px] leading-6 text-[#6B6A64]")}>
                        {room.beds || room.size ? (
                          <p className="font-medium text-[#3C3B37]">{[room.beds, room.size ? `${room.size} m²` : null].filter(Boolean).join(" · ")}</p>
                        ) : null}
                        {room.description ? <ClampedText text={room.description} /> : null}
                      </div>
                      {roomBook ? (
                        <BookLink roomId={room.id} href={roomBook} className={cn(BUTTON, "mt-3 w-full", tone)}>
                          <BookLabel online={online} size={17} upper />
                        </BookLink>
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </section>

        {/* Gallery */}
        {site.gallery.length > 0 ? (
          <section id="gallery" className="mx-auto max-w-[1100px] scroll-mt-4 px-4 py-20 sm:px-8 sm:py-24">
            <div className="mb-10 flex flex-col gap-4">
              <Eyebrow className="text-[#3C3B37]">Gallery</Eyebrow>
              <Heading>Around the lodge</Heading>
            </div>
            <SiteGallery photos={site.gallery} name={site.name} layout="grid4" rounded="rounded-none" limit={8} />
          </section>
        ) : null}

        {/* Good to know and questions */}
        {stayInfo || site.faq.length > 0 ? (
          <section id="good-to-know" className="scroll-mt-4 border-t border-black/[0.06] py-20 sm:py-24">
            <div className="mx-auto flex max-w-[1100px] flex-col gap-16 px-4 sm:px-8">
              {stayInfo ? (
                <div className="flex flex-col gap-8">
                  <div className="flex flex-col gap-4">
                    <Eyebrow className="text-[#3C3B37]">Before you come</Eyebrow>
                    <Heading>Good to know</Heading>
                  </div>
                  <StayDetails site={site} radius="rounded-none" />
                </div>
              ) : null}
              {site.faq.length > 0 ? (
                <div id="questions" className="flex scroll-mt-4 flex-col gap-8">
                  <div className="flex flex-col gap-4">
                    <Eyebrow className="text-[#3C3B37]">Asked often</Eyebrow>
                    <Heading>Questions</Heading>
                  </div>
                  <Questions site={site} radius="rounded-none" />
                </div>
              ) : null}
            </div>
          </section>
        ) : null}

        {/* Find us */}
        <section id="location" className="grid scroll-mt-4 lg:grid-cols-2">
          <MapView site={site} className="min-h-[320px] lg:min-h-[440px]" />
          <div id="contact" className="flex flex-col justify-center gap-6 bg-[#262624] px-6 py-14 text-white sm:px-14">
            <Eyebrow className="text-[var(--accent)]">Find us</Eyebrow>
            <Heading className="text-white">{place ?? site.name}</Heading>
            <FindUsLinks site={site} className="text-white/85" />
            <MessageUs site={site} className={cn(BUTTON, "w-fit")}>
              <WhatsAppIcon size={18} />
              Message us on WhatsApp
            </MessageUs>
            <SocialLinks site={site} button="rounded-none border border-white/25 text-white hover:bg-white/10" />
          </div>
        </section>
      </main>

      <footer className="bg-[#1C1C1A] text-white/70">
        <div className="mx-auto flex max-w-[1240px] flex-col items-center gap-3 px-4 py-7 text-[13px] sm:flex-row sm:justify-between sm:px-14">
          <span className="text-[14px] font-semibold tracking-[0.2em] text-white uppercase">{site.name}</span>
          <span>
            © {new Date().getFullYear()} {site.name}
          </span>
          <MadeWith strong="text-white" />
        </div>
      </footer>

      <MobileBookBar site={site} button="rounded-none tracking-[0.12em] uppercase text-[13px]" />
      <WhatsAppFab site={site} raised={online} />
    </div>
  );
}
