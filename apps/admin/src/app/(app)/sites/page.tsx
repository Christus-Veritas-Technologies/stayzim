"use client";

import { Badge } from "@stayzim/ui/components/badge";
import { Button, buttonVariants } from "@stayzim/ui/components/button";
import { Card } from "@stayzim/ui/components/card";
import { EmptyState } from "@stayzim/ui/components/empty-state";
import { Input } from "@stayzim/ui/components/input";
import { NativeSelect } from "@stayzim/ui/components/native-select";
import { Globe, Plus, Search } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";

import { LoadError, LoadingCards, Page, PageHeader, PageSection } from "@/components/page";
import { formatShortDate } from "@/lib/format";
import { PLAN_NAMES, SITE_STATES } from "@/lib/labels";
import type { Paged, SiteRow } from "@/lib/types";
import { useApi } from "@/lib/use-api";

function SitesList() {
  const params = useSearchParams();
  const router = useRouter();
  const state = params.get("state") ?? "all";
  const plan = params.get("plan") ?? "all";
  const page = Number(params.get("page") ?? "1");
  const q = params.get("q") ?? "";
  const [search, setSearch] = useState(q);

  // The search box writes to the address after a pause, so the list follows the typing
  useEffect(() => {
    const timer = setTimeout(() => {
      if (search !== q) update({ q: search, page: "1" });
    }, 350);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  function update(next: Record<string, string>) {
    const query = new URLSearchParams(params.toString());
    for (const [key, value] of Object.entries(next)) {
      if (!value || value === "all" || (key === "page" && value === "1")) query.delete(key);
      else query.set(key, value);
    }
    router.replace(`/sites${query.size ? `?${query}` : ""}`);
  }

  const apiQuery = new URLSearchParams({ state, plan, page: String(page), ...(q ? { q } : {}) });
  const { data, error, loading, reload } = useApi<Paged<"sites", SiteRow>>(`/api/admin/sites?${apiQuery}`);
  const pages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;

  return (
    <Page>
      <PageHeader
        title="Sites"
        count={data?.total}
        description="Every lodge site: who owns it, what it pays, and where it stands."
        actions={
          <Link href="/sites/new" className={buttonVariants({ size: "sm" })}>
            <Plus />
            New sites
          </Link>
        }
      />
      <PageSection className="flex flex-col gap-2 sm:flex-row">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-2" />
          <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Name, address, domain or owner's email" className="pl-9" aria-label="Search sites" />
        </div>
        <NativeSelect value={state} onChange={(event) => update({ state: event.target.value, page: "1" })} aria-label="Status" className="sm:w-48">
          <option value="all">Every status</option>
          {(Object.keys(SITE_STATES) as (keyof typeof SITE_STATES)[]).map((key) => (
            <option key={key} value={key}>
              {SITE_STATES[key].label}
            </option>
          ))}
        </NativeSelect>
        <NativeSelect value={plan} onChange={(event) => update({ plan: event.target.value, page: "1" })} aria-label="Plan" className="sm:w-40">
          <option value="all">Every plan</option>
          {(Object.keys(PLAN_NAMES) as (keyof typeof PLAN_NAMES)[]).map((key) => (
            <option key={key} value={key}>
              {PLAN_NAMES[key]}
            </option>
          ))}
        </NativeSelect>
      </PageSection>

      {loading ? <LoadingCards /> : null}
      {error ? <LoadError message={error} onRetry={reload} /> : null}
      {data && data.sites.length === 0 ? (
        <PageSection>
          <EmptyState className="rounded-[20px] bg-white shadow-card" icon={<Globe />} title="No sites match" description="Try another search or filter." />
        </PageSection>
      ) : null}
      {data && data.sites.length > 0 ? (
        <PageSection>
          <Card className="overflow-hidden p-0">
            <ul className="divide-y divide-line-3">
              {data.sites.map((site) => (
                <li key={site.id}>
                  <Link href={`/sites/${site.slug}`} className="grid gap-x-4 gap-y-1 px-4 py-3 no-underline transition-colors hover:bg-surface-2 sm:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)_auto] sm:items-center">
                    <span className="flex min-w-0 flex-col">
                      <span className="truncate text-[14.5px] font-semibold text-ink">{site.name}</span>
                      <span className="truncate text-[12.5px] text-muted">
                        {site.url.replace(/^https?:\/\//, "")}
                        {site.town ? ` · ${site.town}` : ""}
                      </span>
                    </span>
                    <span className="flex min-w-0 flex-col text-[12.5px] text-muted">
                      <span className="truncate">
                        {site.lead ? `For lead ${site.lead.name}` : site.owner.guest ? "Guest, not claimed" : (site.owner.email ?? site.owner.name)}
                        {site.owner.team ? " (team)" : ""}
                      </span>
                      <span className="truncate">
                        Made {formatShortDate(site.createdAt)} · {site.source ?? "direct"}
                      </span>
                    </span>
                    <span className="flex flex-wrap items-center gap-1.5 sm:justify-end">
                      <Badge variant="neutral">
                        {PLAN_NAMES[site.plan]} · ${site.monthlyPrice}
                      </Badge>
                      {site.founding ? <Badge variant="purple">Founding</Badge> : null}
                      <Badge variant={SITE_STATES[site.state].badge}>{SITE_STATES[site.state].label}</Badge>
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
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => update({ page: String(page - 1) })}>
              Previous
            </Button>
            <Button variant="outline" size="sm" disabled={page >= pages} onClick={() => update({ page: String(page + 1) })}>
              Next
            </Button>
          </span>
        </PageSection>
      ) : null}
    </Page>
  );
}

export default function SitesPage() {
  return (
    <Suspense fallback={<LoadingCards />}>
      <SitesList />
    </Suspense>
  );
}
