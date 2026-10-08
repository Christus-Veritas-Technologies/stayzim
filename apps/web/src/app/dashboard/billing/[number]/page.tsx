"use client";

import { Button, buttonVariants } from "@stayzim/ui/components/button";
import { EmptyState } from "@stayzim/ui/components/empty-state";
import { Skeleton } from "@stayzim/ui/components/skeleton";
import { formatHarareDay } from "@stayzim/sites";
import { cn } from "@stayzim/ui/lib/utils";
import { motion } from "framer-motion";
import { ArrowLeft, FileX, Printer } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

import { Page, PageSection } from "@/components/dashboard/page";
import { LogoMark } from "@/components/landing/brand";
import { EASE_OUT } from "@/components/motion";
import { api } from "@/lib/api";
import { formatCents, type BillingDocument } from "@/lib/billing";
import { formatLongDate } from "@/lib/format";
import { PLANS, SITES_DOMAIN } from "@/lib/lodge";

/** "6 October 2026", in Zimbabwe time like the emails */
function fullDate(value: string) {
  return formatHarareDay(new Date(value));
}

/** Prints only the document: the dashboard around it is hidden on paper. */
const PRINT_CSS = `@media print {
  body * { visibility: hidden !important; }
  .print-doc, .print-doc * { visibility: visible !important; }
  .print-doc { position: absolute; inset: 0; margin: 0; box-shadow: none !important; border: 0 !important; }
  .print-doc { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  @page { size: A4; margin: 14mm; }
}`;

/** One labelled block in the details grid. */
function Detail({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5 bg-white px-4 py-3.5 text-[13.5px] leading-5">
      <dt className="mb-1 text-[11px] font-bold tracking-[0.08em] text-muted-2 uppercase">{label}</dt>
      <dd>{children}</dd>
    </div>
  );
}

