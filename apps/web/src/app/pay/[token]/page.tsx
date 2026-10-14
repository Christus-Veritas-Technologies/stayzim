"use client";

import { Button, buttonVariants } from "@stayzim/ui/components/button";
import { Field, FormMessage } from "@stayzim/ui/components/field";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@stayzim/ui/components/input";
import { Spinner } from "@stayzim/ui/components/spinner";
import { cn } from "@stayzim/ui/lib/utils";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowUpRight, CircleCheck, CircleX, CreditCard, Globe, Smartphone, Ticket } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";

import { KARIBA_GRADIENT, Rings } from "@/components/auth/kariba-panel";
import { Wordmark } from "@/components/landing/brand";
import { EASE_OUT } from "@/components/motion";
import { api } from "@/lib/api";
import { formatCents, PAY_CHANNELS, type PayChannel } from "@/lib/billing";
import { formatLongDate } from "@/lib/format";
import { phoneToInput } from "@/lib/lodge";
import { stayzimChatUrl } from "@/lib/whatsapp";

/** GET /api/pay/:token (apps/server/src/routes/pay.ts) */
type PayLink = {
  lodgeName: string;
  siteUrl: string;
  siteAddress: string;
  months: number;
  amountCents: number;
  state: "open" | "paid" | "expired";
  paidUntil: string | null;
  phone: string | null;
  paynow: boolean;
};

type LinkPayment = { id: string; reference: string; amountCents: number; channel: string; channelName: string; status: "PENDING" | "PAID" | "FAILED" | "CANCELLED"; receiptNumber: string | null };
type Started = { payment: LinkPayment; redirectUrl: string | null; instructions: string | null; innbucksCode: string | null };

type State =
  | { kind: "idle" }
  | { kind: "waiting"; payment: LinkPayment; instructions: string | null; innbucksCode: string | null }
  | { kind: "failed"; message: string };

const POLL_MS = 3000;

const forMonths = (months: number) => `For ${months} ${months === 1 ? "month" : "months"}`;

/** The white card on the Kariba backdrop, with StayZim's name above and help below. */
function Frame({ children, help }: { children: ReactNode; help: string }) {
  return (
    <main className={cn("relative flex min-h-svh flex-col items-center overflow-hidden px-4 pt-20 pb-10 sm:justify-center sm:py-24", KARIBA_GRADIENT)}>
      <Rings className="top-1/2 left-1/2" sizes={[980, 700, 440]} />
      <Link href="/" className="absolute top-5 left-5 text-lg text-white no-underline sm:top-7 sm:left-8" aria-label="StayZim home">
        <Wordmark size={30} />
      </Link>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.55, ease: EASE_OUT }}
        className="relative w-full max-w-[440px] rounded-[28px] bg-white px-5 pt-7 pb-6 text-ink shadow-[0_30px_70px_rgba(0,40,60,0.35)] sm:px-8"
      >
        {children}
      </motion.div>
      <a href={stayzimChatUrl(help)} className="relative mt-5 text-[14px] font-semibold text-white underline-offset-4 hover:underline">
        Need help? WhatsApp StayZim
      </a>
    </main>
  );
}

/** The lodge, its address and what to pay: the same at the top of every step. */
function Summary({ link }: { link: PayLink }) {
  return (
    <div className="flex flex-col items-center gap-1 text-center">
      <span className="text-[13px] font-semibold tracking-[0.08em] text-muted uppercase">Your website</span>
      <h1 className="font-display text-[26px] leading-8 font-semibold tracking-[-0.02em] text-balance">{link.lodgeName}</h1>
      <a href={link.siteUrl} target="_blank" rel="noreferrer" className="inline-flex max-w-full items-center gap-1.5 text-[14px] font-semibold text-brand">
        <Globe className="size-4 shrink-0" />
        <span className="truncate">{link.siteAddress}</span>
        <ArrowUpRight className="size-4 shrink-0" />
      </a>
      <div className="mt-4 flex w-full flex-col items-center rounded-2xl bg-surface-2 px-4 py-4">
        <span className="text-[13px] text-muted">To pay</span>
        <span className="font-display text-[44px] leading-[52px] font-bold tracking-[-0.03em] tabular-nums">{formatCents(link.amountCents)}</span>
        <span className="text-[14px] text-muted">{forMonths(link.months)}</span>
      </div>
    </div>
  );
}

function Message({ icon, title, children, action }: { icon: ReactNode; title: string; children: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-3 text-center">
      {icon}
      <h1 className="font-display text-2xl font-semibold tracking-[-0.02em] text-balance">{title}</h1>
      <div className="text-[15px] leading-[22px] text-muted">{children}</div>
      {action}
    </div>
  );
}

/**
 * stayzim.co.zw/pay/<token>: a payment link the StayZim team sent. No login and
 * nothing else to find: the lodge, its address, the amount, how to pay (the
 * same ways as the dashboard, all through Paynow) and one button.
 */
