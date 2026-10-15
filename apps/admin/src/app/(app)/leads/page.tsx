"use client";

import { Badge } from "@stayzim/ui/components/badge";
import { Button } from "@stayzim/ui/components/button";
import { Card } from "@stayzim/ui/components/card";
import { EmptyState } from "@stayzim/ui/components/empty-state";
import { Field, FormMessage } from "@stayzim/ui/components/field";
import { Input } from "@stayzim/ui/components/input";
import { NativeSelect } from "@stayzim/ui/components/native-select";
import { Sheet, SheetBody, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@stayzim/ui/components/sheet";
import { Textarea } from "@stayzim/ui/components/textarea";
import { FileUp, Plus, Search, UserRoundSearch } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";

import { LoadError, LoadingCards, Page, PageHeader, PageSection } from "@/components/page";
import { api } from "@/lib/api";
import { leadsFromCsv } from "@/lib/csv";
import { formatShortWhen } from "@/lib/format";
import { AGENT_FILTERS, AGENT_STAGES, LEAD_SOURCES, OUTREACH_STATUSES, PLAN_NAMES, formatPhone } from "@/lib/labels";
import type { LeadDetail, LeadRow, LeadSource, OutreachStatus, Paged } from "@/lib/types";
import { useApi } from "@/lib/use-api";

function AddLeadSheet({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const router = useRouter();
  const [form, setForm] = useState({ name: "", phone: "", city: "", lodgeName: "", email: "", notes: "" });
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const set = (key: keyof typeof form) => (event: { target: { value: string } }) => setForm((current) => ({ ...current, [key]: event.target.value }));

  async function save(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    const result = await api<LeadDetail>("/api/admin/leads", { method: "POST", json: { ...form, source: "manual" } });
    setSaving(false);
    if (result.error !== undefined) {
      setError(result.error);
      return;
    }
    onOpenChange(false);
    router.push(`/leads/${result.data.id}`);
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right">
        <form onSubmit={save} className="flex h-full flex-col">
          <SheetHeader>
            <SheetTitle>Add a lead</SheetTitle>
            <SheetDescription>Someone you met, called or found. You can make sites for them next.</SheetDescription>
          </SheetHeader>
          <SheetBody className="flex flex-col gap-4">
            <Field label="Their name">
              <Input value={form.name} onChange={set("name")} required maxLength={200} />
            </Field>
            <Field label="WhatsApp number" hint="With the country code, like +263 77 123 4567.">
              <Input value={form.phone} onChange={set("phone")} required inputMode="tel" />
            </Field>
            <Field label="Town or city">
              <Input value={form.city} onChange={set("city")} required maxLength={100} />
            </Field>
            <Field label="Lodge name" hint="Optional">
              <Input value={form.lodgeName} onChange={set("lodgeName")} maxLength={120} />
            </Field>
            <Field label="Email" hint="Optional">
              <Input type="email" value={form.email} onChange={set("email")} />
            </Field>
            <Field label="Notes" hint="Optional">
              <Textarea value={form.notes} onChange={set("notes")} rows={3} />
            </Field>
            {error ? <FormMessage>{error}</FormMessage> : null}
          </SheetBody>
          <SheetFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Adding" : "Add lead"}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}

type ImportResult = { received: number; created: number; updated: number; skipped: { name: string; phone: string; reason: string }[] };

function UploadSheet({ open, onOpenChange, onImported }: { open: boolean; onOpenChange: (open: boolean) => void; onImported: () => void }) {
  const [source, setSource] = useState<LeadSource>("meta_form");
  const [file, setFile] = useState<{ name: string; leads: ReturnType<typeof leadsFromCsv> } | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [saving, setSaving] = useState(false);

  async function pickFile(chosen: File | undefined) {
    setResult(null);
    if (!chosen) return setFile(null);
    setFile({ name: chosen.name, leads: leadsFromCsv(await chosen.text()) });
  }

  async function upload() {
    if (!file || file.leads.leads.length === 0) return;
    setSaving(true);
    const response = await api<ImportResult>("/api/admin/leads/import", { method: "POST", json: { source, leads: file.leads.leads } });
    setSaving(false);
    if (response.error !== undefined) {
      toast.error(response.error);
      return;
    }
    setResult(response.data);
    onImported();
  }

  return (
    <Sheet
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next);
        if (!next) {
          setFile(null);
          setResult(null);
        }
      }}
    >
      <SheetContent side="right">
        <SheetHeader>
          <SheetTitle>Upload leads</SheetTitle>
          <SheetDescription>The CSV from Facebook&apos;s Leads Center (or the form&apos;s download), or a list of lodges. New numbers become leads; known ones get what they were missing.</SheetDescription>
        </SheetHeader>
        <SheetBody className="flex flex-col gap-4">
          <Field label="Where they came from">
            <NativeSelect value={source} onChange={(event) => setSource(event.target.value as LeadSource)}>
              {(Object.keys(LEAD_SOURCES) as LeadSource[]).filter((key) => key !== "whatsapp").map((key) => (
                <option key={key} value={key}>
                  {LEAD_SOURCES[key]}
                </option>
              ))}
            </NativeSelect>
          </Field>
          <Field label="CSV file">
            <Input type="file" accept=".csv,text/csv" onChange={(event) => void pickFile(event.target.files?.[0])} />
          </Field>
          {file ? (
            <p className="rounded-[12px] bg-surface-2 px-3 py-2 text-[13px] text-muted">
              {file.name}: {file.leads.leads.length} {file.leads.leads.length === 1 ? "lead" : "leads"} with a number
              {file.leads.withoutNumber ? `; ${file.leads.withoutNumber} without one (Messenger only) left out` : ""}.
            </p>
          ) : null}
          {result ? (
            <div className="flex flex-col gap-1 rounded-[12px] bg-success-tint px-3 py-2 text-[13px] text-success">
              <span>
                {result.created} new, {result.updated} updated, {result.received - result.created - result.updated - result.skipped.length} already here.
              </span>
              {result.skipped.map((row) => (
                <span key={`${row.name}-${row.phone}`} className="text-warning">
                  Skipped {row.name} ({row.phone}): {row.reason}
                </span>
              ))}
            </div>
          ) : null}
        </SheetBody>
        <SheetFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {result ? "Done" : "Cancel"}
          </Button>
          {result ? null : (
            <Button onClick={upload} disabled={saving || !file || file.leads.leads.length === 0}>
              {saving ? "Uploading" : "Add these leads"}
            </Button>
          )}
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

export default function LeadsPage() {
  const [search, setSearch] = useState("");
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<"all" | OutreachStatus>("all");
  const [source, setSource] = useState<"all" | LeadSource>("all");
  const [agent, setAgent] = useState<keyof typeof AGENT_FILTERS>("all");
  const [page, setPage] = useState(1);
  const [adding, setAdding] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setQ(search.trim());
      setPage(1);
    }, 350);
    return () => clearTimeout(timer);
  }, [search]);

  const query = new URLSearchParams({ status, source, agent, page: String(page), ...(q ? { q } : {}) });
  const { data, error, loading, reload } = useApi<Paged<"leads", LeadRow>>(`/api/admin/leads?${query}`);
  const pages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;

  return (
    <Page>
      <PageHeader
        title="Leads"
        count={data?.total}
        description="People and lodges we're talking to: from the Facebook form, outreach lists and by hand. Replies come first."
        actions={
          <>
            <Button variant="outline" size="sm" onClick={() => setUploading(true)}>
              <FileUp />
              Upload CSV
            </Button>
            <Button size="sm" onClick={() => setAdding(true)}>
              <Plus />
              Add a lead
            </Button>
          </>
        }
      />
      <PageSection className="flex flex-col gap-2 sm:flex-row">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-2" />
          <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Name, lodge, town or number" className="pl-9" aria-label="Search leads" />
        </div>
        <NativeSelect
          value={status}
          onChange={(event) => {
            setStatus(event.target.value as typeof status);
            setPage(1);
          }}
          aria-label="Status"
          className="sm:w-48"
        >
          <option value="all">Every status</option>
          {(Object.keys(OUTREACH_STATUSES) as OutreachStatus[]).map((key) => (
            <option key={key} value={key}>
              {OUTREACH_STATUSES[key].label}
            </option>
          ))}
        </NativeSelect>
        <NativeSelect
          value={source}
          onChange={(event) => {
            setSource(event.target.value as typeof source);
            setPage(1);
          }}
          aria-label="Source"
          className="sm:w-44"
        >
          <option value="all">Every source</option>
          {(Object.keys(LEAD_SOURCES) as LeadSource[]).map((key) => (
            <option key={key} value={key}>
              {LEAD_SOURCES[key]}
            </option>
          ))}
        </NativeSelect>
        <NativeSelect
          value={agent}
          onChange={(event) => {
            setAgent(event.target.value as typeof agent);
            setPage(1);
          }}
          aria-label="Sales agent"
          className="sm:w-44"
        >
          {(Object.keys(AGENT_FILTERS) as (keyof typeof AGENT_FILTERS)[]).map((key) => (
            <option key={key} value={key}>
              {AGENT_FILTERS[key]}
            </option>
          ))}
        </NativeSelect>
      </PageSection>

      {loading ? <LoadingCards /> : null}
      {error ? <LoadError message={error} onRetry={reload} /> : null}
      {data && data.leads.length === 0 ? (
        <PageSection>
          <EmptyState
            className="rounded-[20px] bg-white shadow-card"
            icon={<UserRoundSearch />}
            title="No leads match"
            description="Add one, or upload the CSV from Facebook's Leads Center."
          />
        </PageSection>
      ) : null}
      {data && data.leads.length > 0 ? (
        <PageSection>
          <Card className="overflow-hidden p-0">
            <ul className="divide-y divide-line-3">
              {data.leads.map((lead) => (
                <li key={lead.id}>
                  <Link href={`/leads/${lead.id}`} className="grid gap-x-4 gap-y-1 px-4 py-3 no-underline transition-colors hover:bg-surface-2 sm:grid-cols-[minmax(0,1.3fr)_minmax(0,1.4fr)_auto] sm:items-center">
                    <span className="flex min-w-0 flex-col">
                      <span className="truncate text-[14.5px] font-semibold text-ink">
                        {lead.name}
                        {lead.lodgeName && lead.lodgeName !== lead.name ? <span className="font-normal text-muted"> · {lead.lodgeName}</span> : null}
                      </span>
                      <span className="truncate text-[12.5px] text-muted">
                        {formatPhone(lead.phone)} · {lead.city}
                        {lead.source ? ` · ${LEAD_SOURCES[lead.source]}` : ""}
                      </span>
                    </span>
                    <span className="min-w-0 text-[12.5px] text-muted">
                      {lead.lastReply ? (
                        <span className="line-clamp-2">
                          <span className="font-semibold text-success">Replied {formatShortWhen(lead.lastReply.createdAt)}:</span> {lead.lastReply.body || "(a photo or voice note)"}
                        </span>
                      ) : lead.lastContactedAt ? (
                        <span>Messaged {formatShortWhen(lead.lastContactedAt)}</span>
                      ) : (
                        <span>Added {formatShortWhen(lead.createdAt)}</span>
                      )}
                    </span>
                    <span className="flex flex-wrap items-center gap-1.5 sm:justify-end">
                      {lead.sites.map((site) => (
                        <Badge key={site.slug} variant={site.claimed ? "success" : "neutral"}>
                          {PLAN_NAMES[site.plan]}
                          {site.claimed ? " · taken" : ""}
                        </Badge>
                      ))}
                      {lead.agentStage && lead.agentStage !== "NEW" ? (
                        <Badge variant={lead.agentPaused ? "danger" : AGENT_STAGES[lead.agentStage].badge}>{lead.agentPaused ? "Needs you" : AGENT_STAGES[lead.agentStage].label}</Badge>
                      ) : null}
                      <Badge variant={OUTREACH_STATUSES[lead.status].badge}>{OUTREACH_STATUSES[lead.status].label}</Badge>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </Card>
        </PageSection>
      ) : null}
      {data && pages > 1 ? (
        <PageSection className="flex items-center justify-between gap-3 text-[13px] text-muted">
          <span>
            Page {page} of {pages}
          </span>
          <span className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>
              Previous
            </Button>
            <Button variant="outline" size="sm" disabled={page >= pages} onClick={() => setPage(page + 1)}>
              Next
            </Button>
          </span>
        </PageSection>
      ) : null}

      <AddLeadSheet open={adding} onOpenChange={setAdding} />
      <UploadSheet open={uploading} onOpenChange={setUploading} onImported={reload} />
    </Page>
  );
}
