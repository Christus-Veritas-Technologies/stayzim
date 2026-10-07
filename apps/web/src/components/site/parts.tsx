import { cn } from "@stayzim/ui/lib/utils";
import { ArrowUpRight, CalendarDays, Check, ChevronDown, LogIn, LogOut, MapPin } from "lucide-react";
import type { ReactNode } from "react";

import { WhatsAppIcon } from "@/components/landing/brand";
import { PHOTO_FALLBACK } from "@/components/site/gallery";
import { SocialIcon } from "@/components/site/social-icons";
import { BookLink } from "@/components/site/tracking";
import { AMENITIES, formatPhone, lodgePlace } from "@/lib/lodge";
import { bookingUrl, type LiveSite } from "@/lib/site";
import { amenitySummary, emphasis, hasStayInfo, roomStats } from "@/lib/site-content";
import { MAIN_URL } from "@/lib/site-host";

/*
 * Pieces every lodge template shares (docs/cms/README.md, "The template
 * contract"): what a site has to show, worked out once, and the sections whose
 * content is the same in every design. Templates style them through classes.
 * Server components: the only client code is BookLink and the gallery.
 */

/** Everything a template needs to decide what to show. */
export function siteBasics(site: LiveSite) {
  const located = site.latitude !== null && site.longitude !== null;
  return {
    place: lodgePlace(site),
    /** The general Book link (WhatsApp, or the booking sheet where the site takes bookings) */
    book: bookingUrl(site),
    /** Growth and Pro sites that take bookings: Book opens the booking sheet */
    online: site.booking.mode === "request",
    stats: roomStats(site.rooms),
    amenities: amenitySummary(site.rooms),
    located,
    mapsLink: located ? `https://www.google.com/maps?q=${site.latitude},${site.longitude}` : site.mapsUrl,
    stayInfo: hasStayInfo(site),
  };
}

/** Booking colours: the lodge's own where guests book on the site, WhatsApp green otherwise. */
export function bookTone(online: boolean) {
  return online ? "bg-[var(--theme)] text-white" : "bg-[#25D366] text-[#0C181F]";
}

/** What a Book button says: Book now (on the site), or Book on WhatsApp ("Book" when short). */
export function BookLabel({ online, size = 18, short = false, upper = false }: { online: boolean; size?: number; short?: boolean; upper?: boolean }) {
  const text = online ? (short ? "Book" : "Book now") : short ? "Book" : "Book on WhatsApp";
  return (
    <>
      {online ? <CalendarDays style={{ width: size, height: size }} aria-hidden="true" /> : <WhatsAppIcon size={size} />}
      {upper ? text.toUpperCase() : text}
    </>
  );
}

/** Hero text with the owner's *starred* words set apart by `em`. */
export function Emphasis({ text, em }: { text: string; em: string }) {
  return (
    <>
      {emphasis(text).map((part, index) =>
        part.em ? (
          <span key={index} className={em}>
            {part.text}
          </span>
        ) : (
          <span key={index}>{part.text}</span>
        ),
      )}
    </>
  );
}

/** The hero photo filling its box, or a wash of the lodge's colour before there is one. */
export function HeroPhoto({ site, className, sizes = "100vw" }: { site: LiveSite; className?: string; sizes?: string }) {
  if (!site.heroUrl) return <div className={cn("absolute inset-0", PHOTO_FALLBACK, className)} aria-hidden="true" />;
  return (
    // eslint-disable-next-line @next/next/no-img-element -- already resized on upload
    <img
      src={site.heroUrl}
      srcSet={site.heroSrcSet ?? undefined}
      sizes={sizes}
      alt=""
      fetchPriority="high"
      decoding="async"
      className={cn("absolute inset-0 size-full object-cover", className)}
    />
  );
}

