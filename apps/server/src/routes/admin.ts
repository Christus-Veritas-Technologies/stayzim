import prisma from "@stayzim/db";
import { Hono } from "hono";
import { createMiddleware } from "hono/factory";
import { HTTPException } from "hono/http-exception";
import { z } from "zod";

import { postInput, postSlug, reviewsInput } from "@stayzim/sites/schemas";

import { photoJson } from "../lib/lodge";
import { requireAuth, withSession, type AuthVariables } from "../lib/session";
import { validJson } from "../lib/validate";

/** StayZim staff only (accounts made with `create-owner --admin`). */
const requireAdmin = createMiddleware<{ Variables: AuthVariables }>(async (c, next) => {
  if (c.get("user")?.role !== "ADMIN") throw new HTTPException(403, { message: "This is for the StayZim team" });
  await next();
});

const listQuery = z.object({
  /** open: open and in progress, oldest first (the queue). done: done and declined. all: everything, newest first. */
  status: z.enum(["open", "done", "all"]).default("open"),
});

const updateSchema = z.object({
  status: z.enum(["OPEN", "IN_PROGRESS", "DONE", "DECLINED"]),
  reply: z
    .string()
    .trim()
    .max(1000, "Keep the reply under 1000 characters")
    .nullable()
    .optional()
    .transform((value) => value || null),
});

type RequestWithLodge = {
  id: string;
  reference: string;
  topic: string;
  message: string;
  status: string;
  reply: string | null;
  createdAt: Date;
  resolvedAt: Date | null;
  lodge: { name: string; slug: string; whatsapp: string | null; owner: { name: string; email: string } };
};

function adminRequestJson(request: RequestWithLodge) {
  const { id, reference, topic, message, status, reply, createdAt, resolvedAt, lodge } = request;
  return {
    id,
    reference,
    topic,
    message,
    status,
    reply,
    createdAt,
    resolvedAt,
    lodge: { name: lodge.name, slug: lodge.slug, whatsapp: lodge.whatsapp, ownerName: lodge.owner.name, ownerEmail: lodge.owner.email },
  };
}

const withLodge = { lodge: { select: { name: true, slug: true, whatsapp: true, owner: { select: { name: true, email: true } } } } } as const;

const lodgeListQuery = z.object({ q: z.string().trim().max(80).default("") });

/** A lodge by its slug, or 404. */
async function lodgeBySlug(slug: string) {
  const lodge = await prisma.lodge.findUnique({
    where: { slug: slug.toLowerCase() },
    select: { id: true, name: true, slug: true, plan: true, status: true, reviewScore: true, reviewCount: true, reviewSource: true, reviewUrl: true },
  });
  if (!lodge) throw new HTTPException(404, { message: "No lodge with that address" });
  return lodge;
}

type StoredAdminPost = { id: string; slug: string; title: string; excerpt: string | null; body: string; coverId: string | null; publishedOn: string; updatedAt: Date };

function adminPostJson({ id, slug, title, excerpt, body, coverId, publishedOn, updatedAt }: StoredAdminPost) {
  return { id, slug, title, excerpt, body, coverId, publishedOn, updatedAt };
}

/** Everything the content screen shows for one lodge. */
async function lodgeContent(lodgeId: string) {
  const lodge = await prisma.lodge.findUniqueOrThrow({
    where: { id: lodgeId },
    select: {
      name: true,
      slug: true,
      plan: true,
      status: true,
      reviewScore: true,
      reviewCount: true,
      reviewSource: true,
      reviewUrl: true,
      reviews: { orderBy: { position: "asc" } },
      posts: { orderBy: [{ publishedOn: "desc" }, { createdAt: "desc" }] },
      photos: { orderBy: [{ roomId: "asc" }, { position: "asc" }] },
    },
  });
  return {
    lodge: { name: lodge.name, slug: lodge.slug, plan: lodge.plan, status: lodge.status },
    reviews: {
      score: lodge.reviewScore,
      count: lodge.reviewCount,
      source: lodge.reviewSource ?? "Booking.com",
      url: lodge.reviewUrl,
      quotes: lodge.reviews.map(({ quote, author, origin, stayed, score }) => ({ quote, author, origin, stayed, score })),
    },
    posts: lodge.posts.map(adminPostJson),
    photos: lodge.photos.map(photoJson),
  };
}

/** A post's cover must be one of the lodge's own photos. */
async function checkCover(lodgeId: string, coverId: string | null) {
  if (!coverId) return;
  const photo = await prisma.photo.findFirst({ where: { id: coverId, lodgeId }, select: { id: true } });
  if (!photo) throw new HTTPException(400, { message: "Pick one of the lodge's photos for the cover" });
}

/** Saves a post, turning a clash on the address into a sentence. */
async function savePost(save: () => Promise<StoredAdminPost>) {
  try {
    return await save();
  } catch (error) {
    // P2002: the unique (lodge, slug) index
    if (typeof error === "object" && error !== null && "code" in error && error.code === "P2002") {
      throw new HTTPException(409, { message: "Another post already uses that address. Change the address or the title." });
    }
    throw error;
  }
}

