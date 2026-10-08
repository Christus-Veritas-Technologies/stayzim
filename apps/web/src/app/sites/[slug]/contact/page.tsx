import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ContactPage } from "@/components/site/site-pages";
import { sitePageData, sitePageMetadata } from "@/lib/site-page-route";
import { pageUrl } from "@/lib/site-pages";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const site = await sitePageData((await params).slug, "contact");
  return sitePageMetadata(site, { title: "Contact", description: site?.copy.contact.intro || `How to reach ${site?.name}.`, url: site ? pageUrl(site, "contact") : "" });
}

/** {slug}.stayzim.co.zw/contact (Growth and Pro): the map, WhatsApp, and what guests ask. */
export default async function SiteContactPage({ params }: Props) {
  const site = await sitePageData((await params).slug, "contact");
  if (!site) notFound();
  return <ContactPage site={site} />;
}
