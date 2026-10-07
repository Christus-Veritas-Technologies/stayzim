"use client";

import {
  AlertDialog,
  AlertDialogClose,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogTitle,
} from "@stayzim/ui/components/alert-dialog";
import { Badge } from "@stayzim/ui/components/badge";
import { Button, buttonVariants } from "@stayzim/ui/components/button";
import { Card } from "@stayzim/ui/components/card";
import { EmptyState } from "@stayzim/ui/components/empty-state";
import { Field, FormMessage } from "@stayzim/ui/components/field";
import { Input } from "@stayzim/ui/components/input";
import { Sheet, SheetBody, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@stayzim/ui/components/sheet";
import { Textarea } from "@stayzim/ui/components/textarea";
import { CONTENT_LIMITS, formatPostDate, readMinutes, todayInHarare, type Plan } from "@stayzim/sites";
import { postInput, postSlug } from "@stayzim/sites/schemas";
import { cn } from "@stayzim/ui/lib/utils";
import { ArrowUpRight, BookOpenText, Check, ImageOff, Pencil, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import type { LodgeContent } from "@/app/admin/lodges/[slug]/page";
import { api } from "@/lib/api";
import type { Photo } from "@/lib/lodge";
import { siteUrl } from "@/lib/site-host";

export type AdminPost = {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  body: string;
  coverId: string | null;
  publishedOn: string;
  updatedAt: string;
};

type Draft = { title: string; slug: string; excerpt: string; body: string; coverId: string | null; publishedOn: string };

const emptyDraft = (): Draft => ({ title: "", slug: "", excerpt: "", body: "", coverId: null, publishedOn: todayInHarare() });

/**
 * The lodge's journal: every post, newest first, with the editor in a sheet.
 * A post dated later waits until that day.
 */
export function JournalEditor({
  slug,
  lodge,
  posts,
  photos,
  onChanged,
}: {
  slug: string;
  lodge: { slug: string; plan: Plan };
  posts: AdminPost[];
  photos: Photo[];
  onChanged: (content: LodgeContent) => void;
}) {
  const today = todayInHarare();
  const [editing, setEditing] = useState<{ open: boolean; post: AdminPost | null; key: number }>({ open: false, post: null, key: 0 });
  const [removing, setRemoving] = useState<AdminPost | null>(null);
  const [busy, setBusy] = useState(false);
  const open = (post: AdminPost | null) => setEditing((current) => ({ open: true, post, key: current.key + 1 }));
  const cover = (post: AdminPost) => photos.find((photo) => photo.id === post.coverId);

  async function remove() {
    if (!removing) return;
    setBusy(true);
    const result = await api<LodgeContent>(`/api/admin/lodges/${encodeURIComponent(slug)}/posts/${removing.id}`, { method: "DELETE" });
    setBusy(false);
    if (result.error !== undefined) {
      toast.error(result.error);
      return;
    }
    toast.success("Post deleted");
    setRemoving(null);
    onChanged(result.data);
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-[13.5px] text-muted">Two posts a month on Pro. Written for guests first; search engines follow.</p>
        <Button onClick={() => open(null)}>
          <Plus />
          New post
        </Button>
      </div>

      {posts.length === 0 ? (
        <Card>
          <EmptyState icon={<BookOpenText />} title="No posts yet" description="Walks, food, when to come and how to get there: what guests ask before they book." />
        </Card>
      ) : (
        <Card className="overflow-hidden p-0">
          <ul className="divide-y divide-line-3">
            {posts.map((post) => {
              const waiting = post.publishedOn > today;
              const photo = cover(post);
              return (
                <li key={post.id} className="flex items-center gap-3 px-4 py-3.5 sm:px-5">
                  {photo ? (
                    // eslint-disable-next-line @next/next/no-img-element -- our own resized upload
                    <img src={photo.url} alt="" className="size-12 shrink-0 rounded-lg object-cover" />
                  ) : (
                    <span className="flex size-12 shrink-0 items-center justify-center rounded-lg bg-surface text-muted-2">
                      <ImageOff className="size-4" />
                    </span>
                  )}
                  <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <span className="flex flex-wrap items-center gap-2">
                      <span className="truncate text-[14.5px] font-semibold">{post.title}</span>
                      {waiting ? (
                        <Badge status variant="purple">
                          Scheduled
                        </Badge>
                      ) : null}
                    </span>
                    <span className="truncate text-[12.5px] text-muted">
                      {formatPostDate(post.publishedOn)} · {readMinutes(post.body)} min read · /journal/{post.slug}
                    </span>
                  </span>
                  <span className="flex shrink-0 gap-1">
                    {!waiting && lodge.plan === "PRO" ? (
                      <a
                        href={`${siteUrl(lodge)}/journal/${post.slug}`}
                        target="_blank"
                        rel="noreferrer"
                        aria-label={`Open ${post.title} on the site`}
                        className={buttonVariants({ variant: "ghost", size: "icon-sm" })}
                      >
                        <ArrowUpRight />
                      </a>
                    ) : null}
                    <Button variant="ghost" size="icon-sm" aria-label={`Edit ${post.title}`} onClick={() => open(post)}>
                      <Pencil />
                    </Button>
                    <Button variant="ghost" size="icon-sm" aria-label={`Delete ${post.title}`} onClick={() => setRemoving(post)}>
                      <Trash2 />
                    </Button>
                  </span>
                </li>
              );
            })}
          </ul>
        </Card>
      )}

      <PostSheet
        key={editing.key}
        open={editing.open}
        onOpenChange={(value) => setEditing((current) => ({ ...current, open: value }))}
        slug={slug}
        post={editing.post}
        photos={photos}
        onSaved={(content) => {
          setEditing((current) => ({ ...current, open: false }));
          onChanged(content);
        }}
      />

      <AlertDialog open={removing !== null} onOpenChange={(value) => !value && setRemoving(null)}>
        <AlertDialogContent>
          <AlertDialogTitle>Delete “{removing?.title}”?</AlertDialogTitle>
          <AlertDialogDescription>It comes off the site straight away, and its address stops working.</AlertDialogDescription>
          <AlertDialogFooter>
            <AlertDialogClose render={<Button variant="outline" />}>Keep it</AlertDialogClose>
            <Button variant="destructive" onClick={remove} loading={busy}>
              Delete post
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

/** Writing or editing one post. */
function PostSheet({
  open,
  onOpenChange,
  slug,
  post,
  photos,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  slug: string;
  post: AdminPost | null;
  photos: Photo[];
  onSaved: (content: LodgeContent) => void;
}) {
  const [draft, setDraft] = useState<Draft>(() =>
    post
      ? { title: post.title, slug: post.slug, excerpt: post.excerpt ?? "", body: post.body, coverId: post.coverId, publishedOn: post.publishedOn }
      : emptyDraft(),
  );
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const set = <K extends keyof Draft>(key: K, value: Draft[K]) => setDraft((current) => ({ ...current, [key]: value }));
  const address = draft.slug || postSlug(draft.title);

  async function save() {
    const parsed = postInput.safeParse(draft);
    if (!parsed.success) {
      setError(parsed.error.issues[0]!.message);
      return;
    }
    setError(null);
    setSaving(true);
    const path = `/api/admin/lodges/${encodeURIComponent(slug)}/posts${post ? `/${post.id}` : ""}`;
    const result = await api<{ content: LodgeContent }>(path, { method: post ? "PATCH" : "POST", json: parsed.data });
    setSaving(false);
    if (result.error !== undefined) {
      setError(result.error);
      return;
    }
    toast.success(post ? "Post saved" : "Post added", {
      description: parsed.data.publishedOn > todayInHarare() ? `It goes up on ${formatPostDate(parsed.data.publishedOn)}.` : "It's on the site now.",
    });
    onSaved(result.data.content);
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-[640px]">
        <SheetHeader>
          <SheetTitle>{post ? "Edit post" : "New post"}</SheetTitle>
          <SheetDescription>Plain text. Leave a blank line between paragraphs; start a line with ## for a heading.</SheetDescription>
        </SheetHeader>
        <SheetBody className="flex flex-col gap-4">
          <Field label="Title" count={{ value: draft.title.length, max: CONTENT_LIMITS.postTitle }}>
            <Input value={draft.title} onChange={(event) => set("title", event.target.value)} maxLength={CONTENT_LIMITS.postTitle} placeholder="A morning walk to Bridal Veil Falls" />
          </Field>
          <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_170px]">
            <Field label="Address" hint={address ? `/journal/${address}` : "Made from the title"}>
              <Input
                value={draft.slug}
                onChange={(event) => set("slug", event.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-"))}
                placeholder={postSlug(draft.title) || "made-from-the-title"}
                maxLength={CONTENT_LIMITS.postSlug}
              />
            </Field>
            <Field label="Goes up on" hint="Later dates wait">
              <Input type="date" value={draft.publishedOn} onChange={(event) => set("publishedOn", event.target.value)} />
            </Field>
          </div>
          <Field label="Summary" hint="For the list and search results" count={{ value: draft.excerpt.length, max: CONTENT_LIMITS.excerpt }}>
            <Textarea value={draft.excerpt} onChange={(event) => set("excerpt", event.target.value)} maxLength={CONTENT_LIMITS.excerpt} rows={2} />
          </Field>
          <Field label="Post" hint={draft.body.trim() ? `${readMinutes(draft.body)} min read` : undefined}>
            <Textarea
              value={draft.body}
              onChange={(event) => set("body", event.target.value)}
              maxLength={CONTENT_LIMITS.body}
              rows={14}
              placeholder={"Leave after breakfast and you'll have the falls to yourself.\n\n## Getting there\n\nTake the road past the village…"}
            />
          </Field>
          <Field label="Cover" hint={photos.length === 0 ? "This lodge has no photos yet" : "One of the lodge's photos"}>
            <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
              <button
                type="button"
                onClick={() => set("coverId", null)}
                aria-pressed={draft.coverId === null}
                className="flex aspect-square items-center justify-center rounded-lg border border-dashed border-line text-[12px] font-semibold text-muted aria-pressed:border-primary aria-pressed:text-primary"
              >
                None
              </button>
              {photos.map((photo) => (
                <button
                  key={photo.id}
                  type="button"
                  onClick={() => set("coverId", photo.id)}
                  aria-pressed={draft.coverId === photo.id}
                  aria-label={photo.caption || "Use this photo"}
                  className={cn("relative aspect-square overflow-hidden rounded-lg outline-none focus-visible:ring-3 focus-visible:ring-ring/30", draft.coverId === photo.id && "ring-2 ring-primary ring-offset-2")}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element -- our own resized upload */}
                  <img src={photo.url} alt="" loading="lazy" className="size-full object-cover" />
                  {draft.coverId === photo.id ? (
                    <span className="absolute top-1 right-1 flex size-5 items-center justify-center rounded-full bg-primary text-white">
                      <Check className="size-3" />
                    </span>
                  ) : null}
                </button>
              ))}
            </div>
          </Field>
          {error ? <FormMessage>{error}</FormMessage> : null}
        </SheetBody>
        <SheetFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={save} loading={saving}>
            {post ? "Save post" : "Add post"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
