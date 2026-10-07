"use client";

import { Badge } from "@stayzim/ui/components/badge";
import { Button, buttonVariants } from "@stayzim/ui/components/button";
import { Card } from "@stayzim/ui/components/card";
import { EmptyState } from "@stayzim/ui/components/empty-state";
import { Skeleton } from "@stayzim/ui/components/skeleton";
import { Tabs, TabsList, TabsTab } from "@stayzim/ui/components/tabs";
import { PLANS_LABEL, type Plan } from "@stayzim/sites";
import { ArrowLeft, ArrowUpRight, Info } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

import { JournalEditor, type AdminPost } from "@/components/admin/journal-editor";
import { ReviewsEditor, type AdminReviews } from "@/components/admin/reviews-editor";
import { Appear, Item, riseIn } from "@/components/motion";
import { api } from "@/lib/api";
import type { Photo } from "@/lib/lodge";
import { siteUrl } from "@/lib/site-host";

/** GET /api/admin/lodges/:slug/content (apps/server/src/routes/admin.ts) */
export type LodgeContent = {
  lodge: { name: string; slug: string; plan: Plan; status: string };
  reviews: AdminReviews;
  posts: AdminPost[];
  photos: Photo[];
};

type Tab = "reviews" | "journal";

/** One lodge's reviews and journal, kept by the StayZim team. */
export default function AdminLodgeContentPage() {
  const { slug } = useParams<{ slug: string }>();
  const [tab, setTab] = useState<Tab>("reviews");
  const [state, setState] = useState<{ kind: "loading" } | { kind: "ready"; content: LodgeContent } | { kind: "error"; message: string }>({ kind: "loading" });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let current = true;
    void api<LodgeContent>(`/api/admin/lodges/${encodeURIComponent(slug)}/content`).then((result) => {
      if (!current) return;
      setState(result.error === undefined ? { kind: "ready", content: result.data } : { kind: "error", message: result.error });
    });
    return () => {
      current = false;
    };
  }, [slug, attempt]);

  const onChanged = (content: LodgeContent) => setState({ kind: "ready", content });

  return (
    <Appear className="flex flex-col gap-5" stagger={0.06}>
      <Item variants={riseIn}>
        <Link href="/admin/lodges" className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-muted hover:text-ink">
          <ArrowLeft className="size-4" />
          All lodges
        </Link>
      </Item>

      {state.kind === "loading" ? (
        <Item variants={riseIn} className="flex flex-col gap-3" aria-busy="true">
          <Skeleton className="h-9 w-64" />
          <Skeleton className="h-[320px] w-full rounded-[20px]" />
        </Item>
      ) : state.kind === "error" ? (
        <Item variants={riseIn}>
          <Card>
            <EmptyState
              title="This lodge didn't load"
              description={state.message}
              action={
                <Button variant="outline" onClick={() => setAttempt((value) => value + 1)}>
                  Try again
                </Button>
              }
            />
          </Card>
        </Item>
      ) : (
        <>
          <Item variants={riseIn} className="flex flex-wrap items-end justify-between gap-3">
            <div className="flex flex-col gap-1">
              <h1 className="flex flex-wrap items-center gap-2.5 font-display text-2xl leading-8 font-semibold tracking-[-0.02em] lg:text-[28px] lg:leading-[34px]">
                {state.content.lodge.name}
                <Badge variant={state.content.lodge.plan === "PRO" ? "purple" : "neutral"}>{PLANS_LABEL[state.content.lodge.plan]}</Badge>
              </h1>
              <p className="text-[13.5px] text-muted">{state.content.lodge.slug}</p>
            </div>
            <a href={siteUrl({ slug: state.content.lodge.slug })} target="_blank" rel="noreferrer" className={buttonVariants({ variant: "outline", size: "sm" })}>
              View site
              <ArrowUpRight />
            </a>
          </Item>

          {state.content.lodge.plan !== "PRO" ? (
            <Item variants={riseIn}>
              <p className="flex items-start gap-2.5 rounded-2xl bg-purple-tint px-4 py-3 text-[13.5px] text-purple-dark">
                <Info className="mt-0.5 size-4 shrink-0" />
                Reviews and the journal show on Pro sites only. What you save here waits until this lodge is on Pro.
              </p>
            </Item>
          ) : null}

          <Item variants={riseIn}>
            <Tabs value={tab} onValueChange={(value) => setTab(value as Tab)}>
              <TabsList aria-label="Content">
                <TabsTab value="reviews">Reviews</TabsTab>
                <TabsTab value="journal">
                  Journal
                  {state.content.posts.length > 0 ? (
                    <Badge variant={tab === "journal" ? "inverse" : "neutral"} className="h-5 px-1.5">
                      {state.content.posts.length}
                    </Badge>
                  ) : null}
                </TabsTab>
              </TabsList>
            </Tabs>
          </Item>

          <Item variants={riseIn}>
            {tab === "reviews" ? (
              <ReviewsEditor key={`${slug}-reviews`} slug={slug} reviews={state.content.reviews} onSaved={onChanged} />
            ) : (
              <JournalEditor slug={slug} lodge={state.content.lodge} posts={state.content.posts} photos={state.content.photos} onChanged={onChanged} />
            )}
          </Item>
        </>
      )}
    </Appear>
  );
}
