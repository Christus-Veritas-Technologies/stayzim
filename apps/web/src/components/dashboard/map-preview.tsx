"use client";

import { buttonVariants } from "@stayzim/ui/components/button";
import { motion } from "framer-motion";
import { ArrowUpRight, MapPin } from "lucide-react";

/**
 * A drawn map with the lodge's pin (no map tiles, so nothing extra to load
 * on mobile data). The pin drops in again whenever the coordinates change.
 */
export function MapPreview({ latitude, longitude, place }: { latitude: number | null; longitude: number | null; place: string | null }) {
  const located = latitude !== null && longitude !== null;
  const mapsLink = located ? `https://www.google.com/maps?q=${latitude},${longitude}` : null;

  return (
    <div className="relative h-44 overflow-hidden rounded-xl border border-line bg-[#E8F1EC]">
      <svg className="absolute inset-0 size-full" viewBox="0 0 400 176" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
        <path d="M-10 120 C 80 90, 140 150, 230 110 S 360 60, 420 90" fill="none" stroke="#fff" strokeWidth="10" />
        <path d="M120 -10 C 140 60, 110 120, 150 190" fill="none" stroke="#fff" strokeWidth="7" />
        <path d="M300 -10 C 280 50, 320 110, 290 190" fill="none" stroke="#fff" strokeWidth="5" />
        <path d="M-10 40 C 60 50, 120 20, 200 35" fill="none" stroke="#fff" strokeWidth="4" />
        <ellipse cx="335" cy="140" rx="60" ry="26" fill="#CFE6F1" />
      </svg>

      {located ? (
        <>
          <span className="absolute top-1/2 left-1/2 size-28 -translate-1/2 rounded-full border border-brand/20 bg-brand/5" />
          <span className="absolute top-1/2 left-1/2 size-14 -translate-1/2 rounded-full border border-brand/30 bg-brand/10" />
          <motion.span
            key={`${latitude},${longitude}`}
            className="absolute top-1/2 left-1/2 -mt-8 -ml-4 text-brand drop-shadow-[0_6px_8px_rgba(0,60,80,0.35)]"
            initial={{ y: -40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ type: "spring", stiffness: 420, damping: 16 }}
          >
            <MapPin className="size-8 fill-brand stroke-white" strokeWidth={1.5} />
          </motion.span>
        </>
      ) : (
        <div className="absolute inset-0 flex items-center justify-center p-4 text-center text-[13px] text-muted">
          Paste a Google Maps link to drop your pin.
        </div>
      )}

      <div className="absolute inset-x-2.5 bottom-2.5 flex items-center justify-between gap-2">
        {place ? (
          <span className="inline-flex items-center gap-1.5 truncate rounded-lg bg-white px-2.5 py-1.5 text-xs font-semibold shadow-xs">
            <MapPin className="size-3.5 text-brand" />
            {place}
          </span>
        ) : (
          <span />
        )}
        {mapsLink ? (
          <a href={mapsLink} target="_blank" rel="noreferrer" className={buttonVariants({ variant: "outline", size: "xs", className: "bg-white" })}>
            Open in Google Maps
            <ArrowUpRight />
          </a>
        ) : null}
      </div>
    </div>
  );
}
