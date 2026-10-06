"use client";

import { Badge } from "@stayzim/ui/components/badge";
import { Card } from "@stayzim/ui/components/card";
import { CopyButton } from "@stayzim/ui/components/copy-button";
import { DEMO_DAYS } from "@stayzim/sites";
import { cn } from "@stayzim/ui/lib/utils";
import { motion } from "framer-motion";
import { Button, buttonVariants } from "@stayzim/ui/components/button";
import { Skeleton } from "@stayzim/ui/components/skeleton";
import { ChevronRight, CircleCheck, Clock, FileText, ReceiptText, TriangleAlert } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

import { useLodge } from "@/components/dashboard/lodge-provider";
import { Page, PageHeader, PageSection } from "@/components/dashboard/page";
import { WhatsAppIcon } from "@/components/landing/brand";
import { EASE_OUT } from "@/components/motion";
import { PayCard } from "@/components/dashboard/pay-card";
import { api } from "@/lib/api";
import { formatCents, formatMoney, PAYMENT_METHODS, type BillingOverview } from "@/lib/billing";
import { formatClock, formatDate, formatLongDate } from "@/lib/format";
import { demoTimeLeft, dueDate, formatTimeLeft, offlineDate, PLAN_ORDER, PLANS, type Lodge, type PlanKey } from "@/lib/lodge";
import { useNow } from "@/lib/use-now";
import { stayzimChatUrl } from "@/lib/whatsapp";

const STATUS = {
  DEMO: { label: "Demo", badge: "bg-white/12 text-white", dot: "bg-[#B9A7F0]" },
  ACTIVE: { label: "Active", badge: "bg-success-wash text-success", dot: "bg-success" },
  OVERDUE: { label: "Overdue", badge: "bg-warning-tint text-warning", dot: "bg-[#e8833a]" },
  SUSPENDED: { label: "Suspended", badge: "bg-danger-tint text-danger", dot: "bg-danger" },
} as const;

/** A line under the plan name explaining where things stand. */
function statusLine(lodge: Lodge) {
  const plan = PLANS[lodge.plan];
  const due = dueDate(lodge);
  const offline = offlineDate(lodge);
  switch (lodge.status) {
    case "DEMO":
      return lodge.demoEnded
        ? `Your demo has ended and your site is offline. Pay ${formatMoney(plan.price)} to put it back live, just as you left it.`
        : `Your site is live as a free demo. Pay ${formatMoney(plan.price)} for the first month to keep it live and remove the demo badges.`;
    case "ACTIVE":
      return lodge.paidUntil ? `Paid until ${formatLongDate(lodge.paidUntil)}. Nothing to do.` : "Paid up. Nothing to do.";
    case "OVERDUE":
      return `Was due ${due ? formatLongDate(due) : "recently"}. Your site goes offline on ${offline ? formatLongDate(offline) : "soon"}.`;
    case "SUSPENDED":
      return `Pay ${formatMoney(plan.price)} and tap I have paid. Your site comes back as soon as we confirm.`;
  }
}

