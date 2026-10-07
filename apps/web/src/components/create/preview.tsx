"use client";

import { slugFromName } from "@stayzim/sites";
import { cn } from "@stayzim/ui/lib/utils";
import { AnimatePresence, motion } from "framer-motion";
import { Lock } from "lucide-react";

import { SitePreview } from "@/components/dashboard/site-preview";
import { SITES_DOMAIN } from "@/lib/site-host";

export type CreatePreviewProps = {
  name: string;
  /** The site's real address once it exists; until then, one made from the name */
  host?: string;
  themeColor?: string;
  /** Photos so far, saved or still uploading (local previews), first is the top photo */
  photos: string[];
};

export const DEFAULT_THEME = "#1E4A3B";

function previewHost(name: string, host?: string) {
  return host ?? `${slugFromName(name) || "yourlodge"}.${SITES_DOMAIN}`;
}

/**
 * The owner's site taking shape as they type and upload (wide screens): a
 * phone with the address bar, the hero, and the photos underneath.
 */
export function CreatePreview({ name, host, themeColor = DEFAULT_THEME, photos }: CreatePreviewProps) {
  return (
    <div className="flex flex-col gap-3">
      <p className="text-center text-[12.5px] font-semibold tracking-[0.08em] text-muted-2 uppercase">Your site, live as you go</p>
      <div className="mx-auto flex w-full max-w-[300px] items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-[12px] text-slate shadow-card">
        <Lock className="size-3 shrink-0 text-success" />
        <span className="truncate">{previewHost(name, host)}</span>
      </div>
      <SitePreview
        lodge={{
          name: name || "Your lodge",
          place: null,
          description: name ? `Welcome to ${name}. See our rooms and book your stay direct with us.` : "",
          themeColor,
          logoUrl: null,
          heroUrl: photos[0] ?? null,
          rooms: [],
        }}
      />
      <ul className="mx-auto grid w-full max-w-[300px] grid-cols-3 gap-1.5" aria-label="Photos so far">
        <AnimatePresence initial={false}>
          {photos.slice(0, 3).map((url) => (
            <motion.li key={url} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}>
              {/* eslint-disable-next-line @next/next/no-img-element -- local previews and resized uploads */}
              <img src={url} alt="" className="aspect-[4/3] w-full rounded-lg object-cover" />
            </motion.li>
          ))}
        </AnimatePresence>
        {Array.from({ length: Math.max(0, 3 - photos.length) }, (_, index) => (
          <li key={`empty-${index}`} className="aspect-[4/3] rounded-lg border border-dashed border-line-2 bg-white/60" />
        ))}
      </ul>
    </div>
  );
}

/** The same on a phone, small enough to sit above the form: the top photo, the name and the address. */
export function MiniPreview({ name, host, themeColor = DEFAULT_THEME, photos, className }: CreatePreviewProps & { className?: string }) {
  return (
    <div className={cn("relative mb-5 h-[118px] overflow-hidden rounded-2xl xl:hidden", className)} style={{ backgroundColor: themeColor }} aria-label="Preview of your site">
      <AnimatePresence>
        {photos[0] ? (
          <motion.img
            key={photos[0]}
            src={photos[0]}
            alt=""
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute inset-0 size-full object-cover"
          />
        ) : null}
      </AnimatePresence>
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(12,24,31,0.05)_20%,rgba(12,24,31,0.7))]" />
      <div className="absolute inset-x-3.5 bottom-3 text-white">
        <p className="truncate font-serif text-[20px] leading-6 font-semibold">{name || "Your lodge"}</p>
        <p className="flex items-center gap-1 truncate text-[11.5px] text-white/85">
          <Lock className="size-3 shrink-0" />
          {previewHost(name, host)}
        </p>
      </div>
    </div>
  );
}
