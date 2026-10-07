"use client";

import { Button } from "@stayzim/ui/components/button";
import { Field, FormMessage } from "@stayzim/ui/components/field";
import { Input } from "@stayzim/ui/components/input";
import { NativeSelect } from "@stayzim/ui/components/native-select";
import { NumberField } from "@stayzim/ui/components/number-field";
import { addMonths, monthOf, RangeCalendar, type DateRange } from "@stayzim/ui/components/range-calendar";
import { Sheet, SheetBody, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@stayzim/ui/components/sheet";
import { Textarea } from "@stayzim/ui/components/textarea";
import { BOOKING_LIMITS, dateAddMonths, formatStay, nightsBetween, todayInHarare, type SiteAvailability } from "@stayzim/sites";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { CalendarDays, Check, LogIn, LogOut } from "lucide-react";
import { useEffect, useRef, useState, type CSSProperties, type FormEvent } from "react";

import { WhatsAppIcon } from "@/components/landing/brand";
import type { BookingSite } from "@/components/site/tracking";
import { guestPhone } from "@/lib/guest-phone";
import { env } from "@/lib/public-env";
import { useMediaQuery } from "@/lib/use-media-query";

type Step = "dates" | "details" | "sent";

/** The nights already full, per room, loaded a window at a time. */
function useAvailability(slug: string, month: string) {
  const [full, setFull] = useState<Record<string, Set<string>>>({});
  const loaded = useRef<{ to: string } | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    const today = todayInHarare();
    const monthEnd = `${addMonths(month, 1)}-01`;
    if (loaded.current && loaded.current.to >= monthEnd) return;
    const from = loaded.current ? loaded.current.to : today;
    let current = true;
    void fetch(`${env.NEXT_PUBLIC_SERVER_URL}/api/sites/${encodeURIComponent(slug)}/availability?from=${from}&days=${BOOKING_LIMITS.availabilityDays}`)
      .then((response) => (response.ok ? (response.json() as Promise<SiteAvailability>) : Promise.reject(new Error(String(response.status)))))
      .then((data) => {
        if (!current) return;
        loaded.current = { to: data.to };
        setFull((existing) => {
          const next = { ...existing };
          for (const room of data.rooms) next[room.id] = new Set([...(existing[room.id] ?? []), ...room.full]);
          return next;
        });
      })
      .catch(() => current && setError(true));
    return () => {
      current = false;
    };
  }, [slug, month]);

  return { full, error };
}

