"use client";

import { Badge } from "@stayzim/ui/components/badge";
import { Button, buttonVariants } from "@stayzim/ui/components/button";
import { Card } from "@stayzim/ui/components/card";
import { EmptyState } from "@stayzim/ui/components/empty-state";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@stayzim/ui/components/input";
import { monthOf } from "@stayzim/ui/components/range-calendar";
import { Skeleton } from "@stayzim/ui/components/skeleton";
import { Tabs, TabsList, TabsTab } from "@stayzim/ui/components/tabs";
import { dateAdd, formatStay, includesBookingCalendar, todayInHarare } from "@stayzim/sites";
import { cn } from "@stayzim/ui/lib/utils";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { CalendarDays, ChevronLeft, ChevronRight, Inbox, Lock, Plus, Search } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import { BookingRow } from "@/components/dashboard/booking-row";
import { BookingSettings } from "@/components/dashboard/booking-settings";
import { BookingsOverview } from "@/components/dashboard/bookings-overview";
import { BookingSheet, type BookingSheetTarget } from "@/components/dashboard/booking-sheet";
import { BookingsMonth } from "@/components/dashboard/bookings-month";
import { BookingsTimeline } from "@/components/dashboard/bookings-timeline";
import { useLodge } from "@/components/dashboard/lodge-provider";
import { Page, PageHeader, PageSection } from "@/components/dashboard/page";
import { RequestCard } from "@/components/dashboard/request-card";
import { api } from "@/lib/api";
import {
  bookingMessages,
  confirmWarning,
  guestChatUrl,
  holdsOf,
  weekStart,
  type BookingsWindow,
  type DashboardBooking,
} from "@/lib/bookings";
import { PLANS, type Lodge } from "@/lib/lodge";
import { useMediaQuery } from "@/lib/use-media-query";

type Tab = "requests" | "calendar" | "upcoming" | "past";
const TABS: Tab[] = ["requests", "calendar", "upcoming", "past"];

type ListResult = { bookings: DashboardBooking[]; total: number; page: number; pageSize: number };

function useBookingsWindow(from: string, to: string, version: number) {
  const [state, setState] = useState<{ key: string; window: BookingsWindow | null; error: string | null }>({ key: "", window: null, error: null });
  const key = `${from}:${to}`;
  useEffect(() => {
    let current = true;
    void api<BookingsWindow>(`/api/lodge/bookings?from=${from}&to=${to}`).then((result) => {
      if (!current) return;
      setState({ key, window: result.data ?? null, error: result.error ?? null });
    });
    return () => {
      current = false;
    };
  }, [from, to, key, version]);
  // The last window stays on screen while the next loads
  return { window: state.window, loading: state.key !== key, error: state.error };
}

function useBookingList(when: Exclude<Tab, "calendar">, query: string, page: number, version: number, enabled: boolean) {
  const [state, setState] = useState<{ key: string; result: ListResult | null }>({ key: "", result: null });
  const key = `${when}:${query}:${page}:${version}`;
  useEffect(() => {
    if (!enabled) return;
    let current = true;
    const timer = setTimeout(
      () => {
        void api<ListResult>(`/api/lodge/bookings/list?when=${when}&page=${page}${query ? `&q=${encodeURIComponent(query)}` : ""}`).then((response) => {
          if (current && response.data) setState({ key, result: response.data });
        });
      },
      query ? 250 : 0,
    );
    return () => {
      current = false;
      clearTimeout(timer);
    };
  }, [when, query, page, key, enabled]);
  return { result: state.result, loading: state.key !== key };
}

export default function BookingsPage() {
  return (
    <Suspense>
      <Bookings />
    </Suspense>
  );
}

