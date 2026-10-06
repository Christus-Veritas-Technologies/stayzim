"use client";

import {
  AlertDialog,
  AlertDialogClose,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogIcon,
  AlertDialogTitle,
} from "@stayzim/ui/components/alert-dialog";
import { Button } from "@stayzim/ui/components/button";
import { Spinner } from "@stayzim/ui/components/spinner";
import { Tooltip, TooltipContent, TooltipTrigger } from "@stayzim/ui/components/tooltip";
import { cn } from "@stayzim/ui/lib/utils";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, ArrowRight, GripVertical, ImagePlus, Images, Star, Trash2, Upload } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { useLodge } from "@/components/dashboard/lodge-provider";
import { Page, PageHeader, PageSection } from "@/components/dashboard/page";
import { AddPhotosTile, FullTile, UploadTile } from "@/components/dashboard/photo-tiles";
import { usePhotoUploads } from "@/components/dashboard/use-photo-uploads";
import { WhyDisabled } from "@/components/why-disabled";
import { GALLERY_GOAL, type Photo } from "@/lib/lodge";

const GALLERY_LIMIT = 30;

/** Purple banner until the gallery has enough photos for the setup checklist. */
function GoalBanner({ count }: { count: number }) {
  if (count >= GALLERY_GOAL) return null;
  const missing = GALLERY_GOAL - count;
  return (
    <div className="flex flex-col gap-3 rounded-[14px] border border-purple-line bg-purple-tint px-4 py-3 sm:flex-row sm:items-center">
      <span className="flex size-9 shrink-0 items-center justify-center rounded-[10px] bg-white text-purple shadow-xs">
        <Images className="size-[18px]" strokeWidth={1.75} />
      </span>
      <span className="flex flex-1 flex-col">
        <span className="text-[14px] font-semibold text-purple-ink">
          Add {missing} more {missing === 1 ? "photo" : "photos"} to finish setup
        </span>
        <span className="text-[13px] text-muted">Rooms, the view and breakfast all work well.</span>
      </span>
      <span className="flex items-center gap-3">
        <span className="flex gap-1" aria-hidden="true">
          {Array.from({ length: GALLERY_GOAL }, (_, index) => (
            <span key={index} className={cn("h-1.5 w-6 rounded-full transition-colors duration-500", index < count ? "bg-purple" : "bg-purple-line")} />
          ))}
        </span>
        <span className="text-[13px] font-semibold text-purple-ink tabular-nums">
          {count} of {GALLERY_GOAL}
        </span>
      </span>
    </div>
  );
}

function CaptionEditor({ photo, fallback }: { photo: Photo; fallback: string }) {
  const { save } = useLodge();
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(photo.caption);

  async function commit() {
    setEditing(false);
    if (value.trim() === photo.caption) return;
    const error = await save(`/photos/${photo.id}`, "PATCH", { caption: value.trim() });
    if (error) {
      toast.error(error);
      setValue(photo.caption);
    }
  }

  if (editing) {
    return (
      <input
        autoFocus
        value={value}
        maxLength={80}
        onChange={(event) => setValue(event.target.value)}
        onBlur={commit}
        onKeyDown={(event) => {
          if (event.key === "Enter") event.currentTarget.blur();
          if (event.key === "Escape") {
            setValue(photo.caption);
            setEditing(false);
          }
        }}
        aria-label="Caption"
        placeholder="Add a caption"
        className="-mx-1 h-7 rounded-md border border-ring bg-white px-1 text-[13.5px] font-semibold outline-none ring-3 ring-ring/20"
      />
    );
  }
  return (
    <button
      type="button"
      onClick={() => setEditing(true)}
      className="truncate text-left text-[13.5px] font-semibold hover:text-brand"
      title="Edit caption"
    >
      {photo.caption || <span className="text-muted-2">{fallback}</span>}
    </button>
  );
}

