import type { MotionLevel } from "@stayzim/sites";
import { cn } from "@stayzim/ui/lib/utils";
import type { CSSProperties, ReactNode } from "react";

import { WhatsAppIcon } from "@/components/landing/brand";
import { Item, Reveal, Stagger } from "@/components/motion";
import { BookLink } from "@/components/site/tracking";
import { formatPhone, formatPrice, lodgePlace } from "@/lib/lodge";
import { MAIN_URL } from "@/lib/site-host";
import { bookingUrl, type LiveSite } from "@/lib/site";

/**
 * Placeholder templates: plain HTML in three layouts, so switching templates,
 * hero text and plan rules can be tested end to end. Each will be replaced by
 * its own design. They read the same lodge data as every template.
 */
export type BasicConfig = {
  name: string;
  /** stack: photo on top, one column. split: text beside the photo. rooms-first: no photo hero, rooms lead. */
  layout: "stack" | "split" | "rooms-first";
  tone: "light" | "dark" | "warm";
  font: "sans" | "serif";
  motion: MotionLevel;
};

const TONES = {
  light: "bg-white text-[#0C181F]",
  dark: "bg-[#0F1A1F] text-[#F2F5F7]",
  warm: "bg-[#F6EFE4] text-[#2A1F14]",
};

/** Wraps a block in the template's level of motion. Starter templates ("none") stay completely still. */
function Motion({ level, children, className }: { level: MotionLevel; children: ReactNode; className?: string }) {
  if (level === "none") return <div className={className}>{children}</div>;
  return (
    <Reveal className={className} amount={0.2} {...(level === "rich" ? { initial: { opacity: 0, y: 48, scale: 0.98 }, whileInView: { opacity: 1, y: 0, scale: 1 } } : {})}>
      {children}
    </Reveal>
  );
}

function BookButton({ href, roomId, children }: { href: string | null; roomId?: string; children: ReactNode }) {
  if (!href) return null;
  return (
    <BookLink
      href={href}
      roomId={roomId}
      className="inline-flex items-center gap-2 rounded-md bg-[#25D366] px-4 py-2.5 font-semibold text-[#0C181F] hover:brightness-95"
    >
      <WhatsAppIcon size={16} />
      {children}
    </BookLink>
  );
}

