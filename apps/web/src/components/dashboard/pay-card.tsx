"use client";

import { Button, buttonVariants } from "@stayzim/ui/components/button";
import { Field, FormMessage } from "@stayzim/ui/components/field";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@stayzim/ui/components/input";
import { Spinner } from "@stayzim/ui/components/spinner";
import { cn } from "@stayzim/ui/lib/utils";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowUpRight, CircleCheck, CircleX, CreditCard, Smartphone, Ticket } from "lucide-react";
import Link from "next/link";
import { ANNUAL_DISCOUNT, carriedOverMs, paidUntilAfterPayment, planPriceCents } from "@stayzim/sites";
import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";

import { useLodge } from "@/components/dashboard/lodge-provider";
import { EASE_OUT } from "@/components/motion";
import { PlanPicker } from "@/components/plan-picker";
import { api } from "@/lib/api";
import { formatCents, PAY_CHANNELS, type PayChannel, type Payment, type StartedPayment } from "@/lib/billing";
import { formatLongDate } from "@/lib/format";
import { metaEvent } from "@/lib/meta-pixel";
import { phoneToInput, PLANS, type Lodge, type PlanKey } from "@/lib/lodge";
import { useOnline } from "@/lib/online";

const MONTHS = [1, 3, 12] as const;
const POLL_MS = 3000;
/** After this long without an answer, say so (and keep checking). */
const SLOW_MS = 3 * 60 * 1000;

type State =
  | { kind: "idle" }
  | { kind: "waiting"; payment: Payment; instructions: string | null; innbucksCode: string | null; since: number }
  | { kind: "paid"; payment: Payment }
  | { kind: "failed"; message: string };

const DAY_MS = 24 * 60 * 60 * 1000;
const days = (count: number) => `${count} ${count === 1 ? "day" : "days"}`;

/** What a plan change does to the time already paid for: it moves over at the new plan's price. */
function planChangeHint(lodge: Lodge, plan: PlanKey, months: number, now: number) {
  if (plan === lodge.plan) return undefined;
  const moves = `Your site moves to ${PLANS[plan].name} when this is paid.`;
  const paidUntil = lodge.status === "DEMO" || !lodge.paidUntil ? null : new Date(lodge.paidUntil);
  const at = new Date(now);
  const left = paidUntil ? Math.floor((paidUntil.getTime() - now) / DAY_MS) : 0;
  if (left < 1) return moves;
  const carried = Math.round(carriedOverMs(paidUntil, at, lodge.plan, plan) / DAY_MS);
  const until = formatLongDate(paidUntilAfterPayment({ paidUntil, plan: lodge.plan }, plan, months, at));
  return `${moves} Your ${days(left)} left on ${PLANS[lodge.plan].name} become ${days(carried)} of ${PLANS[plan].name}, then the ${months === 1 ? "month" : `${months} months`} you pay for: live until ${until}.`;
}

/**
 * Pay on Paynow without leaving the dashboard: pick the plan and months, then
 * a prompt on the phone (EcoCash, OneMoney), a code for the InnBucks app, or
 * Paynow's page for cards. Shows the payment live until it goes through.
 */
