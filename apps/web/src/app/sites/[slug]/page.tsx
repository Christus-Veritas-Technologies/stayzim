import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { SiteTemplate } from "@/components/site/templates";
import { DemoEndedSite, SuspendedSite } from "@/components/site/site-states";
import { lodgePlace } from "@/lib/lodge";
import { getSite } from "@/lib/site";
import { lodgeShareMetadata } from "@/lib/share-metadata";
import { siteUrl } from "@/lib/site-host";
import { jsonLd, lodgeStructuredData } from "@/lib/structured-data";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const site = await getSite((await params).slug);
  if (!site) return { title: { absolute: "Lodge not found" }, robots: { index: false } };
  if (site.status !== "LIVE") return { title: { absolute: site.name }, robots: { index: false } };
  const place = lodgePlace(site);
  const description =
    site.copy.meta.description || site.description || `${site.name}${place ? ` in ${place}` : ""}. ${site.booking.mode === "request" ? "Book direct, online or on WhatsApp." : "Book direct on WhatsApp."}`;
  return {
    title: { absolute: place ? `${site.name} · ${place}` : site.name },
    description,
    // One address for search engines: the lodge's own domain when it has one
    alternates: { canonical: siteUrl(site) },
    ...lodgeShareMetadata(site, { title: place ? `${site.name} · ${place}` : site.name, description, url: siteUrl(site) }),
    other: { "theme-color": site.themeColor },
    // Demos come and go in 2 days: only paid sites go in search results
    ...(site.demo ? { robots: { index: false, follow: false } } : {}),
  };
}

/** {slug}.stayzim.co.zw, rewritten here by src/proxy.ts. */
export default async function LodgeSitePage({ params }: Props) {
  const site = await getSite((await params).slug);
  if (!site) notFound();
  if (site.status !== "LIVE") return site.status === "DEMO_ENDED" ? <DemoEndedSite name={site.name} /> : <SuspendedSite name={site.name} />;
  return (
    <>
      {/* eslint-disable-next-line react/no-danger -- our own JSON, with "<" escaped */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(lodgeStructuredData(site)) }} />
      <SiteTemplate site={site} />
    </>
  );
}