export function BookingRequest({
  site,
  roomId: startRoom,
  open,
  onOpenChange,
  onWhatsApp,
}: {
  site: BookingSite;
  roomId?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** The guest chose WhatsApp: counted as a booking chat */
  onWhatsApp: (roomId: string) => void;
}) {
  const today = todayInHarare();
  const wide = useMediaQuery("(min-width: 640px)");
  const reduceMotion = useReducedMotion();
  const [step, setStep] = useState<Step>("dates");
  const [roomId, setRoomId] = useState(startRoom ?? site.rooms[0]?.id ?? "");
  const [dates, setDates] = useState<DateRange>({ start: null, end: null });
  const [month, setMonth] = useState(() => monthOf(today));
  const [guests, setGuests] = useState(2);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [website, setWebsite] = useState("");
  const [errors, setErrors] = useState<Partial<Record<"dates" | "name" | "phone" | "email", string>>>({});
  const [formError, setFormError] = useState<{ text: string; whatsapp?: boolean } | null>(null);
  const [sending, setSending] = useState(false);
  const [reference, setReference] = useState<string | null>(null);
  const { full, error: availabilityError } = useAvailability(site.slug, month);

  const room = site.rooms.find((entry) => entry.id === roomId) ?? site.rooms[0]!;
  const nights = dates.start && dates.end ? nightsBetween(dates.start, dates.end) : 0;
  const total = nights * room.price;
  const times = [site.checkInFrom && { icon: LogIn, text: `Check-in from ${site.checkInFrom}` }, site.checkOutBy && { icon: LogOut, text: `Check-out by ${site.checkOutBy}` }].filter(
    (entry): entry is { icon: typeof LogIn; text: string } => Boolean(entry),
  );

  const chatText = reference
    ? `Hi ${site.name}, I've just sent a booking request (${reference}): ${room.name}, ${formatStay(dates.start!, dates.end!)}, ${guests} ${guests === 1 ? "guest" : "guests"}. My name is ${name.trim()}.`
    : dates.start && dates.end
      ? `Hi ${site.name}, I'd like to book the ${room.name} for ${formatStay(dates.start, dates.end)}, ${guests} ${guests === 1 ? "guest" : "guests"}.`
      : `Hi ${site.name}, I'd like to book the ${room.name}. My dates are: `;
  const chatUrl = `https://wa.me/${site.whatsapp}?text=${encodeURIComponent(chatText)}`;

  function next(event?: FormEvent) {
    event?.preventDefault();
    if (step === "dates") {
      if (!dates.start || !dates.end) {
        setErrors({ dates: dates.start ? "Now tap the day you leave" : "Tap the day you arrive, then the day you leave" });
        return;
      }
      setErrors({});
      setStep("details");
      return;
    }
    void send();
  }

  async function send() {
    const nextErrors: typeof errors = {};
    if (name.trim().length < 2) nextErrors.name = "Add your name";
    const number = guestPhone(phone);
    if ("error" in number) nextErrors.phone = number.error;
    if (email.trim() && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim())) nextErrors.email = "Check the email address";
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0 || "error" in number) return;
    setSending(true);
    setFormError(null);
    try {
      const response = await fetch(`${env.NEXT_PUBLIC_SERVER_URL}/api/sites/${encodeURIComponent(site.slug)}/bookings`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          roomId: room.id,
          checkIn: dates.start,
          checkOut: dates.end,
          guests,
          name: name.trim(),
          phone: `+${number.digits}`,
          email: email.trim() || null,
          message: message.trim() || null,
          website,
        }),
      });
      const body = (await response.json().catch(() => ({}))) as { reference?: string; error?: string; fullOn?: string };
      if (response.ok && body.reference) {
        setReference(body.reference);
        setStep("sent");
      } else if (response.status === 409) {
        setErrors({ dates: body.error ?? "Those dates just filled up. Pick others." });
        setStep("dates");
      } else {
        setFormError({ text: body.error ?? "Your request didn't go through. Try again, or message the lodge on WhatsApp.", whatsapp: response.status === 429 || response.status === 404 });
      }
    } catch {
      setFormError({ text: "You seem to be offline. Try again, or message the lodge on WhatsApp.", whatsapp: true });
    }
    setSending(false);
  }

  // The lodge's colour, not StayZim's: primary and ring are "inline" theme values, so the base variables change
  const theme = {
    "--primary": site.themeColor,
    "--primary-foreground": "#ffffff",
    "--ring": site.themeColor,
    "--color-brand-wash": `color-mix(in srgb, ${site.themeColor} 12%, white)`,
  } as CSSProperties;

  const motionProps = reduceMotion
    ? {}
    : { initial: { opacity: 0, x: 16 }, animate: { opacity: 1, x: 0 }, exit: { opacity: 0, x: -16 }, transition: { duration: 0.18 } };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side={wide ? "right" : "bottom"} style={theme} className="max-sm:max-h-[92svh]">
        <form onSubmit={next} className="flex h-full min-h-0 flex-col" noValidate>
          <SheetHeader>
            <SheetTitle>{step === "sent" ? "Request sent" : `Book at ${site.name}`}</SheetTitle>
            <SheetDescription>
              {step === "dates" ? "Pick your dates. Greyed-out nights are full." : step === "details" ? "How the lodge can reach you." : `${site.name} will confirm with you, usually on WhatsApp.`}
            </SheetDescription>
            {step !== "sent" ? (
              <ol className="mt-3 flex gap-1.5" aria-label="Steps">
                {(["dates", "details"] as const).map((entry, index) => (
                  <li
                    key={entry}
                    aria-current={entry === step ? "step" : undefined}
                    className={`h-1 flex-1 rounded-full transition-colors ${index === 0 || step === "details" ? "bg-primary" : "bg-line-2"}`}
                  />
                ))}
              </ol>
            ) : null}
          </SheetHeader>

          <SheetBody className="flex flex-col gap-5">
            {formError ? (
              <FormMessage>
                <span className="flex flex-col gap-2">
                  {formError.text}
                  {formError.whatsapp ? (
                    <a href={chatUrl} target="_blank" rel="noreferrer" onClick={() => onWhatsApp(room.id)} className="font-semibold underline">
                      Message {site.name} on WhatsApp
                    </a>
                  ) : null}
                </span>
              </FormMessage>
            ) : null}

            <AnimatePresence mode="wait" initial={false}>
              {step === "dates" ? (
                <motion.div key="dates" {...motionProps} className="flex flex-col gap-5">
                  {site.rooms.length > 1 ? (
                    <Field label="Room">
                      <NativeSelect
                        value={room.id}
                        onChange={(event) => {
                          setRoomId(event.target.value);
                          setDates({ start: null, end: null });
                        }}
                      >
                        {site.rooms.map((entry) => (
                          <option key={entry.id} value={entry.id}>
                            {entry.name} · ${entry.price} a night
                          </option>
                        ))}
                      </NativeSelect>
                    </Field>
                  ) : null}
                  <Field
                    label="Dates"
                    error={errors.dates}
                    action={
                      dates.start ? (
                        <span className="text-xs font-semibold tabular-nums">
                          {dates.end ? `${formatStay(dates.start, dates.end)} · ${nights} ${nights === 1 ? "night" : "nights"}` : "Now tap the day you leave"}
                        </span>
                      ) : null
                    }
                  >
                    <div className="rounded-xl border border-line p-3">
                      <RangeCalendar
                        mode="range"
                        value={dates}
                        onChange={(value) => {
                          setDates(value);
                          setErrors({});
                        }}
                        month={month}
                        onMonthChange={setMonth}
                        min={today}
                        max={dateAddMonths(today, BOOKING_LIMITS.monthsAhead)}
                        unavailable={full[room.id]}
                        label="Your dates"
                      />
                    </div>
                  </Field>
                  {availabilityError ? <p className="text-xs text-muted-2">We couldn&apos;t check which nights are full. The lodge will tell you.</p> : null}
                  <Field label="Guests" hint={`${room.name} sleeps ${room.sleeps}`}>
                    <NumberField value={guests} min={1} max={Math.max(room.sleeps, 1)} onValueChange={(value) => setGuests(value ?? 1)} className="max-w-40" />
                  </Field>
                  {times.length > 0 ? (
                    <ul className="flex flex-wrap gap-x-4 gap-y-1 text-[13px] text-muted">
                      {times.map(({ icon: Icon, text }) => (
                        <li key={text} className="inline-flex items-center gap-1.5">
                          <Icon className="size-3.5" />
                          {text}
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </motion.div>
              ) : step === "details" ? (
                <motion.div key="details" {...motionProps} className="flex flex-col gap-4">
                  <div className="flex items-center gap-3 rounded-xl bg-surface px-3.5 py-3 text-[13.5px]">
                    <CalendarDays className="size-4 shrink-0 text-primary" />
                    <span className="min-w-0 flex-1">
                      <strong className="font-semibold">{room.name}</strong> · {formatStay(dates.start!, dates.end!)} · {guests} {guests === 1 ? "guest" : "guests"}
                    </span>
                    <button type="button" onClick={() => setStep("dates")} className="-my-2 shrink-0 py-2 font-semibold text-primary">
                      Change
                    </button>
                  </div>
                  <Field label="Your name" error={errors.name}>
                    <Input value={name} onChange={(event) => setName(event.target.value)} autoComplete="name" maxLength={BOOKING_LIMITS.guestName} autoFocus />
                  </Field>
                  <Field label="WhatsApp number" error={errors.phone} hint="The lodge confirms here. Outside Zimbabwe? Start with your country code, e.g. +44.">
                    <Input value={phone} onChange={(event) => setPhone(event.target.value)} inputMode="tel" autoComplete="tel" placeholder="077 123 4567" />
                  </Field>
                  <Field label="Email (optional)" error={errors.email} hint="For a copy of the confirmation.">
                    <Input value={email} onChange={(event) => setEmail(event.target.value)} inputMode="email" autoComplete="email" autoCapitalize="none" />
                  </Field>
                  <Field label="Anything the lodge should know? (optional)" count={{ value: message.length, max: BOOKING_LIMITS.message }}>
                    <Textarea value={message} onChange={(event) => setMessage(event.target.value)} maxLength={BOOKING_LIMITS.message} rows={2} placeholder="We'll arrive around 6pm." />
                  </Field>
                  {/* People don't see this; bots fill it in */}
                  <input
                    type="text"
                    name="website"
                    value={website}
                    onChange={(event) => setWebsite(event.target.value)}
                    tabIndex={-1}
                    autoComplete="off"
                    aria-hidden="true"
                    className="absolute -left-[9999px] h-px w-px opacity-0"
                  />
                </motion.div>
              ) : (
                <motion.div key="sent" {...motionProps} className="flex flex-col items-center gap-4 py-4 text-center">
                  <motion.span
                    initial={reduceMotion ? false : { scale: 0.6, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ type: "spring", stiffness: 380, damping: 22 }}
                    className="flex size-14 items-center justify-center rounded-full bg-primary text-primary-foreground"
                  >
                    <Check className="size-7" strokeWidth={2.5} />
                  </motion.span>
                  <div className="flex flex-col gap-1">
                    <p className="font-display text-xl font-semibold">Thank you, {name.trim().split(/\s+/)[0]}</p>
                    <p className="text-[14px] text-muted">
                      {room.name}, {formatStay(dates.start!, dates.end!)}. Your reference is <strong className="font-semibold whitespace-nowrap text-ink">{reference}</strong>.
                    </p>
                    <p className="text-[13px] text-muted-2">The nights aren&apos;t held until the lodge confirms.</p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </SheetBody>

          <SheetFooter className="flex-col sm:flex-col">
            {step === "sent" ? (
              <>
                <a
                  href={chatUrl}
                  target="_blank"
                  rel="noreferrer"
                  onClick={() => onWhatsApp(room.id)}
                  className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-[#25D366] text-[15px] font-semibold text-[#0C181F]"
                >
                  <WhatsAppIcon size={17} />
                  Send on WhatsApp too
                </a>
                <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} className="w-full">
                  Done
                </Button>
              </>
            ) : (
              <>
                <div className="flex w-full items-center justify-between gap-3">
                  <span className="text-[13.5px] text-muted">
                    {nights > 0 ? (
                      <>
                        <strong className="text-[16px] font-semibold text-ink">${total}</strong> for {nights} {nights === 1 ? "night" : "nights"}
                      </>
                    ) : (
                      <>${room.price} a night</>
                    )}
                  </span>
                  <Button type="submit" size="lg" loading={sending}>
                    {step === "dates" ? "Next" : "Send request"}
                  </Button>
                </div>
                <a
                  href={chatUrl}
                  target="_blank"
                  rel="noreferrer"
                  onClick={() => onWhatsApp(room.id)}
                  className="inline-flex items-center justify-center gap-1.5 self-center py-1 text-[13px] font-semibold text-muted hover:text-ink"
                >
                  <WhatsAppIcon size={14} color="#1F7A4D" />
                  Or ask on WhatsApp
                </a>
              </>
            )}
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
