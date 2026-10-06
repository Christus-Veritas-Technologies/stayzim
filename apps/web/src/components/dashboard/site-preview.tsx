"use client";

import { Avatar } from "@stayzim/ui/components/avatar";
import { cn } from "@stayzim/ui/lib/utils";
import { motion } from "framer-motion";
import { MapPin } from "lucide-react";

import { WhatsAppIcon } from "@/components/landing/brand";
import { formatPrice, type Room } from "@/lib/lodge";

export type PreviewLodge = {
  name: string;
  place: string | null;
  description: string;
  themeColor: string;
  logoUrl: string | null;
  heroUrl: string | null;
  rooms: Room[];
};

/**
 * A small phone showing the top of the lodge site, in the lodge's colour.
 * It follows the form as the owner types, before anything is saved.
 */
export function SitePreview({ lodge, className }: { lodge: PreviewLodge; className?: string }) {
  const room = lodge.rooms[0];
  const roomPhoto = room?.photos[0]?.url;

  return (
    <div
      className={cn(
        "mx-auto w-full max-w-[300px] overflow-hidden rounded-[30px] border-[6px] border-ink bg-white shadow-[0_24px_48px_-16px_rgba(12,24,31,0.35)]",
        className,
      )}
      aria-label={`Preview of ${lodge.name}'s site`}
    >
      <div className="relative h-[190px] bg-[linear-gradient(180deg,#C9D9D2_0%,#7C978B_60%,#3E5A4E_100%)]">
        {lodge.heroUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- photos come from our upload server
          <img src={lodge.heroUrl} alt="" className="absolute inset-0 size-full object-cover" />
        ) : null}
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(12,24,31,0.05)_30%,rgba(12,24,31,0.65))]" />
        <div className="absolute top-3 left-3">
          <Avatar shape="lodge" size="sm" name={lodge.name || "Lodge"} src={lodge.logoUrl} color={lodge.themeColor} className="ring-2 ring-white/70" />
        </div>
        <div className="absolute inset-x-3 bottom-3 text-white">
          <motion.p key={lodge.name} initial={{ opacity: 0.4 }} animate={{ opacity: 1 }} className="font-serif text-[22px] leading-7 font-semibold">
            {lodge.name || "Your lodge"}
          </motion.p>
          {lodge.place ? (
            <p className="flex items-center gap-1 text-xs text-white/85">
              <MapPin className="size-3" />
              {lodge.place}
            </p>
          ) : null}
        </div>
      </div>

      <div className="flex flex-col gap-3 p-3.5">
        <p className="line-clamp-4 text-[12.5px] leading-[18px] text-muted">{lodge.description || "Your short intro shows here."}</p>
        <p className="font-serif text-base font-semibold transition-colors duration-300" style={{ color: lodge.themeColor }}>
          Rooms
        </p>
        {room ? (
          <div className="overflow-hidden rounded-xl border border-line">
            <div className="h-[84px] bg-[linear-gradient(135deg,#E9DCCB,#C9AE8E)]">
              {roomPhoto ? (
                // eslint-disable-next-line @next/next/no-img-element -- photos come from our upload server
                <img src={roomPhoto} alt="" className="size-full object-cover" />
              ) : null}
            </div>
            <div className="flex items-center justify-between gap-2 px-2.5 py-2">
              <span className="flex min-w-0 flex-col">
                <span className="truncate text-[13px] font-semibold">{room.name}</span>
                <span className="text-[11px] text-muted">Sleeps {room.sleeps}</span>
              </span>
              <span
                className="shrink-0 rounded-full px-2 py-1 text-[11px] font-semibold text-white transition-colors duration-300"
                style={{ backgroundColor: lodge.themeColor }}
              >
                {formatPrice(room.price)} / night
              </span>
            </div>
          </div>
        ) : (
          <p className="rounded-xl border border-dashed border-line-2 px-3 py-4 text-center text-xs text-muted-2">Your rooms show here</p>
        )}
        <span className="flex h-10 items-center justify-center gap-2 rounded-full bg-whatsapp text-[13px] font-semibold text-ink">
          <WhatsAppIcon size={15} />
          Book on WhatsApp
        </span>
      </div>
    </div>
  );
}
