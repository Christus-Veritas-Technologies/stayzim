import { cn } from "@stayzim/ui/lib/utils";
import { ArrowRight } from "lucide-react";
import type { CSSProperties, ReactNode } from "react";

import { Reveal } from "@/components/motion";
import { Carousel } from "@/components/site/carousel";
import { EnquiryBar } from "@/components/site/enquiry-bar";
import { SampleBadge } from "@/components/site/sample-badge";
import { SiteGallery } from "@/components/site/gallery";
import {
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
  SocialLinks,
  StayDetails,
  WhatsAppFab,
} from "@/components/site/parts";
import { gloock } from "@/components/site/template-fonts";
import { BookLink } from "@/components/site/tracking";
import { AMENITIES, formatPhone, formatPrice } from "@/lib/lodge";
import { bookingUrl, type LiveSite } from "@/lib/site";
import { roomsEmpty } from "@/lib/site-content";

const DISPLAY = "font-[family-name:var(--font-gloock)] font-normal";

function Heading({ children, className }: { children: ReactNode; className?: string }) {
  return <h2 className={cn(DISPLAY, "text-[38px] leading-[42px] tracking-[-0.02em] sm:text-[56px] sm:leading-[60px]", className)}>{children}</h2>;
}

/** A pill with a round end in the lodge's colour. */
function SeeRooms({ dark = false, className }: { dark?: boolean; className?: string }) {
  return (
    <a
      href="#rooms"
      className={cn(
        "group inline-flex h-12 w-fit items-center gap-3 rounded-full py-1 pr-1 pl-5 text-[15px] font-semibold",
        dark ? "border border-[#22190F] text-[#22190F]" : "bg-white text-[#22190F]",
        className,
      )}
    >
      See rooms
      <span className={cn("flex size-9 items-center justify-center rounded-full text-white transition-transform group-hover:translate-x-0.5 motion-reduce:transform-none", dark ? "bg-[#22190F]" : "bg-[var(--theme)]")}>
        <ArrowRight className="size-4" aria-hidden="true" />
      </span>
    </a>
  );
}

/**
 * Overlap (Growth, 2c): glass navigation and a floating room card over the
 * photo, the enquiry bar overlapping its foot, an about section with tall
 * staggered photos, a room carousel on the lodge's colour, captioned photos
 * and a dark footer. Gloock headings over Instrument Sans.
 */
