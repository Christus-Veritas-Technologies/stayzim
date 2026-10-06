"use client";

import { Button } from "@stayzim/ui/components/button";
import { AnimatePresence, motion } from "framer-motion";
import { Star } from "lucide-react";

import { useLodge } from "@/components/dashboard/lodge-provider";
import { AddPhotosTile, UploadTile } from "@/components/dashboard/photo-tiles";
import { usePhotoUploads } from "@/components/dashboard/use-photo-uploads";
import { StepHeading } from "@/components/start/frame";

/** Plenty to make a site look real; more can go up later from Gallery. */
const START_PHOTOS = 12;

/** Step 2: photos straight from the phone. The first one is the big photo at the top of the site. */
export function PhotosStep({ onNext }: { onNext: () => void }) {
  const { lodge } = useLodge();
  const uploads = usePhotoUploads({ limit: START_PHOTOS, existing: lodge.gallery.length });
  const busy = uploads.items.filter((item) => item.status !== "failed").length;
  const count = lodge.gallery.length;

  return (
    <>
      <StepHeading title="Add some photos">The outside, a room, the view. The first photo goes at the top of your site.</StepHeading>
      <ul className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
        <AnimatePresence initial={false}>
          {lodge.gallery.map((photo, index) => (
            <motion.li key={photo.id} layout initial={{ opacity: 0, scale: 0.94 }} animate={{ opacity: 1, scale: 1 }} className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element -- already resized on upload */}
              <img src={photo.url} srcSet={photo.srcSet ?? undefined} sizes="180px" alt="" className="aspect-[4/3] w-full rounded-xl object-cover" />
              {index === 0 ? (
                <span className="absolute top-1.5 left-1.5 inline-flex items-center gap-1 rounded-full bg-ink/80 px-2 py-0.5 text-[11px] font-semibold text-white">
                  <Star className="size-3" />
                  Top photo
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
        {count + uploads.items.length < START_PHOTOS ? (
          <li>
            <AddPhotosTile onFiles={uploads.add} title={count === 0 ? "Add photos" : "Add more"} />
          </li>
        ) : null}
      </ul>

      <div className="mt-6 flex flex-col gap-2">
        <Button size="lg" className="w-full" onClick={onNext} loading={busy > 0}>
          {busy > 0 ? `Uploading ${busy} ${busy === 1 ? "photo" : "photos"}` : count > 0 ? "Continue" : "Skip for now"}
        </Button>
        {count === 0 && busy === 0 ? <p className="text-center text-[12.5px] text-muted-2">You can add photos any time from your dashboard.</p> : null}
      </div>
    </>
  );
}
