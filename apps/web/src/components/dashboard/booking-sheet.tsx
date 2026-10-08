"use client";

import {
  AlertDialog,
  AlertDialogClose,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogIcon,
  AlertDialogTitle,
} from "@stayzim/ui/components/alert-dialog";
import { Badge } from "@stayzim/ui/components/badge";
import { Button, buttonVariants } from "@stayzim/ui/components/button";
import { Checkbox } from "@stayzim/ui/components/checkbox";
import { Field, FormMessage } from "@stayzim/ui/components/field";
import { Input, InputGroup, InputGroupAddon, InputGroupInput } from "@stayzim/ui/components/input";
import { NativeSelect } from "@stayzim/ui/components/native-select";
import { NumberField } from "@stayzim/ui/components/number-field";
import { monthOf, RangeCalendar, type DateRange } from "@stayzim/ui/components/range-calendar";
import { Sheet, SheetBody, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@stayzim/ui/components/sheet";
import { Textarea } from "@stayzim/ui/components/textarea";
import { Toggle, ToggleGroup } from "@stayzim/ui/components/toggle";
import { cn } from "@stayzim/ui/lib/utils";
import { BOOKING_LIMITS, dateAdd, dateAddMonths, formatStay, nightsBetween, todayInHarare } from "@stayzim/sites";
import { CalendarX2, Info, LockKeyhole, Trash2, UserRound } from "lucide-react";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { toast } from "sonner";

import { useLodge } from "@/components/dashboard/lodge-provider";
import { DiscardChangesDialog } from "@/components/dashboard/unsaved-changes";
import { WhatsAppIcon } from "@/components/landing/brand";
import { api } from "@/lib/api";
import {
  bookingMessages,
  bookingStatus,
  confirmWarning,
  fullNightsOf,
  guestChatUrl,
  holdsOf,
  stayLine,
  type BookingsWindow,
  type DashboardBooking,
} from "@/lib/bookings";
import { dialPrefix, formatPhone, phoneFromInput, phoneToInput, type Lodge } from "@/lib/lodge";

export type SheetRoom = BookingsWindow["rooms"][number];

/** What the sheet opens on: a new booking (maybe on a day, maybe closed dates), or one that exists. */
export type BookingSheetTarget =
  | { kind: "new"; roomId?: string; date?: string; block?: boolean }
  | { kind: "existing"; booking: DashboardBooking };

type Draft = {
  block: boolean;
  roomId: string;
  dates: DateRange;
  quantity: number;
  guests: number | null;
  guestName: string;
  guestPhone: string;
  guestEmail: string;
  notes: string;
};

function draftFrom(target: BookingSheetTarget, rooms: SheetRoom[]): Draft {
  if (target.kind === "existing") {
    const booking = target.booking;
    return {
      block: booking.kind === "BLOCK",
      roomId: booking.roomId,
      dates: { start: booking.checkIn, end: booking.checkOut },
      quantity: booking.quantity,
      guests: booking.guests,
      guestName: booking.guestName ?? "",
      guestPhone: phoneToInput(booking.guestPhone),
      guestEmail: booking.guestEmail ?? "",
      notes: booking.notes ?? "",
    };
  }
  const roomId = target.roomId ?? rooms.find((room) => room.visible)?.id ?? rooms[0]?.id ?? "";
  const room = rooms.find((entry) => entry.id === roomId);
  return {
    block: Boolean(target.block),
    roomId,
    dates: { start: target.date ?? null, end: target.date ? dateAdd(target.date, 1) : null },
    quantity: target.block ? (room?.units ?? 1) : 1,
    guests: target.block ? null : 2,
    guestName: "",
    guestPhone: "",
    guestEmail: "",
    notes: "",
  };
}

/** Same as the draft it started from? (Phones compare as typed.) */
function sameDraft(a: Draft, b: Draft) {
  return JSON.stringify(a) === JSON.stringify(b);
}

/** A booking's nights in the calendar around the visible month, for the date picker. */
function useRoomAvailability(roomId: string, month: string, except?: string) {
  const [window, setWindow] = useState<BookingsWindow | null>(null);
  const from = `${month}-01`;
  const to = dateAdd(from, 62);
  useEffect(() => {
    let current = true;
    void api<BookingsWindow>(`/api/lodge/bookings?from=${from}&to=${to}`).then((result) => {
      if (current && result.data) setWindow(result.data);
    });
    return () => {
      current = false;
    };
  }, [from, to]);
  return useMemo(() => {
    if (!window) return { full: new Set<string>(), holds: [] as ReturnType<typeof holdsOf> };
    const room = window.rooms.find((entry) => entry.id === roomId);
    const holds = holdsOf(window.bookings, roomId, except);
    return { full: room ? fullNightsOf(room.units, holds, from, to) : new Set<string>(), holds };
  }, [window, roomId, except, from, to]);
}

type Closing = { action: "decline" | "cancel" | "reopen"; reason: string; message: boolean };

export function BookingSheet({
  open,
  onOpenChange,
  target,
  rooms,
  onChanged,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  target: BookingSheetTarget;
  rooms: SheetRoom[];
  /** After any save, so the page reloads its lists */
  onChanged: (booking: DashboardBooking) => void;
}) {
  const { lodge, saveWith } = useLodge();
  const existing = target.kind === "existing" ? target.booking : null;
  const start = useMemo(() => draftFrom(target, rooms), [target, rooms]);
  const [draft, setDraft] = useState<Draft>(start);
  const [month, setMonth] = useState(() => monthOf(start.dates.start ?? todayInHarare()));
  const [errors, setErrors] = useState<Partial<Record<"dates" | "guestPhone" | "guestEmail", string>>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [closing, setClosing] = useState<Closing | null>(null);
  const [confirmClose, setConfirmClose] = useState(false);
  const today = todayInHarare();

  const room = rooms.find((entry) => entry.id === draft.roomId);
  const availability = useRoomAvailability(draft.roomId, month, existing?.id);
  const status = existing ? bookingStatus(existing) : null;
  const done = existing ? existing.status === "DECLINED" || existing.status === "CANCELLED" || existing.expired : false;
  const editable = !done;
  const edited = editable && !sameDraft(draft, start);
  const nights = draft.dates.start && draft.dates.end ? nightsBetween(draft.dates.start, draft.dates.end) : 0;
  const price = existing && existing.roomId === draft.roomId ? existing.nightlyPrice : (room?.price ?? 0);
  const total = price * nights * draft.quantity;
  const set = <K extends keyof Draft>(key: K, value: Draft[K]) => setDraft((current) => ({ ...current, [key]: value }));

  // A request or confirmed booking that no longer fits shows why before the owner taps
  const warning =
    existing && existing.status === "REQUESTED" && !existing.expired && room && draft.dates.start && draft.dates.end
      ? confirmWarning(room.units, availability.holds, { checkIn: draft.dates.start, checkOut: draft.dates.end, quantity: draft.quantity, roomName: room.name })
      : null;

  function requestClose() {
    if (edited && !busy) setConfirmClose(true);
    else onOpenChange(false);
  }

  /** The fields as the API wants them, or null after showing what's wrong. */
  function payload() {
    const nextErrors: typeof errors = {};
    if (!draft.dates.start || !draft.dates.end) nextErrors.dates = "Pick the check-in and check-out days";
    const phone = phoneFromInput(draft.guestPhone);
    if (phone.error) nextErrors.guestPhone = phone.error;
    if (draft.guestEmail.trim() && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(draft.guestEmail.trim())) nextErrors.guestEmail = "Check the email address";
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return null;
    return {
      roomId: draft.roomId,
      checkIn: draft.dates.start!,
      checkOut: draft.dates.end!,
      quantity: draft.quantity,
      ...(draft.block
        ? { notes: draft.notes.trim() || null }
        : {
            guests: draft.guests,
            guestName: draft.guestName.trim() || null,
            guestPhone: phone.digits,
            guestEmail: draft.guestEmail.trim() || null,
            notes: draft.notes.trim() || null,
          }),
    };
  }

  async function run(label: string, path: string, method: "POST" | "PATCH", body: unknown) {
    setBusy(label);
    setFormError(null);
    const result = await saveWith<{ booking: DashboardBooking; lodge: Lodge }>(path, method, body);
    setBusy(null);
    if (result.error !== undefined) {
      setFormError(result.error);
      return null;
    }
    onChanged(result.data.booking);
    return result.data.booking;
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (!editable) return;
    const body = payload();
    if (!body) return;
    if (!existing) {
      const created = draft.block
        ? await run("save", "/bookings/blocks", "POST", body)
        : await run("save", "/bookings", "POST", body);
      if (!created) return;
      toast.success(draft.block ? "Dates closed" : "Booking added", { description: `${created.roomName}, ${stayLine(created)}` });
      onOpenChange(false);
      return;
    }
    const saved = await run("save", `/bookings/${existing.id}`, "PATCH", { action: "edit", ...body });
    if (!saved) return;
    toast.success("Changes saved");
    onOpenChange(false);
  }

  async function confirm() {
    if (!existing) return;
    // Unsaved edits to a request (another room, other dates) go first
    if (edited) {
      const body = payload();
      if (!body) return;
      if (!(await run("confirm", `/bookings/${existing.id}`, "PATCH", { action: "edit", ...body }))) return;
    }
    const confirmed = await run("confirm", `/bookings/${existing.id}`, "PATCH", { action: "confirm" });
    if (!confirmed) return;
    const chat = guestChatUrl(confirmed, bookingMessages.confirmed(confirmed, lodge));
    toast.success(`${confirmed.guestName ?? "The booking"} is confirmed`, {
      description: confirmed.guestEmail ? "We emailed them too." : "Let them know on WhatsApp.",
      action: chat ? { label: "Message", onClick: () => window.open(chat, "_blank", "noreferrer") } : undefined,
    });
    onOpenChange(false);
  }

  async function close() {
    if (!existing || !closing) return;
    const reason = closing.reason.trim() || null;
    const action = closing.action === "reopen" ? "cancel" : closing.action;
    const updated = await run(action, `/bookings/${existing.id}`, "PATCH", { action, reason });
    if (!updated) {
      setClosing(null);
      return;
    }
    if (closing.message && updated.guestPhone) {
      const text = action === "decline" ? bookingMessages.declined(updated, lodge, reason) : bookingMessages.cancelled(updated, lodge, reason);
      window.open(guestChatUrl(updated, text)!, "_blank", "noreferrer");
    }
    toast.success(closing.action === "reopen" ? "Dates open again" : action === "decline" ? "Request declined" : "Booking cancelled", {
      description: closing.action === "reopen" ? undefined : "The dates are free for other guests.",
    });
    setClosing(null);
    onOpenChange(false);
  }

  const title = existing
    ? existing.kind === "BLOCK"
      ? `Closed: ${existing.roomName}`
      : (existing.guestName ?? existing.roomName)
    : draft.block
      ? "Close dates"
      : "Add booking";

  const chat = existing && existing.kind === "STAY" ? guestChatUrl(existing, bookingMessages.hello(existing, lodge)) : null;
  const maxDate = dateAddMonths(today, BOOKING_LIMITS.monthsAhead);

  return (
    <Sheet open={open} onOpenChange={(next) => (next ? onOpenChange(true) : requestClose())}>
      <SheetContent>
        <form onSubmit={onSubmit} className="flex h-full flex-col" noValidate>
          <SheetHeader>
            <SheetTitle className="flex flex-wrap items-center gap-2">
              {title}
              {status ? (
                <Badge status variant={status.tone}>
                  {status.label}
                </Badge>
              ) : null}
            </SheetTitle>
            <SheetDescription>
              {existing
                ? `${existing.reference} · ${existing.source === "SITE" ? "Requested on your site" : "Added by you"}`
                : draft.block
                  ? "Guests can't book these nights. Use it for repairs or private events."
                  : "A booking you took on WhatsApp or by phone. It's confirmed straight away."}
            </SheetDescription>
          </SheetHeader>

          <SheetBody className="flex flex-col gap-5">
            <FormMessage>{formError}</FormMessage>

            {!existing ? (
              <ToggleGroup
                value={[draft.block ? "block" : "stay"]}
                onValueChange={(value) => {
                  const block = value[0] === "block";
                  setDraft((current) => ({ ...current, block, quantity: block ? (room?.units ?? 1) : 1, guests: block ? null : 2 }));
                }}
                aria-label="What to add"
              >
                <Toggle value="stay">
                  <UserRound />
                  Booking
                </Toggle>
                <Toggle value="block">
                  <LockKeyhole />
                  Closed dates
                </Toggle>
              </ToggleGroup>
            ) : null}

            {existing && existing.kind === "STAY" && existing.message ? (
              <p className="rounded-xl bg-purple-tint px-3.5 py-3 text-[13.5px] leading-5 text-purple-ink">
                <span className="mb-0.5 block text-xs font-semibold">Their note</span>
                {existing.message}
              </p>
            ) : null}

            <fieldset disabled={!editable || busy !== null} className="flex flex-col gap-5">
              <Field label="Room">
                <NativeSelect
                  value={draft.roomId}
                  onChange={(event) => {
                    const next = rooms.find((entry) => entry.id === event.target.value);
                    setDraft((current) => ({ ...current, roomId: event.target.value, quantity: current.block ? (next?.units ?? 1) : Math.min(current.quantity, next?.units ?? 1) }));
                  }}
                >
                  {rooms
                    .filter((entry) => entry.visible || entry.id === draft.roomId)
                    .map((entry) => (
                      <option key={entry.id} value={entry.id}>
                        {entry.name}
                        {entry.units > 1 ? ` (you have ${entry.units})` : ""}
                      </option>
                    ))}
                </NativeSelect>
              </Field>

              <Field
                label="Dates"
                error={errors.dates}
                action={
                  draft.dates.start ? (
                    <span className="text-xs font-semibold text-ink tabular-nums">
                      {draft.dates.end ? `${formatStay(draft.dates.start, draft.dates.end)} · ${nights} ${nights === 1 ? "night" : "nights"}` : "Now tap check-out"}
                    </span>
                  ) : (
                    <span className="text-xs text-muted-2">Tap check-in, then check-out</span>
                  )
                }
              >
                <div className="rounded-xl border border-line p-3">
                  <RangeCalendar
                    mode="range"
                    value={draft.dates}
                    onChange={(dates) => {
                      set("dates", dates);
                      setErrors((current) => ({ ...current, dates: undefined }));
                    }}
                    month={month}
                    onMonthChange={setMonth}
                    min={dateAdd(today, -366)}
                    max={maxDate}
                    unavailable={availability.full}
                    label="Dates"
                  />
                </div>
              </Field>

              {room && room.units > 1 ? (
                <Field
                  label={draft.block ? "How many to close" : "How many rooms"}
                  hint={`You have ${room.units}`}
                  help={draft.block ? "Closing 1 of 3 cottages leaves 2 for guests to book on those nights." : undefined}
                >
                  <NumberField value={draft.quantity} min={1} max={room.units} onValueChange={(value) => set("quantity", value ?? 1)} className="max-w-40" />
                </Field>
              ) : null}

              {draft.block ? null : (
                <>
                  <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)] gap-3">
                    <Field label="Guests">
                      <NumberField value={draft.guests} min={1} max={200} onValueChange={(value) => set("guests", value)} />
                    </Field>
                    <Field label="Guest name">
                      <Input value={draft.guestName} onChange={(event) => set("guestName", event.target.value)} maxLength={BOOKING_LIMITS.guestName} placeholder="Tendai Moyo" />
                    </Field>
                  </div>
                  <Field label="Guest's WhatsApp" error={errors.guestPhone}>
                    <InputGroup>
                      <InputGroupAddon>
                        <WhatsAppIcon size={15} color="#1F7A4D" />
                        {dialPrefix(draft.guestPhone)}
                      </InputGroupAddon>
                      <InputGroupInput
                        value={draft.guestPhone}
                        onChange={(event) => {
                          set("guestPhone", event.target.value);
                          setErrors((current) => ({ ...current, guestPhone: undefined }));
                        }}
                        inputMode="tel"
                        placeholder="77 123 4567"
                      />
                    </InputGroup>
                  </Field>
                  <Field label="Guest's email" error={errors.guestEmail} hint="Optional. They get an email when you confirm or cancel.">
                    <Input
                      value={draft.guestEmail}
                      onChange={(event) => {
                        set("guestEmail", event.target.value);
                        setErrors((current) => ({ ...current, guestEmail: undefined }));
                      }}
                      inputMode="email"
                      autoCapitalize="none"
                      placeholder="tendai@example.com"
                    />
                  </Field>
                </>
              )}

              <Field label={draft.block ? "Why (only you see it)" : "Notes (only you see them)"} count={{ value: draft.notes.length, max: BOOKING_LIMITS.notes }}>
                <Textarea
                  value={draft.notes}
                  onChange={(event) => set("notes", event.target.value)}
                  maxLength={BOOKING_LIMITS.notes}
                  rows={2}
                  placeholder={draft.block ? "Painting the rondavels" : "Deposit $50 received on EcoCash"}
                />
              </Field>
            </fieldset>

            {!draft.block && nights > 0 ? (
              <div className="flex items-center justify-between rounded-xl bg-surface px-3.5 py-3 text-[13.5px]">
                <span className="text-muted">
                  {nights} {nights === 1 ? "night" : "nights"} × ${price}
                  {draft.quantity > 1 ? ` × ${draft.quantity} rooms` : ""}
                </span>
                <strong className="font-semibold">${total}</strong>
              </div>
            ) : null}

            {warning ? (
              <p
                className={cn(
                  "flex items-start gap-2 rounded-xl px-3.5 py-3 text-[13px] leading-5",
                  warning.kind === "full" ? "bg-danger-tint text-danger" : "bg-surface text-muted",
                )}
              >
                <Info className="mt-0.5 size-4 shrink-0" />
                {warning.text}
              </p>
            ) : null}

            {existing ? (
              <div className="flex flex-col gap-2">
                {chat ? (
                  <a href={chat} target="_blank" rel="noreferrer" className={buttonVariants({ variant: "whatsapp", className: "w-full" })}>
                    <WhatsAppIcon size={16} />
                    Message {existing.guestName?.split(" ")[0] ?? "the guest"}
                    {existing.guestPhone ? <span className="font-normal opacity-80">{formatPhone(existing.guestPhone)}</span> : null}
                  </a>
                ) : null}
                <History booking={existing} />
              </div>
            ) : null}
          </SheetBody>

          <SheetFooter className="flex-wrap">
            {!existing ? (
              <>
                <Button type="button" variant="outline" onClick={requestClose}>
                  Cancel
                </Button>
                <Button type="submit" loading={busy === "save"}>
                  {draft.block ? "Close dates" : "Add booking"}
                </Button>
              </>
            ) : done ? (
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="w-full">
                Close
              </Button>
            ) : existing.status === "REQUESTED" ? (
              <>
                <Button type="button" variant="outline" onClick={() => setClosing({ action: "decline", reason: "", message: Boolean(existing.guestPhone) })} disabled={busy !== null}>
                  Decline
                </Button>
                <Button type="button" onClick={confirm} loading={busy === "confirm"} disabled={warning?.kind === "full"}>
                  {edited ? "Save and confirm" : "Confirm"}
                </Button>
              </>
            ) : (
              <>
                <Button
                  type="button"
                  variant="ghost"
                  className="text-danger hover:text-danger"
                  onClick={() => setClosing({ action: existing.kind === "BLOCK" ? "reopen" : "cancel", reason: "", message: Boolean(existing.guestPhone) })}
                  disabled={busy !== null}
                >
                  {existing.kind === "BLOCK" ? "Open these dates" : "Cancel booking"}
                </Button>
                <Button type="submit" loading={busy === "save"} disabled={!edited}>
                  Save changes
                </Button>
              </>
            )}
          </SheetFooter>
        </form>
      </SheetContent>

      <AlertDialog open={closing !== null} onOpenChange={(next) => !next && setClosing(null)}>
        <AlertDialogContent>
          <AlertDialogIcon>{closing?.action === "reopen" ? <CalendarX2 /> : <Trash2 />}</AlertDialogIcon>
          <AlertDialogTitle>
            {closing?.action === "decline"
              ? `Decline ${existing?.guestName ?? "this request"}?`
              : closing?.action === "reopen"
                ? "Open these dates again?"
                : `Cancel ${existing?.guestName ? `${existing.guestName}'s` : "this"} booking?`}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {closing?.action === "reopen" ? "Guests can book them again." : "The dates open up again for other guests. You can't undo this."}
          </AlertDialogDescription>
          {closing && closing.action !== "reopen" ? (
            <div className="flex flex-col gap-3">
              <Field label="Reason (optional)" hint={existing?.guestEmail ? "We add it to the email to the guest." : undefined}>
                <Textarea
                  value={closing.reason}
                  onChange={(event) => setClosing({ ...closing, reason: event.target.value })}
                  maxLength={BOOKING_LIMITS.reason}
                  rows={2}
                  placeholder={closing.action === "decline" ? "We're full that weekend, but have rooms from the 20th." : "The road is closed after the rains."}
                />
              </Field>
              {existing?.guestPhone ? (
                <label className="flex items-center gap-2.5 text-[13.5px]">
                  <Checkbox checked={closing.message} onCheckedChange={(message) => setClosing({ ...closing, message: Boolean(message) })} />
                  Tell {existing.guestName?.split(" ")[0] ?? "them"} on WhatsApp
                </label>
              ) : null}
            </div>
          ) : null}
          <AlertDialogFooter>
            <AlertDialogClose render={<Button variant="outline" />}>Keep it</AlertDialogClose>
            <Button variant="destructive" onClick={close} loading={busy === "decline" || busy === "cancel"}>
              {closing?.action === "decline" ? "Decline" : closing?.action === "reopen" ? "Open dates" : "Cancel booking"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <DiscardChangesDialog
        open={confirmClose}
        onKeep={() => setConfirmClose(false)}
        onDiscard={() => {
          setConfirmClose(false);
          onOpenChange(false);
        }}
      />
    </Sheet>
  );
}

const WHEN = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Africa/Harare" });

/** What happened to the booking, oldest first. */
function History({ booking }: { booking: DashboardBooking }) {
  const steps = [
    { label: booking.source === "SITE" ? "Requested on your site" : booking.kind === "BLOCK" ? "Closed by you" : "Added by you", at: booking.createdAt },
    booking.decidedAt && booking.source === "SITE" ? { label: booking.status === "DECLINED" ? "Declined" : "Confirmed", at: booking.decidedAt } : null,
    booking.cancelledAt ? { label: booking.kind === "BLOCK" ? "Opened again" : "Cancelled", at: booking.cancelledAt } : null,
  ].filter((step): step is { label: string; at: string } => Boolean(step));
  return (
    <ol className="flex flex-col gap-1.5 pt-1 text-[12.5px] text-muted">
      {steps.map((step) => (
        <li key={step.label} className="flex items-center gap-2">
          <span className="size-1.5 rounded-full bg-soft" />
          {step.label} · {WHEN.format(new Date(step.at))}
        </li>
      ))}
      {booking.cancelReason ? <li className="pl-3.5 italic">“{booking.cancelReason}”</li> : null}
    </ol>
  );
}
