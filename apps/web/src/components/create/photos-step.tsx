"use client";

import { Button } from "@stayzim/ui/components/button";
import { Spinner } from "@stayzim/ui/components/spinner";
import { cn } from "@stayzim/ui/lib/utils";
import { AnimatePresence, motion } from "framer-motion";
import { Rocket, Star, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { CreateActions, CreateHeading } from "@/components/create/frame";
import { MiniPreview } from "@/components/create/preview";
import { useLodge } from "@/components/dashboard/lodge-provider";
import { PhotoDropzone, UploadTile } from "@/components/dashboard/photo-tiles";
import type { usePhotoUploads } from "@/components/dashboard/use-photo-uploads";
import { siteHost } from "@/lib/lodge";
import { metaCreateStep } from "@/lib/meta-pixel";
import { trackCreateStep } from "@/lib/track";

/** Three photos make a site look real. More go up later, from Gallery. */
export const CREATE_PHOTOS = 3;

/** The photos so far for the preview: saved ones, then the ones still uploading (shown from the phone at once). */
export function previewPhotos(lodge: ReturnType<typeof useLodge>["lodge"], uploads: ReturnType<typeof usePhotoUploads>) {
  return [...lodge.gallery.map((photo) => photo.url), ...uploads.items.filter((item) => item.status !== "failed").map((item) => item.previewUrl)];
}

/** How ready the first look is: three bars that fill as photos go up. */
function FirstLook({ done }: { done: number }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-line bg-white px-3.5 py-3">
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="text-[13.5px] font-semibold text-ink">Your first look</span>
        <span className="text-[12.5px] text-muted">
          {done >= CREATE_PHOTOS ? "Looking good. That's all it needs." : "The outside, a room and the view work best."}
        </span>
      </span>
      <span className="flex gap-1" aria-hidden="true">
        {Array.from({ length: CREATE_PHOTOS }, (_, index) => (
          <span key={index} className="block h-1.5 w-6 overflow-hidden rounded-full bg-line">
            <motion.span
              className="block h-full origin-left rounded-full bg-success"
              initial={false}
              animate={{ scaleX: index < done ? 1 : 0 }}
              transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
            />
          </span>
        ))}
      </span>
      <span className="text-[13px] font-semibold text-ink-2 tabular-nums">
        {done} of {CREATE_PHOTOS}
      </span>
    </div>
  );
}

/**
 * Step 3 of 3: three photos straight from the phone (resized there first, so
 * they go up on slow data), then Go live. One is enough to go live; a wrong
 * one comes off with its ✕.
 */
export function PhotosStep({ uploads, onLive }: { uploads: ReturnType<typeof usePhotoUploads>; onLive: () => void }) {
  const { lodge, save } = useLodge();
  const [removing, setRemoving] = useState<string[]>([]);
  const count = lodge.gallery.length;
  const busy = uploads.items.filter((item) => item.status !== "failed").length;
  const tracked = useRef(false);

  // The funnel's "photo" step: the first photo is up
  useEffect(() => {
    if (count > 0 && !tracked.current) {
      tracked.current = true;
      trackCreateStep("photo");
      metaCreateStep("photo");
    }
  }, [count]);

  async function remove(id: string) {
    setRemoving((current) => [...current, id]);
    const error = await save(`/photos/${id}`, "DELETE");
    setRemoving((current) => current.filter((value) => value !== id));
    if (error) toast.error(error);
  }

  const done = Math.min(count, CREATE_PHOTOS);
  const shown = count + uploads.items.length;
  return (
    <>
      <MiniPreview name={lodge.name} host={siteHost(lodge)} themeColor={lodge.themeColor} photos={previewPhotos(lodge, uploads)} />
      <CreateHeading title="Add 3 photos">Straight from your phone. The first one goes at the top of your site.</CreateHeading>

      <div className="flex flex-col gap-4">
        {shown < CREATE_PHOTOS ? (
          <PhotoDropzone
            onFiles={uploads.add}
            size={shown === 0 ? "lg" : "sm"}
            title={shown === 0 ? "Drag photos here" : "Drag another photo here"}
            touchTitle={shown === 0 ? "Add photos from your phone" : "Add another photo"}
            action={shown === 0 ? "Upload photos" : "Add more"}
            note={shown === 0 ? undefined : "Resized on your phone first, so it goes up on slow data."}
            tip={shown === 0 ? "Daylight photos look best" : undefined}
          />
        ) : null}

        {shown > 0 ? (
          <ul className="grid grid-cols-3 gap-2 sm:gap-3" aria-label="Your photos">
            <AnimatePresence initial={false}>
              {lodge.gallery.map((photo, index) => {
                const going = removing.includes(photo.id);
                return (
                  <motion.li
                    key={photo.id}
                    layout
                    initial={{ opacity: 0, scale: 0.94 }}
                    animate={{ opacity: going ? 0.5 : 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    aria-busy={going || undefined}
                    className={cn("relative overflow-hidden rounded-xl", going && "pointer-events-none")}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element -- already resized on upload */}
                    <img src={photo.url} srcSet={photo.srcSet ?? undefined} sizes="200px" alt="" className="aspect-[4/3] w-full object-cover" />
                    {index === 0 ? (
                      <span className="absolute top-1.5 left-1.5 inline-flex items-center gap-1 rounded-full bg-ink/80 px-1.5 py-0.5 text-[10.5px] font-semibold text-white">
                        <Star className="size-2.5" />
                        Top
                      </span>
                    ) : null}
                    <button
                      type="button"
                      onClick={() => void remove(photo.id)}
                      aria-label={`Remove photo ${index + 1}`}
                      className="absolute top-1 right-1 flex size-8 items-center justify-center rounded-full bg-white/95 text-muted-2 shadow-xs transition-colors hover:text-danger"
                    >
                      {going ? <Spinner className="size-3.5" label="Removing photo" /> : <X className="size-3.5" />}
                    </button>
                  </motion.li>
                );
              })}
              {uploads.items.map((item) => (
                <li key={item.id}>
                  <UploadTile item={item} compact onRetry={() => uploads.retry(item.id)} onDismiss={() => uploads.dismiss(item.id)} />
                </li>
              ))}
            </AnimatePresence>
          </ul>
        ) : null}

        <FirstLook done={done} />
      </div>

      <CreateActions
        sticky={shown > 0}
        note={
          count === 0 && busy === 0
            ? null
            : count < CREATE_PHOTOS && busy === 0
              ? `Add ${CREATE_PHOTOS - count} more for the best first look, or go live now.`
              : "More photos go in Gallery, on your dashboard."
        }
      >
        <Button size="lg" className="w-full" onClick={onLive} disabled={count === 0 && busy === 0} loading={busy > 0}>
          {busy > 0 ? (
            `Uploading ${busy} ${busy === 1 ? "photo" : "photos"}`
          ) : (
            <>
              <Rocket />
              Go live
            </>
          )}
        </Button>
        {count === 0 && busy === 0 ? (
          <button type="button" onClick={onLive} className="self-center py-1.5 text-[12.5px] font-medium text-muted-2 underline-offset-2 hover:text-ink hover:underline">
            No photos on this phone? Go live without them
          </button>
        ) : null}
      </CreateActions>
    </>
  );
}
