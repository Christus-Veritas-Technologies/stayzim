"use client";

import { Button } from "@stayzim/ui/components/button";
import { AnimatePresence, motion } from "framer-motion";
import { Check, Rocket, Star } from "lucide-react";
import { useEffect, useRef } from "react";

import { CreateHeading } from "@/components/create/frame";
import { MiniPreview } from "@/components/create/preview";
import { useLodge } from "@/components/dashboard/lodge-provider";
import { AddPhotosTile, UploadTile } from "@/components/dashboard/photo-tiles";
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

/**
 * Step 2 of 2: three photos straight from the phone (resized there first, so
 * they go up on slow data), then Go live. One is enough to go live.
 */
export function PhotosStep({ uploads, onLive }: { uploads: ReturnType<typeof usePhotoUploads>; onLive: () => void }) {
  const { lodge } = useLodge();
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

  const done = Math.min(count, CREATE_PHOTOS);
  return (
    <>
      <MiniPreview name={lodge.name} host={siteHost(lodge)} themeColor={lodge.themeColor} photos={previewPhotos(lodge, uploads)} />
      <CreateHeading title="Add 3 photos">The outside, a room and the view work best. The first one goes at the top of your site.</CreateHeading>

      <ol className="mb-4 flex gap-2" aria-label={`${done} of ${CREATE_PHOTOS} photos`}>
        {Array.from({ length: CREATE_PHOTOS }, (_, index) => (
          <li
            key={index}
            className={`flex size-7 items-center justify-center rounded-full text-[12.5px] font-semibold transition-colors ${index < done ? "bg-success text-white" : "bg-surface text-muted-2"}`}
          >
            {index < done ? <Check className="size-3.5" /> : index + 1}
          </li>
        ))}
      </ol>

      <ul className="grid grid-cols-3 gap-2">
        <AnimatePresence initial={false}>
          {lodge.gallery.map((photo, index) => (
            <motion.li key={photo.id} layout initial={{ opacity: 0, scale: 0.94 }} animate={{ opacity: 1, scale: 1 }} className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element -- already resized on upload */}
              <img src={photo.url} srcSet={photo.srcSet ?? undefined} sizes="160px" alt="" className="aspect-[4/3] w-full rounded-xl object-cover" />
              {index === 0 ? (
                <span className="absolute top-1.5 left-1.5 inline-flex items-center gap-1 rounded-full bg-ink/80 px-1.5 py-0.5 text-[10.5px] font-semibold text-white">
                  <Star className="size-2.5" />
                  Top
                </span>
              ) : null}
            </motion.li>
          ))}
          {uploads.items.map((item) => (
            <li key={item.id}>
              <UploadTile item={item} onRetry={() => uploads.retry(item.id)} onDismiss={() => uploads.dismiss(item.id)} />
            </li>
          ))}
        </AnimatePresence>
        {count + uploads.items.length < CREATE_PHOTOS ? (
          <li>
            <AddPhotosTile onFiles={uploads.add} title={count + uploads.items.length === 0 ? "Add photos" : "Add more"} />
          </li>
        ) : null}
      </ul>

      <div className="mt-6 flex flex-col gap-2">
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
        ) : count < CREATE_PHOTOS && busy === 0 ? (
          <p className="text-center text-[12.5px] text-muted-2">Add {CREATE_PHOTOS - count} more for the best first look, or go live now.</p>
        ) : null}
      </div>
    </>
  );
}
