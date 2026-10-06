"use client";

import { Dialog, DialogContent, DialogTitle } from "@stayzim/ui/components/dialog";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect, useState } from "react";

type GalleryPhoto = { url: string; srcSet?: string | null; width: number; height: number; caption: string };

/** Photo grid; a tap opens the photo large, with arrows (and arrow keys) to move through them. */
export function SiteGallery({ photos, name }: { photos: GalleryPhoto[]; name: string }) {
  const [open, setOpen] = useState<number | null>(null);
  const current = open === null ? null : photos[open];
  const step = (by: number) => setOpen((index) => (index === null ? null : (index + by + photos.length) % photos.length));

  useEffect(() => {
    if (open === null) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "ArrowRight") step(1);
      if (event.key === "ArrowLeft") step(-1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  return (
    <>
      <ul className="grid grid-cols-2 gap-2 sm:gap-3 md:grid-cols-3">
        {photos.map((photo, index) => (
          <li key={photo.url} className={index === 0 ? "col-span-2 row-span-2 md:col-span-2" : undefined}>
            <button
              type="button"
              onClick={() => setOpen(index)}
              className="group relative block size-full overflow-hidden rounded-2xl bg-[#EEF1F3] outline-none focus-visible:ring-3 focus-visible:ring-[var(--theme)]/40"
              aria-label={photo.caption ? `Open photo: ${photo.caption}` : `Open photo ${index + 1}`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element -- already resized on upload */}
              <img
                src={photo.url}
                srcSet={photo.srcSet ?? undefined}
                sizes={index === 0 ? "(min-width: 768px) 66vw, calc(100vw - 32px)" : "(min-width: 768px) 33vw, 50vw"}
                alt={photo.caption || `${name}, photo ${index + 1}`}
                width={photo.width}
                height={photo.height}
                loading="lazy"
                decoding="async"
                className="aspect-[4/3] size-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
              />
              {photo.caption ? (
                <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/55 to-transparent px-3 pt-6 pb-2 text-left text-xs font-semibold text-white">
                  {photo.caption}
                </span>
              ) : null}
            </button>
          </li>
        ))}
      </ul>

      <Dialog open={open !== null} onOpenChange={(value) => !value && setOpen(null)}>
        <DialogContent className="max-w-4xl overflow-hidden bg-ink p-0 text-white" showClose>
          <DialogTitle className="sr-only">{name} photos</DialogTitle>
          <div className="relative flex min-h-[40svh] items-center justify-center">
            <AnimatePresence mode="wait" initial={false}>
              {current ? (
                <motion.img
                  key={current.url}
                  src={current.url}
                  alt={current.caption || name}
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="max-h-[80svh] w-full object-contain"
                />
              ) : null}
            </AnimatePresence>
            {photos.length > 1 ? (
              <>
                <button
                  type="button"
                  onClick={() => step(-1)}
                  aria-label="Previous photo"
                  className="absolute left-2 flex size-10 items-center justify-center rounded-full bg-white/90 text-ink shadow"
                >
                  <ChevronLeft className="size-5" />
                </button>
                <button
                  type="button"
                  onClick={() => step(1)}
                  aria-label="Next photo"
                  className="absolute right-2 flex size-10 items-center justify-center rounded-full bg-white/90 text-ink shadow"
                >
                  <ChevronRight className="size-5" />
                </button>
              </>
            ) : null}
          </div>
          <p className="px-4 py-3 text-sm text-white/80">
            {current?.caption || name} · {open === null ? "" : `${open + 1} of ${photos.length}`}
          </p>
        </DialogContent>
      </Dialog>
    </>
  );
}

/** A room's photos, swiped sideways, with dots. */
export function RoomPhotos({
  photos,
  name,
  theme,
}: {
  photos: { url: string; srcSet?: string | null; width: number; height: number }[];
  name: string;
  theme: string;
}) {
  const [index, setIndex] = useState(0);
  // Photos further along load only as the guest swipes towards them (data is precious)
  const [reached, setReached] = useState(0);
  if (photos.length === 0) {
    return <div className="aspect-[4/3] bg-[linear-gradient(135deg,#EEE6DA,#D7C3A6)]" aria-hidden="true" />;
  }
  return (
    <div className="relative">
      <div
        className="flex aspect-[4/3] snap-x snap-mandatory overflow-x-auto bg-[#EEE6DA] [scrollbar-width:none]"
        onScroll={(event) => {
          const element = event.currentTarget;
          const next = Math.round(element.scrollLeft / element.clientWidth);
          setIndex(next);
          setReached((current) => Math.max(current, next));
        }}
        // A touch on the photos starts loading the next one, so the swipe shows it
        onPointerDown={() => setReached((current) => Math.max(current, index + 1))}
      >
        {photos.map((photo, position) => (
          // eslint-disable-next-line @next/next/no-img-element -- already resized on upload
          <img
            key={photo.url}
            src={position <= reached ? photo.url : undefined}
            srcSet={position <= reached ? (photo.srcSet ?? undefined) : undefined}
            sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, calc(100vw - 32px)"
            alt={`${name}, photo ${position + 1}`}
            width={photo.width}
            height={photo.height}
            loading="lazy"
            decoding="async"
            className="size-full shrink-0 snap-center object-cover"
          />
        ))}
      </div>
      {photos.length > 1 ? (
        <span className="absolute inset-x-0 bottom-2 flex justify-center gap-1.5" aria-hidden="true">
          {photos.map((photo, position) => (
            <span
              key={photo.url}
              className="h-1.5 rounded-full bg-white/70 transition-all duration-300"
              style={{ width: position === index ? 16 : 6, backgroundColor: position === index ? theme : undefined }}
            />
          ))}
        </span>
      ) : null}
    </div>
  );
}