function PlanCard({ lodge }: { lodge: Lodge }) {
  const plan = PLANS[lodge.plan];
  const status = STATUS[lodge.status];
  const now = useNow();
  const left = demoTimeLeft(lodge, now);
  const due = dueDate(lodge);

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-[20px] p-5 text-white shadow-[0_24px_48px_-24px_rgba(12,24,31,0.6)] sm:p-6",
        lodge.status === "SUSPENDED"
          ? "bg-[linear-gradient(135deg,#3A1512,#0C181F_70%)]"
          : lodge.status === "OVERDUE"
            ? "bg-[linear-gradient(135deg,#3B2410,#0C181F_70%)]"
            : "bg-[linear-gradient(135deg,#123A4A,#0C181F_65%)]",
      )}
    >
      <span aria-hidden="true" className="absolute -top-24 -right-24 size-72 rounded-full border border-white/8" />
      <span aria-hidden="true" className="absolute -top-12 -right-12 size-48 rounded-full border border-white/10" />

      <div className="relative flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex flex-col gap-2">
          <span className={cn("inline-flex w-fit items-center gap-1.5 rounded-md px-2 py-1 text-xs font-semibold", status.badge)}>
            <span className={cn("size-1.5 rounded-full", status.dot)} />
            {status.label}
          </span>
          <h2 className="font-display text-2xl leading-8 font-semibold tracking-[-0.02em]">{plan.name} plan</h2>
          <p className="max-w-md text-[13.5px] leading-5 text-[#C6D3D9]">{statusLine(lodge)}</p>
        </div>

        {lodge.status === "DEMO" && !lodge.demoEnded ? (
          <div className="flex flex-col gap-2 lg:min-w-56 lg:items-end">
            <span className="font-display text-[28px] leading-8 font-semibold">{formatTimeLeft(left)} left</span>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/15 lg:w-56" aria-hidden="true">
              <motion.span
                className="block h-full origin-left rounded-full bg-brand-sky"
                initial={{ scaleX: 0 }}
                animate={{ scaleX: Math.min(1, left / (DEMO_DAYS * 24 * 60 * 60 * 1000)) }}
                transition={{ duration: 0.8, delay: 0.2, ease: EASE_OUT }}
              />
            </div>
            {lodge.demoEndsAt ? (
              <span className="text-[13px] text-[#C6D3D9]">
                Demo ends {formatLongDate(lodge.demoEndsAt)} at {formatClock(lodge.demoEndsAt)}
              </span>
            ) : null}
          </div>
        ) : null}
      </div>

      <dl className="relative mt-6 grid overflow-hidden rounded-[14px] border border-white/10 bg-white/5 sm:grid-cols-3">
        <div className="flex flex-col gap-1 border-b border-white/10 p-4 sm:border-r sm:border-b-0">
          <dt className="text-xs text-[#9FB2BB]">{lodge.status === "DEMO" ? "First payment" : "Amount"}</dt>
          <dd className="font-display text-xl font-semibold">{formatMoney(plan.price)}</dd>
        </div>
        <div className="flex flex-col gap-1 border-b border-white/10 p-4 sm:border-r sm:border-b-0">
          <dt className="text-xs text-[#9FB2BB]">{lodge.status === "ACTIVE" ? "Next payment" : "Due"}</dt>
          <dd className="font-display text-xl font-semibold">{due ? formatDate(due) : "When you're ready"}</dd>
        </div>
        <div className="flex items-center justify-between gap-3 p-4">
          <div className="flex flex-col gap-1">
            <dt className="text-xs text-[#9FB2BB]">Payment reference</dt>
            <dd className="font-display text-xl font-semibold">{lodge.slug}</dd>
          </div>
          <CopyButton value={lodge.slug} variant="secondary" size="sm" className="bg-white/12 text-white hover:bg-white/20">
            Copy
          </CopyButton>
        </div>
      </dl>
    </div>
  );
}

/** Paying by merchant code, then "I have paid" on WhatsApp; StayZim records it. */
function HowToPay({ lodge, online }: { lodge: Lodge; online: boolean }) {
  const amount = formatMoney(PLANS[lodge.plan].price);
  return (
    <section className="flex flex-col gap-3" aria-labelledby="how-to-pay">
      <div>
        <h2 id="how-to-pay" className="text-[15px] font-semibold">
          {online ? "Or pay by merchant code" : "How to pay"}
        </h2>
        <p className="text-[13px] text-muted">
          Pay {amount} with reference <strong className="font-semibold text-ink">{lodge.slug}</strong>, then tell us. We&apos;ll send your receipt.
        </p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {PAYMENT_METHODS.map((method, index) => (
          <motion.div
            key={method.key}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: 0.15 + index * 0.06, ease: EASE_OUT }}
          >
            <Card className="flex-row items-center gap-3 p-3.5 transition-transform duration-300 hover:-translate-y-0.5">
              <span className={cn("flex size-10 shrink-0 items-center justify-center rounded-xl text-[13px] font-bold", method.tone)}>
                {method.short}
              </span>
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="text-[14px] font-semibold">{method.name}</span>
                <span className="truncate text-xs text-muted">{method.detail}</span>
              </span>
              <CopyButton value={method.copy} size="icon-sm" copiedLabel="Code copied" />
            </Card>
          </motion.div>
        ))}
      </div>

      <div className="flex flex-col gap-3 rounded-[14px] bg-surface-2 p-3.5 sm:flex-row sm:items-center">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-white text-slate shadow-xs">
          <ReceiptText className="size-[18px]" strokeWidth={1.75} />
        </span>
        <span className="flex flex-1 flex-col">
          <span className="text-[14px] font-semibold">Paid by merchant code?</span>
          <span className="text-[13px] text-muted">Send us your proof of payment. Your lodge name and amount are filled in.</span>
        </span>
        <a
          href={stayzimChatUrl(`Hi StayZim, I have paid ${amount} for ${lodge.name} (reference ${lodge.slug}). Here is my proof of payment:`)}
          target="_blank"
          rel="noreferrer"
          className={buttonVariants({ variant: "whatsapp", size: "lg" })}
        >
          <WhatsAppIcon size={17} />I have paid
        </a>
      </div>
    </section>
  );
}

