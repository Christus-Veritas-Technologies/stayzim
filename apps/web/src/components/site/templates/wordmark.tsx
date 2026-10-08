import { cn } from "@stayzim/ui/lib/utils";
import { Users } from "lucide-react";
import type { CSSProperties, ReactNode } from "react";

import { Reveal } from "@/components/motion";
import { Carousel } from "@/components/site/carousel";
import { ClampedText } from "@/components/site/clamped-text";
import { EnquiryBar } from "@/components/site/enquiry-bar";
import { RoomPhotos, SiteGallery } from "@/components/site/gallery";
import {
  AmenityIcon,
  BookLabel,
  bookTone,
  Emphasis,
  HeroPhoto,
  MadeWith,
  MapView,
  MobileBookBar,
  Photo,
  Questions,
  siteBasics,
  SocialLinks,
  StayDetails,
  WhatsAppFab,
} from "@/components/site/parts";
import { bricolageGrotesque } from "@/components/site/template-fonts";
import { BookLink } from "@/components/site/tracking";
import { AMENITIES, formatPhone, formatPrice } from "@/lib/lodge";
import { bookingUrl, type LiveSite } from "@/lib/site";
import { highlightWords, roomsEmpty } from "@/lib/site-content";

const DISPLAY = "font-[family-name:var(--font-bricolage)]";

function Heading({ children, className }: { children: ReactNode; className?: string }) {
  return <h2 className={cn(DISPLAY, "text-[36px] leading-[42px] font-bold tracking-[-0.035em] sm:text-[52px] sm:leading-[58px]", className)}>{children}</h2>;
}

/** Words around a circle, turning slowly (still with reduce motion). */
function CircleText({ text }: { text: string }) {
  return (
    <span className="flex size-[112px] items-center justify-center rounded-full bg-white shadow-[0_14px_30px_-14px_rgba(35,28,22,0.45)] sm:size-[124px]" aria-hidden="true">
      <svg viewBox="0 0 100 100" className="size-full motion-safe:animate-[spin_28s_linear_infinite]">
        <defs>
          <path id="wordmark-circle" d="M 50,50 m -36,0 a 36,36 0 1,1 72,0 a 36,36 0 1,1 -72,0" />
        </defs>
        <text className="fill-[#231C16] text-[9.5px] font-semibold tracking-[0.2em] uppercase">
          <textPath href="#wordmark-circle">{text}</textPath>
        </text>
      </svg>
    </span>
  );
}

/**
 * Wordmark (Growth, 2b): the lodge's name as a giant wordmark over the photo,
 * a pill enquiry bar, a room carousel, an about band with oval photos, the
 * amenities worked out from the rooms, a row of photos and a dark closing card
 * with the map. Bricolage Grotesque over Instrument Sans, warm neutrals.
 */