function Bookings() {
  const { lodge } = useLodge();
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const wide = useMediaQuery("(min-width: 1024px)");
  const today = todayInHarare();
  const enabled = includesBookingCalendar(lodge.plan);

  const requested = params.get("tab") as Tab | null;
  const tab: Tab = requested && TABS.includes(requested) ? requested : lodge.bookingsWaiting > 0 ? "requests" : "calendar";
  const setTab = (next: Tab) => router.replace(`${pathname}?tab=${next}` as Route, { scroll: false });

  const [version, setVersion] = useState(0);
  const reload = useCallback(() => setVersion((value) => value + 1), []);

  // Calendar: two weeks from Monday on desktop; the month around it on phones
  const [timelineStart, setTimelineStart] = useState(() => weekStart(today));
  const [timelineDays, setTimelineDays] = useState<14 | 28>(14);
  const [month, setMonth] = useState(() => monthOf(today));
  const [day, setDay] = useState(today);
  const [roomId, setRoomId] = useState(() => lodge.rooms.find((room) => room.visible)?.id ?? lodge.rooms[0]?.id ?? "");
  const range = wide
    ? { from: timelineStart, to: dateAdd(timelineStart, timelineDays) }
    : { from: weekStart(`${month}-01`), to: dateAdd(weekStart(`${month}-01`), 42) };
  // Requests need their nights' holds for the "fills your last room" warning: today to 12 weeks on
  const requestRange = { from: today, to: dateAdd(today, 84) };
  const calendar = useBookingsWindow(tab === "calendar" ? range.from : requestRange.from, tab === "calendar" ? range.to : requestRange.to, version);

  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const list = useBookingList(tab === "calendar" ? "upcoming" : tab, tab === "requests" ? "" : query, page, version, enabled && tab !== "calendar");
  useEffect(() => setPage(1), [tab, query]);

  const [sheet, setSheet] = useState<{ open: boolean; target: BookingSheetTarget; key: number }>({ open: false, target: { kind: "new" }, key: 0 });
  const openSheet = (target: BookingSheetTarget) => setSheet((current) => ({ open: true, target, key: current.key + 1 }));

  const rooms = calendar.window?.rooms ?? lodge.rooms.map((room) => ({ id: room.id, name: room.name, units: room.units, visible: room.visible, price: room.price }));

  if (!enabled) return <LockedBookings lodge={lodge} />;

  if (lodge.rooms.length === 0) {
    return (
      <Page>
        <PageHeader title="Bookings" description="Your calendar: requests from your site, bookings you took on WhatsApp, and closed dates." />
        <Card>
          <EmptyState
            icon={<CalendarDays />}
            title="Add a room first"
            description="Bookings are for your rooms. Add them with their prices, then the calendar fills in here."
            action={
              <Link href="/dashboard/rooms" className={buttonVariants()}>
                <Plus />
                Add rooms
              </Link>
            }
          />
        </Card>
      </Page>
    );
  }

  return (
    <Page>
      <PageHeader
        title="Bookings"
        description="Requests from your site, bookings you took on WhatsApp or by phone, and dates you closed."
        actions={
          <Button onClick={() => openSheet({ kind: "new", roomId: tab === "calendar" && !wide ? roomId : undefined, date: tab === "calendar" && !wide ? day : undefined })}>
            <Plus />
            Add booking
          </Button>
        }
      />

      <PageSection>
        <BookingsOverview lodge={lodge} onRequests={() => setTab("requests")} onCalendar={() => setTab("calendar")} />
      </PageSection>

      <PageSection>
        <div className="-mx-4 overflow-x-auto px-4 [scrollbar-width:none] sm:mx-0 sm:px-0">
          <Tabs value={tab} onValueChange={(value) => setTab(value as Tab)}>
            <TabsList aria-label="Bookings" className="shrink-0">
              <TabsTab value="requests">
                <Inbox />
                Requests
                {lodge.bookingsWaiting > 0 ? (
                  <Badge variant={tab === "requests" ? "inverse" : "purple"} className="h-5 px-1.5">
                    {lodge.bookingsWaiting}
                  </Badge>
                ) : null}
              </TabsTab>
              <TabsTab value="calendar">
                <CalendarDays />
                Calendar
              </TabsTab>
              <TabsTab value="upcoming">Upcoming</TabsTab>
              <TabsTab value="past">Past</TabsTab>
            </TabsList>
          </Tabs>
        </div>
      </PageSection>

      <PageSection>
        {tab === "requests" ? (
          <Requests
            result={list.result}
            loading={list.loading}
            window={calendar.window}
            onOpen={(booking) => openSheet({ kind: "existing", booking })}
            onChanged={reload}
          />
        ) : tab === "calendar" ? (
          calendar.window ? (
            <div className={cn("transition-opacity duration-200", calendar.loading && "opacity-60")} aria-busy={calendar.loading || undefined}>
              {wide ? (
                <div className="flex flex-col gap-3">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-1.5">
                      <Button variant="outline" size="icon-sm" aria-label="Earlier" onClick={() => setTimelineStart(dateAdd(timelineStart, -7))}>
                        <ChevronLeft />
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => setTimelineStart(weekStart(today))}>
                        Today
                      </Button>
                      <Button variant="outline" size="icon-sm" aria-label="Later" onClick={() => setTimelineStart(dateAdd(timelineStart, 7))}>
                        <ChevronRight />
                      </Button>
                      <span className="ml-2 text-[14px] font-semibold">{formatStay(timelineStart, dateAdd(timelineStart, timelineDays - 1))}</span>
                    </div>
                    <Tabs value={String(timelineDays)} onValueChange={(value) => setTimelineDays(Number(value) as 14 | 28)}>
                      <TabsList aria-label="Days shown">
                        <TabsTab value="14">2 weeks</TabsTab>
                        <TabsTab value="28">4 weeks</TabsTab>
                      </TabsList>
                    </Tabs>
                  </div>
                  <BookingsTimeline
                    window={calendar.window}
                    from={range.from}
                    days={timelineDays}
                    today={today}
                    onOpen={(booking) => openSheet({ kind: "existing", booking })}
                    onAdd={(room, date) => openSheet({ kind: "new", roomId: room, date })}
                  />
                  <Legend />
                </div>
              ) : (
                <BookingsMonth
                  window={calendar.window}
                  month={month}
                  onMonthChange={(next) => {
                    setMonth(next);
                    setDay(next === monthOf(today) ? today : `${next}-01`);
                  }}
                  roomId={roomId}
                  onRoomChange={setRoomId}
                  day={day}
                  onDayChange={(date) => {
                    setDay(date);
                    if (monthOf(date) !== month) setMonth(monthOf(date));
                  }}
                  onOpen={(booking) => openSheet({ kind: "existing", booking })}
                  onAdd={(room, date, block) => openSheet({ kind: "new", roomId: room, date, block })}
                />
              )}
            </div>
          ) : (
            <Skeleton className="h-[420px] w-full rounded-2xl" />
          )
        ) : (
          <BookingList
            tab={tab}
            result={list.result}
            loading={list.loading}
            query={query}
            onQuery={setQuery}
            page={page}
            onPage={setPage}
            onOpen={(booking) => openSheet({ kind: "existing", booking })}
          />
        )}
      </PageSection>

      <BookingSheet
        key={sheet.key}
        open={sheet.open}
        onOpenChange={(open) => setSheet((current) => ({ ...current, open }))}
        target={sheet.target}
        rooms={rooms}
        onChanged={reload}
      />
    </Page>
  );
}