/** Invoices and receipts, newest first, each opening its printable page. */
function Documents({ overview }: { overview: BillingOverview | null }) {
  const rows = overview
    ? [
        ...overview.invoices
          .filter((invoice) => invoice.status === "OPEN")
          .map((invoice) => ({ key: invoice.id, number: invoice.number, date: invoice.dueAt, label: `Invoice · due ${formatDate(invoice.dueAt)}`, amount: invoice.amountCents, paid: false })),
        ...overview.payments.map((payment) => ({
          key: payment.id,
          number: payment.receiptNumber ?? payment.reference,
          date: payment.paidAt ?? payment.createdAt,
          label: `Receipt · ${payment.channelName}, ${formatDate(payment.paidAt ?? payment.createdAt)}`,
          amount: payment.amountCents,
          paid: true,
        })),
      ]
    : null;

  return (
    <section className="flex flex-col gap-3 rounded-[20px] bg-white p-5 shadow-card sm:p-6" aria-labelledby="documents">
      <div>
        <h2 id="documents" className="text-[15px] font-semibold">
          Invoices and receipts
        </h2>
        <p className="text-[13px] text-muted">We email each one too. Open one to print it or save it as a PDF.</p>
      </div>
      {rows === null ? (
        <div className="flex flex-col gap-2" aria-busy="true">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      ) : rows.length === 0 ? (
        <p className="rounded-xl bg-surface-2 px-4 py-6 text-center text-[13.5px] text-muted">Nothing yet. Your first invoice shows here.</p>
      ) : (
        <ul className="-mx-2 flex flex-col">
          {rows.map((row, index) => (
            <motion.li key={row.key} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.04, ease: EASE_OUT }}>
              <Link
                href={`/dashboard/billing/${row.number}`}
                className="flex items-center gap-3 rounded-xl px-2 py-2.5 text-ink no-underline hover:bg-surface-2"
              >
                <span className={cn("flex size-9 shrink-0 items-center justify-center rounded-lg", row.paid ? "bg-success-wash text-success" : "bg-warning-tint text-warning")}>
                  {row.paid ? <CircleCheck className="size-[18px]" /> : <FileText className="size-[18px]" />}
                </span>
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="text-[14px] font-semibold">{row.number}</span>
                  <span className="truncate text-[12.5px] text-muted">{row.label}</span>
                </span>
                <span className="text-[14px] font-semibold">{formatCents(row.amount)}</span>
                <ChevronRight className="size-4 text-muted-2" />
              </Link>
            </motion.li>
          ))}
        </ul>
      )}
    </section>
  );
}

