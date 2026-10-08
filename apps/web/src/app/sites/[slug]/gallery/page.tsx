import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { GalleryPage } from "@/components/site/site-pages";
import { sitePageData, sitePageMetadata } from "@/lib/site-page-route";
import { pageUrl } from "@/lib/site-pages";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const site = await sitePageData((await params).slug, "gallery");
  return sitePageMetadata(site, { title: "Gallery", description: site?.copy.gallery.intro || `Photos of ${site?.name}.`, url: site ? pageUrl(site, "gallery") : "" });
}

/** {slug}.stayzim.co.zw/gallery (Growth and Pro): every photo. */
export default async function SiteGalleryPage({ params }: Props) {
  const site = await sitePageData((await params).slug, "gallery");
  if (!site) notFound();
  return <GalleryPage site={site} />;
}
