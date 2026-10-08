import { cn } from "@stayzim/ui/lib/utils";
import { ArrowRight } from "lucide-react";
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
import { highlightWords, roomFacts, roomsEmpty, roomsIntro } from "@/lib/site-content";

function Heading({ children, className }: { children: ReactNode; className?: string }) {
  return <h2 className={cn("text-[34px] leading-10 font-bold tracking-[-0.025em] sm:text-[48px] sm:leading-[54px]", className)}>{children}</h2>;
}

/** A pill with a round end, like the design's "See the cabins". */
function RoundEndLink({ href, children, dark = false }: { href: string; children: ReactNode; dark?: boolean }) {
  return (
    <a
      href={href}
      className={cn(
        "group inline-flex h-[52px] w-fit items-center gap-4 rounded-full py-1.5 pr-1.5 pl-6 text-[15.5px] font-semibold",
        dark ? "bg-[#10202A] text-white" : "bg-white text-[#10202A]",
      )}
    >
      {children}
      <span className={cn("flex size-10 items-center justify-center rounded-full transition-transform group-hover:translate-x-0.5 motion-reduce:transform-none", dark ? "bg-white text-[#10202A]" : "bg-[#10202A] text-white")}>
        <ArrowRight className="size-4" aria-hidden="true" />
      </span>
    </a>
  );
}

/**
 * Shoreline (Growth, 2a): pill navigation over a big rounded photo, the
 * enquiry bar along its foot, an intro with the amenities picked out, a room
 * carousel, and a map with the details floating on it. Urbanist, soft motion.
 */