/** One photo (a room's cover, a gallery picture) or the colour wash. */
export function Photo({
  photo,
  alt,
  className,
  sizes,
}: {
  photo: { url: string; srcSet?: string | null; width: number; height: number } | undefined;
  alt: string;
  className?: string;
  sizes: string;
}) {
  if (!photo) return <div className={cn(PHOTO_FALLBACK, className)} aria-hidden="true" />;
  return (
    // eslint-disable-next-line @next/next/no-img-element -- already resized on upload
    <img
      src={photo.url}
      srcSet={photo.srcSet ?? undefined}
      sizes={sizes}
      alt={alt}
      width={photo.width}
      height={photo.height}
      loading="lazy"
      decoding="async"
      className={cn("object-cover", className)}
    />
  );
}

/** A room's amenity names, joined with dots: "Wi-Fi · Braai · Parking". */
export function amenityLine(keys: LiveSite["rooms"][number]["amenities"], max = 4) {
  return keys
    .slice(0, max)
    .map((key) => AMENITIES[key]?.label)
    .filter(Boolean)
    .join(" · ");
}

/** An amenity's icon. */
export function AmenityIcon({ amenity, className }: { amenity: LiveSite["rooms"][number]["amenities"][number]; className?: string }) {
  const Icon = AMENITIES[amenity]?.icon;
  return Icon ? <Icon className={className} strokeWidth={1.75} aria-hidden="true" /> : null;
}

/** "Sleeps 2 to 4", "Sleeps up to 4" */
export function sleepsRange(stats: NonNullable<ReturnType<typeof roomStats>>) {
  return stats.fewest === stats.most ? `${stats.most}` : `${stats.fewest}–${stats.most}`;
}

type Tone = "light" | "dark";

const MUTED: Record<Tone, string> = { light: "text-[#5D6964]", dark: "text-white/70" };
const CARD: Record<Tone, string> = {
  light: "bg-white shadow-[0_0_0_1px_rgba(12,24,31,0.07)]",
  dark: "bg-white/[0.06] shadow-[0_0_0_1px_rgba(255,255,255,0.1)]",
};

/**
 * Good to know: check-in and check-out times, house rules and cancellations.
 * Renders nothing when the owner hasn't filled any of it in.
 */
