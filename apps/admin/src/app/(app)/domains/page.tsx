"use client";

import { Badge } from "@stayzim/ui/components/badge";
import { Button } from "@stayzim/ui/components/button";
import { EmptyState } from "@stayzim/ui/components/empty-state";
import { Link2 } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";

import { LoadError, LoadingCards, Page, PageHeader, PageSection, Panel } from "@/components/page";
import { api } from "@/lib/api";
import { formatShortDate } from "@/lib/format";
import { PLAN_NAMES } from "@/lib/labels";
import type { Plan } from "@/lib/types";
import { useApi } from "@/lib/use-api";

type Claim = {
  id: string;
  domain: string;
  status: "REQUESTED" | "READY";
  createdAt: string;
  readyAt: string | null;
  lodge: { name: string; slug: string; customDomain: string | null; plan: Plan; whatsapp: string | null; owner: { name: string; email: string } };
};

/**
 * Free .co.zw domains owners claimed from their dashboard. Register the name,
 * point its DNS at us (docs/deployment.md, Custom domains), then Set up: the
 * site answers on it, and the hourly job emails the owner that it's live.
 */
export default function DomainsPage() {
  const { data, error, loading, reload } = useApi<{ claims: Claim[] }>("/api/admin/domains");
  const [busy, setBusy] = useState<string | null>(null);

  async function setUp(claim: Claim) {
    setBusy(claim.id);
    const result = await api(`/api/admin/sites/${claim.lodge.slug}`, { method: "PATCH", json: { customDomain: claim.domain } });
    setBusy(null);
    if (result.error !== undefined) toast.error(result.error);
    else {
      toast.success(`${claim.lodge.name} answers on ${claim.domain} now. The owner gets an email within the hour.`);
      reload();
    }
  }

  const waiting = data?.claims.filter((claim) => claim.status === "REQUESTED") ?? [];
  const ready = data?.claims.filter((claim) => claim.status === "READY") ?? [];

  return (
    <Page>
      <PageHeader title="Domains" count={waiting.length} description="Free .co.zw domains claimed from the dashboard. Register the name and point it at us, then set it up here." />
      {loading ? <LoadingCards /> : null}
      {error ? <LoadError message={error} onRetry={reload} /> : null}
      {data && data.claims.length === 0 ? (
        <PageSection>
          <EmptyState className="rounded-[20px] bg-white shadow-card" icon={<Link2 />} title="No domains claimed yet" description="Paid sites claim theirs from the dashboard; they show here." />
        </PageSection>
      ) : null}
      {data && data.claims.length > 0 ? (
        <PageSection className="flex flex-col gap-4">
          <Panel title="Waiting to be set up" description="Oldest first: each was promised within 72 hours.">
            {waiting.length === 0 ? <p className="text-[13.5px] text-muted">All caught up.</p> : null}
            <ul className="flex flex-col divide-y divide-line-3">
              {waiting.map((claim) => (
                <li key={claim.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                  <span className="flex min-w-0 flex-col">
                    <span className="text-[14.5px] font-semibold">{claim.domain}</span>
                    <span className="text-[12.5px] text-muted">
                      <Link href={`/sites/${claim.lodge.slug}`} className="text-ink hover:text-brand">
                        {claim.lodge.name}
                      </Link>{" "}
                      · {PLAN_NAMES[claim.lodge.plan]} · {claim.lodge.owner.name} ({claim.lodge.owner.email}) · claimed {formatShortDate(claim.createdAt)}
                    </span>
                  </span>
                  <Button size="sm" onClick={() => setUp(claim)} disabled={busy === claim.id}>
                    {busy === claim.id ? "Setting up" : "Set up"}
                  </Button>
                </li>
              ))}
            </ul>
          </Panel>
          {ready.length > 0 ? (
            <Panel title="Live">
              <ul className="flex flex-col divide-y divide-line-3">
                {ready.map((claim) => (
                  <li key={claim.id} className="flex items-center justify-between gap-3 py-2.5 text-[13.5px]">
                    <span>
                      <span className="font-semibold">{claim.domain}</span> · {claim.lodge.name}
                    </span>
                    <Badge variant="success">Live {claim.readyAt ? formatShortDate(claim.readyAt) : ""}</Badge>
                  </li>
                ))}
              </ul>
            </Panel>
          ) : null}
        </PageSection>
      ) : null}
    </Page>
  );
}
