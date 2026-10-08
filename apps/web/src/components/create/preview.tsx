"use client";

import { slugFromName } from "@stayzim/sites";
import { cn } from "@stayzim/ui/lib/utils";
import { AnimatePresence, motion } from "framer-motion";
import { Lock } from "lucide-react";

import type { CreateFacts } from "@/components/create/place-step";
import { SitePreview } from "@/components/preview/site-preview";
import { SITES_DOMAIN } from "@/lib/site-host";

export const DEFAULT_THEME = "#1E4A3B";

/** Typing changes the preview once the owner pauses */
const SETTLE_MS = 700;

function previewHost(name: string, host?: string) {
  return host ?? `${slugFromName(name) || "yourlodge"}.${SITES_DOMAIN}`;
}

/** What /create knows before the lodge exists, for /preview/sample/{template}. */
export type SampleAnswers = { template: string; name: string; town: string; country: string; facts: CreateFacts; themeColor?: string };

export function samplePreviewUrl({ template, name, town, country, facts, themeColor }: SampleAnswers) {
  const query = new URLSearchParams();
  if (name.trim()) query.set("name", name.trim());
  if (town.trim()) query.set("town", town.trim());
  if (country.trim()) query.set("country", country.trim());
  if (facts.kind) query.set("kind", facts.kind);
  if (facts.setting) query.set("setting", facts.setting);
  if (facts.roomsHint) query.set("rooms", String(facts.roomsHint));
  if (facts.priceHint) query.set("price", String(facts.priceHint));
  if (themeColor) query.set("color", themeColor);
  const search = query.toString();
  return `/preview/sample/${template}${search ? `?${search}` : ""}`;
}

/**
 * The owner's site in the design they picked (wide screens): the real page in
 * an iPhone, scaled to fit the column, with full screen for a closer look.
 */
export function CreatePreview({ src, name, host, tint }: { src: string; name: string; host?: string; tint?: string }) {
  return (
    <div className="flex flex-col gap-3">
      <p className="text-center text-[12.5px] font-semibold tracking-[0.08em] text-muted-2 uppercase">Your site, live as you go</p>
      <div className="mx-auto flex w-full max-w-[288px] items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-[12px] text-slate shadow-card">
        <Lock className="size-3 shrink-0 text-success" />
        <span className="truncate">{previewHost(name, host)}</span>
      </div>
      <SitePreview src={src} host={previewHost(name, host)} tint={tint} settle={SETTLE_MS} />
    </div>
  );
}

/** On a phone, small enough to sit above the form: the top photo, the name and the address. */
export function MiniPreview({
  name,
  host,
  themeColor = DEFAULT_THEME,
  photos,
  className,
}: {
  name: string;
  host?: string;
  themeColor?: string;
  /** Photos so far, saved or still uploading (local previews), first is the top photo */
  photos: string[];
  className?: string;
}) {
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
