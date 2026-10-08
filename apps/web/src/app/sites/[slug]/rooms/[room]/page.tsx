import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { RoomPage } from "@/components/site/site-pages";
import { formatPrice } from "@/lib/lodge";
import { sitePageData, sitePageMetadata } from "@/lib/site-page-route";
import { roomBySlug, roomUrl } from "@/lib/site-pages";
import { jsonLd, roomStructuredData } from "@/lib/structured-data";

type Props = { params: Promise<{ slug: string; room: string }> };

async function load(params: Props["params"]) {
  const { slug, room: roomSlug } = await params;
  const site = await sitePageData(slug, "room");
  const room = site ? roomBySlug(site, roomSlug) : null;
  return site && room ? { site, room } : null;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const found = await load(params);
  if (!found) return sitePageMetadata(null, { title: "", description: "", url: "" });
  const { site, room } = found;
  return sitePageMetadata(site, {
    title: room.name,
    description: room.description?.slice(0, 160) || `${room.name} at ${site.name}: sleeps ${room.sleeps}, from ${formatPrice(room.price)} a night.`,
    url: roomUrl(site, room.id) ?? "",
  });
}

/** {slug}.stayzim.co.zw/rooms/{room} (Growth and Pro): one room. */
export default async function SiteRoomPage({ params }: Props) {
  const found = await load(params);
  if (!found) notFound();
  return (
    <>
      {/* eslint-disable-next-line react/no-danger -- our own JSON, with "<" escaped */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(roomStructuredData(found.site, found.room)) }} />
      <RoomPage site={found.site} room={found.room} />
    </>
  );
}
