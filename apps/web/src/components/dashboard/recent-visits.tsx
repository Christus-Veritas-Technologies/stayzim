"use client";

import { Badge } from "@stayzim/ui/components/badge";
import { Button } from "@stayzim/ui/components/button";
import { Skeleton } from "@stayzim/ui/components/skeleton";
import { cn } from "@stayzim/ui/lib/utils";
import { motion } from "framer-motion";
import { Monitor, RotateCcw, Smartphone, Tablet } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";

import { EASE_OUT } from "@/components/motion";
import { api } from "@/lib/api";
import { formatWhen } from "@/lib/format";
import { countryName, DEVICE_LABEL, type SiteVisit } from "@/lib/stats";

const DEVICE_ICON = { PHONE: Smartphone, TABLET: Tablet, COMPUTER: Monitor } as const;

const COLUMNS = "md:grid md:grid-cols-[1.1fr_1.2fr_0.8fr_0.9fr_1fr] md:items-center";

type VisitsPage = { total: number; items: SiteVisit[] };

/** The latest visits and booking chats, newest first: a table on desktop, a list on phones. */
export function RecentVisits({ empty }: { empty: ReactNode }) {
  const [state, setState] = useState<{ kind: "loading" } | { kind: "ready"; page: VisitsPage } | { kind: "error"; message: string }>({ kind: "loading" });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let current = true;
    void api<VisitsPage>("/api/lodge/visits?pageSize=10").then((result) => {
      if (!current) return;
      setState(result.error === undefined ? { kind: "ready", page: result.data } : { kind: "error", message: result.error });
    });
    return () => {
      current = false;
    };
  }, [attempt]);

  if (state.kind === "loading") {
    return (
      <div className="flex flex-col gap-3 px-5 py-4" aria-busy="true" aria-label="Loading visits">
        {[0, 1, 2, 3].map((index) => (
          <Skeleton key={index} className="h-9 w-full" />
        ))}
      </div>
    );
  }
  if (state.kind === "error") {
    return (
      <div className="flex flex-col items-center gap-3 px-5 py-8 text-center text-[13.5px] text-muted">
        Visits didn&apos;t load. {state.message}
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            setState({ kind: "loading" });
            setAttempt((value) => value + 1);
          }}
        >
          <RotateCcw />
          Try again
        </Button>
      </div>
    );
  }
  if (state.page.items.length === 0) return <>{empty}</>;

  return (
    <div>
      <div className={cn("hidden border-b border-line-3 bg-surface px-5 py-2.5 text-xs font-semibold text-muted", COLUMNS)}>
        <span>Date</span>
        <span>Country</span>
        <span>Page</span>
        <span>Device</span>
        <span>Activity</span>
      </div>
      <ul className="divide-y divide-line-3">
        {state.page.items.map((visit, index) => {
          const DeviceIcon = DEVICE_ICON[visit.device];
          const chat = visit.type === "BOOKING_CHAT";
          return (
            <motion.li
              key={visit.id}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: index * 0.03, ease: EASE_OUT }}
              className={cn("flex flex-col gap-1 px-5 py-3 text-[13px]", COLUMNS)}
            >
              <span className="flex items-center justify-between gap-2 md:block">
                <span className="font-semibold text-ink md:font-normal">{formatWhen(visit.createdAt)}</span>
                <span className="md:hidden">
                  <ActivityBadge chat={chat} room={visit.room} />
                </span>
              </span>
              <span className="text-slate">
                {visit.country ? <strong className="mr-1 font-semibold text-ink">{visit.country}</strong> : null}
                {countryName(visit.country)}
              </span>
              <span className="hidden font-mono text-xs text-muted md:block">{visit.path}</span>
              <span className="inline-flex items-center gap-1.5 text-muted">
                <DeviceIcon className="size-3.5" />
                {DEVICE_LABEL[visit.device]}
                <span className="font-mono text-xs md:hidden"> · {visit.path}</span>
              </span>
              <span className="hidden md:block">
                <ActivityBadge chat={chat} room={visit.room} />
              </span>
            </motion.li>
          );
        })}
      </ul>
      <p className="border-t border-line-3 px-5 py-3 text-[12.5px] text-muted">
        Showing the latest {state.page.items.length} of <strong className="font-semibold text-ink">{state.page.total}</strong>
      </p>
    </div>
  );
}

function ActivityBadge({ chat, room }: { chat: boolean; room: string | null }) {
  if (!chat) return <Badge>Visit</Badge>;
  return <Badge variant="purple">{room ? `Booking chat · ${room}` : "Booking chat"}</Badge>;
}
