"use client";

import { AlertDialog, AlertDialogClose, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogIcon, AlertDialogTitle } from "@stayzim/ui/components/alert-dialog";
import { Badge } from "@stayzim/ui/components/badge";
import { Button, buttonVariants } from "@stayzim/ui/components/button";
import { Card } from "@stayzim/ui/components/card";
import { CopyButton } from "@stayzim/ui/components/copy-button";
import { Field, FormMessage } from "@stayzim/ui/components/field";
import { Input } from "@stayzim/ui/components/input";
import { Sheet, SheetBody, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@stayzim/ui/components/sheet";
import { Switch } from "@stayzim/ui/components/switch";
import { Textarea } from "@stayzim/ui/components/textarea";
import { cn } from "@stayzim/ui/lib/utils";
import { findTemplate } from "@stayzim/sites";
import { ArrowUpRight, Gift, Globe, Link2, Plus, Send, Trash2 } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { toast } from "sonner";

import { WhatsAppIcon } from "@/components/brand";
import { LoadError, LoadingCards, Page, PageHeader, PageSection, Panel } from "@/components/page";
import { PaymentLinkSheet } from "@/components/payment-link-sheet";
import { api, outreachApi } from "@/lib/api";
import { formatShortDate, formatWhen } from "@/lib/format";
import { formatPhone, LEAD_SOURCES, OUTREACH_STATUSES, PLAN_NAMES } from "@/lib/labels";
import { formatCents } from "@/lib/money";
import type { LeadDetail, LeadSite } from "@/lib/types";
import { useApi } from "@/lib/use-api";
import { whatsappTextUrl } from "@/lib/whatsapp";

/** "Give to lead": a one-time claim link, to copy or send on WhatsApp from the next number in turn. */
function GiveSheet({ lead, site, onClose, onSent }: { lead: LeadDetail; site: LeadSite | null; onClose: () => void; onSent: () => void }) {
  const [link, setLink] = useState<{ url: string; expiresAt: string } | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const made = useRef<string | null>(null);

  useEffect(() => {
    if (!site || made.current === site.slug) return;
    made.current = site.slug;
    setLink(null);
    setError(null);
    void api<{ url: string; expiresAt: string }>(`/api/admin/leads/${lead.id}/sites/${site.slug}/claim-link`, { method: "POST" }).then((result) => {
      if (result.error !== undefined) return setError(result.error);
      setLink(result.data);
      const first = lead.name.split(" ")[0];
      setMessage(
        `Hi ${first}, here's your website, ${site.name}:\n${result.data.url}\n\nOpen it on your phone and add your email, so it's yours to edit. The link works once, for the next 7 days.\n\nIt's ${PLAN_NAMES[site.plan]}, $${site.monthlyPrice} a month${site.founding ? ", our founding price, yours for life" : ""}.`,
      );
    });
  }, [lead.id, lead.name, site]);

  async function send() {
    setSending(true);
    const result = await outreachApi<{ status: string; error?: string }>("/messages", { method: "POST", json: { phone: lead.phone, message } });
    setSending(false);
    if (result.error !== undefined) return toast.error(result.error);
    toast.success(`Sent to ${lead.name} on WhatsApp`);
    onSent();
    onClose();
  }

  return (
    <Sheet
      open={site !== null}
      onOpenChange={(open) => {
        if (!open) {
          made.current = null;
          onClose();
        }
      }}
    >
      <SheetContent side="right">
        <SheetHeader>
          <SheetTitle>Give {site?.name} to {lead.name}</SheetTitle>
          <SheetDescription>A one-time link that signs them in to this site. When they open it, their 2-day free preview starts and their other sites are deleted.</SheetDescription>
        </SheetHeader>
        <SheetBody className="flex flex-col gap-4">
          {error ? <FormMessage>{error}</FormMessage> : null}
          {!link && !error ? <p className="text-[13.5px] text-muted">Making the link…</p> : null}
          {link ? (
            <>
              <div className="flex items-center gap-2 rounded-2xl border border-line bg-surface-2 p-2 pl-3">
                <span className="min-w-0 flex-1 truncate text-[13px] font-semibold">{link.url}</span>
                <CopyButton value={link.url} size="sm" copiedLabel="Copied">
                  Copy
                </CopyButton>
              </div>
              <p className="text-[12.5px] text-muted">Works once, until {formatWhen(link.expiresAt)}. Making a new one stops this one working.</p>
              <Field label="Message" hint="Sent from the next WhatsApp number in turn.">
                <Textarea value={message} onChange={(event) => setMessage(event.target.value)} rows={8} />
              </Field>
            </>
          ) : null}
        </SheetBody>
        <SheetFooter>
          {link ? (
            <a href={whatsappTextUrl(message, lead.phone)} target="_blank" rel="noreferrer" className={buttonVariants({ variant: "outline" })}>
              <WhatsAppIcon size={16} />
              From my phone
            </a>
          ) : null}
          <Button onClick={send} disabled={!link || sending || !message.trim() || lead.status === "DO_NOT_CONTACT"}>
            <Send />
            {sending ? "Sending" : "Send on WhatsApp"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

function SiteCard({ leadId, site, onGive, onPay, onDelete }: { leadId: string; site: LeadSite; onGive: () => void; onPay: () => void; onDelete: () => void }) {
  const design = site.template ? findTemplate(site.template) : undefined;
  return (
    <Card className="flex flex-col gap-3 p-4">
      <div className="flex items-start justify-between gap-3">
        <span className="flex min-w-0 flex-col">
          <Link href={`/sites/${site.slug}`} className="truncate text-[15px] font-semibold text-ink no-underline hover:text-brand">
            {site.name}
          </Link>
          <span className="truncate text-[12.5px] text-muted">{site.url.replace(/^https?:\/\//, "")}</span>
        </span>
        <span className="text-right">
          <span className="block font-display text-xl font-semibold tabular-nums">${site.monthlyPrice}</span>
          {site.founding ? <span className="text-[11.5px] text-muted-2 line-through">${site.normalPrice}</span> : null}
        </span>
      </div>
      <div className="flex flex-wrap gap-1.5">
        <Badge variant="neutral">{PLAN_NAMES[site.plan]}</Badge>
        {design ? <Badge variant="brand">{design.name}</Badge> : null}
        <Badge variant="neutral">
          {site.photos} {site.photos === 1 ? "photo" : "photos"}
        </Badge>
        {site.claimed ? <Badge variant="success">Theirs: {site.ownerEmail}</Badge> : null}
        {!site.claimed && site.previewEndsAt ? <Badge variant="purple">Link opened, not claimed yet</Badge> : null}
        {site.paymentLink?.state === "paid" ? <Badge variant="success">Paid {formatCents(site.paymentLink.amountCents)}</Badge> : null}
      </div>
      <div className="flex flex-wrap gap-2">
        <a href={site.url} target="_blank" rel="noreferrer" className={buttonVariants({ variant: "outline", size: "sm" })}>
          Open
          <ArrowUpRight />
        </a>
        <Button size="sm" variant="outline" onClick={onPay}>
          <Link2 />
          Payment link
        </Button>
        {site.claimed ? null : (
          <>
            <Link href={`/leads/${leadId}/new-site?site=${site.slug}`} className={buttonVariants({ variant: "outline", size: "sm" })}>
              Photos
            </Link>
            <Button size="sm" onClick={onGive}>
              <Gift />
              {site.previewEndsAt ? "New claim link" : "Give to lead"}
            </Button>
            <Button size="sm" variant="ghost" onClick={onDelete} aria-label={`Delete ${site.name}`}>
              <Trash2 />
            </Button>
          </>
        )}
      </div>
      {site.claimLinkExpiresAt && !site.claimed ? <p className="text-[12px] text-muted-2">A claim link is out, until {formatShortDate(site.claimLinkExpiresAt)}.</p> : null}
      {site.paymentLink?.state === "open" ? (
        <p className="text-[12px] text-muted-2">
          A payment link for {formatCents(site.paymentLink.amountCents)} is out, until {formatShortDate(site.paymentLink.expiresAt)}.
        </p>
      ) : null}
    </Card>
  );
}

function Conversation({ lead, onSent }: { lead: LeadDetail; onSent: () => void }) {
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const end = useRef<HTMLDivElement>(null);

  useEffect(() => {
    end.current?.scrollIntoView({ block: "nearest" });
  }, [lead.conversation.length]);

  async function send(event: FormEvent) {
    event.preventDefault();
    setSending(true);
    const result = await outreachApi<{ status: string }>("/messages", { method: "POST", json: { phone: lead.phone, message } });
    setSending(false);
    if (result.error !== undefined) return toast.error(result.error);
    setMessage("");
    onSent();
  }

  return (
    <Panel title="WhatsApp" description="What we sent (and from which number) and what they wrote back.">
      <div className="flex max-h-[460px] flex-col gap-2 overflow-y-auto rounded-[14px] bg-[#EFEAE2] p-3">
        {lead.conversation.length === 0 ? <p className="py-6 text-center text-[13px] text-muted">Nothing sent or received yet.</p> : null}
        {lead.conversation.map((item) => (
          <div key={item.id} className={cn("flex max-w-[85%] flex-col gap-1 rounded-[12px] px-3 py-2 text-[13.5px] shadow-xs", item.direction === "out" ? "self-end bg-[#D9FDD3]" : "self-start bg-white")}>
            <p className="whitespace-pre-line">{item.body || "(a photo or voice note)"}</p>
            <span className="self-end text-[11px] text-muted-2">
              {item.direction === "out" ? `${item.account} · ` : ""}
              {formatWhen(item.at)}
              {item.status && item.status !== "SENT" ? ` · ${item.status.toLowerCase().replace(/_/g, " ")}` : ""}
            </span>
          </div>
        ))}
        <div ref={end} />
      </div>
      {lead.status === "DO_NOT_CONTACT" ? (
        <p className="text-[13px] text-danger">They asked not to be messaged.</p>
      ) : (
        <form onSubmit={send} className="flex items-end gap-2">
          <Textarea value={message} onChange={(event) => setMessage(event.target.value)} rows={2} placeholder="Write a message" className="flex-1" />
          <Button type="submit" disabled={sending || !message.trim()} aria-label="Send">
            <Send />
          </Button>
        </form>
      )}
    </Panel>
  );
}

function Details({ lead, onSaved }: { lead: LeadDetail; onSaved: (lead: LeadDetail) => void }) {
  const [form, setForm] = useState({ name: lead.name, city: lead.city, lodgeName: lead.lodgeName ?? "", email: lead.email ?? "", notes: lead.notes });
  const [saving, setSaving] = useState(false);
  const set = (key: keyof typeof form) => (event: { target: { value: string } }) => setForm((current) => ({ ...current, [key]: event.target.value }));
  const changed = form.name !== lead.name || form.city !== lead.city || form.lodgeName !== (lead.lodgeName ?? "") || form.email !== (lead.email ?? "") || form.notes !== lead.notes;

  async function save(json: Record<string, unknown>, done: string) {
    setSaving(true);
    const result = await api<LeadDetail>(`/api/admin/leads/${lead.id}`, { method: "PATCH", json });
    setSaving(false);
    if (result.error !== undefined) return toast.error(result.error);
    toast.success(done);
    onSaved(result.data);
  }

  return (
    <Panel title="Details">
      <form
        className="flex flex-col gap-3"
        onSubmit={(event) => {
          event.preventDefault();
          void save(form, "Saved");
        }}
      >
        <Field label="Name">
          <Input value={form.name} onChange={set("name")} required />
        </Field>
        <Field label="Lodge name">
          <Input value={form.lodgeName} onChange={set("lodgeName")} />
        </Field>
        <Field label="Town or city">
          <Input value={form.city} onChange={set("city")} required />
        </Field>
        <Field label="Email">
          <Input type="email" value={form.email} onChange={set("email")} />
        </Field>
        <Field label="Notes">
          <Textarea value={form.notes} onChange={set("notes")} rows={4} />
        </Field>
        <Button type="submit" variant="outline" size="sm" className="self-start" disabled={!changed || saving}>
          Save details
        </Button>
      </form>
      <label className="flex items-center justify-between gap-3 border-t border-line-3 pt-3 text-[13.5px]">
        <span className="flex flex-col">
          Do not contact
          <span className="text-[12.5px] text-muted">No messages from campaigns or from here</span>
        </span>
        <Switch
          checked={lead.status === "DO_NOT_CONTACT"}
          disabled={saving}
          onCheckedChange={(checked) => save({ status: checked ? "DO_NOT_CONTACT" : "PENDING" }, checked ? "They won't be messaged again" : "They can be messaged again")}
        />
      </label>
    </Panel>
  );
}

export default function LeadPage() {
  const { id } = useParams<{ id: string }>();
  const { data: lead, error, loading, reload, set } = useApi<LeadDetail>(`/api/admin/leads/${id}`);
  const [giving, setGiving] = useState<LeadSite | null>(null);
  const [paying, setPaying] = useState<LeadSite | null>(null);
  const [deleting, setDeleting] = useState<LeadSite | null>(null);

  if (loading) return <LoadingCards />;
  if (error || !lead) return <LoadError message={error ?? "Try again."} onRetry={reload} />;

  async function removeSite() {
    if (!deleting || !lead) return;
    const result = await api<LeadDetail>(`/api/admin/leads/${lead.id}/sites/${deleting.slug}`, { method: "DELETE" });
    if (result.error !== undefined) toast.error(result.error);
    else {
      toast.success(`${deleting.name} is deleted`);
      set(result.data);
    }
    setDeleting(null);
  }

  const status = OUTREACH_STATUSES[lead.status];

  return (
    <Page>
      <PageHeader
        back={{ label: "Leads", href: "/leads" }}
        title={lead.name}
        description={
          <span className="flex flex-wrap items-center gap-1.5">
            <Badge variant={status.badge}>{status.label}</Badge>
            <span>
              {formatPhone(lead.phone)} · {lead.city}
              {lead.source ? ` · ${LEAD_SOURCES[lead.source]}` : ""} · added {formatShortDate(lead.createdAt)}
            </span>
          </span>
        }
        actions={
          <>
            <a href={whatsappTextUrl("", lead.phone)} target="_blank" rel="noreferrer" className={buttonVariants({ variant: "outline", size: "sm" })}>
              <WhatsAppIcon size={15} />
              Chat from my phone
            </a>
            <Link href={`/leads/${lead.id}/new-site`} className={buttonVariants({ size: "sm" })}>
              <Plus />
              Make a site
            </Link>
          </>
        }
      />

      <PageSection className="grid gap-4 xl:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        <div className="flex flex-col gap-4">
          <Panel title="Sites for them" description="Make one per plan you want to show them ($15, $30, $50…). When they pick one, give it to them; the others go.">
            {lead.sites.length === 0 ? (
              <div className="flex flex-col items-start gap-3 rounded-[14px] bg-surface-2 p-4">
                <span className="flex items-center gap-2 text-[13.5px] text-muted">
                  <Globe className="size-4" />
                  No sites yet.
                </span>
                <Link href={`/leads/${lead.id}/new-site`} className={buttonVariants({ size: "sm" })}>
                  <Plus />
                  Make their first site
                </Link>
              </div>
            ) : (
              <div className="grid gap-3 md:grid-cols-2">
                {lead.sites.map((site) => (
                  <SiteCard key={site.id} leadId={lead.id} site={site} onGive={() => setGiving(site)} onPay={() => setPaying(site)} onDelete={() => setDeleting(site)} />
                ))}
              </div>
            )}
          </Panel>
          <Conversation lead={lead} onSent={reload} />
        </div>
        <Details key={lead.id} lead={lead} onSaved={set} />
      </PageSection>

      <GiveSheet lead={lead} site={giving} onClose={() => setGiving(null)} onSent={reload} />
      {paying ? (
        <PaymentLinkSheet
          site={paying}
          phone={lead.status === "DO_NOT_CONTACT" ? null : lead.phone}
          name={lead.name}
          open
          onOpenChange={(open) => {
            if (!open) setPaying(null);
          }}
          onChanged={reload}
        />
      ) : null}
      <AlertDialog open={deleting !== null} onOpenChange={(open) => !open && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogIcon>
            <Trash2 />
          </AlertDialogIcon>
          <AlertDialogTitle>Delete {deleting?.name}?</AlertDialogTitle>
          <AlertDialogDescription>The site and its photos go, and its address frees up. You can&apos;t undo this.</AlertDialogDescription>
          <AlertDialogFooter>
            <AlertDialogClose render={<Button variant="outline" />}>Keep it</AlertDialogClose>
            <Button variant="destructive" onClick={removeSite}>
              Delete site
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Page>
  );
}
