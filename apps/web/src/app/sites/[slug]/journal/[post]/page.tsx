import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { JournalPost, journalUrl } from "@/components/site/journal";
import { lodgeShareMetadata } from "@/lib/share-metadata";
import { getPost, getSite } from "@/lib/site";
import { jsonLd, postStructuredData } from "@/lib/structured-data";

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
    ...lodgeShareMetadata(site, {
      title: post.title,
      description,
      url: journalUrl(site, post.slug),
      type: "article",
      image: post.cover ? { url: post.cover.url, alt: post.title } : undefined,
    }),
    ...(site.demo ? { robots: { index: false, follow: false } } : {}),
  };
}

/** {slug}.stayzim.co.zw/journal/{post}: one journal post. */
export default async function JournalPostPage({ params }: Props) {
  const { slug, post: postSlug } = await params;
  const [site, post] = await Promise.all([getSite(slug), getPost(slug, postSlug)]);
  if (site?.status !== "LIVE" || !post) notFound();
  return (
    <>
      {/* eslint-disable-next-line react/no-danger -- our own JSON, with "<" escaped */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(postStructuredData(site, post)) }} />
      <JournalPost site={site} post={post} />
    </>
  );
}
