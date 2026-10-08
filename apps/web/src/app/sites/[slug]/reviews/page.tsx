import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ReviewsPage } from "@/components/site/site-pages";
import { sitePageData, sitePageMetadata } from "@/lib/site-page-route";
import { pageUrl } from "@/lib/site-pages";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const site = await sitePageData((await params).slug, "reviews");
  return sitePageMetadata(site, { title: "Reviews", description: site?.copy.reviews.intro || `What guests say about ${site?.name}.`, url: site ? pageUrl(site, "reviews") : "" });
}

/** {slug}.stayzim.co.zw/reviews (Pro): what guests say. */
export default async function SiteReviewsPage({ params }: Props) {
  const site = await sitePageData((await params).slug, "reviews");
  if (!site) notFound();
  return <ReviewsPage site={site} />;
}
