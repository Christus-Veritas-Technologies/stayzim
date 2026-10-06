import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { LodgeSite } from "@/components/site/lodge-site";
import { SuspendedSite } from "@/components/site/site-states";
import { lodgePlace } from "@/lib/lodge";
import { getSite } from "@/lib/site";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const site = await getSite((await params).slug);
  if (!site) return { title: { absolute: "Lodge not found" }, robots: { index: false } };
  if (site.status === "SUSPENDED") return { title: { absolute: site.name }, robots: { index: false } };
  const place = lodgePlace(site);
  const description = site.description || `${site.name}${place ? ` in ${place}` : ""}. Book direct on WhatsApp.`;
  return {
    title: { absolute: place ? `${site.name} · ${place}` : site.name },
    description,
    openGraph: { title: site.name, description, type: "website", images: site.heroUrl ? [{ url: site.heroUrl }] : undefined },
    other: { "theme-color": site.themeColor },
  };
}

/** {slug}.stayzim.co.zw, rewritten here by src/proxy.ts. */
export default async function LodgeSitePage({ params }: Props) {
  const site = await getSite((await params).slug);
  if (!site) notFound();
  if (site.status === "SUSPENDED") return <SuspendedSite name={site.name} />;
  return <LodgeSite site={site} />;
}