export function PayCard({
  plan,
  onPlanChange,
  onPaid,
}: {
  plan: PlanKey;
  onPlanChange: (plan: PlanKey) => void;
  /** After a payment goes through: reload the invoices and receipts */
  onPaid: () => void;
}) {
  const { lodge, setLodge } = useLodge();
  const online = useOnline();
  const [months, setMonths] = useState<(typeof MONTHS)[number]>(1);
  const [channel, setChannel] = useState<PayChannel>("ecocash");
  const [phone, setPhone] = useState(() => (lodge.whatsapp?.startsWith("263") ? phoneToInput(lodge.whatsapp) : ""));
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [state, setState] = useState<State>({ kind: "idle" });
  const [now, setNow] = useState(() => Date.now());
  const total = planPriceCents(plan, months);
  const prompt = PAY_CHANNELS.find((item) => item.key === channel)!.prompt;

  const watch = useCallback((payment: Payment, extra: { instructions?: string | null; innbucksCode?: string | null } = {}) => {
    setState({ kind: "waiting", payment, instructions: extra.instructions ?? null, innbucksCode: extra.innbucksCode ?? null, since: Date.now() });
  }, []);

  // Back from Paynow's page (?payment=…): watch that payment
  const resumed = useRef(false);
  useEffect(() => {
    if (resumed.current) return;
    resumed.current = true;
    const id = new URLSearchParams(window.location.search).get("payment");
    if (!id) return;
    void api<{ payment: Payment; lodge: Lodge }>(`/api/lodge/billing/payments/${id}`).then(({ data }) => {
      if (data) watch(data.payment);
    });
  }, [watch]);

  // While waiting, ask every few seconds how it's going
  const waitingId = state.kind === "waiting" ? state.payment.id : null;
  useEffect(() => {
    if (!waitingId) return;
    let stopped = false;
    const timer = setInterval(async () => {
      setNow(Date.now());
      const { data } = await api<{ payment: Payment; lodge: Lodge }>(`/api/lodge/billing/payments/${waitingId}`);
      if (!data || stopped) return;
      if (data.payment.status === "PAID") {
        metaEvent("Purchase", { value: data.payment.amountCents / 100, currency: "USD", content_name: data.payment.plan.toLowerCase(), num_items: data.payment.months });
        setLodge(data.lodge);
        setState({ kind: "paid", payment: data.payment });
        onPaid();
      } else if (data.payment.status !== "PENDING") {
        setState({ kind: "failed", message: "The payment was cancelled or didn't go through. Nothing was taken. Try again, or use another way to pay." });
      }
    }, POLL_MS);
    return () => {
      stopped = true;
      clearInterval(timer);
    };
  }, [waitingId, onPaid, setLodge]);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setStarting(true);
    metaEvent("InitiateCheckout", { value: total / 100, currency: "USD", content_name: plan.toLowerCase(), num_items: months });
    const result = await api<StartedPayment>("/api/lodge/billing/pay", {
      method: "POST",
      json: { plan, months, channel, phone: prompt ? phone : undefined },
    });
    setStarting(false);
    if (!result.data) {
      setError(result.error);
      return;
    }
    if (result.data.redirectUrl) {
      window.location.assign(result.data.redirectUrl);
      return;
    }
    watch(result.data.payment, result.data);
  }

  return (
    <section className="rounded-[20px] bg-white p-5 shadow-card sm:p-6" aria-labelledby="pay-online">
      <AnimatePresence mode="wait" initial={false}>
        {state.kind === "waiting" ? (
          <motion.div key="waiting" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="flex flex-col items-center gap-3 py-4 text-center" aria-live="polite">
            <span className="relative flex size-14 items-center justify-center rounded-2xl bg-brand-wash text-brand">
              <Smartphone className="size-6" />
              <motion.span
                className="absolute inset-0 rounded-2xl border-2 border-brand"
                animate={{ opacity: [0.6, 0], scale: [1, 1.35] }}
                transition={{ duration: 1.6, repeat: Infinity, ease: "easeOut" }}
              />
            </span>
            <h2 id="pay-online" className="font-display text-xl font-semibold">
              {state.innbucksCode ? "Pay in the InnBucks app" : state.payment.channel === "web" ? "Finishing your payment" : "Check your phone"}
            </h2>
            {state.innbucksCode ? (
              <>
                <p className="max-w-sm text-[14px] text-muted">Open InnBucks, choose Pay, and enter this code. We&apos;ll see it here as soon as you&apos;ve paid.</p>
                <span className="rounded-xl bg-surface-2 px-5 py-3 font-display text-2xl font-semibold tracking-[0.12em]">{state.innbucksCode}</span>
                <a href={`schinn.wbpycode://innbucks.co.zw?pymInnCode=${state.innbucksCode}`} className={buttonVariants({ variant: "outline" })}>
                  Open InnBucks
                  <ArrowUpRight />
                </a>
              </>
            ) : (
              <p className="max-w-sm text-[14px] text-muted">
                {state.instructions ?? `Approve ${formatCents(state.payment.amountCents)} on your phone. This page updates on its own.`}
              </p>
            )}
            <span className="inline-flex items-center gap-2 text-[13px] text-muted">
              <Spinner className="size-4 text-brand" />
              Waiting for {state.payment.channelName}… ({formatCents(state.payment.amountCents)}, ref {state.payment.reference})
            </span>
            {now - state.since > SLOW_MS ? (
              <p className="max-w-sm text-[13px] text-muted-2">Taking a while? You can leave this page; we&apos;ll email your receipt as soon as it goes through.</p>
            ) : null}
            <Button variant="ghost" size="sm" onClick={() => setState({ kind: "idle" })}>
              Start again
            </Button>
          </motion.div>
        ) : state.kind === "paid" ? (
          <motion.div key="paid" initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} transition={{ ease: EASE_OUT }} className="flex flex-col items-center gap-3 py-4 text-center">
            <motion.span initial={{ scale: 0.4 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 320, damping: 16 }} className="flex size-14 items-center justify-center rounded-2xl bg-success-wash text-success">
              <CircleCheck className="size-7" />
            </motion.span>
            <h2 id="pay-online" className="font-display text-xl font-semibold">
              Paid. Thank you!
            </h2>
            <p className="max-w-sm text-[14px] text-muted">
              {formatCents(state.payment.amountCents)} for {PLANS[state.payment.plan].name}.{" "}
              {lodge.paidUntil ? `Your site is live until ${formatLongDate(lodge.paidUntil)}.` : null} We&apos;ve emailed your receipt.
            </p>
            {state.payment.receiptNumber ? (
              <Link href={`/dashboard/billing/${state.payment.receiptNumber}`} className={buttonVariants({ variant: "outline" })}>
                View receipt {state.payment.receiptNumber}
              </Link>
            ) : null}
          </motion.div>
        ) : (
          <motion.form key="form" onSubmit={onSubmit} noValidate initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="mb-4">
              <h2 id="pay-online" className="text-[15px] font-semibold">
                {lodge.status === "ACTIVE" ? "Pay ahead" : "Pay now"}
              </h2>
              <p className="text-[13px] text-muted">
                {lodge.status === "ACTIVE" ? "Paying early adds to the time you have left." : "Your site goes live (or stays live) the moment it's paid."}
              </p>
            </div>
            <fieldset disabled={starting} className="flex flex-col gap-4">
              {state.kind === "failed" ? (
                <FormMessage>
                  <CircleX className="mt-0.5 size-4 shrink-0" />
                  {state.message}
                </FormMessage>
              ) : null}
              <FormMessage>{error}</FormMessage>
              <Field label="Plan" hint={planChangeHint(lodge, plan, months, now)}>
                <PlanPicker value={plan} onChange={onPlanChange} disabled={starting} />
              </Field>
              <Field label="How long" help="Pay for 1, 3 or 12 months at a time. Paying early adds to the time you have left, and 12 months costs less.">
                <div role="radiogroup" aria-label="How long" className="grid grid-cols-3 gap-2">
                  {MONTHS.map((count) => (
                    <button
                      key={count}
                      type="button"
                      role="radio"
                      aria-checked={months === count}
                      onClick={() => setMonths(count)}
                      className={cn(
                        "flex flex-col items-start rounded-xl border px-3 py-2.5 text-left outline-none focus-visible:ring-3 focus-visible:ring-ring/30",
                        months === count ? "border-brand bg-brand-wash shadow-[0_0_0_1px_var(--color-brand)]" : "border-input hover:border-[#cfd8dd]",
                      )}
                    >
                      <span className="text-[13.5px] font-semibold">
                        {count} {count === 1 ? "month" : "months"}
                      </span>
                      <span className="text-[12.5px] text-muted">{formatCents(planPriceCents(plan, count))}</span>
                      {count === 12 ? <span className="text-[11.5px] font-semibold text-success">{ANNUAL_DISCOUNT[plan]}% off</span> : null}
                    </button>
                  ))}
                </div>
              </Field>
              <Field label="Pay with">
                <div role="radiogroup" aria-label="Pay with" className="grid grid-cols-2 gap-2">
                  {PAY_CHANNELS.map((item) => (
                    <button
                      key={item.key}
                      type="button"
                      role="radio"
                      aria-checked={channel === item.key}
                      onClick={() => setChannel(item.key)}
                      className={cn(
                        "flex items-center gap-2 rounded-xl border px-2.5 py-2 text-left text-[13.5px] font-semibold outline-none focus-visible:ring-3 focus-visible:ring-ring/30",
                        channel === item.key ? "border-brand bg-brand-wash shadow-[0_0_0_1px_var(--color-brand)]" : "border-input hover:border-[#cfd8dd]",
                      )}
                    >
                      <span
                        className={cn(
                          "flex size-8 shrink-0 items-center justify-center rounded-lg transition-colors",
                          channel === item.key ? "bg-white text-brand shadow-xs" : "bg-surface-2 text-slate",
                        )}
                        aria-hidden="true"
                      >
                        {item.key === "web" ? <CreditCard className="size-4" /> : item.key === "innbucks" ? <Ticket className="size-4" /> : <Smartphone className="size-4" />}
                      </span>
                      <span className="flex min-w-0 flex-col">
                        <span className="truncate">{item.name}</span>
                        <span className="truncate text-[11.5px] font-medium text-muted">{item.how}</span>
                      </span>
                    </button>
                  ))}
                </div>
              </Field>
              {prompt ? (
                <Field
                  label={`${PAY_CHANNELS.find((item) => item.key === channel)!.name} number`}
                  hint={channel === "innbucks" ? "You'll get a code to pay with in the InnBucks app." : "You'll get a prompt on this phone to approve the payment."}
                >
                  <InputGroup>
                    <InputGroupAddon>+263</InputGroupAddon>
                    <InputGroupInput value={phone} onChange={(event) => setPhone(event.target.value)} inputMode="tel" autoComplete="tel-national" placeholder="77 123 4567" />
                  </InputGroup>
                </Field>
              ) : (
                <p className="text-[13px] text-muted">You&apos;ll go to Paynow to pay by Visa, Mastercard, ZimSwitch or another wallet, then come back here.</p>
              )}
              <Button type="submit" size="lg" className="w-full" loading={starting} disabled={!online}>
                {starting ? "Starting payment" : `Pay ${formatCents(total)}`}
              </Button>
              <p className="text-center text-[12px] text-muted-2">Every payment goes through Paynow, whichever way you pay. StayZim never sees your PIN or card.</p>
            </fieldset>
          </motion.form>
        )}
      </AnimatePresence>
    </section>
  );
}