export function OverlapTemplate({ site }: { site: LiveSite }) {
  const { place, book, online, stats, amenities, mapsLink, stayInfo } = siteBasics(site);
  const tone = bookTone(online);
  const featured = site.rooms[0];
  const panels = [site.gallery[0], site.gallery[1] ?? site.rooms[0]?.photos[0], site.gallery[2] ?? site.rooms[1]?.photos[0]];
  const nav = [
    { href: "#top", label: "Home" },
    { href: "#rooms", label: "Rooms" },
    site.gallery.length > 0 ? { href: "#gallery", label: "Gallery" } : null,
    { href: "#location", label: "Find us" },
  ].filter((link) => link !== null);

  return (
    <div
      style={{ "--theme": site.themeColor, "--deep": "color-mix(in oklab, var(--theme) 35%, #1E160E)" } as CSSProperties}
      className={cn(gloock.variable, "min-h-svh bg-[#FAF7F2] font-sans pb-24 text-[#22190F] lg:pb-0")}
    >
      {/* Hero */}
      <section id="top" className="px-2 pt-2 sm:px-5 sm:pt-5">
        <div className="relative flex min-h-[640px] flex-col overflow-hidden rounded-[28px] bg-[var(--deep)] text-white sm:min-h-[700px] sm:rounded-[32px]">
          <HeroPhoto site={site} />
          <div className="absolute inset-0 bg-[linear-gradient(100deg,color-mix(in_oklab,var(--deep)_88%,transparent)_0%,color-mix(in_oklab,var(--deep)_45%,transparent)_55%,color-mix(in_oklab,var(--deep)_20%,transparent)_100%)]" />
          <div className="pointer-events-none absolute inset-0 hidden lg:block" aria-hidden="true">
            <span className="absolute inset-y-0 left-1/3 w-px bg-white/10" />
            <span className="absolute inset-y-0 left-2/3 w-px bg-white/10" />
          </div>

          <header className="relative z-10 m-3 flex items-center justify-between gap-3 rounded-[18px] border border-white/20 bg-white/10 p-2 pl-3 backdrop-blur-md sm:m-5 sm:pl-4">
            <a href="#top" className="flex min-w-0 items-center gap-3">
              {site.logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element -- already resized on upload
                <img src={site.logoUrl} alt="" className="size-9 shrink-0 rounded-full object-cover" />
              ) : (
                <span className="size-9 shrink-0 rounded-full bg-[color-mix(in_oklab,var(--theme)_35%,#F1D9B0)]" aria-hidden="true" />
              )}
              <span className="truncate text-[17px] font-semibold">{site.name}</span>
            </a>
            <nav className="hidden items-center gap-8 text-[15px] lg:flex" aria-label="Sections">
              {nav.map((link, index) => (
                <a key={link.href} href={link.href} className={index === 0 ? "font-semibold" : "text-white/80 hover:text-white"}>
                  {link.label}
                </a>
              ))}
            </nav>
            {book ? (
              <BookLink href={book} className={cn("inline-flex h-11 shrink-0 items-center gap-2 rounded-full px-4 text-[15px] font-semibold sm:px-5", tone)}>
                <span className="contents sm:hidden">
                  <BookLabel online={online} size={17} short />
                </span>
                <span className="hidden sm:contents">
                  <BookLabel online={online} size={17} />
                </span>
              </BookLink>
            ) : null}
          </header>

          <div className="relative z-10 mx-auto grid w-full max-w-[1180px] flex-1 items-center gap-10 px-5 pt-8 pb-28 sm:px-10 lg:grid-cols-[minmax(0,1fr)_300px]">
            <Reveal className="flex max-w-xl flex-col gap-6">
              <h1 className={cn(DISPLAY, "text-[52px] leading-[54px] tracking-[-0.03em] text-balance sm:text-[84px] sm:leading-[84px]")}>
                <Emphasis text={site.hero.headline} em="italic" />
              </h1>
              <p className="max-w-md text-[16px] leading-7 text-white/85 sm:text-[17px]">{site.hero.subline}</p>
              <SeeRooms />
            </Reveal>
            {featured ? (
              <Reveal delay={0.2} className="hidden rounded-[22px] border border-white/20 bg-white/10 p-2.5 pb-4 backdrop-blur-md lg:block">
                <div className="relative">
                  <Photo photo={featured.photos[0]} alt={featured.name} sizes="280px" className="aspect-[5/4] w-full rounded-[16px]" />
                  {featured.sample ? <SampleBadge className="absolute top-2.5 left-2.5" /> : null}
                </div>
                <div className="flex flex-col gap-0.5 px-2 pt-3">
                  <span className="text-[16px] font-semibold">{featured.name}</span>
                  <span className="text-[13.5px] text-white/75">
                    Sleeps {featured.sleeps} · from {formatPrice(featured.price)} a night
                  </span>
                </div>
              </Reveal>
            ) : null}
          </div>
        </div>
      </section>

      {/* Enquiry bar over the hero's edge */}
      {site.rooms.length > 0 && site.whatsapp ? (
        <div className="relative z-10 mx-auto -mt-20 max-w-[1130px] px-4 sm:px-10">
          <Reveal className="rounded-[22px] bg-white p-3 shadow-[0_24px_50px_-26px_rgba(34,25,15,0.4)] sm:p-4">
            <EnquiryBar
              online={online}
              lodge={site.name}
              rooms={site.rooms}
              whatsapp={site.whatsapp}
              look={{ layout: "inline", divider: "lg:rounded-none lg:border-r lg:border-black/10", field: "border-0 bg-[#F6F1EA] lg:bg-transparent", button: "h-14", hint: null }}
            />
          </Reveal>
        </div>
      ) : null}

      <main>
        {/* About, with tall staggered photos */}
        <section id="about" className="mx-auto grid max-w-[1180px] gap-10 px-4 py-20 sm:px-8 sm:py-24 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1fr)_minmax(0,1.1fr)] lg:gap-12">
          <Heading>About {site.name}</Heading>
          <Reveal className="flex flex-col gap-7">
            <p className="text-[18px] leading-8 text-[#4A4036] sm:text-[19px]">
              <strong className="font-semibold text-[var(--theme)]">Welcome to {site.name}.</strong> {site.description || site.hero.subline}
            </p>
            <SeeRooms dark />
          </Reveal>
          <div className="grid h-[320px] grid-cols-3 gap-3 sm:h-[360px]" aria-hidden="true">
            {panels.map((photo, index) => (
              <Photo key={index} photo={photo} alt="" sizes="160px" className={cn("w-full rounded-[16px]", index === 1 ? "mt-10 h-[calc(100%-40px)]" : "h-full")} />
            ))}
          </div>
        </section>

        {/* Rooms on the lodge's colour */}
        <section id="rooms" className="scroll-mt-4 bg-[var(--theme)] py-20 text-white sm:py-24">
          <div className="mx-auto max-w-[1180px] px-4 sm:px-8">
            <div className="mb-10 flex flex-col items-center gap-3 text-center">
              <Heading>Choose your room</Heading>
              <p className="text-[16px] text-white/80">
                {amenities.find((entry) => entry.key === "breakfast" && entry.count === site.rooms.length) ? "Breakfast included in every room. " : ""}
                Prices per night.
              </p>
            </div>
            {site.rooms.length === 0 ? (
              <p className="text-center text-white/80">{roomsEmpty(site)}</p>
            ) : (
              <Carousel
                label="Rooms"
                controls="bottom"
                itemClassName="w-[88%] sm:w-[62%] lg:w-[46%]"
                buttonClassName="border-white/30 bg-transparent text-white"
                activeButtonClassName="bg-white text-[#22190F]"
                className="text-white"
              >
                {site.rooms.map((room) => {
                  const roomBook = bookingUrl(site, room.name);
                  return (
                    <article key={room.id} className="relative flex aspect-[4/5] flex-col justify-end overflow-hidden rounded-[22px] sm:aspect-[7/5]">
                      <Photo photo={room.photos[0]} alt={room.name} sizes="(min-width: 1024px) 540px, 88vw" className="absolute inset-0 size-full" />
                      <div className="absolute inset-0 bg-[linear-gradient(180deg,transparent_35%,rgba(20,14,8,0.85))]" />
                      <span className="absolute top-4 left-4 rounded-full bg-[#22190F] px-3 py-1.5 text-[13.5px] font-semibold">From {formatPrice(room.price)} / night</span>
                      {room.sample ? <SampleBadge className="absolute top-4 right-4" /> : null}
                      <div className="relative flex items-end justify-between gap-4 p-5 sm:p-6">
                        <div className="flex min-w-0 flex-col gap-1">
                          <h3 className={cn(DISPLAY, "text-[28px] leading-8 sm:text-[34px] sm:leading-10")}>{room.name}</h3>
                          <p className="text-[14px] text-white/85">{[`Sleeps ${room.sleeps}`, room.beds, amenityLine(room.amenities, 3)].filter(Boolean).join(" · ")}</p>
                          {room.description ? <p className="mt-1 line-clamp-2 text-[14px] leading-6 text-white/75">{room.description}</p> : null}
                        </div>
                        {roomBook ? (
                          <BookLink roomId={room.id} href={roomBook} className={cn("inline-flex h-11 shrink-0 items-center gap-2 rounded-full px-4 text-[15px] font-semibold", online ? "bg-white text-[#22190F]" : tone)}>
                            <BookLabel online={online} size={16} short />
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
          {/* Around the house */}
          {site.gallery.length > 0 ? (
            <section id="gallery" className="scroll-mt-4">
              <div className="mb-8 flex flex-wrap items-end justify-between gap-3">
                <Heading>Around the house</Heading>
                {amenities.length > 0 ? (
                  <span className="text-[15px] text-[#6B5F52]">
                    {amenities
                      .slice(0, 3)
                      .map((entry) => AMENITIES[entry.key]?.label)
                      .join(", ")}
                  </span>
                ) : null}
              </div>
              <Reveal>
                <SiteGallery
                  photos={site.gallery}
                  name={site.name}
                  layout="captioned"
                  rounded="rounded-[22px]"
                  limit={4}
                  captionClassName={cn(DISPLAY, "px-5 pt-16 pb-5 text-[22px] leading-7 sm:text-[26px] sm:leading-8")}
                />
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

          {/* Find us */}
          <section id="location" className="grid scroll-mt-4 gap-3 lg:grid-cols-[minmax(0,0.78fr)_minmax(0,1fr)]">
            <div id="contact" className="flex flex-col gap-5 rounded-[22px] bg-[#F2EBE2] p-7 sm:p-11">
              <Heading>Find us</Heading>
              {place ? <p className="text-[16px] text-[#6B5F52]">{place}</p> : null}
              <FindUsLinks site={site} />
              <MessageUs site={site} className="mt-auto w-fit rounded-full" />
              <SocialLinks site={site} button="bg-white hover:bg-white/70" />
            </div>
            <MapView site={site} className="min-h-[320px] rounded-[22px] sm:min-h-[420px]" />
          </section>
        </div>
      </main>

      <footer className="bg-[var(--deep)] text-white/70">
        <div className="mx-auto max-w-[1180px] px-4 pt-14 pb-8 sm:px-8">
          <div className="grid gap-10 sm:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)_minmax(0,1fr)]">
            <div className="flex flex-col gap-2">
              <span className={cn(DISPLAY, "text-[34px] leading-10 text-white")}>{site.name}</span>
              {place ? <span className="text-[15px]">{place}</span> : null}
            </div>
            <nav className="flex flex-col gap-2.5 text-[15px]" aria-label="Footer">
              <span className="font-semibold text-white">Visit</span>
              {nav.slice(1).map((link) => (
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
              {mapsLink ? (
                <a href={mapsLink} target="_blank" rel="noreferrer" className="hover:text-white">
                  Open in Google Maps
                </a>
              ) : null}
            </div>
          </div>
          <div className="mt-12 flex flex-col gap-3 border-t border-white/15 pt-6 text-[13.5px] sm:flex-row sm:justify-between">
            <span>
              © {new Date().getFullYear()} {site.name}
              {stats ? ` · ${stats.count} ${stats.count === 1 ? "room" : "rooms"}` : ""}
            </span>
            <MadeWith strong="text-white" />
          </div>
        </div>
      </footer>

      <MobileBookBar site={site} className="bg-[#FAF7F2]/90" />
      <WhatsAppFab site={site} raised={online} />
    </div>
  );
}