function Plans({ lodge, onPick, canPay }: { lodge: Lodge; onPick: (plan: PlanKey) => void; canPay: boolean }) {
  return (
    <section className="flex flex-col gap-3" aria-labelledby="plans">
      <div>
        <h2 id="plans" className="text-[15px] font-semibold">
          Plans
        </h2>
        <p className="text-[13px] text-muted">A new plan starts when you pay for it.</p>
      </div>
      <div className="grid gap-3 lg:grid-cols-3">
        {PLAN_ORDER.map((key: PlanKey, index) => {
          const plan = PLANS[key];
          const current = key === lodge.plan;
          return (
            <motion.div
              key={key}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 + index * 0.07, ease: EASE_OUT }}
              className={cn("flex flex-col gap-4 rounded-[20px] bg-white p-5", current ? "ring-2 ring-ink" : "shadow-card")}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-[13px] font-semibold text-slate">
                  {plan.name} · {plan.tagline}
                </span>
                {current ? <Badge className="border-ink bg-ink text-white">{lodge.status === "DEMO" ? "Your demo" : "Current plan"}</Badge> : null}
              </div>
              <div>
                <p>
                  <span className="font-display text-[28px] font-semibold tracking-[-0.02em]">${plan.price}</span>
                  <span className="text-[13px] text-muted">/month</span>
                </p>
                <p className="text-[13px] text-muted">{plan.pitch}</p>
              </div>
              <ul className="flex flex-col gap-2 border-t border-line-3 pt-4 text-[13.5px]">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2">
                    <CircleCheck className="mt-0.5 size-4 shrink-0 text-brand" />
                    {feature}
                  </li>
                ))}
                {plan.later ? (
                  <li className="flex items-start gap-2 text-muted-2">
                    <Clock className="mt-0.5 size-4 shrink-0" />
                    {plan.later}
                  </li>
                ) : null}
              </ul>
              <div className="mt-auto">
                {canPay ? (
                  <Button variant={current ? "default" : "outline"} className="w-full" onClick={() => onPick(key)}>
                    {current ? (lodge.status === "ACTIVE" ? "Pay ahead" : "Pay for this plan") : `Pay for ${plan.name}`}
                  </Button>
                ) : current ? (
                  <span className="flex h-10 items-center justify-center rounded-[10px] bg-surface-2 text-sm font-semibold text-muted">Your plan</span>
                ) : (
                  <a
                    href={stayzimChatUrl(`Hi StayZim, I'd like to switch ${lodge.name} to the ${plan.name} plan ($${plan.price}/month).`)}
                    target="_blank"
                    rel="noreferrer"
                    className={buttonVariants({ variant: "outline", className: "w-full" })}
                  >
                    Switch to this plan
                  </a>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>
    </section>
  );
}

export default function BillingPage() {
  const { lodge } = useLodge();
  const offline = offlineDate(lodge);
  const [plan, setPlan] = useState<PlanKey>(lodge.plan);
  const [overview, setOverview] = useState<BillingOverview | null>(null);
  const payRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    const { data } = await api<BillingOverview>("/api/lodge/billing");
    if (data) setOverview(data);
  }, []);
  useEffect(() => {
    void load();
  }, [load]);

  const paynow = overview?.paynow ?? false;
  const late = lodge.status === "OVERDUE" || lodge.status === "SUSPENDED" || lodge.demoEnded;

  return (
    <Page>
      <PageHeader title="Billing" description="Pay online, find your invoices and receipts, or change your plan." />

      {late ? (
        <PageSection>
          <div role="alert" className="flex items-start gap-3 rounded-[14px] border border-danger-line bg-danger-tint px-4 py-3 text-[13.5px] text-danger">
            <TriangleAlert className="mt-0.5 size-4 shrink-0" />
            {lodge.demoEnded
              ? "Your demo has ended, so your site is offline. Pay for a plan to put it back live, just as you left it."
              : lodge.status === "SUSPENDED"
                ? "Your site is offline. Guests see “temporarily unavailable” until you pay."
                : `Your payment is late. Pay by ${offline ? formatLongDate(offline) : "soon"} to keep your site live.`}
          </div>
        </PageSection>
      ) : null}

      <PageSection>
        <PlanCard lodge={lodge} />
      </PageSection>

      <PageSection className="grid grid-cols-1 items-start gap-5 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
        <div ref={payRef} className="flex scroll-mt-24 flex-col gap-5">
          {overview === null ? (
            <Skeleton className="h-[420px] w-full rounded-[20px]" />
          ) : paynow ? (
            <PayCard plan={plan} onPlanChange={setPlan} onPaid={load} />
          ) : null}
          {overview !== null && (!paynow || lodge.status !== "ACTIVE") ? <HowToPay lodge={lodge} online={paynow} /> : null}
        </div>
        <Documents overview={overview} />
      </PageSection>

      <PageSection>
        <Plans
          lodge={lodge}
          canPay={paynow}
          onPick={(key) => {
            setPlan(key);
            payRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
          }}
        />
      </PageSection>
    </Page>
  );
}