export function ShorelineTemplate({ site }: { site: LiveSite }) {
  const { place, book, online, amenities, stayInfo } = siteBasics(site);
  const tone = bookTone(online);
  const top = amenities.slice(0, 3);
  const nav = [
    { href: "#top", label: "Home" },
    { href: "#rooms", label: "Rooms" },
    site.gallery.length > 0 ? { href: "#gallery", label: "Gallery" } : null,
    { href: "#location", label: "Location" },
  ].filter((link) => link !== null);

  return (
    <div
      style={{ "--theme": site.themeColor, "--deep": "color-mix(in oklab, var(--theme) 70%, #04121A)" } as CSSProperties}
      className={cn(urbanist.className, "min-h-svh bg-white pb-24 text-[#10202A] lg:pb-0")}
    >
      {/* Hero card with the bar inside */}
      <section id="top" className="p-2 sm:p-5">
        <div className="relative flex min-h-[640px] flex-col overflow-hidden rounded-[28px] text-white sm:min-h-[720px] sm:rounded-[36px]">
          <HeroPhoto site={site} />
          <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,0.18)_0%,transparent_30%,color-mix(in_oklab,var(--deep)_88%,transparent)_100%)]" />

          <header className="relative z-10 flex items-center justify-between gap-3 p-3 sm:p-6">
            <a href="#top" className="flex min-w-0 items-center gap-2.5 rounded-full bg-white py-1.5 pr-5 pl-1.5 text-[#10202A] shadow-sm">
              {site.logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element -- already resized on upload
                <img src={site.logoUrl} alt="" className="size-8 shrink-0 rounded-full object-cover" />
              ) : (
                <span className="size-8 shrink-0 rounded-full bg-[var(--theme)]" aria-hidden="true" />
              )}
              <span className="truncate text-[16px] font-semibold sm:text-[17px]">{site.name}</span>
            </a>
            <nav className="hidden items-center gap-2 lg:flex" aria-label="Sections">
              {nav.map((link, index) => (
                <a
                  key={link.href}
                  href={link.href}
                  className={cn(
                    "rounded-full px-4 py-2.5 text-[14.5px] font-medium text-[#10202A] transition-colors",
                    index === 0 ? "bg-white" : "bg-white/75 backdrop-blur hover:bg-white",
                  )}
                >
                  {link.label}
                </a>
              ))}
            </nav>
            {book ? (
              <BookLink href={book} className={cn("hidden h-12 shrink-0 items-center gap-2 rounded-full px-5 text-[15px] font-semibold sm:inline-flex", tone)}>
                <BookLabel online={online} size={17} />
              </BookLink>
            ) : null}
          </header>

          <Reveal className="relative z-10 mx-auto flex max-w-3xl flex-1 flex-col items-center justify-center gap-5 px-5 py-12 text-center">
            <h1 className="text-[42px] leading-[46px] font-bold tracking-[-0.03em] text-balance [text-shadow:0_2px_24px_rgba(0,0,0,0.25)] sm:text-[66px] sm:leading-[70px]">
              <Emphasis text={site.hero.headline} em="font-light" />
            </h1>
            <p className="max-w-xl text-[16px] leading-7 text-white/90 sm:text-[18px]">{site.hero.subline}</p>
            <RoundEndLink href="#rooms">See the rooms</RoundEndLink>
          </Reveal>

          {site.rooms.length > 0 && site.whatsapp ? (
            <div className="relative z-10 px-3 pb-3 sm:px-10 sm:pb-9">
              <Reveal delay={0.15} className="rounded-[24px] bg-white p-3 text-[#10202A] shadow-[0_24px_60px_-30px_rgba(0,0,0,0.6)] sm:rounded-[28px] sm:p-5">
                <EnquiryBar lodge={site.name} rooms={site.rooms} whatsapp={site.whatsapp} online={online} look={{ hint: "text-[#5F6B72]" }} />
              </Reveal>
            </div>
          ) : null}
        </div>
      </section>

      <main>
        {/* Intro with the amenities picked out */}
        {site.description ? (
          <section className="mx-auto grid max-w-[1180px] gap-10 px-4 py-20 sm:px-8 sm:py-28 lg:grid-cols-[150px_minmax(0,1fr)_auto] lg:gap-12">
            <span className="text-[15px] font-medium text-[#5F6B72]">{site.town ?? site.name}</span>
            <Reveal className="flex flex-col gap-8">
              <p className="text-[28px] leading-[38px] font-medium tracking-[-0.015em] sm:text-[40px] sm:leading-[48px]">
                {highlightWords(
                  site.description,
                  amenities.map((entry) => AMENITIES[entry.key]?.label ?? ""),
                ).map((part, index) => (
                  <span key={index} className={part.em ? "text-[#10202A]" : "text-[#A0AAB0]"}>
                    {part.text}
                  </span>
                ))}
              </p>
              <RoundEndLink href="#rooms" dark>
                See the rooms
              </RoundEndLink>
            </Reveal>
            {top.length > 0 ? (
              <ul className="flex gap-3 lg:self-start">
                {top.map((entry, index) => (
                  <li key={entry.key}>
                    <Reveal
                      delay={0.1 + index * 0.08}
                      className="flex h-[150px] w-[104px] flex-col items-center justify-center gap-3 rounded-full border border-black/10 text-center text-[14px] font-medium sm:h-[168px] sm:w-[124px]"
                    >
                      <AmenityIcon amenity={entry.key} className="size-6 text-[var(--theme)]" />
                      {AMENITIES[entry.key]?.label}
                    </Reveal>
                  </li>
                ))}
              </ul>
            ) : null}
          </section>
        ) : null}

        {/* Rooms */}
        <section id="rooms" className="scroll-mt-4 bg-[color-mix(in_oklab,var(--theme)_5%,white)] py-20 sm:py-24">
          <div className="mx-auto max-w-[1180px] px-4 sm:px-8">
            {site.rooms.length === 0 ? (
              <div className="flex flex-col gap-3">
                <Heading>Choose your room</Heading>
                <p className="text-[#5F6B72]">{roomsEmpty(site)}</p>
              </div>
            ) : (
              <Carousel
                label="Rooms"
                itemClassName="w-[86%] sm:w-[calc(50%-12px)] lg:w-[calc(33.333%-16px)]"
                buttonClassName="border-0 shadow-sm"
                activeButtonClassName="bg-[#10202A]"
                header={
                  <div className="flex flex-col gap-2">
                    <Heading>Choose your room</Heading>
                    <p className="text-[16px] text-[#5F6B72]">{roomsIntro(site)}</p>
                  </div>
                }
              >
                {site.rooms.map((room) => {
                  const roomBook = bookingUrl(site, room.name);
                  const facts = roomFacts(room).slice(1);
                  return (
                    <article key={room.id} className="flex h-full flex-col gap-4 rounded-[28px] bg-white p-2.5 pb-5 shadow-[0_18px_40px_-28px_rgba(16,32,42,0.4)]">
                      <div className="relative">
                        <RoomPhotos photos={room.photos} name={room.name} theme={site.themeColor} sample={room.sample} className="aspect-[4/3] rounded-[22px]" />
                        <span className="pointer-events-none absolute top-3 left-3 rounded-full bg-white px-3 py-1.5 text-[15px] shadow-sm">
                          <strong className="font-bold text-[var(--theme)]">{formatPrice(room.price)}</strong> <span className="text-[#5F6B72]">/ night</span>
                        </span>
                      </div>
                      <div className="flex flex-1 flex-col gap-3 px-2.5">
                        <div className="flex items-baseline justify-between gap-3">
                          <h3 className="text-[22px] leading-7 font-semibold tracking-[-0.01em]">{room.name}</h3>
                          <span className="shrink-0 text-[14px] text-[#5F6B72]">Sleeps {room.sleeps}</span>
                        </div>
                        {facts.length > 0 ? <p className="-mt-1.5 text-[14px] text-[#5F6B72]">{facts.join(" · ")}</p> : null}
                        {room.amenities.length > 0 ? (
                          <ul className="flex flex-wrap gap-1.5">
                            {room.amenities.slice(0, 4).map((key) => (
                              <li key={key} className="inline-flex items-center gap-1.5 rounded-full bg-[#F2F5F7] px-3 py-1.5 text-[13px] font-medium">
                                <AmenityIcon amenity={key} className="size-3.5 text-[var(--theme)]" />
                                {AMENITIES[key]?.label}
                              </li>
                            ))}
                          </ul>
                        ) : null}
                        {room.description ? <ClampedText text={room.description} className="text-[14.5px] leading-6 text-[#5F6B72]" /> : null}
                        {roomBook ? (
                          <BookLink roomId={room.id} href={roomBook} className={cn("mt-auto inline-flex h-12 w-full items-center justify-center gap-2 rounded-full text-[15px] font-semibold", tone)}>
                            <BookLabel online={online} size={17} />
                          </BookLink>
                        ) : null}
                      </div>
                    </article>
                  );
                })}
              </Carousel>
            )}
          </div>
        </section>

        <div className="mx-auto flex max-w-[1180px] flex-col gap-20 px-4 py-20 sm:gap-24 sm:px-8 sm:py-24">
          {/* Gallery */}
          {site.gallery.length > 0 ? (
            <section id="gallery" className="scroll-mt-4">
              <Heading className="mb-8">Life at {site.name}</Heading>
              <Reveal>
                <SiteGallery photos={site.gallery} name={site.name} layout="feature" rounded="rounded-[24px]" limit={5} />
              </Reveal>
            </section>
          ) : null}

          {/* Good to know */}
          {stayInfo ? (
            <section id="good-to-know" className="scroll-mt-4">
              <Heading className="mb-8">Good to know</Heading>
              <Reveal>
                <StayDetails site={site} radius="rounded-[24px]" />
              </Reveal>
            </section>
          ) : null}

          {/* Questions */}
          {site.faq.length > 0 ? (
            <section id="questions" className="scroll-mt-4">
              <Heading className="mb-8">Questions</Heading>
              <Reveal>
                <Questions site={site} radius="rounded-[20px]" />
              </Reveal>
            </section>
          ) : null}

          {/* Find us: the details float on the map */}
          <section id="location" className="relative scroll-mt-4">
            <MapView site={site} className="min-h-[340px] rounded-[28px] sm:min-h-[480px]" />
            <Reveal className="relative -mt-16 mx-3 flex flex-col gap-4 rounded-[24px] bg-white p-6 shadow-[0_24px_50px_-24px_rgba(16,32,42,0.35)] sm:absolute sm:top-8 sm:left-8 sm:mx-0 sm:mt-0 sm:w-[360px]">
              <div id="contact" className="flex flex-col gap-1.5">
                <span className="text-[12.5px] font-bold tracking-[0.12em] text-[var(--theme)] uppercase">Find us</span>
                <h2 className="text-[26px] leading-8 font-bold tracking-[-0.015em]">{site.name}</h2>
                {place ? <p className="text-[15px] text-[#5F6B72]">{place}</p> : null}
              </div>
              <FindUsLinks site={site} className="text-[14.5px]" />
              <MessageUs site={site} className="w-full rounded-full" />
              <SocialLinks site={site} button="bg-[#F2F5F7] hover:bg-[#E6ECEF]" />
            </Reveal>
          </section>
        </div>
      </main>

      <footer className="p-2 sm:p-5">
        <div className="rounded-[28px] bg-[var(--theme)] px-6 py-10 text-white sm:rounded-[36px] sm:px-11 sm:py-14">
          <div className="flex flex-col gap-8 sm:flex-row sm:items-end sm:justify-between">
            <div className="flex flex-col gap-2">
              <span className="text-[34px] leading-10 font-bold tracking-[-0.025em] sm:text-[46px] sm:leading-[52px]">{site.name}</span>
              {place ? <span className="text-[16px] text-white/80">{place}</span> : null}
            </div>
            <nav className="flex flex-wrap gap-2" aria-label="Footer">
              {nav.slice(1).map((link) => (
                <a key={link.href} href={link.href} className="rounded-full border border-white/35 px-4 py-2.5 text-[14px] font-medium hover:bg-white/10">
                  {link.label}
                </a>
              ))}
            </nav>
          </div>
          <div className="mt-10 flex flex-col gap-3 border-t border-white/20 pt-6 text-[13.5px] text-white/75 sm:flex-row sm:justify-between">
            <span>
              © {new Date().getFullYear()} {site.name}
            </span>
            <MadeWith strong="text-white" />
          </div>
        </div>
      </footer>

      <MobileBookBar site={site} />
      <WhatsAppFab site={site} raised={online} />
    </div>
  );
}