export function BasicTemplate({ site, config }: { site: LiveSite; config: BasicConfig }) {
  const place = lodgePlace(site);
  const book = bookingUrl(site);
  const muted = config.tone === "dark" ? "text-white/70" : "opacity-75";
  const card = config.tone === "dark" ? "border-white/15 bg-white/5" : "border-black/10 bg-white/60";
  const rich = config.motion === "rich";

  const hero = (
    <section className={cn("grid gap-6", config.layout === "split" && site.heroUrl ? "md:grid-cols-2 md:items-center" : "")}>
      {config.layout !== "rooms-first" && site.heroUrl ? (
        // eslint-disable-next-line @next/next/no-img-element -- already resized on upload
        <img
          src={site.heroUrl}
          alt=""
          fetchPriority="high"
          className={cn("w-full rounded-lg object-cover", config.layout === "split" ? "aspect-[4/3]" : "aspect-[16/7]")}
        />
      ) : null}
      <Motion level={config.motion}>
        {place ? <p className={cn("text-sm", muted)}>{place}</p> : null}
        <h1 className="mt-1 text-4xl leading-tight font-bold sm:text-5xl" style={{ color: config.tone === "dark" ? undefined : "var(--theme)" }}>
          {site.hero.headline}
        </h1>
        <p className={cn("mt-3 max-w-xl text-lg", muted)}>{site.hero.subline}</p>
        <div className="mt-5">
          <BookButton href={book}>Book on WhatsApp</BookButton>
        </div>
      </Motion>
    </section>
  );

  const about = site.description ? (
    <Motion level={config.motion}>
      <section>
        <h2 className="text-2xl font-bold">About {site.name}</h2>
        <p className={cn("mt-2 max-w-2xl text-lg", muted)}>{site.description}</p>
      </section>
    </Motion>
  ) : null;

  const roomCards = site.rooms.map((room) => (
    <article key={room.id} className={cn("flex flex-col overflow-hidden rounded-lg border", card, rich && "transition-transform hover:-translate-y-1")}>
      {room.photos[0] ? (
        // eslint-disable-next-line @next/next/no-img-element -- already resized on upload
        <img src={room.photos[0].url} alt="" loading="lazy" className="aspect-[4/3] w-full object-cover" />
      ) : null}
      <div className="flex flex-1 flex-col gap-2 p-4">
        <h3 className="text-xl font-bold">{room.name}</h3>
        <p className={muted}>
          Sleeps {room.sleeps} · <strong style={{ color: config.tone === "dark" ? undefined : "var(--theme)" }}>{formatPrice(room.price)}</strong> a night
        </p>
        <div className="mt-auto pt-2">
          <BookButton href={bookingUrl(site, room.name)} roomId={room.id}>
            Book this room
          </BookButton>
        </div>
      </div>
    </article>
  ));

  const rooms = (
    <section id="rooms">
      <h2 className="text-2xl font-bold">Rooms</h2>
      {site.rooms.length === 0 ? (
        <p className={cn("mt-2", muted)}>Rooms are coming soon. Message us on WhatsApp to book.</p>
      ) : rich ? (
        <Stagger className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3" stagger={0.08}>
          {roomCards.map((roomCard, index) => (
            <Item key={site.rooms[index]!.id}>{roomCard}</Item>
          ))}
        </Stagger>
      ) : (
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{roomCards}</div>
      )}
    </section>
  );

  const gallery =
    site.gallery.length > 0 ? (
      <Motion level={config.motion}>
        <section id="gallery">
          <h2 className="text-2xl font-bold">Gallery</h2>
          <div className="mt-4 grid grid-cols-2 gap-2 md:grid-cols-4">
            {site.gallery.map((photo) => (
              // eslint-disable-next-line @next/next/no-img-element -- already resized on upload
              <img key={photo.url} src={photo.url} alt={photo.caption} loading="lazy" className="aspect-square w-full rounded-md object-cover" />
            ))}
          </div>
        </section>
      </Motion>
    ) : null;

  const mapsLink = site.latitude !== null && site.longitude !== null ? `https://www.google.com/maps?q=${site.latitude},${site.longitude}` : site.mapsUrl;

  const contact = (
    <Motion level={config.motion}>
      <section id="contact" className={cn("rounded-lg border p-6", card)}>
        <h2 className="text-2xl font-bold">Contact</h2>
        <ul className={cn("mt-3 space-y-1", muted)}>
          {site.whatsapp ? <li>WhatsApp: {formatPhone(site.whatsapp)}</li> : null}
          {site.phone ? (
            <li>
              Phone: <a href={`tel:+${site.phone}`}>{formatPhone(site.phone)}</a>
            </li>
          ) : null}
          {site.email ? (
            <li>
              Email: <a href={`mailto:${site.email}`}>{site.email}</a>
            </li>
          ) : null}
          {mapsLink ? (
            <li>
              <a href={mapsLink} target="_blank" rel="noreferrer" className="underline">
                Open in Google Maps
              </a>
            </li>
          ) : null}
        </ul>
        <div className="mt-4">
          <BookButton href={book}>Message us on WhatsApp</BookButton>
        </div>
      </section>
    </Motion>
  );

  const order = config.layout === "rooms-first" ? [hero, rooms, about, gallery, contact] : [hero, about, rooms, gallery, contact];

  return (
    <div
      style={{ "--theme": site.themeColor } as CSSProperties}
      className={cn("min-h-svh", TONES[config.tone], config.font === "serif" ? "font-serif" : "font-sans")}
    >
      <header className={cn("border-b", config.tone === "dark" ? "border-white/10" : "border-black/10")}>
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-4">
          <strong className="text-lg">{site.name}</strong>
          <BookButton href={book}>Book</BookButton>
        </div>
      </header>
      <main className="mx-auto flex max-w-5xl flex-col gap-14 px-4 py-10">
        {order.map((section, index) => (
          <div key={index}>{section}</div>
        ))}
      </main>
      <footer className={cn("border-t py-6 text-center text-sm", config.tone === "dark" ? "border-white/10" : "border-black/10", muted)}>
        © {new Date().getFullYear()} {site.name} · {config.name} template ·{" "}
        <a href={`${MAIN_URL}/privacy`} className="underline">
          Privacy
        </a>{" "}
        ·{" "}
        <a href="https://stayzim.co.zw" className="underline">
          Made with StayZim
        </a>
      </footer>
    </div>
  );
}
