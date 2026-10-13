"use client";

import { FOUNDING_PRICES } from "@stayzim/sites";
import { AlertDialog, AlertDialogClose, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogIcon, AlertDialogTitle } from "@stayzim/ui/components/alert-dialog";
import { Badge } from "@stayzim/ui/components/badge";
import { Button, buttonVariants } from "@stayzim/ui/components/button";
import { Field } from "@stayzim/ui/components/field";
import { Input } from "@stayzim/ui/components/input";
import { NativeSelect } from "@stayzim/ui/components/native-select";
import { Sheet, SheetBody, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@stayzim/ui/components/sheet";
import { Switch } from "@stayzim/ui/components/switch";
import { Tabs, TabsList, TabsTab } from "@stayzim/ui/components/tabs";
import { ArrowUpRight, Banknote, Trash2 } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { JournalEditor } from "@/components/content/journal-editor";
import { ReviewsEditor } from "@/components/content/reviews-editor";
import type { LodgeContent } from "@/components/content/types";
import { LoadError, LoadingCards, Page, PageHeader, PageSection, Panel } from "@/components/page";
import { api } from "@/lib/api";
import { formatDate, formatShortDate, formatWhen } from "@/lib/format";
import { CHANNELS, PLAN_NAMES, SITE_STATES } from "@/lib/labels";
import { formatCents } from "@/lib/money";
import type { Plan, SiteDetail } from "@/lib/types";
import { useApi } from "@/lib/use-api";

type Tab = "overview" | "billing" | "content";

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5 sm:flex-row sm:justify-between sm:gap-4">
      <dt className="text-[13px] text-muted">{label}</dt>
      <dd className="text-[13.5px] font-medium text-ink sm:text-right">{children}</dd>
    </div>
  );
}

