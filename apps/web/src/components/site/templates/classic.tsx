import { Avatar } from "@stayzim/ui/components/avatar";
import { ArrowUpRight, BedDouble, CalendarDays, Check, ChevronDown, LogIn, LogOut, Mail, MapPin, Phone, Users } from "lucide-react";
import type { CSSProperties, ReactNode } from "react";

import { WhatsAppIcon } from "@/components/landing/brand";
import { Reveal } from "@/components/motion";
import { ClampedText } from "@/components/site/clamped-text";
import { RoomPhotos, SiteGallery } from "@/components/site/gallery";
import { SocialIcon } from "@/components/site/social-icons";
import { BookLink } from "@/components/site/tracking";
import { AMENITIES, AMENITIES_ON_CARD, formatPhone, formatPrice, lodgePlace } from "@/lib/lodge";
import { bookingUrl, type LiveSite } from "@/lib/site";
import { hasStayInfo, roomFacts } from "@/lib/site-content";
import { MAIN_URL } from "@/lib/site-host";

const whatsappButton =
  "inline-flex h-12 items-center justify-center gap-2 rounded-full bg-[#25D366] px-6 text-[15px] font-semibold text-[#0C181F] shadow-[0_8px_20px_-8px_rgba(37,211,102,0.7)] transition-transform hover:scale-[1.02] active:scale-[0.98] motion-reduce:transform-none";

/** Book now: the lodge's own colour, where guests book on the site (Growth and Pro). */
const bookButton =
  "inline-flex h-12 items-center justify-center gap-2 rounded-full bg-[var(--theme)] px-6 text-[15px] font-semibold text-white shadow-[0_10px_24px_-12px_var(--theme)] transition-transform hover:scale-[1.02] active:scale-[0.98] motion-reduce:transform-none";

/** What a Book button says: Book now (on the site), or Book on WhatsApp. */
function BookLabel({ online, size = 18 }: { online: boolean; size?: number }) {
  return online ? (
    <>
      <CalendarDays style={{ width: size, height: size }} />
      Book now
    </>
  ) : (
    <>
      <WhatsAppIcon size={size} />
      Book on WhatsApp
    </>
  );
}

function SectionTitle({ eyebrow, children }: { eyebrow: string; children: string }) {
  return (
    <div className="mb-5 flex flex-col gap-1">
      <span className="text-xs font-bold tracking-[0.12em] text-[var(--theme)] uppercase">{eyebrow}</span>
      <h2 className="font-serif text-[28px] leading-9 font-semibold text-[#0C181F] sm:text-[34px] sm:leading-10">{children}</h2>
    </div>
  );
}

function StayTime({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1 rounded-3xl bg-white p-5 shadow-[0_0_0_1px_rgba(12,24,31,0.06)]">
      <span className="inline-flex items-center gap-1.5 text-sm text-[#6C767D]">
        <span className="text-[var(--theme)]">{icon}</span>
        {label}
      </span>
      <span className="font-serif text-xl font-semibold whitespace-nowrap sm:text-2xl">{value}</span>
    </div>
  );
}

/**
 * Classic (Growth): full-width hero, room cards with photos, gallery, map and
 * contact. The lodge leads (its photos, name and colour); StayZim is only the
 * footer link. Server-rendered and light, for guests on slow or expensive data.
 */
