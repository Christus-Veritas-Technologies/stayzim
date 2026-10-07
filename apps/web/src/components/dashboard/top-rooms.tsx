"use client";

import { Card } from "@stayzim/ui/components/card";
import { Skeleton } from "@stayzim/ui/components/skeleton";
import { cn } from "@stayzim/ui/lib/utils";
import { motion, useReducedMotion } from "framer-motion";
import { BedDouble } from "lucide-react";

import { useLodge } from "@/components/dashboard/lodge-provider";
import { RoomThumb } from "@/components/dashboard/room-bits";
import { periodLabel, type Period, type VisitStats } from "@/lib/stats";

/** Which rooms guests ask about: Book taps per room this period, with a bar against the top one. */
export function TopRoomsCard({ stats, period, loading = false }: { stats: VisitStats | null; period: Period; loading?: boolean }) {
  const { lodge } = useLodge();
  const reduceMotion = useReducedMotion();

  if (!stats) {
    return (
      <Card className="gap-4 px-4 pt-[18px] pb-4 sm:px-5" aria-busy="true" aria-label="Loading rooms">
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
      </Card>
    );
  }

  const top = stats.topRooms[0]?.count ?? 0;
  return (
    <Card className={cn("gap-4 px-4 pt-[18px] pb-4 transition-opacity duration-300 sm:px-5", loading && "opacity-60")} aria-busy={loading || undefined}>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <span className="text-[13.5px] font-medium text-slate">Most asked-about rooms</span>
        <span className="text-[13px] text-muted">Bookings and Book taps · {periodLabel(period)}</span>
      </div>
      {stats.topRooms.length === 0 ? (
        <p className="flex items-center gap-2.5 rounded-xl bg-surface px-4 py-5 text-[13px] text-muted">
          <BedDouble className="size-4 shrink-0 text-muted-2" />
          When guests book or tap Book on a room, it shows here.
        </p>
      ) : (
        <ol className="flex flex-col gap-3">
          {stats.topRooms.map((entry, index) => {
            const room = lodge.rooms.find((candidate) => candidate.id === entry.roomId);
            return (
              <li key={entry.roomId} className="flex items-center gap-3">
                {room ? <RoomThumb room={room} className="h-10 w-14" /> : <span className="h-10 w-14 shrink-0 rounded-lg bg-surface" />}
                <span className="flex min-w-0 flex-1 flex-col gap-1.5">
                  <span className="flex items-baseline justify-between gap-3 text-[13.5px]">
                    <span className="truncate font-semibold">{entry.name}</span>
                    <span className="shrink-0 font-semibold tabular-nums">
                      {entry.count}
                    </span>
                  </span>
                  <span className="h-1.5 overflow-hidden rounded-full bg-surface">
                    <motion.span
                      className="block h-full rounded-full bg-purple"
                      initial={reduceMotion ? false : { width: 0 }}
                      animate={{ width: `${Math.max(6, (entry.count / top) * 100)}%` }}
                      transition={{ duration: 0.6, delay: index * 0.06, ease: [0.22, 1, 0.36, 1] }}
                    />
                  </span>
                </span>
              </li>
            );
          })}
        </ol>
      )}
    </Card>
  );
}