/** "Record a payment": what mark-paid did, from a sheet. */
function PaymentSheet({ site, open, onOpenChange, onSaved }: { site: SiteDetail; open: boolean; onOpenChange: (open: boolean) => void; onSaved: (site: SiteDetail) => void }) {
  const [plan, setPlan] = useState<Plan>(site.plan);
  const [months, setMonths] = useState(1);
  const [amount, setAmount] = useState("");
  const [channel, setChannel] = useState("ecocash");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    const result = await api<SiteDetail>(`/api/admin/sites/${site.slug}/payments`, {
      method: "POST",
      json: { plan, months, channel, note: note || undefined, ...(amount ? { amount: Number(amount) } : {}) },
    });
    setSaving(false);
    if (result.error !== undefined) {
      toast.error(result.error);
      return;
    }
    toast.success("Payment recorded. The receipt is on its way to the owner.");
    onSaved(result.data);
    onOpenChange(false);
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right">
        <SheetHeader>
          <SheetTitle>Record a payment</SheetTitle>
          <SheetDescription>A payment made outside Paynow. The site goes live on this plan and the owner gets the receipt by email.</SheetDescription>
        </SheetHeader>
        <SheetBody className="flex flex-col gap-4">
          <Field label="Plan">
            <NativeSelect value={plan} onChange={(event) => setPlan(event.target.value as Plan)}>
              {(Object.keys(PLAN_NAMES) as Plan[]).map((key) => (
                <option key={key} value={key}>
                  {PLAN_NAMES[key]}
                </option>
              ))}
            </NativeSelect>
          </Field>
          <Field label="Months">
            <NativeSelect value={String(months)} onChange={(event) => setMonths(Number(event.target.value))}>
              <option value="1">1 month</option>
              <option value="3">3 months</option>
              <option value="12">12 months</option>
            </NativeSelect>
          </Field>
          <Field label="Amount (USD)" hint="Leave empty for the lodge's own price for those months (founding or not).">
            <Input inputMode="decimal" value={amount} onChange={(event) => setAmount(event.target.value.replace(/[^\d.]/g, ""))} placeholder="Their price" />
          </Field>
          <Field label="Paid with">
            <NativeSelect value={channel} onChange={(event) => setChannel(event.target.value)}>
              {CHANNELS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </NativeSelect>
          </Field>
          <Field label="Note" hint="Optional, e.g. the EcoCash reference.">
            <Input value={note} onChange={(event) => setNote(event.target.value)} maxLength={300} />
          </Field>
        </SheetBody>
        <SheetFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={save} disabled={saving}>
            {saving ? "Recording" : "Record payment"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

function Actions({ site, onChanged }: { site: SiteDetail; onChanged: (site: SiteDetail) => void }) {
  const router = useRouter();
  const [domain, setDomain] = useState(site.customDomain ?? "");
  const [paying, setPaying] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [busy, setBusy] = useState(false);

  async function patch(json: Record<string, unknown>, done: string) {
    setBusy(true);
    const result = await api<SiteDetail>(`/api/admin/sites/${site.slug}`, { method: "PATCH", json });
    setBusy(false);
    if (result.error !== undefined) toast.error(result.error);
    else {
      toast.success(done);
      onChanged(result.data);
      setDomain(result.data.customDomain ?? "");
    }
  }

  async function remove() {
    setBusy(true);
    const result = await api(`/api/admin/sites/${site.slug}`, { method: "DELETE" });
    setBusy(false);
    if (result.error !== undefined) {
      toast.error(result.error);
      return;
    }
    toast.success(`${site.name} is deleted`);
    router.replace("/sites");
  }

  const paid = site.payments.some((payment) => payment.status === "PAID");

  return (
    <Panel title="Actions">
      <div className="flex flex-col gap-4">
        {site.status === "DEMO" ? (
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-[13.5px]">
              Free preview {site.previewEndsAt ? `ends ${formatWhen(site.previewEndsAt)}` : "has no end (made for a lead)"}
            </span>
            <span className="flex gap-2">
              <Button variant="outline" size="sm" disabled={busy} onClick={() => patch({ extendPreviewDays: 2 }, "Preview extended by 2 days")}>
                +2 days
              </Button>
              <Button variant="outline" size="sm" disabled={busy} onClick={() => patch({ extendPreviewDays: 7 }, "Preview extended by 7 days")}>
                +7 days
              </Button>
            </span>
          </div>
        ) : (
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-[13.5px]">Status</span>
            <NativeSelect
              value={site.status}
              disabled={busy}
              onChange={(event) => patch({ status: event.target.value }, "Status changed")}
              className="w-44"
              aria-label="Status"
            >
              <option value="ACTIVE">Active</option>
              <option value="OVERDUE">Payment due</option>
              <option value="SUSPENDED">Offline</option>
            </NativeSelect>
          </div>
        )}

        <label className="flex items-center justify-between gap-3 text-[13.5px]">
          <span className="flex flex-col">
            Founding price
            <span className="text-[12.5px] text-muted">
              ${FOUNDING_PRICES[site.plan]} instead of ${site.normalPrice} a month on {PLAN_NAMES[site.plan]}, on any plan for life
            </span>
          </span>
          <Switch checked={site.founding} disabled={busy} onCheckedChange={(checked) => patch({ founding: checked }, checked ? "Founding price on" : "Founding price off")} />
        </label>

        <form
          className="flex flex-col gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            void patch({ customDomain: domain.trim() || null }, domain.trim() ? `It answers on ${domain.trim()} now` : "Own domain removed");
          }}
        >
          <Field label="Own domain" hint="Set it once DNS points at us (docs/deployment.md, Custom domains). Empty: remove it.">
            <Input value={domain} onChange={(event) => setDomain(event.target.value)} placeholder="mistvalleylodge.co.zw" />
          </Field>
          <Button type="submit" variant="outline" size="sm" className="self-start" disabled={busy || domain.trim() === (site.customDomain ?? "")}>
            Save domain
          </Button>
        </form>

        <div className="flex flex-wrap gap-2 border-t border-line-3 pt-4">
          <Button size="sm" onClick={() => setPaying(true)} disabled={site.owner.guest}>
            <Banknote />
            Record a payment
          </Button>
          <Button size="sm" variant="destructive" onClick={() => setDeleting(true)} disabled={paid}>
            <Trash2 />
            Delete site
          </Button>
        </div>
        {site.owner.guest ? <p className="text-[12.5px] text-muted">Payments wait until the owner has claimed the site with an email (for the receipt).</p> : null}
      </div>

      <PaymentSheet site={site} open={paying} onOpenChange={setPaying} onSaved={onChanged} />
      <AlertDialog open={deleting} onOpenChange={setDeleting}>
        <AlertDialogContent>
          <AlertDialogIcon>
            <Trash2 />
          </AlertDialogIcon>
          <AlertDialogTitle>Delete {site.name}?</AlertDialogTitle>
          <AlertDialogDescription>
            The site, its photos and its {site.owner.team ? "content" : "owner's account"} go for good. Its address frees up. You can&apos;t undo this.
          </AlertDialogDescription>
          <AlertDialogFooter>
            <AlertDialogClose render={<Button variant="outline" />}>Keep it</AlertDialogClose>
            <Button variant="destructive" onClick={remove} disabled={busy}>
              Delete site
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Panel>
  );
}

function Content({ slug }: { slug: string }) {
  const { data, error, loading, reload, set } = useApi<LodgeContent>(`/api/admin/lodges/${slug}/content`);
  const [tab, setTab] = useState<"reviews" | "journal">("reviews");
  if (loading) return <LoadingCards rows={1} />;
  if (error || !data) return <LoadError message={error ?? "Try again."} onRetry={reload} />;
  return (
    <div className="flex flex-col gap-4">
      {data.lodge.plan !== "PRO" ? (
        <p className="rounded-2xl bg-purple-tint px-4 py-3 text-[13.5px] text-purple-dark">Reviews and the journal show on Pro sites only. What you save waits until this site is on Pro.</p>
      ) : null}
      <Tabs value={tab} onValueChange={(value) => setTab(value as "reviews" | "journal")}>
        <TabsList aria-label="Content">
          <TabsTab value="reviews">Reviews</TabsTab>
          <TabsTab value="journal">Journal</TabsTab>
        </TabsList>
      </Tabs>
      {tab === "reviews" ? (
        <ReviewsEditor key={`${slug}-reviews`} slug={slug} reviews={data.reviews} onSaved={set} />
      ) : (
        <JournalEditor slug={slug} lodge={data.lodge} posts={data.posts} photos={data.photos} onChanged={set} />
      )}
    </div>
  );
}

export default function SitePage() {
  const { slug } = useParams<{ slug: string }>();
  const { data: site, error, loading, reload, set } = useApi<SiteDetail>(`/api/admin/sites/${slug}`);
  const [tab, setTab] = useState<Tab>("overview");

  if (loading) return <LoadingCards />;
  if (error || !site) return <LoadError message={error ?? "Try again."} onRetry={reload} />;

  return (
    <Page>
      <PageHeader
        back={{ label: "Sites", href: "/sites" }}
        title={site.name}
        description={
          <span className="flex flex-wrap items-center gap-1.5">
            <Badge variant={SITE_STATES[site.state].badge}>{SITE_STATES[site.state].label}</Badge>
            <Badge variant="neutral">{PLAN_NAMES[site.plan]}</Badge>
            {site.founding ? <Badge variant="purple">Founding</Badge> : null}
            <span>{site.url.replace(/^https?:\/\//, "")}</span>
          </span>
        }
        actions={
          <a href={site.url} target="_blank" rel="noreferrer" className={buttonVariants({ variant: "outline", size: "sm" })}>
            Open site
            <ArrowUpRight />
          </a>
        }
      />

      <PageSection>
        <Tabs value={tab} onValueChange={(value) => setTab(value as Tab)}>
          <TabsList aria-label="Site">
            <TabsTab value="overview">Overview</TabsTab>
            <TabsTab value="billing">Billing</TabsTab>
            <TabsTab value="content">Reviews and journal</TabsTab>
          </TabsList>
        </Tabs>
      </PageSection>

      {tab === "overview" ? (
        <PageSection className="grid gap-4 xl:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
          <Panel title="The site">
            {site.heroUrl ? (
              // eslint-disable-next-line @next/next/no-img-element -- a lodge photo from the bucket
              <img src={site.heroUrl} alt="" className="h-40 w-full rounded-[14px] object-cover" />
            ) : null}
            <dl className="flex flex-col gap-2.5">
              <Row label="Price">
                ${site.monthlyPrice}/month{site.founding ? ` (founding; normally $${site.normalPrice})` : ""}
              </Row>
              {site.status === "DEMO" ? (
                <Row label="Free preview ends">{site.previewEndsAt ? formatWhen(site.previewEndsAt) : "No end: made for a lead"}</Row>
              ) : (
                <Row label="Paid until">{site.paidUntil ? formatDate(site.paidUntil) : "Not set"}</Row>
              )}
              <Row label="Owner">
                {site.lead ? (
                  <Link href={`/leads/${site.lead.id}`} className="text-brand hover:text-brand-dark">
                    Lead: {site.lead.name}
                  </Link>
                ) : null}
                {site.lead ? " · " : ""}
                {site.owner.guest ? "Guest, not claimed yet" : `${site.owner.name} (${site.owner.email})`}
              </Row>
              <Row label="WhatsApp">{site.whatsapp ? `+${site.whatsapp}` : "Not set"}</Row>
              <Row label="Place">{site.place || "Not set"}</Row>
              <Row label="Design">{site.template ?? "The plan's default"}</Row>
              <Row label="Made">
                {formatShortDate(site.createdAt)} · {site.source ?? "direct"}
              </Row>
              {site.utm.campaign || site.utm.medium ? (
                <Row label="Advert">{[site.utm.source, site.utm.medium, site.utm.campaign, site.utm.content].filter(Boolean).join(" · ")}</Row>
              ) : null}
              <Row label="Content">
                {site.counts.rooms} rooms · {site.counts.photos} photos · {site.counts.bookings} bookings
              </Row>
              <Row label="Visits (30 days)">{site.counts.visits30}</Row>
              {site.domainClaim ? (
                <Row label="Free domain">
                  {site.domainClaim.domain} · {site.domainClaim.status === "READY" ? "set up" : `claimed ${formatShortDate(site.domainClaim.createdAt)}`}
                </Row>
              ) : null}
            </dl>
          </Panel>
          <div className="flex flex-col gap-4">
            <Actions site={site} onChanged={set} />
            {site.requests.length > 0 ? (
              <Panel title="Change requests" actions={<Link href="/requests" className="text-[13px] font-semibold text-brand hover:text-brand-dark">All requests</Link>}>
                <ul className="flex flex-col gap-2">
                  {site.requests.map((request) => (
                    <li key={request.id} className="rounded-[12px] bg-surface-2 px-3 py-2 text-[13px]">
                      <span className="font-semibold">{request.reference}</span> · {request.status.toLowerCase().replace("_", " ")}
                      <p className="line-clamp-2 text-muted">{request.message}</p>
                    </li>
                  ))}
                </ul>
              </Panel>
            ) : null}
          </div>
        </PageSection>
      ) : null}

      {tab === "billing" ? (
        <PageSection className="grid gap-4 xl:grid-cols-2">
          <Panel title="Payments">
            {site.payments.length === 0 ? <p className="text-[13.5px] text-muted">No payments yet.</p> : null}
            <ul className="flex flex-col divide-y divide-line-3">
              {site.payments.map((payment) => (
                <li key={payment.id} className="flex items-center justify-between gap-3 py-2.5 text-[13.5px]">
                  <span className="flex flex-col">
                    <span className="font-semibold">
                      {PLAN_NAMES[payment.plan]}, {payment.months} {payment.months === 1 ? "month" : "months"}
                    </span>
                    <span className="text-[12.5px] text-muted">
                      {payment.receiptNumber ?? payment.reference} · {payment.channel} · {formatShortDate(payment.paidAt ?? payment.createdAt)}
                    </span>
                  </span>
                  <span className="flex flex-col items-end gap-1">
                    <span className="font-semibold tabular-nums">{formatCents(payment.amountCents)}</span>
                    <Badge variant={payment.status === "PAID" ? "success" : payment.status === "PENDING" ? "warning" : "neutral"}>{payment.status.toLowerCase()}</Badge>
                  </span>
                </li>
              ))}
            </ul>
          </Panel>
          <Panel title="Invoices">
            {site.invoices.length === 0 ? <p className="text-[13.5px] text-muted">No invoices yet.</p> : null}
            <ul className="flex flex-col divide-y divide-line-3">
              {site.invoices.map((invoice) => (
                <li key={invoice.id} className="flex items-center justify-between gap-3 py-2.5 text-[13.5px]">
                  <span className="flex flex-col">
                    <span className="font-semibold">{invoice.number}</span>
                    <span className="text-[12.5px] text-muted">
                      {PLAN_NAMES[invoice.plan]} · due {formatShortDate(invoice.dueAt)}
                    </span>
                  </span>
                  <span className="flex flex-col items-end gap-1">
                    <span className="font-semibold tabular-nums">{formatCents(invoice.amountCents)}</span>
                    <Badge variant={invoice.status === "PAID" ? "success" : invoice.status === "OPEN" ? "warning" : "neutral"}>{invoice.status.toLowerCase()}</Badge>
                  </span>
                </li>
              ))}
            </ul>
          </Panel>
        </PageSection>
      ) : null}

      {tab === "content" ? (
        <PageSection>
          <Content slug={site.slug} />
        </PageSection>
      ) : null}
    </Page>
  );
}