export function ClassicTemplate({ site }: { site: LiveSite }) {
  const place = lodgePlace(site);
  const book = bookingUrl(site);
  // Growth and Pro: guests book on the site first; WhatsApp is the second way
  const online = site.booking.mode === "request";
  const primary = online ? bookButton : whatsappButton;
  const cheapest = site.rooms.length > 0 ? Math.min(...site.rooms.map((room) => room.price)) : null;
  const mostGuests = site.rooms.length > 0 ? Math.max(...site.rooms.map((room) => room.sleeps)) : null;
  const located = site.latitude !== null && site.longitude !== null;
  const mapsLink = located ? `https://www.google.com/maps?q=${site.latitude},${site.longitude}` : site.mapsUrl;
  const stayInfo = hasStayInfo(site);

  return (
    <div style={{ "--theme": site.themeColor } as CSSProperties} className="min-h-svh bg-[#FAF9F6] pb-24 text-[#0C181F] lg:pb-0">
      {/* Top bar */}
      <header className="sticky top-0 z-30 border-b border-black/5 bg-[#FAF9F6]/85 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-3 px-4 sm:px-6">
          <Avatar shape="lodge" name={site.name} src={site.logoUrl} color={site.themeColor} />
          <span className="min-w-0 flex-1 truncate font-serif text-lg font-semibold">{site.name}</span>
          <nav className="hidden items-center gap-6 text-sm font-medium text-[#4F5A60] md:flex">
            <a href="#rooms" className="hover:text-[var(--theme)]">
              Rooms
            </a>
            {site.gallery.length > 0 ? (
              <a href="#gallery" className="hover:text-[var(--theme)]">
                Gallery
              </a>
            ) : null}
            {stayInfo || site.faq.length > 0 ? (
              <a href={stayInfo ? "#good-to-know" : "#questions"} className="hover:text-[var(--theme)]">
                Info
              </a>
            ) : null}
            {mapsLink ? (
              <a href="#location" className="hover:text-[var(--theme)]">
                Location
              </a>
            ) : null}
            <a href="#contact" className="hover:text-[var(--theme)]">
              Contact
            </a>
          </nav>
          {book ? (
            <BookLink href={book} className={`${primary} hidden h-10 px-4 text-sm lg:inline-flex`}>
              <BookLabel online={online} size={16} />
            </BookLink>
          ) : null}
        </div>
      </header>

      {/* Hero */}
      <section className="relative">
        <div className="relative h-[68svh] max-h-[620px] min-h-[420px] overflow-hidden bg-[linear-gradient(180deg,#C9D9D2_0%,#7C978B_60%,#3E5A4E_100%)]">
          {site.heroUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- already resized on upload
            <img
              src={site.heroUrl}
              srcSet={site.heroSrcSet ?? undefined}
              sizes="100vw"
              alt=""
              fetchPriority="high"
              decoding="async"
              className="absolute inset-0 size-full object-cover"
            />
          ) : null}
          <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(12,24,31,0.05)_35%,rgba(12,24,31,0.7))]" />
          <div className="absolute inset-x-0 bottom-0">
            <Reveal className="mx-auto flex max-w-6xl flex-col gap-4 px-4 pb-10 text-white sm:px-6 sm:pb-14">
              {place ? (
                <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-sm font-medium backdrop-blur">
                  <MapPin className="size-4" />
                  {place}
                </span>
              ) : null}
              <h1 className="max-w-3xl font-serif text-[40px] leading-[46px] font-semibold text-balance sm:text-[56px] sm:leading-[62px]">
                {site.hero.headline}
              </h1>
              <p className="max-w-xl text-[17px] leading-7 text-white/90">{site.hero.subline}</p>
              <div className="flex flex-wrap gap-3">
                {book ? (
                  <BookLink href={book} className={primary}>
                    <BookLabel online={online} />
                  </BookLink>
                ) : null}
                <a
                  href="#rooms"
                  className="inline-flex h-12 items-center justify-center rounded-full border border-white/50 px-6 text-[15px] font-semibold text-white backdrop-blur transition-colors hover:bg-white/10"
                >
                  See rooms
                </a>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      <main className="mx-auto flex max-w-6xl flex-col gap-16 px-4 py-12 sm:gap-20 sm:px-6 sm:py-16">
        {/* Intro */}
        {site.description || cheapest !== null ? (
          <Reveal className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            {site.description ? (
              <p className="max-w-2xl font-serif text-[22px] leading-8 text-[#253037] sm:text-[26px] sm:leading-9">{site.description}</p>
            ) : (
              <span />
            )}
            <ul className="flex flex-wrap gap-2 text-sm">
              <li className="inline-flex items-center gap-1.5 rounded-full border border-black/10 bg-white px-3.5 py-2">
                <BedDouble className="size-4 text-[var(--theme)]" />
                {site.rooms.length} {site.rooms.length === 1 ? "room" : "rooms"}
              </li>
              {mostGuests ? (
                <li className="inline-flex items-center gap-1.5 rounded-full border border-black/10 bg-white px-3.5 py-2">
                  <Users className="size-4 text-[var(--theme)]" />
                  Sleeps up to {mostGuests}
                </li>
              ) : null}
              {cheapest !== null ? (
                <li className="inline-flex items-center gap-1.5 rounded-full border border-black/10 bg-white px-3.5 py-2">
                  From <strong className="font-semibold text-[var(--theme)]">{formatPrice(cheapest)}</strong> a night
                </li>
              ) : null}
            </ul>
          </Reveal>
        ) : null}

        {/* Rooms */}
        <section id="rooms" className="scroll-mt-20">
          <SectionTitle eyebrow="Stay with us">Rooms</SectionTitle>
          {site.rooms.length === 0 ? (
            <p className="text-[#4F5A60]">Rooms are coming soon. Message us on WhatsApp to book.</p>
          ) : (
            <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {site.rooms.map((room, index) => {
                const roomBook = bookingUrl(site, room.name);
                return (
                  <li key={room.id}>
                    <Reveal delay={index * 0.06} className="flex h-full flex-col overflow-hidden rounded-3xl bg-white shadow-[0_0_0_1px_rgba(12,24,31,0.06),0_16px_32px_-20px_rgba(12,24,31,0.25)]">
                      <RoomPhotos photos={room.photos} name={room.name} theme={site.themeColor} />
                      <div className="flex flex-1 flex-col gap-3 p-5">
                        <div className="flex flex-col gap-1">
                          <div className="flex items-start justify-between gap-3">
                            <h3 className="font-serif text-xl leading-7 font-semibold">{room.name}</h3>
                            <span className="shrink-0 rounded-full bg-[var(--theme)] px-3 py-1.5 text-sm font-semibold text-white">
                              {formatPrice(room.price)} <span className="font-normal opacity-80">/ night</span>
                            </span>
                          </div>
                          <p className="flex flex-wrap items-center gap-x-1.5 text-sm text-[#4F5A60]">
                            <Users className="size-3.5 shrink-0" />
                            {roomFacts(room).map((fact, position) => (
                              <span key={fact} className="whitespace-nowrap">
                                {position > 0 ? <span aria-hidden="true" className="mr-1.5 text-[#A3ADB2]">·</span> : null}
                                {fact}
                              </span>
                            ))}
                          </p>
                        </div>
                        {room.amenities.length > 0 ? (
                          <ul className="flex flex-wrap gap-x-3 gap-y-1.5 text-[13px] text-[#4F5A60]">
                            {room.amenities.slice(0, AMENITIES_ON_CARD).map((key) => {
                              const amenity = AMENITIES[key];
                              if (!amenity) return null;
                              const Icon = amenity.icon;
                              return (
                                <li key={key} className="inline-flex items-center gap-1.5">
                                  <Icon className="size-4 text-[var(--theme)]" strokeWidth={1.75} />
                                  {amenity.label}
                                </li>
                              );
                            })}
                          </ul>
                        ) : null}
                        {room.description ? <ClampedText text={room.description} className="text-[14px] leading-6 text-[#4F5A60]" /> : null}
                        {roomBook ? (
                          <BookLink roomId={room.id} href={roomBook} className={`${primary} mt-auto w-full`}>
                            <BookLabel online={online} size={17} />
                          </BookLink>
                        ) : null}
                      </div>
                    </Reveal>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        {/* Gallery */}
        {site.gallery.length > 0 ? (
          <section id="gallery" className="scroll-mt-20">
            <SectionTitle eyebrow="Have a look">Gallery</SectionTitle>
            <Reveal>
              <SiteGallery photos={site.gallery} name={site.name} />
            </Reveal>
          </section>
        ) : null}

        {/* Good to know */}
        {stayInfo ? (
          <section id="good-to-know" className="scroll-mt-20">
            <SectionTitle eyebrow="Before you come">Good to know</SectionTitle>
            <Reveal className="grid gap-4 md:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
              {site.checkInFrom || site.checkOutBy ? (
                <div className="grid grid-cols-2 gap-3 self-start">
                  {site.checkInFrom ? <StayTime icon={<LogIn className="size-4" />} label="Check-in" value={`From ${site.checkInFrom}`} /> : null}
                  {site.checkOutBy ? <StayTime icon={<LogOut className="size-4" />} label="Check-out" value={`By ${site.checkOutBy}`} /> : null}
                </div>
              ) : null}
              {site.houseRules.length > 0 || site.cancellationPolicy ? (
                <div className="flex flex-col gap-4 rounded-3xl bg-white p-5 shadow-[0_0_0_1px_rgba(12,24,31,0.06)] sm:p-6">
                  {site.houseRules.length > 0 ? (
                    <div className="flex flex-col gap-2.5">
                      <h3 className="font-semibold">House rules</h3>
                      <ul className="grid gap-2 text-[15px] text-[#4F5A60] sm:grid-cols-2">
                        {site.houseRules.map((rule) => (
                          <li key={rule} className="flex items-start gap-2">
                            <Check className="mt-1 size-4 shrink-0 text-[var(--theme)]" />
                            {rule}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                  {site.cancellationPolicy ? (
                    <div className="flex flex-col gap-1.5 border-t border-black/5 pt-4 first:border-0 first:pt-0">
                      <h3 className="font-semibold">Cancellations</h3>
                      <p className="text-[15px] leading-6 whitespace-pre-line text-[#4F5A60]">{site.cancellationPolicy}</p>
                    </div>
                  ) : null}
                </div>
              ) : null}
            </Reveal>
          </section>
        ) : null}

        {/* Questions */}
        {site.faq.length > 0 ? (
          <section id="questions" className="scroll-mt-20">
            <SectionTitle eyebrow="Asked often">Questions</SectionTitle>
            <Reveal className="flex flex-col gap-2.5">
              {site.faq.map((entry, index) => (
                // Native details: opens without JavaScript, and screen readers know it
                <details
                  key={entry.q}
                  open={index === 0}
                  className="group rounded-2xl bg-white px-5 py-4 shadow-[0_0_0_1px_rgba(12,24,31,0.06)] open:shadow-[0_0_0_1px_rgba(12,24,31,0.06),0_12px_24px_-18px_rgba(12,24,31,0.3)]"
                >
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-semibold [&::-webkit-details-marker]:hidden">
                    {entry.q}
                    <ChevronDown className="size-5 shrink-0 text-[var(--theme)] transition-transform duration-200 group-open:rotate-180 motion-reduce:transition-none" />
                  </summary>
                  <p className="mt-2 text-[15px] leading-6 whitespace-pre-line text-[#4F5A60]">{entry.a}</p>
                </details>
              ))}
            </Reveal>
          </section>
        ) : null}

        {/* Location */}
        {mapsLink ? (
          <section id="location" className="scroll-mt-20">
            <SectionTitle eyebrow="Find us">Location</SectionTitle>
            <Reveal className="overflow-hidden rounded-3xl bg-white shadow-[0_0_0_1px_rgba(12,24,31,0.06)]">
              {located ? (
                <iframe
                  title={`Map of ${site.name}`}
                  src={`https://maps.google.com/maps?q=${site.latitude},${site.longitude}&z=13&output=embed`}
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  className="h-[320px] w-full border-0"
                />
              ) : null}
              <div className="flex flex-wrap items-center justify-between gap-3 p-5">
                <span className="inline-flex items-center gap-2 font-medium">
                  <MapPin className="size-5 text-[var(--theme)]" />
                  {place ?? site.name}
                </span>
                <a
                  href={mapsLink}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex h-10 items-center gap-1.5 rounded-full border border-black/10 px-4 text-sm font-semibold hover:border-[var(--theme)] hover:text-[var(--theme)]"
                >
                  Open in Google Maps
                  <ArrowUpRight className="size-4" />
                </a>
              </div>
            </Reveal>
          </section>
        ) : null}

        {/* Contact */}
        <section id="contact" className="scroll-mt-20">
          <SectionTitle eyebrow="Book direct">Contact us</SectionTitle>
          <Reveal className="flex flex-col gap-5 rounded-3xl bg-[var(--theme)] p-6 text-white sm:flex-row sm:items-center sm:justify-between sm:p-8">
            <p className="max-w-md font-serif text-2xl leading-8">
              {online ? "Pick your dates and book online, or message us on WhatsApp." : "Message us on WhatsApp with your dates. We reply quickly."}
            </p>
            <div className="flex flex-col gap-2 sm:items-end">
              <div className="flex flex-wrap gap-2 sm:justify-end">
                {book && online ? (
                  <BookLink
                    href={book}
                    className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-white px-6 text-[15px] font-semibold text-[var(--theme)] transition-transform hover:scale-[1.02] active:scale-[0.98] motion-reduce:transform-none"
                  >
                    <CalendarDays className="size-[18px]" />
                    Book now
                  </BookLink>
                ) : null}
                {book ? (
                  <BookLink href={book} channel="whatsapp" className={whatsappButton}>
                    <WhatsAppIcon size={18} />
                    {formatPhone(site.whatsapp)}
                  </BookLink>
                ) : null}
              </div>
              <div className="flex flex-wrap gap-4 text-sm text-white/90">
                {site.phone ? (
                  <a href={`tel:+${site.phone}`} className="inline-flex items-center gap-1.5 hover:underline">
                    <Phone className="size-4" />
                    {formatPhone(site.phone)}
                  </a>
                ) : null}
                {site.email ? (
                  <a href={`mailto:${site.email}`} className="inline-flex items-center gap-1.5 hover:underline">
                    <Mail className="size-4" />
                    {site.email}
                  </a>
                ) : null}
              </div>
              {site.socialLinks.length > 0 ? (
                <div className="flex flex-wrap gap-2 sm:justify-end">
                  {site.socialLinks.map((link) => (
                    <a
                      key={link.key}
                      href={link.url}
                      target="_blank"
                      rel="noreferrer"
                      aria-label={`${site.name} on ${link.label}`}
                      title={link.label}
                      className="flex size-11 items-center justify-center rounded-full bg-white/15 text-white transition-colors hover:bg-white/25"
                    >
                      <SocialIcon network={link.key} />
                    </a>
                  ))}
                </div>
              ) : null}
            </div>
          </Reveal>
        </section>
      </main>

      <footer className="border-t border-black/5">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-2 px-4 py-6 text-sm text-[#6C767D] sm:flex-row sm:px-6">
          <span>
            © {new Date().getFullYear()} {site.name}
          </span>
          <span className="flex items-center gap-4">
            <a href={`${MAIN_URL}/privacy`} className="hover:text-[#0C181F]">
              Privacy
            </a>
            <a href="https://stayzim.co.zw" className="hover:text-[#0C181F]">
              Made with <strong className="font-semibold">StayZim</strong>
            </a>
          </span>
        </div>
      </footer>

      {/* Phones: booking always in reach */}
      {book ? (
        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-black/5 bg-[#FAF9F6]/90 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur lg:hidden">
          {online ? (
            <div className="flex gap-2">
              <BookLink href={book} className={`${bookButton} flex-1`}>
                <BookLabel online />
              </BookLink>
              <BookLink
                href={book}
                channel="whatsapp"
                aria-label="Message us on WhatsApp"
                className="inline-flex size-12 shrink-0 items-center justify-center rounded-full bg-[#25D366] text-[#0C181F]"
              >
                <WhatsAppIcon size={20} />
              </BookLink>
            </div>
          ) : (
            <BookLink href={book} className={`${whatsappButton} w-full`}>
              <BookLabel online={false} />
            </BookLink>
          )}
        </div>
      ) : null}
    </div>
  );
}
