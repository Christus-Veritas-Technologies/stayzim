"use client";

import { Badge } from "@stayzim/ui/components/badge";
import { buttonVariants } from "@stayzim/ui/components/button";
import { Card, CardAction, CardHeader, CardTitle } from "@stayzim/ui/components/card";
import { EmptyState } from "@stayzim/ui/components/empty-state";
import { cn } from "@stayzim/ui/lib/utils";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, BedDouble, Eye, Images, MessageCircle, Pencil } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

import { useLodge } from "@/components/dashboard/lodge-provider";
import { RoomStatus, RoomThumb } from "@/components/dashboard/room-bits";
import { EASE_OUT } from "@/components/motion";
import { api } from "@/lib/api";
import { formatShortWhen } from "@/lib/format";
import { formatPrice, hasAnalytics } from "@/lib/lodge";
import { countryName, DEVICE_LABEL, type SiteVisit } from "@/lib/stats";

/** Rooms at a glance: a table on desktop, a list on phones. */
export function RoomsSummaryCard() {
  const { lodge } = useLodge();
  const rooms = lodge.rooms;

  return (
    <Card className="overflow-hidden">
      <CardHeader>
        <CardTitle>
          Rooms <Badge>{rooms.length}</Badge>
        </CardTitle>
        <CardAction>
          <Link href="/dashboard/rooms" className={buttonVariants({ variant: "outline", size: "sm", className: "group" })}>
            <span className="hidden sm:inline">Manage rooms</span>
            <span className="sm:hidden">Manage</span>
            <ArrowRight className="transition-transform group-hover:translate-x-0.5" />
          </Link>
        </CardAction>
      </CardHeader>

      {rooms.length === 0 ? (
        <EmptyState
          icon={<BedDouble />}
          title="No rooms yet"
          description="Add your rooms with a price and a photo. Each gets its own Book on WhatsApp button."
          action={
            <Link href="/dashboard/rooms" className={buttonVariants({ size: "sm" })}>
              Add a room
            </Link>
          }
        />
      ) : (
        <>
          <div className="hidden grid-cols-[minmax(0,1.6fr)_0.9fr_0.6fr_0.8fr_1fr] border-y border-[#EAEFF2] bg-surface text-xs font-semibold text-muted md:grid">
            {["Room", "Price", "Sleeps", "Photos", "Status"].map((heading, index) => (
              <span key={heading} className={cn("flex h-[38px] items-center px-3.5", index > 0 && "border-l border-[#EAEFF2]")}>
                {heading}
              </span>
            ))}
          </div>
          <ul className="divide-y divide-line-3 border-t border-line-3 md:border-t-0">
            {rooms.slice(0, 5).map((room, index) => (
              <motion.li
                key={room.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.1 + index * 0.05, ease: EASE_OUT }}
                className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-surface/60 md:grid md:grid-cols-[minmax(0,1.6fr)_0.9fr_0.6fr_0.8fr_1fr] md:gap-0 md:p-0"
              >
                <span className="flex min-w-0 flex-1 items-center gap-3 md:px-3.5 md:py-2.5">
                  <RoomThumb room={room} />
                  <span className="flex min-w-0 flex-col">
                    <span className="truncate text-[13.5px] font-semibold">{room.name}</span>
                    <span className="text-xs text-muted md:hidden">
                      {formatPrice(room.price)} / night · Sleeps {room.sleeps}
                    </span>
                  </span>
                </span>
                <span className="hidden px-3.5 text-[13.5px] md:block">
                  <strong className="font-semibold">{formatPrice(room.price)}</strong> <span className="text-muted-2">/ night</span>
                </span>
                <span className="hidden px-3.5 text-[13.5px] md:block">{room.sleeps}</span>
                <span className="hidden px-3.5 text-[13.5px] text-muted md:block">{room.photos.length} of 5</span>
                <span className="md:px-3.5">
                  <RoomStatus room={room} />
                </span>
              </motion.li>
            ))}
          </ul>
        </>
      )}
    </Card>
  );
}

