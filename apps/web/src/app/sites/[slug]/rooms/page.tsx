import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { RoomsPage } from "@/components/site/site-pages";
import { sitePageData, sitePageMetadata } from "@/lib/site-page-route";
import { pageUrl } from "@/lib/site-pages";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const site = await sitePageData((await params).slug, "rooms");
  return sitePageMetadata(site, { title: "Rooms", description: site?.copy.rooms.intro || `Rooms at ${site?.name}.`, url: site ? pageUrl(site, "rooms") : "" });
}

/** {slug}.stayzim.co.zw/rooms (Growth and Pro): every room, with filters. */
export default async function SiteRoomsPage({ params }: Props) {
  const site = await sitePageData((await params).slug, "rooms");
  if (!site) notFound();
  return <RoomsPage site={site} />;
}
