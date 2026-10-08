import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ExperiencesPage } from "@/components/site/site-pages";
import { sitePageData, sitePageMetadata } from "@/lib/site-page-route";
import { pageUrl } from "@/lib/site-pages";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const site = await sitePageData((await params).slug, "experiences");
  return sitePageMetadata(site, { title: "Things to do", description: site?.copy.experiences.intro || `Things to do near ${site?.name}.`, url: site ? pageUrl(site, "experiences") : "" });
}

/** {slug}.stayzim.co.zw/experiences (Pro): things to do nearby. */
export default async function SiteExperiencesPage({ params }: Props) {
  const site = await sitePageData((await params).slug, "experiences");
  if (!site) notFound();
  return <ExperiencesPage site={site} />;
}