function Legend() {
  return (
    <div className="flex flex-wrap gap-x-5 gap-y-1 text-[12px] text-muted">
      <span className="inline-flex items-center gap-1.5">
        <span className="h-2.5 w-5 rounded-sm bg-primary" />
        Booked
      </span>
      <span className="inline-flex items-center gap-1.5">
        <span className="h-2.5 w-5 rounded-sm border border-dashed border-purple bg-purple-tint" />
        Request, waiting for you
      </span>
      <span className="inline-flex items-center gap-1.5">
        <span className="h-2.5 w-5 rounded-sm bg-[repeating-linear-gradient(135deg,#E4E9EC_0,#E4E9EC_3px,#F4F7F9_3px,#F4F7F9_6px)]" />
        Closed
      </span>
      <span>Tap a day to add a booking there.</span>
    </div>
  );
}

/** Requests from the site, oldest first, each with Confirm right there. */
function Requests({
  result,
  loading,
  window,
  onOpen,
  onChanged,
}: {
  result: ListResult | null;
  loading: boolean;
  window: BookingsWindow | null;
  onOpen: (booking: DashboardBooking) => void;
  onChanged: () => void;
}) {
  const { lodge, saveWith } = useLodge();
  const reduceMotion = useReducedMotion();
  const [busy, setBusy] = useState<string | null>(null);

  async function confirm(booking: DashboardBooking) {
    setBusy(booking.id);
    const response = await saveWith<{ booking: DashboardBooking; lodge: Lodge }>(`/bookings/${booking.id}`, "PATCH", { action: "confirm" });
    setBusy(null);
    if (response.error !== undefined) {
      toast.error(response.error);
      return;
    }
    const confirmed = response.data.booking;
    const chat = guestChatUrl(confirmed, bookingMessages.confirmed(confirmed, lodge));
    toast.success(`${confirmed.guestName ?? "The booking"} is confirmed`, {
      description: confirmed.guestEmail ? "We emailed them too." : "Let them know on WhatsApp.",
      action: chat ? { label: "Message", onClick: () => globalThis.open(chat, "_blank", "noreferrer") } : undefined,
    });
    onChanged();
  }

  let body: React.ReactNode;
  if (!result) {
    body = (
      <div className="flex flex-col gap-3" aria-busy="true">
        <Skeleton className="h-44 w-full rounded-2xl" />
        <Skeleton className="h-44 w-full rounded-2xl" />
      </div>
    );
  } else if (result.bookings.length === 0) {
    body = (
      <Card>
        <EmptyState
          icon={<Inbox />}
          title="No requests waiting"
          description={
            lodge.autoConfirmBookings
              ? "Bookings from your site are confirmed automatically, so they go straight to Upcoming. We email you each one."
              : "When a guest picks dates on your site and sends a request, it shows here, and we email you."
          }
        />
      </Card>
    );
  } else {
    body = (
      <ul className={cn("flex flex-col gap-3 transition-opacity", loading && "opacity-60")}>
        <AnimatePresence initial={false}>
          {result.bookings.map((booking, index) => {
            const room = window?.rooms.find((entry) => entry.id === booking.roomId);
            const warning = room && window ? confirmWarning(room.units, holdsOf(window.bookings, room.id, booking.id), booking) : undefined;
            return (
              <motion.li
                key={booking.id}
                layout={!reduceMotion}
                initial={reduceMotion ? false : { opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={reduceMotion ? { opacity: 0 } : { opacity: 0, height: 0, marginTop: -12 }}
                transition={{ duration: 0.2 }}
              >
                <RequestCard
                  booking={booking}
                  position={(result.page - 1) * result.pageSize + index + 1}
                  warning={warning}
                  busy={busy === booking.id}
                  onOpen={() => onOpen(booking)}
                  onConfirm={() => confirm(booking)}
                />
              </motion.li>
            );
          })}
        </AnimatePresence>
      </ul>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <BookingSettings />
      {body}
    </div>
  );
}

function BookingList({
  tab,
  result,
  loading,
  query,
  onQuery,
  page,
  onPage,
  onOpen,
}: {
  tab: "upcoming" | "past";
  result: ListResult | null;
  loading: boolean;
  query: string;
  onQuery: (query: string) => void;
  page: number;
  onPage: (page: number) => void;
  onOpen: (booking: DashboardBooking) => void;
}) {
  const pages = result ? Math.max(1, Math.ceil(result.total / result.pageSize)) : 1;
  return (
    <Card className="overflow-hidden">
      <div className="border-b border-line-3 p-3 sm:p-4">
        <InputGroup className="sm:max-w-sm">
          <InputGroupAddon>
            <Search />
          </InputGroupAddon>
          <InputGroupInput value={query} onChange={(event) => onQuery(event.target.value)} placeholder="Search by name, phone or reference" aria-label="Search bookings" />
        </InputGroup>
      </div>
      {!result ? (
        <div className="flex flex-col gap-2 p-4" aria-busy="true">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      ) : result.bookings.length === 0 ? (
        <EmptyState
          icon={<CalendarDays />}
          title={query ? "Nothing matches" : tab === "upcoming" ? "No upcoming bookings" : "Nothing here yet"}
          description={
            query
              ? "Try part of the guest's name, their number, or the B- reference."
              : tab === "upcoming"
                ? "Confirmed bookings from today on show here, soonest first."
                : "Stays that are over, and declined or cancelled bookings, show here."
          }
        />
      ) : (
        <ul className={cn("divide-y divide-line-3 transition-opacity", loading && "opacity-60")}>
          {result.bookings.map((booking) => (
            <li key={booking.id}>
              <BookingRow booking={booking} onOpen={onOpen} />
            </li>
          ))}
        </ul>
      )}
      {result && pages > 1 ? (
        <div className="flex items-center justify-between border-t border-line-3 px-4 py-3 text-[13px] text-muted">
          <span>
            Page {page} of {pages}
          </span>
          <span className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => onPage(page - 1)} disabled={page <= 1}>
              Newer
            </Button>
            <Button variant="outline" size="sm" onClick={() => onPage(page + 1)} disabled={page >= pages}>
              {tab === "past" ? "Older" : "Later"}
            </Button>
          </span>
        </div>
      ) : null}
    </Card>
  );
}

/** Starter: what the calendar looks like, and the way to it. */
function LockedBookings({ lodge }: { lodge: Lodge }) {
  const growth = PLANS.GROWTH;
  const sample = ["Tendai Moyo", "Closed: painting", "Sarah Banda"];
  return (
    <Page>
      <PageHeader title="Bookings" description="Take booking requests on your site, and keep every booking in one calendar." />
      <Card className="relative overflow-hidden">
        <div aria-hidden="true" className="pointer-events-none flex flex-col gap-2 p-5 blur-[3px] select-none">
          {sample.map((name, index) => (
            <div key={name} className="grid grid-cols-[160px_minmax(0,1fr)] items-center gap-3">
              <span className="text-[13px] font-semibold">{lodge.rooms[index]?.name ?? ["Garden Cottage", "River Suite", "Family Chalet"][index]}</span>
              <span className="grid grid-cols-14 gap-1">
                <span
                  className={cn("h-7 rounded-lg", index === 1 ? "bg-surface" : "bg-primary")}
                  style={{ gridColumn: `${2 + index * 3} / ${6 + index * 3}` }}
                />
              </span>
            </div>
          ))}
        </div>
        <div className="flex items-center justify-center bg-white/55 p-4 sm:absolute sm:inset-0">
          <div className="flex max-w-sm flex-col items-center gap-3 rounded-[20px] bg-white p-6 text-center shadow-pop animate-in fade-in-0 zoom-in-95 duration-500">
            <span className="flex size-11 items-center justify-center rounded-full bg-purple-wash text-purple">
              <Lock className="size-5" />
            </span>
            <span className="text-xs font-semibold tracking-[0.06em] text-purple uppercase">{growth.name} plan</span>
            <p className="font-display text-lg leading-6 font-semibold">Guests pick dates on your site; you confirm in one tap</p>
            <p className="text-[13px] text-muted">No more double bookings. Bookings you added before stay here when you upgrade.</p>
            <Link href="/dashboard/billing" className={buttonVariants({ variant: "accent", size: "lg", className: "w-full" })}>
              Upgrade to {growth.name} (${growth.price}/mo)
            </Link>
          </div>
        </div>
      </Card>
    </Page>
  );
}

