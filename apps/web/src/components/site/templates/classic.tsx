import { Avatar } from "@stayzim/ui/components/avatar";
import { ArrowUpRight, BedDouble, Mail, MapPin, Phone, Users } from "lucide-react";
import type { CSSProperties } from "react";

import { WhatsAppIcon } from "@/components/landing/brand";
import { Reveal } from "@/components/motion";
import { RoomPhotos, SiteGallery } from "@/components/site/gallery";
import { BookLink } from "@/components/site/tracking";
import { AMENITIES, AMENITIES_ON_CARD, formatPhone, formatPrice, lodgePlace } from "@/lib/lodge";
import { bookingUrl, type LiveSite } from "@/lib/site";

const whatsappButton =
  "inline-flex h-12 items-center justify-center gap-2 rounded-full bg-[#25D366] px-6 text-[15px] font-semibold text-[#0C181F] shadow-[0_8px_20px_-8px_rgba(37,211,102,0.7)] transition-transform hover:scale-[1.02] active:scale-[0.98] motion-reduce:transform-none";

function SectionTitle({ eyebrow, children }: { eyebrow: string; children: string }) {
  return (
    <div className="mb-5 flex flex-col gap-1">
      <span className="text-xs font-bold tracking-[0.12em] text-[var(--theme)] uppercase">{eyebrow}</span>
      <h2 className="font-serif text-[28px] leading-9 font-semibold text-[#0C181F] sm:text-[34px] sm:leading-10">{children}</h2>
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
  const cheapest = site.rooms.length > 0 ? Math.min(...site.rooms.map((room) => room.price)) : null;
  const mostGuests = site.rooms.length > 0 ? Math.max(...site.rooms.map((room) => room.sleeps)) : null;
  const located = site.latitude !== null && site.longitude !== null;
  const mapsLink = located ? `https://www.google.com/maps?q=${site.latitude},${site.longitude}` : site.mapsUrl;

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
            <BookLink href={book} className={`${whatsappButton} hidden h-10 px-4 text-sm lg:inline-flex`}>
              <WhatsAppIcon size={16} />
              Book on WhatsApp
            </BookLink>
          ) : null}
        </div>
      </header>

      {/* Hero */}
      <section className="relative">
        <div className="relative h-[68svh] max-h-[620px] min-h-[420px] overflow-hidden bg-[linear-gradient(180deg,#C9D9D2_0%,#7C978B_60%,#3E5A4E_100%)]">
          {site.heroUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- already resized on upload
            <img src={site.heroUrl} alt="" fetchPriority="high" className="absolute inset-0 size-full object-cover" />
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
                  <BookLink href={book} className={whatsappButton}>
                    <WhatsAppIcon size={18} />
                    Book on WhatsApp
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
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <h3 className="font-serif text-xl leading-7 font-semibold">{room.name}</h3>
                            <p className="flex items-center gap-1 text-sm text-[#4F5A60]">
                              <Users className="size-3.5" />
                              Sleeps {room.sleeps}
                            </p>
                          </div>
                          <span className="shrink-0 rounded-full bg-[var(--theme)] px-3 py-1.5 text-sm font-semibold text-white">
                            {formatPrice(room.price)} <span className="font-normal opacity-80">/ night</span>
                          </span>
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
                        {roomBook ? (
                          <BookLink roomId={room.id} href={roomBook} className={`${whatsappButton} mt-auto w-full`}>
                            <WhatsAppIcon size={17} />
                            Book on WhatsApp
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
            <p className="max-w-md font-serif text-2xl leading-8">Message us on WhatsApp with your dates. We reply quickly.</p>
            <div className="flex flex-col gap-2 sm:items-end">
              {book ? (
                <BookLink href={book} className={whatsappButton}>
                  <WhatsAppIcon size={18} />
                  {formatPhone(site.whatsapp)}
                </BookLink>
              ) : null}
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
            </div>
          </Reveal>
        </section>
      </main>

      <footer className="border-t border-black/5">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-2 px-4 py-6 text-sm text-[#6C767D] sm:flex-row sm:px-6">
          <span>
            © {new Date().getFullYear()} {site.name}
          </span>
          <a href="https://stayzim.co.zw" className="hover:text-[#0C181F]">
            Made with <strong className="font-semibold">StayZim</strong>
          </a>
        </div>
      </footer>

      {/* Phones: booking always in reach */}
      {book ? (
        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-black/5 bg-[#FAF9F6]/90 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur lg:hidden">
          <BookLink href={book} className={`${whatsappButton} w-full`}>
            <WhatsAppIcon size={18} />
            Book on WhatsApp
          </BookLink>
        </div>
      ) : null}
    </div>
  );
}
