"use client";

import { Badge } from "@stayzim/ui/components/badge";
import { Tabs, TabsList, TabsTab } from "@stayzim/ui/components/tabs";
import Link from "next/link";
import { useState } from "react";

import { LoadError, LoadingCards, Page, PageHeader, PageSection, Panel } from "@/components/page";
import { formatShortDate } from "@/lib/format";
import { PLAN_NAMES } from "@/lib/labels";
import { formatCents } from "@/lib/money";
import type { Invoice, Payment } from "@/lib/types";
import { useApi } from "@/lib/use-api";

type WithLodge<T> = T & { lodge: { name: string; slug: string } };

const PAYMENT_BADGE = { PAID: "success", PENDING: "warning", FAILED: "danger", CANCELLED: "neutral" } as const;
const INVOICE_BADGE = { PAID: "success", OPEN: "warning", VOID: "neutral" } as const;

export default function BillingPage() {
  const { data, error, loading, reload } = useApi<{ invoices: WithLodge<Invoice>[]; payments: WithLodge<Payment>[] }>("/api/admin/billing");
  const [tab, setTab] = useState<"payments" | "invoices">("payments");

  return (
    <Page>
      <PageHeader title="Billing" description="Payments and invoices across every site, newest first. Record a payment from the site's own page." />
      <PageSection>
        <Tabs value={tab} onValueChange={(value) => setTab(value as "payments" | "invoices")}>
          <TabsList aria-label="Billing">
            <TabsTab value="payments">Payments</TabsTab>
            <TabsTab value="invoices">Invoices</TabsTab>
          </TabsList>
        </Tabs>
      </PageSection>
      {loading ? <LoadingCards /> : null}
      {error ? <LoadError message={error} onRetry={reload} /> : null}
      {data ? (
        <PageSection>
          <Panel>
            <ul className="flex flex-col divide-y divide-line-3">
              {tab === "payments" && data.payments.length === 0 ? <li className="py-2 text-[13.5px] text-muted">No payments yet.</li> : null}
              {tab === "invoices" && data.invoices.length === 0 ? <li className="py-2 text-[13.5px] text-muted">No invoices yet.</li> : null}
              {tab === "payments"
                ? data.payments.map((payment) => (
                    <li key={payment.id} className="flex items-center justify-between gap-3 py-2.5 text-[13.5px]">
                      <Link href={`/sites/${payment.lodge.slug}`} className="flex min-w-0 flex-col no-underline">
                        <span className="truncate font-semibold text-ink">{payment.lodge.name}</span>
                        <span className="truncate text-[12.5px] text-muted">
                          {PLAN_NAMES[payment.plan]}, {payment.months} {payment.months === 1 ? "month" : "months"} · {payment.method === "MANUAL" ? "recorded" : "Paynow"} ({payment.channel}) ·{" "}
                          {payment.receiptNumber ?? payment.reference} · {formatShortDate(payment.paidAt ?? payment.createdAt)}
                        </span>
                      </Link>
                      <span className="flex shrink-0 flex-col items-end gap-1">
                        <span className="font-semibold tabular-nums">{formatCents(payment.amountCents)}</span>
                        <Badge variant={PAYMENT_BADGE[payment.status]}>{payment.status.toLowerCase()}</Badge>
                      </span>
                    </li>
                  ))
                : data.invoices.map((invoice) => (
                    <li key={invoice.id} className="flex items-center justify-between gap-3 py-2.5 text-[13.5px]">
                      <Link href={`/sites/${invoice.lodge.slug}`} className="flex min-w-0 flex-col no-underline">
                        <span className="truncate font-semibold text-ink">{invoice.lodge.name}</span>
                        <span className="truncate text-[12.5px] text-muted">
                          {invoice.number} · {PLAN_NAMES[invoice.plan]} · due {formatShortDate(invoice.dueAt)}
                        </span>
                      </Link>
                      <span className="flex shrink-0 flex-col items-end gap-1">
                        <span className="font-semibold tabular-nums">{formatCents(invoice.amountCents)}</span>
                        <Badge variant={INVOICE_BADGE[invoice.status]}>{invoice.status.toLowerCase()}</Badge>
                      </span>
                    </li>
                  ))}
            </ul>
          </Panel>
        </PageSection>
      ) : null}
    </Page>
  );
}