/** /api/admin: StayZim's own tools: owners' change requests, and the reviews and journal on Pro sites. */
export const admin = new Hono<{ Variables: AuthVariables }>()
  .use(withSession, requireAuth(), requireAdmin)

  .get("/requests", async (c) => {
    const query = listQuery.safeParse(c.req.query());
    if (!query.success) throw new HTTPException(400, { message: "Check the filter" });
    const { status } = query.data;
    const list = await prisma.changeRequest.findMany({
      where:
        status === "open"
          ? { status: { in: ["OPEN", "IN_PROGRESS"] } }
          : status === "done"
            ? { status: { in: ["DONE", "DECLINED"] } }
            : {},
      orderBy: { createdAt: status === "open" ? "asc" : "desc" },
      include: withLodge,
      take: 200,
    });
    const [open, inProgress] = await Promise.all([
      prisma.changeRequest.count({ where: { status: "OPEN" } }),
      prisma.changeRequest.count({ where: { status: "IN_PROGRESS" } }),
    ]);
    return c.json({ requests: list.map(adminRequestJson), counts: { open, inProgress } });
  })

  /** Moves a request along, with an optional note the owner sees under their request. */
  .patch("/requests/:id", validJson(updateSchema), async (c) => {
    const { status, reply } = c.req.valid("json");
    const existing = await prisma.changeRequest.findUnique({ where: { id: c.req.param("id") }, select: { id: true, reply: true } });
    if (!existing) throw new HTTPException(404, { message: "That request no longer exists" });
    const updated = await prisma.changeRequest.update({
      where: { id: existing.id },
      data: {
        status,
        // Leaving the reply out keeps the one already there
        reply: reply === undefined ? existing.reply : reply,
        resolvedAt: status === "DONE" || status === "DECLINED" ? new Date() : null,
      },
      include: withLodge,
    });
    return c.json(adminRequestJson(updated));
  })

  /** Lodges for the content screen, Pro first. */
  .get("/lodges", async (c) => {
    const query = lodgeListQuery.safeParse(c.req.query());
    const q = query.success ? query.data.q : "";
    const lodges = await prisma.lodge.findMany({
      where: q ? { OR: [{ name: { contains: q, mode: "insensitive" } }, { slug: { contains: q.toLowerCase() } }] } : {},
      select: { name: true, slug: true, plan: true, status: true, reviewScore: true, _count: { select: { reviews: true, posts: true } } },
      orderBy: [{ plan: "desc" }, { name: "asc" }],
      take: 100,
    });
    return c.json({
      lodges: lodges.map(({ _count, ...lodge }) => ({ ...lodge, quotes: _count.reviews, posts: _count.posts })),
    });
  })

  .get("/lodges/:slug/content", async (c) => {
    const lodge = await lodgeBySlug(c.req.param("slug"));
    return c.json(await lodgeContent(lodge.id));
  })

  /** The score and the quotes, saved together (the quotes in the order sent). */
  .put("/lodges/:slug/reviews", validJson(reviewsInput), async (c) => {
    const lodge = await lodgeBySlug(c.req.param("slug"));
    const { score, count, source, url, quotes } = c.req.valid("json");
    await prisma.$transaction([
      prisma.lodge.update({ where: { id: lodge.id }, data: { reviewScore: score, reviewCount: count, reviewSource: source, reviewUrl: url } }),
      prisma.review.deleteMany({ where: { lodgeId: lodge.id } }),
      prisma.review.createMany({ data: quotes.map((quote, position) => ({ ...quote, lodgeId: lodge.id, position })) }),
    ]);
    return c.json(await lodgeContent(lodge.id));
  })

  .post("/lodges/:slug/posts", validJson(postInput), async (c) => {
    const lodge = await lodgeBySlug(c.req.param("slug"));
    const input = c.req.valid("json");
    await checkCover(lodge.id, input.coverId);
    const slug = input.slug || postSlug(input.title) || "post";
    const post = await savePost(() => prisma.post.create({ data: { ...input, slug, lodgeId: lodge.id } }));
    return c.json({ post: adminPostJson(post), content: await lodgeContent(lodge.id) }, 201);
  })

  .patch("/lodges/:slug/posts/:id", validJson(postInput), async (c) => {
    const lodge = await lodgeBySlug(c.req.param("slug"));
    const existing = await prisma.post.findFirst({ where: { id: c.req.param("id"), lodgeId: lodge.id }, select: { id: true } });
    if (!existing) throw new HTTPException(404, { message: "That post no longer exists" });
    const input = c.req.valid("json");
    await checkCover(lodge.id, input.coverId);
    const slug = input.slug || postSlug(input.title) || "post";
    const post = await savePost(() => prisma.post.update({ where: { id: existing.id }, data: { ...input, slug } }));
    return c.json({ post: adminPostJson(post), content: await lodgeContent(lodge.id) });
  })

  .delete("/lodges/:slug/posts/:id", async (c) => {
    const lodge = await lodgeBySlug(c.req.param("slug"));
    const removed = await prisma.post.deleteMany({ where: { id: c.req.param("id"), lodgeId: lodge.id } });
    if (removed.count === 0) throw new HTTPException(404, { message: "That post no longer exists" });
    return c.json(await lodgeContent(lodge.id));
  });