export default function GalleryPage() {
  const { lodge, save } = useLodge();
  const uploads = usePhotoUploads({ limit: GALLERY_LIMIT, existing: lodge.gallery.length });
  const [order, setOrder] = useState<string[]>(() => lodge.gallery.map((photo) => photo.id));
  const [dragging, setDragging] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<Photo | null>(null);
  const [busyDelete, setBusyDelete] = useState(false);
  /** The photo whose move is saving */
  const [moving, setMoving] = useState<string | null>(null);
  const picker = useRef<HTMLInputElement>(null);

  // Follow the saved order (uploads, deletes, another tab)
  useEffect(() => setOrder(lodge.gallery.map((photo) => photo.id)), [lodge.gallery]);

  const photos = order.map((id) => lodge.gallery.find((photo) => photo.id === id)).filter((photo): photo is Photo => Boolean(photo));
  const heroId = lodge.heroPhotoId ?? photos[0]?.id;

  async function saveOrder(ids: string[], movedId: string) {
    setOrder(ids);
    if (ids.join() === lodge.gallery.map((photo) => photo.id).join()) return;
    setMoving(movedId);
    const error = await save("/photos/order", "PUT", { roomId: null, ids });
    setMoving(null);
    if (error) {
      toast.error(error);
      setOrder(lodge.gallery.map((photo) => photo.id));
    }
  }

  function move(id: string, by: number) {
    const from = order.indexOf(id);
    const to = from + by;
    if (to < 0 || to >= order.length) return;
    const next = [...order];
    next.splice(to, 0, next.splice(from, 1)[0]!);
    void saveOrder(next, id);
  }

  async function makeHero(photo: Photo) {
    const error = await save("", "PATCH", { heroPhotoId: photo.id });
    if (error) toast.error(error);
    else toast.success("Hero photo changed", { description: "It's the first thing guests see." });
  }

  async function confirmDelete() {
    if (!deleting) return;
    setBusyDelete(true);
    const error = await save(`/photos/${deleting.id}`, "DELETE");
    setBusyDelete(false);
    if (error) toast.error(error);
    else setDeleting(null);
  }

  const full = lodge.gallery.length + uploads.items.length >= GALLERY_LIMIT;

  return (
    <Page>
      <PageHeader
        sitePage
        title="Gallery"
        count={lodge.gallery.length}
        description="Drag to reorder. The first photo is your hero unless you pick another."
        actions={
          <>
            <AnimatePresence>
              {moving ? (
                <motion.span
                  initial={{ opacity: 0, x: 8 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0 }}
                  role="status"
                  className="inline-flex items-center gap-1.5 text-[13px] text-muted"
                >
                  <Spinner className="size-3.5 text-brand" />
                  Saving order…
                </motion.span>
              ) : null}
            </AnimatePresence>
            <WhyDisabled reason={full ? `The gallery holds up to ${GALLERY_LIMIT} photos` : null}>
              <Button onClick={() => picker.current?.click()} disabled={full}>
                <Upload />
                <span className="hidden sm:inline">Upload photos</span>
                <span className="sm:hidden">Upload</span>
              </Button>
            </WhyDisabled>
          </>
        }
      />
      <input
        ref={picker}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        multiple
        className="sr-only"
        tabIndex={-1}
        aria-label="Upload photos"
        onChange={(event) => {
          if (event.target.files?.length) uploads.add(event.target.files);
          event.target.value = "";
        }}
      />

      <PageSection>
        <GoalBanner count={lodge.gallery.length} />
      </PageSection>

      <PageSection>
        <motion.ul layout className="grid grid-cols-2 gap-x-3 gap-y-5 md:grid-cols-3 xl:grid-cols-4 xl:gap-x-4">
          <AnimatePresence initial={false}>
            {photos.map((photo, index) => {
              const hero = photo.id === heroId;
              const busy = moving === photo.id || (busyDelete && deleting?.id === photo.id);
              return (
                <motion.li
                  key={photo.id}
                  layout
                  initial={{ opacity: 0, scale: 0.94 }}
                  animate={{ opacity: dragging === photo.id || busy ? 0.5 : 1, scale: 1 }}
                  aria-busy={busy || undefined}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ type: "spring", stiffness: 380, damping: 32 }}
                  draggable
                  onDragStartCapture={(event) => {
                    setDragging(photo.id);
                    event.dataTransfer.effectAllowed = "move";
                  }}
                  onDragEndCapture={() => setDragging(null)}
                  onDragOver={(event) => {
                    if (!dragging || dragging === photo.id) return;
                    event.preventDefault();
                    // Live preview of the new order while dragging
                    setOrder((current) => {
                      const next = current.filter((id) => id !== dragging);
                      next.splice(next.indexOf(photo.id) + (current.indexOf(dragging) < current.indexOf(photo.id) ? 1 : 0), 0, dragging);
                      return next.join() === current.join() ? current : next;
                    });
                  }}
                  onDrop={(event) => {
                    event.preventDefault();
                    if (dragging) void saveOrder(order, dragging);
                    setDragging(null);
                  }}
                  className={cn("group flex flex-col gap-2", busy && "pointer-events-none")}
                >
                  <div
                    className={cn(
                      "relative aspect-[4/3] cursor-grab overflow-hidden rounded-xl bg-surface-2 active:cursor-grabbing",
                      hero && "ring-2 ring-brand ring-offset-2",
                    )}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element -- photos come from our upload server */}
                    <img
                      src={photo.url}
                      alt={photo.caption}
                      loading="lazy"
                      draggable={false}
                      className="size-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                    />
                    {busy ? (
                      <span className="absolute inset-0 flex items-center justify-center">
                        <span className="flex size-9 items-center justify-center rounded-full bg-white/95 text-brand shadow-xs">
                          <Spinner label="Saving" />
                        </span>
                      </span>
                    ) : null}
                    {hero ? (
                      <span className="absolute top-2 left-2 inline-flex items-center gap-1 rounded-full bg-white/95 px-2 py-1 text-xs font-semibold text-ink shadow-xs">
                        <Star className="size-3.5 fill-brand text-brand" />
                        Hero
                      </span>
                    ) : null}

                    {/* Controls: on hover with a mouse, always on touch screens */}
                    <div className="absolute top-2 right-2 flex gap-1 transition-opacity [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-focus-within:opacity-100 [@media(hover:hover)]:group-hover:opacity-100">
                      {hero ? null : (
                        <Tooltip>
                          <TooltipTrigger
                            render={
                              <button
                                type="button"
                                onClick={() => makeHero(photo)}
                                aria-label="Make this the hero photo"
                                className="flex size-8 items-center justify-center rounded-lg bg-white/95 text-slate shadow-xs hover:text-brand"
                              />
                            }
                          >
                            <Star className="size-4" />
                          </TooltipTrigger>
                          <TooltipContent>Make hero</TooltipContent>
                        </Tooltip>
                      )}
                      <Tooltip>
                        <TooltipTrigger
                          render={
                            <button
                              type="button"
                              onClick={() => setDeleting(photo)}
                              aria-label="Delete photo"
                              className="flex size-8 items-center justify-center rounded-lg bg-white/95 text-slate shadow-xs hover:text-danger"
                            />
                          }
                        >
                          <Trash2 className="size-4" />
                        </TooltipTrigger>
                        <TooltipContent>Delete</TooltipContent>
                      </Tooltip>
                    </div>

                    <div className="absolute bottom-2 left-2 flex gap-1 transition-opacity [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-focus-within:opacity-100 [@media(hover:hover)]:group-hover:opacity-100">
                      <span className="hidden size-8 items-center justify-center rounded-lg bg-white/95 text-muted-2 shadow-xs [@media(hover:hover)]:flex" aria-hidden="true">
                        <GripVertical className="size-4" />
                      </span>
                      <button
                        type="button"
                        onClick={() => move(photo.id, -1)}
                        disabled={index === 0}
                        aria-label="Move earlier"
                        className="flex size-8 items-center justify-center rounded-lg bg-white/95 text-slate shadow-xs hover:text-ink disabled:opacity-40"
                      >
                        <ArrowLeft className="size-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => move(photo.id, 1)}
                        disabled={index === photos.length - 1}
                        aria-label="Move later"
                        className="flex size-8 items-center justify-center rounded-lg bg-white/95 text-slate shadow-xs hover:text-ink disabled:opacity-40"
                      >
                        <ArrowRight className="size-4" />
                      </button>
                    </div>
                  </div>
                  <span className="flex min-w-0 flex-col">
                    <CaptionEditor photo={photo} fallback={`Photo ${index + 1}`} />
                    <span className="text-xs text-muted">{hero ? "Shown first on your site" : `Photo ${index + 1}`}</span>
                  </span>
                </motion.li>
              );
            })}

            {uploads.items.map((item) => (
              <li key={item.id}>
                <UploadTile item={item} onRetry={() => uploads.retry(item.id)} onDismiss={() => uploads.dismiss(item.id)} />
              </li>
            ))}
          </AnimatePresence>

          <li>{full ? <FullTile limit={GALLERY_LIMIT} /> : <AddPhotosTile onFiles={uploads.add} />}</li>
        </motion.ul>
        <p className="mt-5 hidden text-center text-[12.5px] text-muted-2 max-sm:block">
          <ImagePlus className="mr-1 inline size-3.5" />
          Use the arrows to move a photo earlier or later.
        </p>
      </PageSection>

      <AlertDialog open={deleting !== null} onOpenChange={(open) => !open && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogIcon>
            <Trash2 />
          </AlertDialogIcon>
          <AlertDialogTitle>Delete this photo?</AlertDialogTitle>
          <AlertDialogDescription>
            It disappears from your site straight away.
            {deleting?.id === heroId ? " Your next photo becomes the hero." : ""} You can't undo this.
          </AlertDialogDescription>
          <AlertDialogFooter>
            <AlertDialogClose render={<Button variant="outline" />}>Keep photo</AlertDialogClose>
            <Button variant="destructive" onClick={confirmDelete} loading={busyDelete}>
              Delete photo
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Page>
  );
}
