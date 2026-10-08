import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { JournalList, journalUrl } from "@/components/site/journal";
import { getJournal, getSite } from "@/lib/site";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const site = await getSite((await params).slug);
  if (site?.status !== "LIVE") return { title: { absolute: "Not found" }, robots: { index: false } };
  return {
    title: { absolute: `Journal · ${site.name}` },
    description: `Notes from ${site.town ?? site.name}: walks, food and when to come, from ${site.name}.`,
    alternates: { canonical: journalUrl(site) },
    ...(site.demo ? { robots: { index: false, follow: false } } : {}),
  };
}

/** {slug}.stayzim.co.zw/journal: a Pro site's posts, newest first. */
export default async function JournalPage({ params }: Props) {
  const { slug } = await params;
  const [site, posts] = await Promise.all([getSite(slug), getJournal(slug)]);
  if (site?.status !== "LIVE" || !posts) notFound();
  return <JournalList site={site} posts={posts} />;
}
