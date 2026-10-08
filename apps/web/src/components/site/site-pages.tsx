import type { SiteRoom } from "@stayzim/sites";
import { cn } from "@stayzim/ui/lib/utils";
import { ArrowLeft, ArrowRight, Check } from "lucide-react";

import { RoomPhotos, SiteGallery } from "@/components/site/gallery";
import { PageHeading, PageShell, pageLook } from "@/components/site/page-shell";
import {
  AmenityIcon,
  amenityLine,
  BookLabel,
  bookTone,
  FindUsLinks,
  MapView,
  MessageUs,
  Questions,
  siteBasics,
  SocialLinks,
  StayDetails,
} from "@/components/site/parts";
import { RoomFilters } from "@/components/site/room-filters";
import { BookLink } from "@/components/site/tracking";
import { AMENITIES, formatPrice } from "@/lib/lodge";
import { bookingUrl, type LiveSite } from "@/lib/site";
import { filterRooms, roomFacts, roomsEmpty, roomsIntro } from "@/lib/site-content";
import { pageUrl, roomUrl } from "@/lib/site-pages";

/*
 * The pages Growth and Pro sites have beyond the home page (packages/sites
 * content/pages.ts), in the design's look (page-shell.tsx). Server components:
 * the filters, gallery and Book are the client parts.
 */

/** A room on the Rooms page (and under "Other rooms"): photos, price, the facts, and View room and Book. */
function RoomCard({ site, room }: { site: LiveSite; room: SiteRoom }) {
  const look = pageLook(site.template);
  const { online } = siteBasics(site);
  const book = bookingUrl(site, room.name);
  const href = roomUrl(site, room.id);
  const facts = roomFacts(room);
  const amenities = amenityLine(room.amenities, 3);
  return (
    <li data-room-id={room.id} className={cn("flex flex-col overflow-hidden", look.card, look.radius)}>
      <RoomPhotos photos={room.photos} name={room.name} theme={site.themeColor} sample={room.sample} className="aspect-[4/3]" />
      <div className="flex flex-1 flex-col gap-2 p-5">
        <div className="flex items-baseline justify-between gap-3">
          <h3 className={cn(look.display, "text-[24px] leading-8")}>{href ? <a href={href} className="hover:text-[var(--theme)]">{room.name}</a> : room.name}</h3>
          <span className="shrink-0 text-[15px]">
            <strong className="font-semibold text-[var(--theme)]">{formatPrice(room.price)}</strong>
            <span className={look.muted}> / night</span>
          </span>
        </div>
        {facts.length > 0 ? <p className={cn("text-[14.5px]", look.muted)}>{facts.join(" · ")}</p> : null}
        {amenities ? <p className={cn("text-[14.5px]", look.muted)}>{amenities}</p> : null}
        <div className="mt-auto flex flex-wrap items-center gap-2 pt-3">
          {book ? (
            <BookLink roomId={room.id} href={book} className={cn("inline-flex h-11 items-center gap-2 px-5 text-[14.5px] font-semibold", look.pill, bookTone(online))}>
              <BookLabel online={online} size={16} />
            </BookLink>
          ) : null}
          {href ? (
            <a href={href} className={cn("inline-flex h-11 items-center gap-1.5 px-4 text-[14.5px] font-semibold hover:text-[var(--theme)]", look.pill)}>
              View room
              <ArrowRight className="size-4" aria-hidden="true" />
            </a>
          ) : null}
        </div>
      </div>
    </li>
  );
}

/** /rooms: every room, with guests, price, sort and amenity filters. */
export function RoomsPage({ site }: { site: LiveSite }) {
  const look = pageLook(site.template);
  return (
    <PageShell site={site} current="rooms">
      <PageHeading site={site} eyebrow="Rooms" title={`Stay at ${site.name}`} intro={roomsIntro(site)} />
      {site.rooms.length === 0 ? (
        <p className={look.muted}>{roomsEmpty(site)}</p>
      ) : (
        <RoomFilters rooms={filterRooms(site.rooms)} amenities control={look.pill}>
          <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {site.rooms.map((room) => (
              <RoomCard key={room.id} site={site} room={room} />
            ))}
          </ul>
        </RoomFilters>
      )}
    </PageShell>
  );
}

