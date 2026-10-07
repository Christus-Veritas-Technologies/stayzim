"use client";

import { Badge } from "@stayzim/ui/components/badge";
import { Button } from "@stayzim/ui/components/button";
import { Card } from "@stayzim/ui/components/card";
import { EmptyState } from "@stayzim/ui/components/empty-state";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@stayzim/ui/components/input";
import { Skeleton } from "@stayzim/ui/components/skeleton";
import { PLANS_LABEL, type Plan } from "@stayzim/sites";
import { cn } from "@stayzim/ui/lib/utils";
import { BookOpenText, ChevronRight, Quote, Search, Star } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { useEffect, useState } from "react";

import { Appear, Item, riseIn } from "@/components/motion";
import { api } from "@/lib/api";

/** GET /api/admin/lodges (apps/server/src/routes/admin.ts) */
type AdminLodge = { name: string; slug: string; plan: Plan; status: string; reviewScore: number | null; quotes: number; posts: number };

/** The team's list of lodges, to pick one whose reviews and journal to edit. Pro lodges first. */
export default function AdminLodgesPage() {
  const [query, setQuery] = useState("");
  const [state, setState] = useState<{ kind: "loading" } | { kind: "ready"; lodges: AdminLodge[] } | { kind: "error"; message: string }>({ kind: "loading" });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let current = true;
    const timer = setTimeout(
      () => {
        void api<{ lodges: AdminLodge[] }>(`/api/admin/lodges${query.trim() ? `?q=${encodeURIComponent(query.trim())}` : ""}`).then((result) => {
          if (!current) return;
          setState(result.error === undefined ? { kind: "ready", lodges: result.data.lodges } : { kind: "error", message: result.error });
        });
      },
      query ? 250 : 0,
    );
    return () => {
      current = false;
      clearTimeout(timer);
    };
  }, [query, attempt]);

  return (
    <Appear className="flex flex-col gap-5" stagger={0.06}>
      <Item variants={riseIn} className="flex flex-col gap-1">
        <h1 className="font-display text-2xl leading-8 font-semibold tracking-[-0.02em] lg:text-[28px] lg:leading-[34px]">Lodge content</h1>
        <p className="text-[13.5px] text-muted lg:text-sm">Booking.com reviews and the journal for Pro sites. Owners can't edit these; we keep them up to date.</p>
      </Item>

      <Item variants={riseIn}>
        <InputGroup className="sm:max-w-sm">
          <InputGroupAddon>
            <Search />
          </InputGroupAddon>
          <InputGroupInput value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search by name or address" aria-label="Search lodges" />
        </InputGroup>
      </Item>

      <Item variants={riseIn}>
        {state.kind === "loading" ? (
          <div className="flex flex-col gap-2" aria-busy="true">
            <Skeleton className="h-16 w-full rounded-2xl" />
            <Skeleton className="h-16 w-full rounded-2xl" />
            <Skeleton className="h-16 w-full rounded-2xl" />
          </div>
        ) : state.kind === "error" ? (
          <Card>
            <EmptyState
              title="The lodges didn't load"
              description={state.message}
              action={
                <Button variant="outline" onClick={() => setAttempt((value) => value + 1)}>
                  Try again
                </Button>
              }
            />
          </Card>
        ) : state.lodges.length === 0 ? (
          <Card>
            <EmptyState icon={<Search />} title="No lodges match" description="Try part of the lodge's name or its address, like mistvalley." />
          </Card>
        ) : (
          <Card className="overflow-hidden p-0">
            <ul className="divide-y divide-line-3">
              {state.lodges.map((lodge) => (
                <li key={lodge.slug}>
                  <Link
                    href={`/admin/lodges/${lodge.slug}` as Route}
                    className="flex items-center gap-3 px-4 py-3.5 transition-colors outline-none hover:bg-surface focus-visible:bg-surface sm:px-5"
                  >
                    <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                      <span className="flex flex-wrap items-center gap-2">
                        <span className="truncate text-[14.5px] font-semibold">{lodge.name}</span>
                        <Badge variant={lodge.plan === "PRO" ? "purple" : "neutral"}>{PLANS_LABEL[lodge.plan]}</Badge>
                      </span>
                      <span className="text-[12.5px] text-muted">{lodge.slug}</span>
                    </span>
                    <span className={cn("hidden items-center gap-4 text-[13px] text-muted sm:flex", lodge.plan !== "PRO" && "opacity-60")}>
                      <span className="inline-flex items-center gap-1.5" title="Score">
                        <Star className="size-3.5" />
                        {lodge.reviewScore ?? "–"}
                      </span>
                      <span className="inline-flex items-center gap-1.5" title="Quotes">
                        <Quote className="size-3.5" />
                        {lodge.quotes}
                      </span>
                      <span className="inline-flex items-center gap-1.5" title="Journal posts">
                        <BookOpenText className="size-3.5" />
                        {lodge.posts}
                      </span>
                    </span>
                    <ChevronRight className="size-4 shrink-0 text-soft" />
                  </Link>
                </li>
              ))}
            </ul>
          </Card>
        )}
      </Item>
    </Appear>
  );
}
