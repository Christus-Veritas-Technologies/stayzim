import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { AboutPage } from "@/components/site/site-pages";
import { sitePageData, sitePageMetadata } from "@/lib/site-page-route";
import { pageUrl } from "@/lib/site-pages";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const site = await sitePageData((await params).slug, "about");
  return sitePageMetadata(site, { title: "Our story", description: site?.copy.about.body[0] || `About ${site?.name}.`, url: site ? pageUrl(site, "about") : "" });
}

/** {slug}.stayzim.co.zw/about (Pro): the story. */
export default async function SiteAboutPage({ params }: Props) {
  const site = await sitePageData((await params).slug, "about");
  if (!site) notFound();
  return <AboutPage site={site} />;
}
