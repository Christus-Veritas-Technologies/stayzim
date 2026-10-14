"use client";

import { planPriceCents } from "@stayzim/sites";
import { Badge } from "@stayzim/ui/components/badge";
import { Button, buttonVariants } from "@stayzim/ui/components/button";
import { CopyButton } from "@stayzim/ui/components/copy-button";
import { Field, FormMessage } from "@stayzim/ui/components/field";
import { Sheet, SheetBody, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@stayzim/ui/components/sheet";
import { Textarea } from "@stayzim/ui/components/textarea";
import { cn } from "@stayzim/ui/lib/utils";
import { AnimatePresence, motion } from "framer-motion";
import { Link2, Send } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { WhatsAppIcon } from "@/components/brand";
import { EASE_OUT } from "@/components/motion";
import { api, outreachApi } from "@/lib/api";
import { formatDate, formatShortDate } from "@/lib/format";
import { formatCents } from "@/lib/money";
import type { PaymentLink, Plan } from "@/lib/types";
import { whatsappTextUrl } from "@/lib/whatsapp";

const MONTHS = [1, 3, 12] as const;

export type PaymentLinkSite = { slug: string; name: string; plan: Plan; founding: boolean; paymentLink: PaymentLink | null };

const forMonths = (months: number) => `${months} ${months === 1 ? "month" : "months"}`;

function messageFor(site: PaymentLinkSite, link: PaymentLink, name: string | null) {
  const hello = name ? `Hi ${name.split(" ")[0]}` : "Hi";
  return `${hello}, here's the link to pay for your website, ${site.name}:\n${link.url}\n\nIt's ${formatCents(link.amountCents)} for ${forMonths(link.months)}. Open it, choose EcoCash, OneMoney, InnBucks or a card, and press Pay. Your site goes live as soon as it's paid.`;
}

/**
 * "Payment link": a page where the owner pays without logging in, showing only
 * their lodge's name, its address and the amount (stayzim.co.zw/pay/…). Pick
 * how many months, make the link, then copy it or send it on WhatsApp.
 */
export function PaymentLinkSheet({
  site,
  phone,
  name,
  open,
  onOpenChange,
  onChanged,
}: {
  site: PaymentLinkSite;
  /** Who to send it to on WhatsApp (digits with the country code); null: copy it only */
  phone: string | null;
  /** Their name, for the message's hello */
  name: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** After a new link is made, so the page shows it */
  onChanged: () => void;
}) {
  const current = site.paymentLink?.state === "open" ? site.paymentLink : null;
  const [months, setMonths] = useState<number>(current?.months ?? 1);
  const [link, setLink] = useState<PaymentLink | null>(current);
  const [message, setMessage] = useState(() => (current ? messageFor(site, current, name) : ""));
  const [making, setMaking] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Opening the sheet again starts from the site's own link
  useEffect(() => {
    if (!open) return;
    setLink(current);
    setMonths(current?.months ?? 1);
    setMessage(current ? messageFor(site, current, name) : "");
    setError(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only when the sheet opens
  }, [open]);

  async function make() {
    setMaking(true);
    setError(null);
    const result = await api<PaymentLink>(`/api/admin/sites/${site.slug}/payment-link`, { method: "POST", json: { months } });
    setMaking(false);
    if (result.error !== undefined) return setError(result.error);
    setLink(result.data);
    setMessage(messageFor(site, result.data, name));
    onChanged();
  }

  async function send() {
    if (!phone) return;
    setSending(true);
    const result = await outreachApi<{ status: string; error?: string }>("/messages", { method: "POST", json: { phone, message } });
    setSending(false);
    if (result.error !== undefined) return toast.error(result.error);
    if (result.data.status !== "SENT") return toast.error(result.data.error ?? "WhatsApp didn't send it. Try From my phone.");
    toast.success("Payment link sent on WhatsApp");
    onOpenChange(false);
  }

  const stale = link !== null && link.months !== months;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right">
        <SheetHeader>
          <SheetTitle>Payment link for {site.name}</SheetTitle>
          <SheetDescription>A page where they pay without logging in. It shows only their lodge&apos;s name, its address and the amount, with the same ways to pay as the dashboard.</SheetDescription>
        </SheetHeader>
        <SheetBody className="flex flex-col gap-5">
          {site.paymentLink?.state === "paid" ? (
            <p className="rounded-2xl bg-success-wash px-4 py-3 text-[13.5px] text-success">
              Paid {formatDate(site.paymentLink.paidAt!)}: {formatCents(site.paymentLink.amountCents)} for {forMonths(site.paymentLink.months)}. A new link is for paying ahead.
            </p>
          ) : null}
          <Field label="How long they pay for" hint="Their own plan, at their price (founding or not).">
            <div role="radiogroup" aria-label="How long they pay for" className="grid grid-cols-3 gap-2">
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
                  <span className="text-[13.5px] font-semibold">{forMonths(count)}</span>
                  <span className="text-[12.5px] text-muted tabular-nums">{formatCents(planPriceCents(site.plan, count, site.founding))}</span>
                </button>
              ))}
            </div>
          </Field>
          {!link || stale ? (
            <Button onClick={make} disabled={making} className="self-start">
              <Link2 />
              {making ? "Making the link" : link ? `Make a new link for ${forMonths(months)}` : "Make the link"}
            </Button>
          ) : null}
          {stale ? <p className="-mt-3 text-[12.5px] text-muted">The new link replaces the one for {forMonths(link.months)}.</p> : null}
          {error ? <FormMessage>{error}</FormMessage> : null}
          <AnimatePresence initial={false}>
            {link && !stale ? (
              <motion.div key={link.url} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.3, ease: EASE_OUT }} className="flex flex-col gap-4">
                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-2 rounded-2xl border border-line bg-surface-2 p-2 pl-3">
                    <span className="min-w-0 flex-1 truncate text-[13px] font-semibold">{link.url}</span>
                    <CopyButton value={link.url} size="sm" copiedLabel="Copied">
                      Copy
                    </CopyButton>
                  </div>
                  <span className="flex flex-wrap items-center gap-1.5 text-[12.5px] text-muted">
                    <Badge variant="brand">{formatCents(link.amountCents)}</Badge>
                    for {forMonths(link.months)} · works until {formatShortDate(link.expiresAt)}
                  </span>
                </div>
                <Field label="Message" hint={phone ? "Sent from the next WhatsApp number in turn." : "No WhatsApp number for this site: copy the link instead."}>
                  <Textarea value={message} onChange={(event) => setMessage(event.target.value)} rows={7} />
                </Field>
              </motion.div>
            ) : null}
          </AnimatePresence>
        </SheetBody>
        <SheetFooter>
          {link && !stale && phone ? (
            <>
              <a href={whatsappTextUrl(message, phone)} target="_blank" rel="noreferrer" className={buttonVariants({ variant: "outline" })}>
                <WhatsAppIcon size={16} />
                From my phone
              </a>
              <Button onClick={send} disabled={sending || !message.trim()}>
                <Send />
                {sending ? "Sending" : "Send on WhatsApp"}
              </Button>
            </>
          ) : (
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Close
            </Button>
          )}
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