export default function PayPage() {
  const { token } = useParams<{ token: string }>();
  const [link, setLink] = useState<PayLink | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [channel, setChannel] = useState<PayChannel>("ecocash");
  const [phone, setPhone] = useState("");
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [state, setState] = useState<State>({ kind: "idle" });

  useEffect(() => {
    void api<PayLink>(`/api/pay/${token}`).then((result) => {
      if (result.error !== undefined) return setLoadError(result.error);
      setLink(result.data);
      setPhone((current) => current || (result.data.phone?.startsWith("263") ? phoneToInput(result.data.phone) : ""));
    });
  }, [token]);

  const watch = useCallback((payment: LinkPayment, extra: { instructions?: string | null; innbucksCode?: string | null } = {}) => {
    setState({ kind: "waiting", payment, instructions: extra.instructions ?? null, innbucksCode: extra.innbucksCode ?? null });
  }, []);

  // Back from Paynow's page (?payment=…): carry on watching that payment
  const resumed = useRef(false);
  useEffect(() => {
    if (resumed.current) return;
    resumed.current = true;
    const id = new URLSearchParams(window.location.search).get("payment");
    if (!id) return;
    void api<{ payment: LinkPayment; link: PayLink }>(`/api/pay/${token}/payments/${id}`).then(({ data }) => {
      if (!data) return;
      setLink(data.link);
      if (data.payment.status === "PENDING") watch(data.payment);
    });
  }, [token, watch]);

  // While waiting, ask every few seconds how it's going
  const waitingId = state.kind === "waiting" ? state.payment.id : null;
  useEffect(() => {
    if (!waitingId) return;
    let stopped = false;
    const timer = setInterval(async () => {
      const { data } = await api<{ payment: LinkPayment; link: PayLink }>(`/api/pay/${token}/payments/${waitingId}`);
      if (!data || stopped) return;
      if (data.payment.status === "PAID") {
        setLink(data.link);
        setState({ kind: "idle" });
      } else if (data.payment.status !== "PENDING") {
        setState({ kind: "failed", message: "The payment was cancelled or didn't go through. No money was taken. Try again." });
      }
    }, POLL_MS);
    return () => {
      stopped = true;
      clearInterval(timer);
    };
  }, [token, waitingId]);

  if (loadError) {
    return (
      <Frame help="Hi StayZim, my payment link didn't open.">
        <Message icon={<CircleX className="size-12 text-danger" />} title="This link didn't open">
          {loadError}
        </Message>
      </Frame>
    );
  }

  if (!link) {
    return (
      <Frame help="Hi StayZim, my payment link didn't open.">
        <div className="flex flex-col items-center gap-3 py-10" aria-busy="true">
          <Spinner className="size-10 text-brand" />
          <p className="text-[15px] text-muted">Opening your payment…</p>
        </div>
      </Frame>
    );
  }

  const help = `Hi StayZim, I need help paying for ${link.lodgeName} (${formatCents(link.amountCents)}).`;

  if (link.state === "paid") {
    return (
      <Frame help={help}>
        <Message
          icon={
            <motion.span initial={{ scale: 0.4 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 320, damping: 16 }} className="flex size-16 items-center justify-center rounded-2xl bg-success-wash text-success">
              <CircleCheck className="size-8" />
            </motion.span>
          }
          title="Paid. Thank you!"
          action={
            <a href={link.siteUrl} target="_blank" rel="noreferrer" className={buttonVariants({ size: "lg", className: "mt-2 w-full" })}>
              Open my website
              <ArrowUpRight />
            </a>
          }
        >
          Your website is live{link.paidUntil ? ` until ${formatLongDate(link.paidUntil)}` : ""}. Guests can find {link.lodgeName} and book you on WhatsApp.
        </Message>
      </Frame>
    );
  }

  if (link.state === "expired") {
    return (
      <Frame help={help}>
        <Message
          icon={<CircleX className="size-12 text-warning" />}
          title="This link has expired"
          action={
            <a href={stayzimChatUrl(`Hi StayZim, my payment link for ${link.lodgeName} has expired. Can you send me a new one?`)} className={buttonVariants({ size: "lg", className: "mt-2 w-full" })}>
              Ask for a new link
            </a>
          }
        >
          Ask StayZim on WhatsApp for a new one. It only takes a minute.
        </Message>
      </Frame>
    );
  }

  const picked = PAY_CHANNELS.find((item) => item.key === channel)!;

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setStarting(true);
    const result = await api<Started>(`/api/pay/${token}`, { method: "POST", json: { channel, phone: picked.prompt ? phone : undefined } });
    setStarting(false);
    if (result.error !== undefined) return setError(result.error);
    if (result.data.redirectUrl && channel === "web") {
      window.location.assign(result.data.redirectUrl);
      return;
    }
    watch(result.data.payment, result.data);
  }

  return (
    <Frame help={help}>
      <Summary link={link} />
      <AnimatePresence mode="wait" initial={false}>
        {state.kind === "waiting" ? (
          <motion.div key="waiting" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="mt-6 flex flex-col items-center gap-3 text-center" aria-live="polite">
            <span className="relative flex size-14 items-center justify-center rounded-2xl bg-brand-wash text-brand">
              {state.innbucksCode ? <Ticket className="size-6" /> : <Smartphone className="size-6" />}
              <motion.span
                className="absolute inset-0 rounded-2xl border-2 border-brand"
                animate={{ opacity: [0.6, 0], scale: [1, 1.35] }}
                transition={{ duration: 1.6, repeat: Infinity, ease: "easeOut" }}
              />
            </span>
            <h2 className="font-display text-xl font-semibold">{state.innbucksCode ? "Pay in the InnBucks app" : state.payment.channel === "web" ? "Finishing your payment" : "Check your phone"}</h2>
            {state.innbucksCode ? (
              <>
                <p className="text-[15px] text-muted">Open InnBucks, choose Pay, and type this code:</p>
                <span className="rounded-xl bg-surface-2 px-5 py-3 font-display text-3xl font-semibold tracking-[0.12em]">{state.innbucksCode}</span>
                <a href={`schinn.wbpycode://innbucks.co.zw?pymInnCode=${state.innbucksCode}`} className={buttonVariants({ variant: "outline" })}>
                  Open InnBucks
                  <ArrowUpRight />
                </a>
              </>
            ) : (
              <p className="text-[15px] text-muted">{state.instructions ?? `A message is coming to your phone. Enter your PIN to pay ${formatCents(state.payment.amountCents)}.`}</p>
            )}
            <span className="inline-flex items-center gap-2 text-[13px] text-muted">
              <Spinner className="size-4 text-brand" />
              Waiting for {state.payment.channelName}. This page changes by itself.
            </span>
            <Button variant="ghost" size="sm" onClick={() => setState({ kind: "idle" })}>
              Start again
            </Button>
          </motion.div>
        ) : (
          <motion.form key="form" onSubmit={onSubmit} noValidate initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="mt-6">
            <fieldset disabled={starting} className="flex flex-col gap-4">
              {state.kind === "failed" ? (
                <FormMessage>
                  <CircleX className="mt-0.5 size-4 shrink-0" />
                  {state.message}
                </FormMessage>
              ) : null}
              <FormMessage>{error}</FormMessage>
              <Field label="How will you pay?">
                <div role="radiogroup" aria-label="How will you pay?" className="grid grid-cols-2 gap-2">
                  {PAY_CHANNELS.map((item) => (
                    <button
                      key={item.key}
                      type="button"
                      role="radio"
                      aria-checked={channel === item.key}
                      onClick={() => setChannel(item.key)}
                      className={cn(
                        "flex min-h-14 items-center gap-2.5 rounded-xl border px-3 py-2.5 text-left text-[15px] font-semibold outline-none focus-visible:ring-3 focus-visible:ring-ring/30",
                        channel === item.key ? "border-brand bg-brand-wash shadow-[0_0_0_1px_var(--color-brand)]" : "border-input hover:border-[#cfd8dd]",
                      )}
                    >
                      <span
                        className={cn("flex size-8 shrink-0 items-center justify-center rounded-lg transition-colors", channel === item.key ? "bg-white text-brand shadow-xs" : "bg-surface-2 text-slate")}
                        aria-hidden="true"
                      >
                        {item.key === "web" ? <CreditCard className="size-4" /> : item.key === "innbucks" ? <Ticket className="size-4" /> : <Smartphone className="size-4" />}
                      </span>
                      {item.name}
                    </button>
                  ))}
                </div>
              </Field>
              {picked.prompt ? (
                <Field label={`Your ${picked.name} number`} hint={channel === "innbucks" ? "You'll get a code to pay with in the InnBucks app." : "A message comes to this phone. Enter your PIN to pay."}>
                  <InputGroup className="h-12">
                    <InputGroupAddon>+263</InputGroupAddon>
                    <InputGroupInput value={phone} onChange={(event) => setPhone(event.target.value)} inputMode="tel" autoComplete="tel-national" placeholder="77 123 4567" className="text-[16px]" />
                  </InputGroup>
                </Field>
              ) : (
                <p className="text-[14px] text-muted">You&apos;ll go to Paynow&apos;s page to pay by Visa, Mastercard, ZimSwitch or another wallet, then come back here.</p>
              )}
              <Button type="submit" size="lg" className="h-13 w-full text-[16px]" loading={starting} disabled={!link.paynow}>
                {starting ? "Starting your payment" : `Pay ${formatCents(link.amountCents)}`}
              </Button>
              {!link.paynow ? <p className="text-center text-[13px] text-warning">Paying online isn&apos;t switched on yet. WhatsApp StayZim to pay another way.</p> : null}
              <p className="text-center text-[12.5px] text-muted-2">Paid safely through Paynow. StayZim never sees your PIN or card.</p>
            </fieldset>
          </motion.form>
        )}
      </AnimatePresence>
    </Frame>
  );
}