type ActivityItem = { id: string; icon: typeof Eye; tone: string; title: string; detail: string; at: string };

function visitItem(visit: SiteVisit): ActivityItem {
  if (visit.type === "BOOKING_CHAT") {
    return {
      id: visit.id,
      icon: MessageCircle,
      tone: "bg-purple-wash text-purple",
      title: visit.room ? `Booking chat started · ${visit.room}` : "Booking chat started",
      detail: `${countryName(visit.country)} · ${DEVICE_LABEL[visit.device]}`,
      at: visit.createdAt,
    };
  }
  return {
    id: visit.id,
    icon: Eye,
    tone: "bg-success-tint text-success",
    title: visit.country ? `Visit from ${countryName(visit.country)}` : "Visit",
    detail: `${DEVICE_LABEL[visit.device]} · ${visit.path}`,
    at: visit.createdAt,
  };
}

/** Guests' latest visits and booking chats (Growth and Pro), mixed with the latest changes to the site. */
export function ActivityCard() {
  const { lodge } = useLodge();
  const analytics = hasAnalytics(lodge);
  const [visits, setVisits] = useState<SiteVisit[]>([]);

  useEffect(() => {
    if (!analytics) return;
    let current = true;
    void api<SiteVisit[]>("/api/lodge/activity").then((result) => {
      if (current && result.data) setVisits(result.data);
    });
    return () => {
      current = false;
    };
  }, [analytics]);

  const items: ActivityItem[] = [
    ...visits.map(visitItem),
    { id: "lodge", icon: Pencil, tone: "bg-brand-wash text-brand", title: "Lodge info saved", detail: "Name, contact and look", at: lodge.updatedAt },
    ...lodge.rooms.map((room) => ({
      id: room.id,
      icon: BedDouble,
      tone: "bg-surface-2 text-slate",
      title: `${room.name} updated`,
      detail: `${formatPrice(room.price)} / night · ${room.photos.length} ${room.photos.length === 1 ? "photo" : "photos"}`,
      at: room.updatedAt,
    })),
    ...(lodge.gallery.length > 0
      ? [
          {
            id: "gallery",
            icon: Images,
            tone: "bg-peach-wash text-rust",
            title: "Gallery",
            detail: `${lodge.gallery.length} ${lodge.gallery.length === 1 ? "photo" : "photos"} on your site`,
            at: lodge.updatedAt,
          },
        ]
      : []),
  ]
    .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
    .slice(0, 6);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Activity</CardTitle>
        <CardAction className="text-[13px] text-muted-2">{analytics ? "Visits and changes" : "Latest changes"}</CardAction>
      </CardHeader>
      <ul className="flex flex-col gap-1 px-3 pb-3">
        <AnimatePresence initial={false}>
          {items.map((item, index) => {
            const Icon = item.icon;
            return (
              <motion.li
                key={item.id}
                layout
                initial={{ opacity: 0, x: -6 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.4, delay: 0.1 + index * 0.06, ease: EASE_OUT }}
                className="flex items-center gap-3 rounded-xl px-2 py-2 transition-colors hover:bg-surface"
              >
                <span className={cn("flex size-8 shrink-0 items-center justify-center rounded-[9px]", item.tone)}>
                  <Icon className="size-4" strokeWidth={1.75} />
                </span>
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate text-[13.5px] font-semibold">{item.title}</span>
                  <span className="truncate text-xs text-muted">{item.detail}</span>
                </span>
                <span className="shrink-0 text-xs text-muted-2 tabular-nums">{formatShortWhen(item.at)}</span>
              </motion.li>
            );
          })}
        </AnimatePresence>
      </ul>
      {analytics ? null : (
        <p className="mx-5 mb-4 flex items-center gap-2 rounded-[10px] bg-surface px-3 py-2.5 text-xs leading-4 text-muted">
          <Eye className="size-3.5 shrink-0 text-muted-2" />
          Guest visits and booking chats show here on the Growth plan.
        </p>
      )}
    </Card>
  );
}
