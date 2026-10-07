import prisma from "@stayzim/db";
import { CONTENT_LIMITS, readMinutes, todayInHarare, type Plan, type SitePost, type SitePostFull, type SiteReviews } from "@stayzim/sites";

import { photoSrcSet, uploadUrl } from "./uploads";

/*
 * Reviews and journal posts: Pro sites only, entered by the StayZim team
 * (routes/admin.ts) and read by lodge sites (routes/sites.ts).
 */

const coverSelect = { select: { key: true, mediumKey: true, smallKey: true, width: true, height: true } } as const;

type StoredPost = {
  slug: string;
  title: string;
  excerpt: string | null;
  body: string;
  publishedOn: string;
  cover: { key: string; mediumKey: string | null; smallKey: string | null; width: number; height: number } | null;
};

export function postJson(post: StoredPost): SitePost {
  return {
    slug: post.slug,
    title: post.title,
    excerpt: post.excerpt,
    publishedOn: post.publishedOn,
    readMinutes: readMinutes(post.body),
    cover: post.cover ? { url: uploadUrl(post.cover.key), srcSet: photoSrcSet(post.cover), width: post.cover.width, height: post.cover.height } : null,
  };
}

/** Posts guests can see: published today or earlier (Harare), newest first. */
export async function publishedPosts(lodgeId: string, take?: number): Promise<SitePost[]> {
  const posts = await prisma.post.findMany({
    where: { lodgeId, publishedOn: { lte: todayInHarare() } },
    orderBy: [{ publishedOn: "desc" }, { createdAt: "desc" }],
    include: { cover: coverSelect },
    take,
  });
  return posts.map(postJson);
}

export async function publishedPost(lodgeId: string, slug: string): Promise<SitePostFull | null> {
  const post = await prisma.post.findUnique({ where: { lodgeId_slug: { lodgeId, slug } }, include: { cover: coverSelect } });
  if (!post || post.publishedOn > todayInHarare()) return null;
  return { ...postJson(post), body: post.body };
}

/** The lodge's score and quotes, or null when there's nothing to show. */
export async function siteReviews(lodge: {
  id: string;
  reviewScore: number | null;
  reviewCount: number | null;
  reviewSource: string | null;
  reviewUrl: string | null;
}): Promise<SiteReviews | null> {
  const quotes = await prisma.review.findMany({ where: { lodgeId: lodge.id }, orderBy: { position: "asc" }, take: CONTENT_LIMITS.quotes });
  if (lodge.reviewScore === null && quotes.length === 0) return null;
  return {
    score: lodge.reviewScore,
    count: lodge.reviewCount,
    source: lodge.reviewSource ?? "Booking.com",
    url: lodge.reviewUrl,
    quotes: quotes.map(({ quote, author, origin, stayed, score }) => ({ quote, author, origin, stayed, score })),
  };
}

/** What a Pro site adds to its page; empty on other plans. */
export async function proContent(lodge: Parameters<typeof siteReviews>[0] & { plan: Plan }) {
  if (lodge.plan !== "PRO") return { reviews: null, journal: [] };
  const [reviews, journal] = await Promise.all([siteReviews(lodge), publishedPosts(lodge.id, CONTENT_LIMITS.latestPosts)]);
  return { reviews, journal };
}
