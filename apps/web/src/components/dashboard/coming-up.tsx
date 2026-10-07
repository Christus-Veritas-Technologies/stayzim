"use client";

import { Badge } from "@stayzim/ui/components/badge";
import { buttonVariants } from "@stayzim/ui/components/button";
import { Card, CardAction, CardHeader, CardTitle } from "@stayzim/ui/components/card";
import { EmptyState } from "@stayzim/ui/components/empty-state";
import { Skeleton } from "@stayzim/ui/components/skeleton";
import { ArrowRight, CalendarDays } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { BookingRow } from "@/components/dashboard/booking-row";
import { useLodge } from "@/components/dashboard/lodge-provider";
import { api } from "@/lib/api";
import type { DashboardBooking } from "@/lib/bookings";

const SHOWN = 3;

/** The next arrivals, on the overview (Growth and Pro). */
export function ComingUpCard() {
  const { lodge } = useLodge();
  const router = useRouter();
  const [result, setResult] = useState<{ bookings: DashboardBooking[]; total: number } | null>(null);

  // Refreshes when the counts change (a booking confirmed, cancelled or added elsewhere)
  const key = `${lodge.bookingsWaiting}:${lodge.today.arriving}:${lodge.updatedAt}`;
  useEffect(() => {
    let current = true;
    void api<{ bookings: DashboardBooking[]; total: number }>("/api/lodge/bookings/list?when=upcoming").then((response) => {
      if (current && response.data) setResult(response.data);
    });
    return () => {
      current = false;
    };
  }, [key]);

  return (
    <Card className="overflow-hidden">
      <CardHeader>
        <CardTitle>
          Coming up {result && result.total > 0 ? <Badge>{result.total}</Badge> : null}
        </CardTitle>
        <CardAction>
          <Link href={{ pathname: "/dashboard/bookings", query: { tab: "calendar" } }} className={buttonVariants({ variant: "outline", size: "sm", className: "group" })}>
            <span className="hidden sm:inline">Open calendar</span>
            <span className="sm:hidden">Calendar</span>
            <ArrowRight className="transition-transform group-hover:translate-x-0.5" />
          </Link>
        </CardAction>
      </CardHeader>
      {!result ? (
        <div className="flex flex-col gap-2 p-4" aria-busy="true">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      ) : result.bookings.length === 0 ? (
        <EmptyState
          icon={<CalendarDays />}
          title="No arrivals yet"
          description="Bookings from your site, and ones you add from WhatsApp, show here."
        />
      ) : (
        <ul className="divide-y divide-line-3 border-t border-line-3">
          {result.bookings.slice(0, SHOWN).map((booking) => (
            <li key={booking.id}>
              <BookingRow booking={booking} onOpen={() => router.push("/dashboard/bookings?tab=upcoming")} />
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
