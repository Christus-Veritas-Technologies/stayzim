"use client";

import { isSamplePhoto } from "@stayzim/sites";
import { Dialog, DialogContent, DialogTitle } from "@stayzim/ui/components/dialog";
import { cn } from "@stayzim/ui/lib/utils";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect, useState } from "react";

import { SampleBadge } from "@/components/site/sample-badge";
import { PHOTO_FALLBACK } from "@/lib/site-content";

type GalleryPhoto = { url: string; srcSet?: string | null; width: number; height: number; caption: string };

/**
 * How a template lays out its gallery:
 * - feature: the first photo large, the rest beside it
 * - grid3, grid4: even tiles in three or four columns
 * - strip: one row that scrolls sideways (a filmstrip)
 * - ovals: tall rounded shapes, four across
 * - panels: tall photos side by side
 * - row: four tall photos of different widths in one line
 * - captioned: a wide photo then three tall ones, captions large on them
 */
export type GalleryLayout = "feature" | "grid3" | "grid4" | "strip" | "ovals" | "panels" | "row" | "captioned";

const LAYOUTS: Record<GalleryLayout, { list: string; item: (index: number) => string | undefined; image: string; sizes: (index: number) => string }> = {
  feature: {
    list: "grid grid-cols-2 gap-2 sm:gap-3 md:grid-cols-4",
    item: (index) => (index === 0 ? "col-span-2 row-span-2" : undefined),
    image: "aspect-[4/3]",
    sizes: (index) => (index === 0 ? "(min-width: 768px) 50vw, calc(100vw - 32px)" : "(min-width: 768px) 25vw, 50vw"),
  },
  grid3: { list: "grid grid-cols-2 gap-2 sm:gap-3 md:grid-cols-3", item: () => undefined, image: "aspect-[4/3]", sizes: () => "(min-width: 768px) 33vw, 50vw" },
  grid4: { list: "grid grid-cols-2 gap-1.5 md:grid-cols-4", item: () => undefined, image: "aspect-[5/4]", sizes: () => "(min-width: 768px) 25vw, 50vw" },
  strip: {
    list: "-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-2 [scrollbar-width:none] sm:-mx-6 sm:px-6",
    item: () => "w-[78%] shrink-0 snap-start sm:w-[44%] lg:w-[31%]",
    image: "aspect-[3/4]",
    sizes: () => "(min-width: 1024px) 31vw, (min-width: 640px) 44vw, 78vw",
  },
  ovals: { list: "grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-4", item: () => undefined, image: "aspect-[3/4]", sizes: () => "(min-width: 768px) 25vw, 50vw" },
  row: {
    list: "grid grid-cols-2 gap-3 md:grid-cols-[1.4fr_1fr_1fr_1.2fr]",
    item: () => undefined,
    image: "h-[200px] w-full sm:h-[260px] md:h-[320px]",
    sizes: () => "(min-width: 768px) 30vw, 50vw",
  },
  captioned: {
    list: "grid grid-cols-2 gap-3 md:grid-cols-[1.75fr_1fr_1fr_1fr]",
    item: (index) => (index === 0 ? "col-span-2 md:col-span-1" : undefined),
    image: "h-[260px] w-full sm:h-[340px] md:h-[440px]",
    sizes: (index) => (index === 0 ? "(min-width: 768px) 36vw, 100vw" : "(min-width: 768px) 20vw, 50vw"),
  },
  panels: {
    list: "grid grid-cols-2 gap-3 md:grid-cols-3",
    item: (index) => (index === 0 ? "col-span-2 md:col-span-1" : undefined),
    image: "aspect-[4/5]",
    sizes: () => "(min-width: 768px) 33vw, 50vw",
  },
};

/** Photo grid; a tap opens the photo large, with arrows (and arrow keys) to move through them. */
export function SiteGallery({
  photos,
  name,
  layout = "feature",
  rounded = "rounded-2xl",
  limit,
  captionClassName,
}: {
  photos: GalleryPhoto[];
  name: string;
  layout?: GalleryLayout;
  /** Corner shape of each tile ("rounded-none", "rounded-full" for ovals) */
  rounded?: string;
  /** Show only the first few in the grid; the large view still has all of them */
  limit?: number;
  /** How captions look on the tiles (the template's display type) */
  captionClassName?: string;
}) {
  const shape = LAYOUTS[layout];
  const shown = limit ? photos.slice(0, limit) : photos;
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
      <ul className={shape.list}>
        {shown.map((photo, index) => (
          <li key={photo.url} className={shape.item(index)}>
            <button
              type="button"
              onClick={() => setOpen(index)}
              className={cn(
                "group relative block size-full overflow-hidden bg-[#EEF1F3] outline-none focus-visible:ring-3 focus-visible:ring-[var(--theme)]/40",
                layout === "ovals" ? "rounded-full" : rounded,
              )}
              aria-label={photo.caption ? `Open photo: ${photo.caption}` : `Open photo ${index + 1}`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element -- already resized on upload */}
              <img
                src={photo.url}
                srcSet={photo.srcSet ?? undefined}
                sizes={shape.sizes(index)}
                alt={photo.caption || `${name}, photo ${index + 1}`}
                width={photo.width}
                height={photo.height}
                loading="lazy"
                decoding="async"
                className={cn("size-full object-cover transition-transform duration-500 group-hover:scale-[1.03] motion-reduce:transition-none", shape.image)}
              />
              {index === shown.length - 1 && shown.length < photos.length ? (
                <span className="absolute inset-0 flex items-center justify-center bg-black/45 text-lg font-semibold text-white">
                  +{photos.length - shown.length} photos
                </span>
              ) : null}
              {isSamplePhoto(photo.url) ? <SampleBadge className={cn("absolute", layout === "ovals" ? "top-[12%] left-1/2 -translate-x-1/2" : "top-2.5 left-2.5")} /> : null}
              {photo.caption && layout !== "ovals" ? (
                <span
                  className={cn(
                    "absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/55 to-transparent px-3 pt-6 pb-2 text-left text-xs font-semibold text-white",
                    captionClassName,
                  )}
                >
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
  className = "aspect-[4/3]",
  sizes = "(min-width: 1024px) 33vw, (min-width: 640px) 50vw, calc(100vw - 32px)",
  sample = false,
  sampleAt = "right",
}: {
  photos: { url: string; srcSet?: string | null; width: number; height: number }[];
  name: string;
  theme: string;
  /** An example room on a demo site: marked Example */
  sample?: boolean;
  /** The corner the Example mark takes, clear of the template's own labels */
  sampleAt?: "left" | "right";
  /** The frame's shape (and corners); 4:3 by default */
  className?: string;
  sizes?: string;
}) {
  const [index, setIndex] = useState(0);
  // Photos further along load only as the guest swipes towards them (data is precious)
  const [reached, setReached] = useState(0);
  const badge = sample ? <SampleBadge className={cn("absolute top-3", sampleAt === "left" ? "left-3" : "right-3")} /> : null;
  if (photos.length === 0) {
    return <div className={cn("relative", PHOTO_FALLBACK, className)}>{badge}</div>;
  }
  return (
    <div className={cn("relative overflow-hidden", className)}>
      <div
        className="flex size-full snap-x snap-mandatory overflow-x-auto bg-[#EEE6DA] [scrollbar-width:none]"
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
            sizes={sizes}
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
      {badge}
    </div>
  );
}