export function WordmarkTemplate({ site }: { site: LiveSite }) {
  const { place, book, online, stats, amenities, mapsLink, stayInfo } = siteBasics(site);
  const tone = bookTone(online);
  const word = (site.name.split(/\s+/)[0] ?? site.name).toUpperCase();
  const wordSize = `min(${(88 / (Math.max(3, word.length) * 0.7)).toFixed(1)}vw, 220px)`;
  const ovals = [site.gallery[0] ?? site.rooms[0]?.photos[0], site.gallery[1] ?? site.rooms[1]?.photos[0]];
  const badge = `${[...amenities.slice(0, 2).map((entry) => AMENITIES[entry.key]?.label), site.town].filter(Boolean).join(" · ")} · `;
  const nav = [
    { href: "#top", label: "Home" },
    { href: "#rooms", label: "Rooms" },
    site.description ? { href: "#about", label: "About" } : null,
    site.gallery.length > 0 ? { href: "#gallery", label: "Gallery" } : null,
    { href: "#location", label: "Find us" },
  ].filter((link) => link !== null);

  return (
    <div
      style={
        {
          "--theme": site.themeColor,
          "--deep": "color-mix(in oklab, var(--theme) 40%, #1C140E)",
        } as CSSProperties
      }
      className={cn(bricolageGrotesque.variable, "min-h-svh bg-[#EEE7DC] font-sans pb-24 text-[#231C16] lg:pb-0")}
    >
      {/* Hero card */}
      <section id="top" className="p-2 sm:p-5">
        <div className="relative flex min-h-[620px] flex-col overflow-hidden rounded-[28px] bg-[var(--deep)] text-white sm:min-h-[700px] sm:rounded-[36px]">
          <HeroPhoto site={site} className="opacity-60" />
          <div className="absolute inset-0 bg-[linear-gradient(180deg,color-mix(in_oklab,var(--deep)_55%,transparent)_0%,color-mix(in_oklab,var(--deep)_35%,transparent)_45%,var(--deep)_100%)]" />

          <header className="relative z-10 flex items-center justify-between gap-3 px-4 pt-4 sm:px-8 sm:pt-6">
            <a href="#top" className={cn(DISPLAY, "truncate text-[20px] font-bold tracking-[-0.02em] sm:text-[23px]")}>
              {site.name}
            </a>
            <nav className="hidden items-center gap-1 rounded-full border border-white/30 p-1 lg:flex" aria-label="Sections">
              {nav.map((link, index) => (
                <a
                  key={link.href}
                  href={link.href}
                  className={cn("rounded-full px-4 py-2 text-[14.5px] font-semibold", index === 0 ? "bg-white text-[#231C16]" : "text-white/90 hover:bg-white/10")}
                >
                  {link.label}
                </a>
              ))}
            </nav>
            {book ? (
              <BookLink href={book} className={cn("hidden h-11 shrink-0 items-center gap-2 rounded-full px-5 text-[15px] font-semibold sm:inline-flex", tone)}>
                <BookLabel online={online} size={17} />
              </BookLink>
            ) : null}
          </header>

          <div className="relative z-10 flex flex-1 flex-col items-center justify-center gap-5 px-4 py-10 text-center">
            <Reveal className="w-full overflow-hidden">
              <span
                aria-hidden="true"
                className={cn(DISPLAY, "block bg-[linear-gradient(180deg,#fff_30%,rgba(255,255,255,0.12))] bg-clip-text leading-[0.85] font-extrabold tracking-[-0.04em] whitespace-nowrap text-transparent")}
                style={{ fontSize: wordSize }}
              >
                {word}
              </span>
            </Reveal>
            <Reveal delay={0.1} className="flex max-w-2xl flex-col items-center gap-3">
              <h1 className={cn(DISPLAY, "text-[30px] leading-9 font-semibold tracking-[-0.025em] text-balance sm:text-[42px] sm:leading-[48px]")}>
                <Emphasis text={site.hero.headline} em="italic font-medium" />
              </h1>
              <p className="max-w-xl text-[16px] leading-7 text-white/85">{site.hero.subline}</p>
            </Reveal>
            {site.rooms.length > 0 && site.whatsapp ? (
              <Reveal delay={0.2} className="mt-4 w-full max-w-[820px] text-left text-[#231C16]">
                <EnquiryBar
                  online={online}
                  lodge={site.name}
                  rooms={site.rooms}
                  whatsapp={site.whatsapp}
                  look={{
                    layout: "inline",
                    className: "rounded-[26px] bg-white p-2 shadow-[0_24px_60px_-28px_rgba(0,0,0,0.6)] lg:gap-0 lg:rounded-full",
                    divider: "lg:rounded-none lg:border-r lg:border-black/10",
                    field: "border-0 bg-[#F5F0E8] lg:bg-transparent",
                    button: "h-14",
                    hint: null,
                  }}
                />
              </Reveal>
            ) : null}
          </div>
        </div>
      </section>

      <main>
        {/* Rooms */}
        <section id="rooms" className="mx-auto max-w-[1180px] scroll-mt-4 px-4 py-20 sm:px-8 sm:py-24">
          <div className="mb-10 flex flex-col items-center gap-5 text-center">
            <span className="size-7 rounded-full bg-[var(--theme)]" aria-hidden="true" />
            <Heading>Rooms at {site.name}</Heading>
            {stats ? <p className="text-[16px] text-[#6E6459]">Prices per room, per night, from {formatPrice(stats.from)}.</p> : null}
          </div>
          {site.rooms.length === 0 ? (
            <p className="text-center text-[#6E6459]">{roomsEmpty(site)}</p>
          ) : (
            <Carousel
              label="Rooms"
              controls="bottom"
              counterNoun={site.rooms.length === 1 ? "room" : "rooms"}
              progress
              itemClassName="w-[86%] sm:w-[calc(50%-12px)] lg:w-[calc(33.333%-16px)]"
              buttonClassName="border-[#231C16]/20 bg-transparent"
              activeButtonClassName="border border-[#231C16] bg-transparent text-[#231C16]"
            >
              {site.rooms.map((room) => {
                const roomBook = bookingUrl(site, room.name);
                return (
                  <article key={room.id} className="flex h-full flex-col gap-4 rounded-[26px] bg-white p-2 pb-5">
                    <div className="relative">
                      <RoomPhotos photos={room.photos} name={room.name} theme={site.themeColor} className="aspect-[5/4] rounded-[20px]" />
                      <span className="pointer-events-none absolute top-3 right-3 rounded-full bg-white px-3 py-1.5 text-[17px] font-bold shadow-sm">
                        {formatPrice(room.price)}
                        <span className="text-[12px] font-normal text-[#6E6459]"> /night</span>
                      </span>
                    </div>
                    <div className="flex flex-1 flex-col gap-3 px-3">
                      <h3 className={cn(DISPLAY, "text-[23px] leading-7 font-bold tracking-[-0.02em]")}>{room.name}</h3>
                      <ul className="flex flex-wrap gap-x-5 gap-y-1.5 text-[14px] text-[#6E6459]">
                        <li className="inline-flex items-center gap-1.5">
                          <Users className="size-4" aria-hidden="true" />
                          Sleeps {room.sleeps}
                        </li>
                        {room.amenities.slice(0, 2).map((key) => (
                          <li key={key} className="inline-flex items-center gap-1.5">
                            <AmenityIcon amenity={key} className="size-4" />
                            {AMENITIES[key]?.label}
                          </li>
                        ))}
                      </ul>
                      {room.description ? <ClampedText text={room.description} className="text-[14.5px] leading-6 text-[#6E6459]" /> : null}
                      {roomBook ? (
                        <BookLink roomId={room.id} href={roomBook} className={cn("mt-auto inline-flex h-11 w-fit items-center gap-2 rounded-full px-5 text-[15px] font-semibold", tone)}>
                          <BookLabel online={online} size={17} />
                        </BookLink>
                      ) : null}
                    </div>
                  </article>
                );
              })}
            </Carousel>
          )}
        </section>

        {/* About, with oval photos */}
        {site.description ? (
          <section id="about" className="scroll-mt-4 bg-[#E5DCCD] px-4 py-20 sm:px-8 sm:py-24">
            <div className="mx-auto grid max-w-[1180px] items-center gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
              <Reveal className="flex flex-col items-start gap-7">
                <span className="inline-flex items-center gap-2 rounded-full bg-white px-3.5 py-1.5 text-[13.5px] font-semibold">
                  <span className="size-2 rounded-full bg-[var(--theme)]" aria-hidden="true" />
                  About the lodge
                </span>
                <p className={cn(DISPLAY, "text-[28px] leading-[36px] font-medium tracking-[-0.02em] sm:text-[36px] sm:leading-[44px]")}>
                  {highlightWords(site.description, [site.name, ...amenities.slice(0, 3).map((entry) => AMENITIES[entry.key]?.label ?? "")]).map((part, index) => (
                    <span key={index} className={part.em ? "font-bold text-[#231C16]" : "text-[#6E6459]"}>
                      {part.text}
                    </span>
                  ))}
                </p>
                <a href="#rooms" className="inline-flex h-12 items-center rounded-full border border-[#231C16] px-6 text-[15px] font-semibold hover:bg-[#231C16] hover:text-white">
                  See all rooms
                </a>
              </Reveal>
              <div className="relative mx-auto flex h-[400px] w-full max-w-[500px] gap-4 sm:h-[470px]" aria-hidden="true">
                <Photo photo={ovals[0]} alt="" sizes="240px" className="h-[86%] w-1/2 rounded-full" />
                <Photo photo={ovals[1]} alt="" sizes="240px" className="mt-auto h-[86%] w-1/2 rounded-full" />
                {badge.length > 4 ? (
                  <span className="absolute top-[58%] left-[42%] -translate-x-1/2">
                    <CircleText text={badge} />
                  </span>
                ) : null}
              </div>
            </div>
          </section>
        ) : null}

        <div className="mx-auto flex max-w-[1180px] flex-col gap-20 px-4 py-20 sm:gap-24 sm:px-8 sm:py-24">
          {/* In your room: amenities worked out from the rooms */}
          {amenities.length > 0 ? (
            <section>
              <Heading className="mb-8">In your room</Heading>
              <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {amenities.slice(0, 6).map((entry, index) => (
                  <li key={entry.key}>
                    <Reveal delay={index * 0.05} className="flex h-full flex-col gap-4 rounded-[22px] bg-white p-6">
                      <span className="flex size-12 items-center justify-center rounded-full bg-[#F3ECE1] text-[var(--theme)]">
                        <AmenityIcon amenity={entry.key} className="size-5" />
                      </span>
                      <span className="flex flex-col gap-0.5">
                        <span className={cn(DISPLAY, "text-[20px] font-bold tracking-[-0.01em]")}>{AMENITIES[entry.key]?.label}</span>
                        <span className="text-[14px] text-[#6E6459]">{entry.where}</span>
                      </span>
                    </Reveal>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {/* Gallery */}
          {site.gallery.length > 0 ? (
            <section id="gallery" className="scroll-mt-4">
              <Reveal>
                <SiteGallery photos={site.gallery} name={site.name} layout="row" rounded="rounded-[22px]" limit={4} />
              </Reveal>
            </section>
          ) : null}

          {stayInfo ? (
            <section id="good-to-know" className="scroll-mt-4">
              <Heading className="mb-8">Good to know</Heading>
              <StayDetails site={site} radius="rounded-[22px]" heading={DISPLAY} />
            </section>
          ) : null}

          {site.faq.length > 0 ? (
            <section id="questions" className="scroll-mt-4">
              <Heading className="mb-8">Questions</Heading>
              <Questions site={site} radius="rounded-[20px]" />
            </section>
          ) : null}
        </div>
      </main>

      {/* Closing card: book, find us, footer */}
      <footer id="location" className="scroll-mt-4 p-2 sm:p-5">
        <div className="rounded-[28px] bg-[var(--deep)] px-6 py-10 text-white sm:rounded-[36px] sm:px-14 sm:py-16">
          <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:items-center">
            <div id="contact" className="flex flex-col gap-5">
              <h2 className={cn(DISPLAY, "text-[40px] leading-[44px] font-bold tracking-[-0.04em] sm:text-[58px] sm:leading-[62px]")}>
                Stay in {site.town ?? place ?? "Zimbabwe"}
              </h2>
              <p className="text-[16px] text-white/80">
                {online ? "Pick your dates and book in a minute, or message us on WhatsApp." : "Message us on WhatsApp with your dates. We reply the same day."}
              </p>
              <div className="flex flex-wrap gap-3">
                {book ? (
                  <BookLink href={book} className={cn("inline-flex h-12 items-center gap-2 rounded-full px-5 text-[15px] font-semibold", tone)}>
                    <BookLabel online={online} />
                  </BookLink>
                ) : null}
                {mapsLink ? (
                  <a href={mapsLink} target="_blank" rel="noreferrer" className="inline-flex h-12 items-center rounded-full border border-white/30 px-5 text-[15px] font-semibold hover:bg-white/10">
                    Open in Google Maps
                  </a>
                ) : null}
              </div>
              <SocialLinks site={site} button="border border-white/25 text-white hover:bg-white/10" />
            </div>
            <MapView site={site} dark pin="bg-[var(--theme)]" className="min-h-[280px] rounded-[22px] sm:min-h-[320px]" />
          </div>
          <div className="mt-12 flex flex-col gap-3 border-t border-white/15 pt-6 text-[13.5px] text-white/65 sm:flex-row sm:justify-between">
            <span>
              © {new Date().getFullYear()} {site.name}
              {place ? ` · ${place}` : ""}
              {site.whatsapp ? ` · ${formatPhone(site.whatsapp)}` : ""}
            </span>
            <MadeWith strong="text-white" />
          </div>
        </div>
      </footer>

      <MobileBookBar site={site} className="bg-[#EEE7DC]/90" />
      <WhatsAppFab site={site} raised={online} />
    </div>
  );
}