/** /rooms/{room}: the photos large, the facts, what's in it, Book, and the other rooms. */
export function RoomPage({ site, room }: { site: LiveSite; room: SiteRoom }) {
  const look = pageLook(site.template);
  const { online } = siteBasics(site);
  const book = bookingUrl(site, room.name);
  const facts = roomFacts(room);
  const others = site.rooms.filter((other) => other.id !== room.id).slice(0, 3);
  return (
    <PageShell site={site} current="room">
      <a href={pageUrl(site, "rooms")} className={cn("mb-8 inline-flex items-center gap-2 text-[14px] font-medium hover:text-[var(--theme)]", look.muted)}>
        <ArrowLeft className="size-4" aria-hidden="true" />
        All rooms
      </a>
      {/* Phones: photos, then the name, price and Book, then the rest. Wide: the card stays beside both */}
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)] lg:gap-x-14">
        <div className="min-w-0">
          {room.photos.length > 1 ? (
            <SiteGallery photos={room.photos.map((photo) => ({ ...photo, caption: "" }))} name={room.name} layout="feature" rounded={look.radius} limit={5} />
          ) : (
            <RoomPhotos photos={room.photos} name={room.name} theme={site.themeColor} sample={room.sample} className={cn("aspect-[4/3]", look.radius)} sizes="(min-width: 1024px) 680px, 100vw" />
          )}
        </div>
        <aside className="lg:sticky lg:top-8 lg:col-start-2 lg:row-span-2 lg:row-start-1 lg:h-fit">
          <div className={cn("flex flex-col gap-5 p-6 sm:p-7", look.card, look.radius)}>
            <h1 className={cn(look.display, "text-[36px] leading-[42px] text-balance sm:text-[44px] sm:leading-[50px]")}>{room.name}</h1>
            <p className="text-[17px]">
              <strong className="text-[26px] font-semibold text-[var(--theme)]">{formatPrice(room.price)}</strong>
              <span className={look.muted}> a night</span>
            </p>
            <ul className="flex flex-col gap-2 text-[15px]">
              {facts.map((fact) => (
                <li key={fact} className="flex items-center gap-2">
                  <Check className="size-4 shrink-0 text-[var(--theme)]" aria-hidden="true" />
                  {fact}
                </li>
              ))}
            </ul>
            {book ? (
              <BookLink roomId={room.id} href={book} className={cn("flex h-12 w-full items-center justify-center gap-2 text-[15px] font-semibold", look.pill, bookTone(online))}>
                <BookLabel online={online} />
              </BookLink>
            ) : null}
            <p className={cn("text-[13.5px] leading-5", look.muted)}>
              {online ? "Pick your dates and we'll confirm on WhatsApp." : "Message us your dates on WhatsApp and we'll confirm."}
            </p>
          </div>
        </aside>
        <div className="flex min-w-0 flex-col gap-8 lg:col-start-1">
          {room.description ? <p className="text-[17px] leading-8 whitespace-pre-line">{room.description}</p> : null}
          {room.amenities.length > 0 ? (
            <section className="flex flex-col gap-4">
              <h2 className={cn(look.display, "text-[28px] leading-9")}>In the room</h2>
              <ul className="grid grid-cols-1 gap-3 min-[420px]:grid-cols-2 sm:grid-cols-3">
                {room.amenities.map((key) => (
                  <li key={key} className={cn("flex items-center gap-2.5 px-4 py-3 text-[15px]", look.card, look.radius)}>
                    <AmenityIcon amenity={key} className="size-5 shrink-0 text-[var(--theme)]" />
                    {AMENITIES[key]?.label}
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </div>
      </div>
      {others.length > 0 ? (
        <section className="mt-20 flex flex-col gap-6">
          <h2 className={cn(look.display, "text-[32px] leading-10")}>Other rooms</h2>
          <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {others.map((other) => (
              <RoomCard key={other.id} site={site} room={other} />
            ))}
          </ul>
        </section>
      ) : null}
    </PageShell>
  );
}

/** /gallery: every photo, opening large. */
export function GalleryPage({ site }: { site: LiveSite }) {
  const look = pageLook(site.template);
  return (
    <PageShell site={site} current="gallery">
      <PageHeading site={site} eyebrow="Gallery" title={site.copy.gallery.title || `Inside ${site.name}`} intro={site.copy.gallery.intro} />
      {site.gallery.length > 0 ? (
        <SiteGallery photos={site.gallery} name={site.name} layout="grid3" rounded={look.radius} />
      ) : (
        <p className={look.muted}>Photos are on their way.</p>
      )}
    </PageShell>
  );
}

/** /contact: the map, how to reach the lodge, the stay details and questions. */
export function ContactPage({ site }: { site: LiveSite }) {
  const look = pageLook(site.template);
  const { place, stayInfo } = siteBasics(site);
  return (
    <PageShell site={site} current="contact">
      <PageHeading site={site} eyebrow="Contact" title={site.copy.contact.title || "Get in touch"} intro={site.copy.contact.intro} />
      <div className={cn("grid gap-6 overflow-hidden p-3 sm:p-4 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] lg:items-center", look.card, look.radius)}>
        <MapView site={site} className={cn("min-h-[300px] lg:min-h-[420px]", look.radius)} />
        <div className="flex flex-col gap-5 px-3 pb-4 sm:px-6 lg:py-6">
          <div className="flex flex-col gap-1.5">
            <h2 className={cn(look.display, "text-[30px] leading-9")}>{site.copy.location.title || "Find us"}</h2>
            {place ? <p className={cn("text-[16px]", look.muted)}>{place}</p> : null}
          </div>
          <FindUsLinks site={site} />
          <MessageUs site={site} className={cn("w-full", look.pill)} />
          <SocialLinks site={site} />
        </div>
      </div>
      {stayInfo ? (
        <section className="mt-16 flex flex-col gap-6">
          <h2 className={cn(look.display, "text-[32px] leading-10")}>Good to know</h2>
          <StayDetails site={site} radius={look.radius} heading={look.display} />
        </section>
      ) : null}
      {site.faq.length > 0 ? (
        <section className="mt-16 flex flex-col gap-6">
          <h2 className={cn(look.display, "text-[32px] leading-10")}>Questions</h2>
          <Questions site={site} radius={look.radius} />
        </section>
      ) : null}
    </PageShell>
  );
}