/** An invoice (SZ-…) or receipt (R-…), laid out to print or save as a PDF from the browser. */
export default function BillingDocumentPage() {
  const { number } = useParams<{ number: string }>();
  const [doc, setDoc] = useState<BillingDocument | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void api<BillingDocument>(`/api/lodge/billing/documents/${encodeURIComponent(number)}`).then((result) => {
      if (result.data) setDoc(result.data);
      else setError(result.error);
    });
  }, [number]);

  return (
    <Page>
      <style>{PRINT_CSS}</style>
      <PageSection className="flex flex-wrap items-center justify-between gap-3">
        <Link href="/dashboard/billing" className="group -my-2.5 inline-flex items-center gap-1.5 py-2.5 text-[13px] font-semibold text-muted hover:text-ink">
          <ArrowLeft className="size-4 transition-transform group-hover:-translate-x-0.5" />
          Billing
        </Link>
        {doc ? (
          <Button variant="outline" onClick={() => window.print()}>
            <Printer />
            Print or save as PDF
          </Button>
        ) : null}
      </PageSection>

      <PageSection>
        {error ? (
          <EmptyState className="rounded-[20px] bg-white shadow-card" icon={<FileX />} title="We couldn't find that" description={error} />
        ) : !doc ? (
          <Skeleton className="mx-auto h-[720px] w-full max-w-[780px] rounded-[22px]" />
        ) : (
          <motion.article
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, ease: EASE_OUT }}
            className="print-doc mx-auto w-full max-w-[780px] overflow-hidden rounded-[22px] print:rounded-none bg-white text-ink shadow-card"
          >
            {/* Brand band: the mark and name, and who issues it */}
            <header className="flex flex-col gap-5 bg-[linear-gradient(135deg,#0096BE_0%,#007DA2_45%,#006483_100%)] px-6 py-6 text-white sm:flex-row sm:items-center sm:justify-between sm:px-10 sm:py-7">
              <div className="flex items-center gap-3">
                <LogoMark size={40} className="rounded-[11px] shadow-[0_0_0_2px_rgba(255,255,255,0.35)]" />
                <div className="flex flex-col">
                  <span className="font-display text-[21px] leading-6 font-bold tracking-[-0.01em]">StayZim</span>
                  <span className="text-[12.5px] text-white/75">{doc.issuer.name}</span>
                </div>
              </div>
              <div className="text-[12.5px] leading-[19px] text-white/80 sm:text-right">
                <p>{doc.issuer.website}</p>
                <p>{doc.issuer.email}</p>
                <p>{doc.issuer.phone}</p>
              </div>
            </header>

            <div className="flex flex-col gap-8 px-6 py-7 sm:px-10 sm:py-9">
              <div className="flex flex-wrap items-end justify-between gap-4">
                <div>
                  <p className="font-display text-[34px] leading-10 font-semibold tracking-[-0.02em]">{doc.kind === "invoice" ? "Invoice" : "Receipt"}</p>
                  <p className="mt-1 inline-flex rounded-full bg-surface-2 px-3 py-1 font-mono text-[13px] font-semibold text-ink-2">{doc.number}</p>
                </div>
                <span
                  className={cn(
                    "rounded-[8px] border-2 px-3 py-1.5 text-[13px] font-bold tracking-[0.16em] uppercase",
                    doc.status === "PAID" ? "-rotate-3 border-success text-success" : "border-warning text-warning",
                  )}
                >
                  {doc.status === "PAID" ? "Paid" : "Due"}
                </span>
              </div>

              {/* The details, in a grid of small labelled blocks */}
              <dl className="grid gap-px overflow-hidden rounded-[14px] border border-line bg-line sm:grid-cols-2">
                <Detail label={doc.kind === "invoice" ? "Bill to" : "Received from"}>
                  <p className="font-semibold">{doc.billedTo.lodge}</p>
                  <p className="text-muted">{doc.billedTo.name}</p>
                  {doc.billedTo.place ? <p className="text-muted">{doc.billedTo.place}</p> : null}
                  <p className="text-muted">{doc.billedTo.email}</p>
                </Detail>
                <Detail label={doc.kind === "invoice" ? "Issued" : "Paid on"}>
                  <p className="font-semibold">{fullDate(doc.issuedAt)}</p>
                </Detail>
                {doc.kind === "invoice" ? (
                  <Detail label="Due">
                    <p className="font-semibold">{doc.dueAt ? formatLongDate(doc.dueAt) : "—"}</p>
                    {doc.periodStart && doc.periodEnd ? (
                      <p className="text-muted">
                        For {fullDate(doc.periodStart)} to {fullDate(doc.periodEnd)}
                      </p>
                    ) : null}
                  </Detail>
                ) : (
                  <Detail label="Paid with">
                    <p className="font-semibold">{doc.channelName} via Paynow</p>
                    <p className="text-muted">Reference {doc.reference}</p>
                  </Detail>
                )}
                <Detail label={doc.kind === "receipt" && doc.coversUntil ? "Site live until" : "Site"}>
                  {doc.kind === "receipt" && doc.coversUntil ? <p className="font-semibold">{fullDate(doc.coversUntil)}</p> : null}
                  <p className={doc.kind === "receipt" && doc.coversUntil ? "text-muted" : "font-semibold"}>
                    {doc.billedTo.slug}.{SITES_DOMAIN}
                  </p>
                </Detail>
              </dl>

              <table className="w-full text-[14px]">
                <thead>
                  <tr className="bg-surface-2 text-left text-[11.5px] font-bold tracking-[0.08em] text-muted-2 uppercase">
                    <th className="rounded-l-[10px] px-3.5 py-2.5 font-bold">Description</th>
                    <th className="rounded-r-[10px] px-3.5 py-2.5 text-right font-bold">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="align-top">
                    <td className="px-3.5 py-4">
                      <p className="font-semibold">
                        StayZim {PLANS[doc.plan].name} plan, {doc.months} {doc.months === 1 ? "month" : "months"}
                      </p>
                      <p className="text-[13px] text-muted">Lodge website, booked on WhatsApp</p>
                      {doc.previousPlan ? (
                        <p className="mt-1.5 text-[13px] text-muted">
                          Moved from {PLANS[doc.previousPlan].name} to {PLANS[doc.plan].name}
                          {doc.template ? `, with the ${doc.template} design` : ""}. Time already paid for moved over at the new price.
                        </p>
                      ) : null}
                    </td>
                    <td className="px-3.5 py-4 text-right font-semibold whitespace-nowrap">{formatCents(doc.amountCents)}</td>
                  </tr>
                </tbody>
              </table>

              <div className="flex justify-end border-t border-line pt-5">
                <dl className="grid w-full max-w-[280px] grid-cols-[1fr_auto] gap-x-6 gap-y-1.5 text-[14px]">
                  <dt className="text-muted">Subtotal</dt>
                  <dd className="text-right">{formatCents(doc.amountCents)}</dd>
                  <dt className="text-muted">Commission on bookings</dt>
                  <dd className="text-right">$0.00</dd>
                  <dt className="pt-2 font-semibold">Total (USD)</dt>
                  <dd className="pt-2 text-right font-display text-[26px] leading-8 font-semibold tracking-[-0.02em]">{formatCents(doc.amountCents)}</dd>
                </dl>
              </div>

              <footer className="flex flex-col gap-2 rounded-[14px] bg-surface-2 p-4 text-[12.5px] leading-5 text-muted sm:p-5">
                {doc.kind === "invoice" && doc.status !== "PAID" ? (
                  <p className="flex flex-wrap items-center gap-2">
                    Pay from Billing in your StayZim dashboard. Every payment goes through Paynow: EcoCash, InnBucks, OneMoney, card and more.
                    <Link href="/dashboard/billing" className={buttonVariants({ size: "sm", className: "print:hidden" })}>
                      Pay now
                    </Link>
                  </p>
                ) : (
                  <p className="font-semibold text-ink-2">Thank you for your payment.</p>
                )}
                <p>
                  Questions about this {doc.kind}? Email {doc.issuer.email} or WhatsApp {doc.issuer.phone}.
                </p>
              </footer>
            </div>
          </motion.article>
        )}
      </PageSection>
    </Page>
  );
}
