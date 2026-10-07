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
  @page { margin: 16mm; }
}`;

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
          <Skeleton className="mx-auto h-[640px] w-full max-w-[760px] rounded-[20px]" />
        ) : (
          <motion.article
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, ease: EASE_OUT }}
            className="print-doc mx-auto w-full max-w-[760px] rounded-[20px] bg-white p-6 text-ink shadow-card sm:p-10"
          >
            <header className="flex flex-col gap-6 border-b border-line pb-6 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex items-start gap-3">
                <LogoMark size={36} />
                <div className="text-[13px] leading-5 text-muted">
                  <p className="font-display text-[17px] font-bold text-ink">{doc.issuer.name}</p>
                  <p>{doc.issuer.website}</p>
                  <p>{doc.issuer.email}</p>
                  <p>{doc.issuer.phone}</p>
                </div>
              </div>
              <div className="sm:text-right">
                <p className="font-display text-[26px] leading-8 font-semibold tracking-[-0.02em]">{doc.kind === "invoice" ? "Invoice" : "Receipt"}</p>
                <p className="text-[14px] font-semibold">{doc.number}</p>
                <p className="text-[13px] text-muted">
                  {doc.kind === "invoice" ? "Issued" : "Paid"} {fullDate(doc.issuedAt)}
                </p>
              </div>
            </header>

            <section className="grid gap-6 border-b border-line py-6 sm:grid-cols-2">
              <div className="text-[13.5px] leading-5">
                <p className="mb-1 text-[11.5px] font-bold tracking-[0.08em] text-muted-2 uppercase">{doc.kind === "invoice" ? "Bill to" : "Received from"}</p>
                <p className="font-semibold">{doc.billedTo.lodge}</p>
                <p className="text-muted">{doc.billedTo.name}</p>
                {doc.billedTo.place ? <p className="text-muted">{doc.billedTo.place}</p> : null}
                <p className="text-muted">{doc.billedTo.email}</p>
              </div>
              <div className="text-[13.5px] leading-5 sm:text-right">
                {doc.kind === "invoice" ? (
                  <>
                    <p className="mb-1 text-[11.5px] font-bold tracking-[0.08em] text-muted-2 uppercase">Due</p>
                    <p className="font-semibold">{doc.dueAt ? formatLongDate(doc.dueAt) : "—"}</p>
                  </>
                ) : (
                  <>
                    <p className="mb-1 text-[11.5px] font-bold tracking-[0.08em] text-muted-2 uppercase">Paid with</p>
                    <p className="font-semibold">{doc.channelName}</p>
                    <p className="text-muted">Reference {doc.reference}</p>
                  </>
                )}
              </div>
            </section>

            <table className="w-full border-b border-line text-[14px]">
              <thead>
                <tr className="text-left text-[11.5px] font-bold tracking-[0.08em] text-muted-2 uppercase">
                  <th className="py-3 font-bold">Description</th>
                  <th className="py-3 text-right font-bold">Amount</th>
                </tr>
              </thead>
              <tbody>
                <tr className="align-top">
                  <td className="py-3 pr-4">
                    <p className="font-semibold">
                      StayZim {PLANS[doc.plan].name} plan, {doc.months} {doc.months === 1 ? "month" : "months"}
                    </p>
                    <p className="text-[13px] text-muted">
                      Lodge website {doc.billedTo.slug}.{SITES_DOMAIN}
                      {doc.periodStart && doc.periodEnd ? `, ${fullDate(doc.periodStart)} to ${fullDate(doc.periodEnd)}` : ""}
                    </p>
                  </td>
                  <td className="py-3 text-right font-semibold whitespace-nowrap">{formatCents(doc.amountCents)}</td>
                </tr>
              </tbody>
            </table>

            <div className="flex items-center justify-between gap-4 pt-5">
              <span
                className={cn(
                  "rounded-md border-2 px-2.5 py-1 text-[12px] font-bold tracking-[0.12em] uppercase",
                  doc.status === "PAID" ? "-rotate-3 border-success text-success" : "border-warning text-warning",
                )}
              >
                {doc.status === "PAID" ? "Paid" : "Due"}
              </span>
              <p className="text-right">
                <span className="block text-[12px] text-muted">Total (USD)</span>
                <span className="font-display text-[28px] font-semibold tracking-[-0.02em]">{formatCents(doc.amountCents)}</span>
              </p>
            </div>

            <footer className="mt-8 border-t border-line pt-5 text-[12.5px] leading-5 text-muted">
              {doc.kind === "invoice" && doc.status !== "PAID" ? (
                <p>
                  Pay from Billing in your StayZim dashboard: EcoCash, InnBucks, OneMoney or card through Paynow.{" "}
                  <Link href="/dashboard/billing" className={buttonVariants({ size: "sm", className: "ml-1 align-middle print:hidden" })}>
                    Pay now
                  </Link>
                </p>
              ) : (
                <p>Thank you for your payment.</p>
              )}
              <p className="mt-2">
                {doc.issuer.name} · {doc.issuer.website} · No commission on bookings.
              </p>
            </footer>
          </motion.article>
        )}
      </PageSection>
    </Page>
  );
}
