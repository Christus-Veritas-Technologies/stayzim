import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { JournalPost, journalUrl } from "@/components/site/journal";
import { bookingSite } from "@/components/site/templates";
import { PageViewTracker, SiteTracking } from "@/components/site/tracking";
import { getPost, getSite } from "@/lib/site";

type Props = { params: Promise<{ slug: string; post: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug, post: postSlug } = await params;
  const [site, post] = await Promise.all([getSite(slug), getPost(slug, postSlug)]);
  if (site?.status !== "LIVE" || !post) return { title: { absolute: "Not found" }, robots: { index: false } };
  const description = post.excerpt ?? `${post.title}, from ${site.name}.`;
  return {
    title: { absolute: `${post.title} · ${site.name}` },
    description,
    alternates: { canonical: journalUrl(site, post.slug) },
    openGraph: { title: post.title, description, type: "article", url: journalUrl(site, post.slug), images: post.cover ? [{ url: post.cover.url }] : undefined },
    ...(site.demo ? { robots: { index: false, follow: false } } : {}),
  };
}

/** {slug}.stayzim.co.zw/journal/{post}: one journal post. */
export default async function JournalPostPage({ params }: Props) {
  const { slug, post: postSlug } = await params;
  const [site, post] = await Promise.all([getSite(slug), getPost(slug, postSlug)]);
  if (site?.status !== "LIVE" || !post) notFound();
  return (
    <SiteTracking slug={site.slug} enabled booking={bookingSite(site)}>
      <PageViewTracker />
      <JournalPost site={site} post={post} />
    </SiteTracking>
  );
}