export function StayDetails({
  site,
  tone = "light",
  heading,
  radius = "rounded-3xl",
  className,
}: {
  site: LiveSite;
  tone?: Tone;
  /** Classes for the small headings and time values (the template's display font) */
  heading?: string;
  radius?: string;
  className?: string;
}) {
  if (!hasStayInfo(site)) return null;
  const times = [
    site.checkInFrom ? { icon: <LogIn className="size-4" />, label: "Check-in", value: `From ${site.checkInFrom}` } : null,
    site.checkOutBy ? { icon: <LogOut className="size-4" />, label: "Check-out", value: `By ${site.checkOutBy}` } : null,
  ].filter((entry) => entry !== null);
  return (
    <div className={cn("grid gap-3 md:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)] md:gap-4", className)}>
      {times.length > 0 ? (
        <div className="grid grid-cols-2 gap-3 self-start">
          {times.map((time) => (
            <div key={time.label} className={cn("flex flex-col gap-1 p-4 sm:p-5", CARD[tone], radius)}>
              <span className={cn("inline-flex items-center gap-1.5 text-sm", MUTED[tone])}>
                <span className="text-[var(--theme)]">{time.icon}</span>
                {time.label}
              </span>
              <span className={cn("text-xl font-semibold whitespace-nowrap sm:text-2xl", heading)}>{time.value}</span>
            </div>
          ))}
        </div>
      ) : null}
      {site.houseRules.length > 0 || site.cancellationPolicy ? (
        <div className={cn("flex flex-col gap-4 p-5 sm:p-6", CARD[tone], radius)}>
          {site.houseRules.length > 0 ? (
            <div className="flex flex-col gap-2.5">
              <h3 className={cn("font-semibold", heading)}>House rules</h3>
              <ul className={cn("grid gap-2 text-[15px] sm:grid-cols-2", MUTED[tone])}>
                {site.houseRules.map((rule) => (
                  <li key={rule} className="flex items-start gap-2">
                    <Check className="mt-1 size-4 shrink-0 text-[var(--theme)]" aria-hidden="true" />
                    {rule}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          {site.cancellationPolicy ? (
            <div className={cn("flex flex-col gap-1.5 border-t pt-4 first:border-0 first:pt-0", tone === "dark" ? "border-white/10" : "border-black/5")}>
              <h3 className={cn("font-semibold", heading)}>Cancellations</h3>
              <p className={cn("text-[15px] leading-6 whitespace-pre-line", MUTED[tone])}>{site.cancellationPolicy}</p>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

/**
 * Questions guests ask, as native <details>: they open without JavaScript and
 * screen readers know them. The first starts open.
 */
export function Questions({ site, tone = "light", radius = "rounded-2xl", className }: { site: LiveSite; tone?: Tone; radius?: string; className?: string }) {
  if (site.faq.length === 0) return null;
  return (
    <div className={cn("flex flex-col gap-2.5", className)}>
      {site.faq.map((entry, index) => (
        <details key={entry.q} open={index === 0} className={cn("group px-5 py-4", CARD[tone], radius)}>
          <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-semibold [&::-webkit-details-marker]:hidden">
            {entry.q}
            <ChevronDown className="size-5 shrink-0 text-[var(--theme)] transition-transform duration-200 group-open:rotate-180 motion-reduce:transition-none" aria-hidden="true" />
          </summary>
          <p className={cn("mt-2 text-[15px] leading-6 whitespace-pre-line", MUTED[tone])}>{entry.a}</p>
        </details>
      ))}
    </div>
  );
}

/** The lodge's Facebook, Instagram and listing links as round icon buttons. */
export function SocialLinks({ site, className, button }: { site: LiveSite; className?: string; button?: string }) {
  if (site.socialLinks.length === 0) return null;
  return (
    <div className={cn("flex flex-wrap gap-2", className)}>
      {site.socialLinks.map((link) => (
        <a
          key={link.key}
          href={link.url}
          target="_blank"
          rel="noreferrer"
          aria-label={`${site.name} on ${link.label}`}
          title={link.label}
          className={cn("flex size-11 items-center justify-center rounded-full transition-colors", button ?? "bg-black/5 hover:bg-black/10")}
        >
          <SocialIcon network={link.key} />
        </a>
      ))}
    </div>
  );
}

/**
 * The map: Google's embed when the lodge has a pin, else a drawn map with the
 * lodge's name on it (it still links to Google Maps beside it).
 */
export function MapView({ site, className, pin }: { site: LiveSite; className?: string; pin?: string }) {
  if (site.latitude !== null && site.longitude !== null) {
    return (
      <iframe
        title={`Map of ${site.name}`}
        src={`https://maps.google.com/maps?q=${site.latitude},${site.longitude}&z=13&output=embed`}
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
        className={cn("size-full min-h-[280px] border-0", className)}
      />
    );
  }
  return (
    <div className={cn("relative min-h-[280px] overflow-hidden bg-[#E8EEE6]", className)} aria-hidden="true">
      <div className="absolute inset-0 bg-[linear-gradient(rgba(12,24,31,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(12,24,31,0.05)_1px,transparent_1px)] bg-[size:44px_44px]" />
      <div className="absolute top-[16%] left-[14%] h-[30%] w-[26%] rounded-[50%] bg-[#D2E4EE]" />
      <div className="absolute right-[16%] bottom-[14%] h-[22%] w-[22%] rounded-[40%] bg-[#D7E6D0]" />
      <div className="absolute top-0 left-[58%] h-[140%] w-3 origin-top rotate-[18deg] bg-white" />
      <div className="absolute top-[62%] -left-[10%] h-3 w-[130%] -rotate-[8deg] bg-white" />
      <div className="absolute top-[44%] left-1/2 flex -translate-x-1/2 -translate-y-full flex-col items-center gap-1">
        <span className={cn("size-9 rotate-45 rounded-[50%_50%_0_50%] border-[3px] border-white shadow-md", pin ?? "bg-[var(--theme)]")} />
        <span className="mt-1 rounded-full bg-white px-3 py-1 text-xs font-semibold text-[#0C181F] shadow-sm">{site.name}</span>
      </div>
    </div>
  );
}

/** "Find us" lines: the place, Open in Google Maps, and the WhatsApp number. */
export function FindUsLinks({ site, className, link }: { site: LiveSite; className?: string; link?: string }) {
  const { mapsLink } = siteBasics(site);
  return (
    <ul className={cn("flex flex-col gap-2.5 text-[15px]", className)}>
      {mapsLink ? (
        <li>
          <a href={mapsLink} target="_blank" rel="noreferrer" className={cn("inline-flex items-center gap-2 font-medium hover:underline", link)}>
            <MapPin className="size-4 text-[var(--theme)]" aria-hidden="true" />
            Open in Google Maps
            <ArrowUpRight className="size-3.5 opacity-60" aria-hidden="true" />
          </a>
        </li>
      ) : null}
      {site.whatsapp ? (
        <li className={cn("inline-flex items-center gap-2 font-medium", link)}>
          <WhatsAppIcon size={16} color="currentColor" />
          {formatPhone(site.whatsapp)}
        </li>
      ) : null}
      {site.phone && site.phone !== site.whatsapp ? (
        <li>
          <a href={`tel:+${site.phone}`} className={cn("font-medium hover:underline", link)}>
            {formatPhone(site.phone)}
          </a>
        </li>
      ) : null}
      {site.email ? (
        <li>
          <a href={`mailto:${site.email}`} className={cn("font-medium hover:underline", link)}>
            {site.email}
          </a>
        </li>
      ) : null}
    </ul>
  );
}

/** "Message us on WhatsApp": always the chat, even where Book opens the booking sheet. */
export function MessageUs({ site, className, children }: { site: LiveSite; className?: string; children?: ReactNode }) {
  const book = bookingUrl(site);
  if (!book) return null;
  return (
    <BookLink
      href={book}
      channel="whatsapp"
      className={cn(
        "inline-flex h-12 items-center justify-center gap-2 bg-[#25D366] px-6 text-[15px] font-semibold text-[#0C181F] transition-transform active:scale-[0.98] motion-reduce:transform-none",
        className,
      )}
    >
      {children ?? (
        <>
          <WhatsAppIcon size={18} />
          Message us on WhatsApp
        </>
      )}
    </BookLink>
  );
}

/** The round WhatsApp button in the corner, on every design. Clears the phone booking bar when there is one. */
export function WhatsAppFab({ site, raised = false }: { site: LiveSite; raised?: boolean }) {
  const book = bookingUrl(site);
  if (!book) return null;
  return (
    <BookLink
      href={book}
      channel="whatsapp"
      aria-label={`Message ${site.name} on WhatsApp`}
      className={cn(
        "fixed right-4 z-30 flex size-14 items-center justify-center rounded-full bg-[#25D366] text-[#0C181F] shadow-[0_12px_28px_-10px_rgba(12,24,31,0.45)] transition-transform hover:scale-105 active:scale-95 motion-reduce:transform-none sm:right-6",
        raised ? "bottom-[88px] lg:bottom-6" : "bottom-4 sm:bottom-6",
      )}
    >
      <WhatsAppIcon size={26} />
    </BookLink>
  );
}

/**
 * Phones, where guests book on the site: Book now always in reach at the
 * bottom. (WhatsApp-only sites have the round button instead.)
 */
export function MobileBookBar({ site, className, button }: { site: LiveSite; className?: string; button?: string }) {
  const { book, online } = siteBasics(site);
  if (!book || !online) return null;
  return (
    <div className={cn("fixed inset-x-0 bottom-0 z-30 border-t border-black/5 bg-white/90 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur lg:hidden", className)}>
      <BookLink href={book} className={cn("flex h-12 w-full items-center justify-center gap-2 rounded-full text-[15px] font-semibold", bookTone(true), button)}>
        <BookLabel online />
      </BookLink>
    </div>
  );
}

/** "Made with StayZim" and the privacy link, in every footer. */
export function MadeWith({ className, strong }: { className?: string; strong?: string }) {
  return (
    <span className={cn("flex items-center gap-4", className)}>
      <a href={`${MAIN_URL}/privacy`} className="hover:underline">
        Privacy
      </a>
      <a href="https://stayzim.co.zw" className="hover:underline">
        Made with <strong className={cn("font-semibold", strong)}>StayZim</strong>
      </a>
    </span>
  );
}
