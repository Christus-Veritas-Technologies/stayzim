"use client";

import { Badge } from "@stayzim/ui/components/badge";
import { Button } from "@stayzim/ui/components/button";
import { Card } from "@stayzim/ui/components/card";
import { EmptyState } from "@stayzim/ui/components/empty-state";
import { Input } from "@stayzim/ui/components/input";
import { Tabs, TabsList, TabsTab } from "@stayzim/ui/components/tabs";
import { KeyRound, Search, Users } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { LoadError, LoadingCards, Page, PageHeader, PageSection } from "@/components/page";
import { api } from "@/lib/api";
import { formatShortDate, formatShortWhen } from "@/lib/format";
import { PLAN_NAMES, SITE_STATES } from "@/lib/labels";
import type { Paged, UserRow } from "@/lib/types";
import { useApi } from "@/lib/use-api";

type Kind = "owners" | "guests" | "team" | "all";

const KIND_HINTS: Record<Kind, string> = {
  owners: "Owners who claimed their site with an email or Google.",
  guests: "People who made a site at /create but haven't added their email yet.",
  team: "StayZim team accounts (made with create-owner --admin).",
  all: "Everyone with an account, except the placeholders on sites made for leads.",
};

export default function UsersPage() {
  const [kind, setKind] = useState<Kind>("owners");
  const [search, setSearch] = useState("");
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);

  useEffect(() => {
    const timer = setTimeout(() => {
      setQ(search.trim());
      setPage(1);
    }, 350);
    return () => clearTimeout(timer);
  }, [search]);

  const query = new URLSearchParams({ kind, page: String(page), ...(q ? { q } : {}) });
  const { data, error, loading, reload } = useApi<Paged<"users", UserRow>>(`/api/admin/users?${query}`);
  const pages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;

  async function sendReset(user: UserRow) {
    const result = await api(`/api/admin/users/${user.id}/password-reset`, { method: "POST" });
    if (result.error !== undefined) toast.error(result.error);
    else toast.success(`Reset email sent to ${user.email}`);
  }

  return (
    <Page>
      <PageHeader title="Users" count={data?.total} description={KIND_HINTS[kind]} />
      <PageSection className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <Tabs
          value={kind}
          onValueChange={(value) => {
            setKind(value as Kind);
            setPage(1);
          }}
        >
          <TabsList aria-label="Kind">
            <TabsTab value="owners">Owners</TabsTab>
            <TabsTab value="guests">Guests</TabsTab>
            <TabsTab value="team">Team</TabsTab>
            <TabsTab value="all">Everyone</TabsTab>
          </TabsList>
        </Tabs>
        <div className="relative sm:w-80">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-2" />
          <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Name or email" className="pl-9" aria-label="Search users" />
        </div>
      </PageSection>

      {loading ? <LoadingCards /> : null}
      {error ? <LoadError message={error} onRetry={reload} /> : null}
      {data && data.users.length === 0 ? (
        <PageSection>
          <EmptyState className="rounded-[20px] bg-white shadow-card" icon={<Users />} title="Nobody here yet" description="Try another tab or search." />
        </PageSection>
      ) : null}
      {data && data.users.length > 0 ? (
        <PageSection>
          <Card className="overflow-hidden p-0">
            <ul className="divide-y divide-line-3">
              {data.users.map((user) => (
                <li key={user.id} className="grid gap-x-4 gap-y-2 px-4 py-3 sm:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_auto] sm:items-center">
                  <span className="flex min-w-0 flex-col">
                    <span className="flex items-center gap-2 truncate text-[14.5px] font-semibold">
                      {user.name}
                      {user.role === "ADMIN" ? <Badge variant="purple">Team</Badge> : null}
                      {user.guest ? <Badge variant="neutral">Guest</Badge> : null}
                    </span>
                    <span className="truncate text-[12.5px] text-muted">{user.email ?? "No email yet"}</span>
                  </span>
                  <span className="flex min-w-0 flex-col text-[12.5px] text-muted">
                    {user.lodge ? (
                      <Link href={`/sites/${user.lodge.slug}`} className="flex flex-wrap items-center gap-1.5 text-ink no-underline hover:text-brand">
                        <span className="truncate font-semibold">{user.lodge.name}</span>
                        <Badge variant={SITE_STATES[user.lodge.state].badge}>{SITE_STATES[user.lodge.state].label}</Badge>
                        <span className="text-muted">{PLAN_NAMES[user.lodge.plan]}</span>
                      </Link>
                    ) : (
                      <span>No site</span>
                    )}
                    <span>
                      Joined {formatShortDate(user.createdAt)}
                      {user.lastSeenAt ? ` · last seen ${formatShortWhen(user.lastSeenAt)}` : ""}
                      {user.signIn.includes("google") ? " · Google" : ""}
                    </span>
                  </span>
                  <span className="flex sm:justify-end">
                    {user.email && user.signIn.includes("credential") ? (
                      <Button variant="ghost" size="sm" onClick={() => sendReset(user)}>
                        <KeyRound />
                        Send password reset
                      </Button>
                    ) : null}
                  </span>
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
    </Page>
  );
}
