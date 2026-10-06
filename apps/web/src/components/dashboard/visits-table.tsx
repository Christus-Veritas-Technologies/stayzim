"use client";

import { Badge } from "@stayzim/ui/components/badge";
import { Button } from "@stayzim/ui/components/button";
import { Card } from "@stayzim/ui/components/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@stayzim/ui/components/dropdown-menu";
import { Skeleton } from "@stayzim/ui/components/skeleton";
import { Spinner } from "@stayzim/ui/components/spinner";
import { Tabs, TabsList, TabsTab } from "@stayzim/ui/components/tabs";
import { cn } from "@stayzim/ui/lib/utils";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowDown,
  ArrowRight,
  ArrowUp,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronsUpDown,
  Monitor,
  RotateCcw,
  SearchX,
  Smartphone,
  Tablet,
  X,
} from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";

import { WhatsAppIcon } from "@/components/landing/brand";
import { EASE_OUT } from "@/components/motion";
import { api } from "@/lib/api";
import { formatClock, formatWhen } from "@/lib/format";
import { countryName, DEVICE_LABEL, type Device, type SiteVisit } from "@/lib/stats";

const DEVICE_ICON = { PHONE: Smartphone, TABLET: Tablet, COMPUTER: Monitor } as const;

const COLUMNS = "grid-cols-[40px_1.1fr_1.15fr_0.85fr_0.85fr_1fr_1fr]";

const PAGE_SIZES = [25, 50, 100] as const;

type Region = "all" | "zw" | "abroad";
type Activity = SiteVisit["type"];

type Filters = {
  where: Region;
  device: Device | null;
  path: string | null;
  type: Activity | null;
  sort: "newest" | "oldest";
  page: number;
  pageSize: (typeof PAGE_SIZES)[number];
};

const START: Filters = { where: "all", device: null, path: null, type: null, sort: "newest", page: 1, pageSize: 50 };

type VisitsPage = { total: number; page: number; pageSize: number; paths: { path: string; count: number }[]; items: SiteVisit[] };

type Journey = { startedAt: string; endedAt: string; steps: { id: string; type: Activity; path: string; createdAt: string; room: string | null }[] };

const ACTIVITY_LABEL: Record<Activity, string> = { PAGE_VIEW: "Page view", BOOKING_CHAT: "Booking chat" };

function query(filters: Filters) {
  const params = new URLSearchParams({ page: String(filters.page), pageSize: String(filters.pageSize), where: filters.where, sort: filters.sort });
  if (filters.device) params.set("device", filters.device);
  if (filters.path) params.set("path", filters.path);
  if (filters.type) params.set("type", filters.type);
  return params.toString();
}

/** 1 2 3 … 7, around the current page. */
function pageNumbers(current: number, last: number): (number | "gap")[] {
  const pages = new Set([1, last, current - 1, current, current + 1].filter((page) => page >= 1 && page <= last));
  const sorted = [...pages].sort((a, b) => a - b);
  return sorted.flatMap((page, index) => (index > 0 && page - sorted[index - 1]! > 1 ? ["gap" as const, page] : [page]));
}

/**
 * Every visit and booking chat, newest first: filters for where guests are,
 * device, page and activity; a page at a time; and each visit's path through
 * the site when opened. A table on desktop, a list on phones.
 */
export function VisitsTable({ empty }: { empty: ReactNode }) {
  const [filters, setFilters] = useState<Filters>(START);
  const [data, setData] = useState<VisitsPage | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [open, setOpen] = useState<string | null>(null);

  useEffect(() => {
    let current = true;
    setLoading(true);
    setError(null);
    void api<VisitsPage>(`/api/lodge/visits?${query(filters)}`).then((result) => {
      if (!current) return;
      setLoading(false);
      if (result.error === undefined) setData(result.data);
      else setError(result.error);
    });
    return () => {
      current = false;
    };
  }, [filters, attempt]);

  // Filters start again from the first page
  const update = (patch: Partial<Filters>) => {
    setOpen(null);
    setFilters((current) => ({ ...current, page: 1, ...patch }));
  };
  const filtered = filters.where !== "all" || filters.device !== null || filters.path !== null || filters.type !== null;
  const lastPage = data ? Math.max(1, Math.ceil(data.total / filters.pageSize)) : 1;

  if (!data && loading) {
    return (
      <Card aria-busy="true" aria-label="Loading visits">
        <div className="flex flex-col gap-3 px-5 py-5">
          <Skeleton className="h-6 w-40" />
          {[0, 1, 2, 3, 4].map((index) => (
            <Skeleton key={index} className="h-10 w-full" />
          ))}
        </div>
      </Card>
    );
  }
  if (!data && error) {
    return (
      <Card className="items-center gap-3 px-5 py-10 text-center text-[13.5px] text-muted">
        Visits didn&apos;t load. {error}
        <Button variant="outline" size="sm" onClick={() => setAttempt((value) => value + 1)}>
          <RotateCcw />
          Try again
        </Button>
      </Card>
    );
  }
  if (data && data.total === 0 && !filtered) return <Card>{empty}</Card>;

  const pathOptions = data?.paths ?? [];

  return (
    <Card className="overflow-hidden">
      <div className="flex flex-wrap items-center gap-x-2.5 gap-y-3 px-4 pt-4 pb-3.5 sm:px-5">
        <span className="text-[15px] font-semibold">Recent visits</span>
        {data ? <Badge>{data.total.toLocaleString("en")}</Badge> : null}
        {loading ? <Spinner className="size-4 text-brand" label="Updating" /> : null}
        <Tabs value={filters.where} onValueChange={(value) => update({ where: value as Region })} className="w-full sm:ml-auto sm:w-auto">
          <TabsList aria-label="Where visitors are" variant="track" className="sm:w-fit sm:bg-transparent sm:p-0">
            <TabsTab value="all">All</TabsTab>
            <TabsTab value="zw">Zimbabwe</TabsTab>
            <TabsTab value="abroad">Outside Zimbabwe</TabsTab>
          </TabsList>
        </Tabs>
      </div>

      <div className="flex items-center gap-2 overflow-x-auto px-4 pb-3.5 [scrollbar-width:none] sm:px-5">
        <FilterChip
          label="Device"
          value={filters.device ? DEVICE_LABEL[filters.device] : null}
          options={(Object.keys(DEVICE_LABEL) as Device[]).map((device) => ({ value: device, label: DEVICE_LABEL[device] }))}
          selected={filters.device}
          onSelect={(device) => update({ device: device as Device | null })}
        />
        <FilterChip
          label="Page"
          value={filters.path}
          mono
          options={pathOptions.map((option) => ({ value: option.path, label: option.path, note: option.count.toLocaleString("en") }))}
          selected={filters.path}
          onSelect={(path) => update({ path })}
        />
        <FilterChip
          label="Activity"
          value={filters.type ? ACTIVITY_LABEL[filters.type] : null}
          options={(Object.keys(ACTIVITY_LABEL) as Activity[]).map((type) => ({ value: type, label: ACTIVITY_LABEL[type] }))}
          selected={filters.type}
          onSelect={(type) => update({ type: type as Activity | null })}
        />
        <AnimatePresence>
          {filtered ? (
            <motion.button
              type="button"
              initial={{ opacity: 0, x: -6 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0 }}
              onClick={() => update({ where: "all", device: null, path: null, type: null })}
              className="ml-auto shrink-0 rounded-md px-1 text-[13px] font-semibold whitespace-nowrap text-brand outline-none hover:text-brand-dark focus-visible:ring-3 focus-visible:ring-ring/30"
            >
              Clear filters
            </motion.button>
          ) : null}
        </AnimatePresence>
      </div>

      {/* Desktop: table head */}
      <div className={cn("hidden h-10 items-center border-y border-[#EAEFF2] bg-surface text-xs font-semibold text-muted md:grid", COLUMNS)}>
        <span />
        <button
          type="button"
          onClick={() => update({ sort: filters.sort === "newest" ? "oldest" : "newest" })}
          className="inline-flex h-full items-center gap-1 px-3.5 text-left text-ink outline-none hover:text-brand focus-visible:text-brand"
          aria-label={filters.sort === "newest" ? "Date, newest first. Show oldest first" : "Date, oldest first. Show newest first"}
        >
          Date
          {filters.sort === "newest" ? <ArrowDown className="size-3" /> : <ArrowUp className="size-3" />}
        </button>
        {["Country", "Page", "Device", "IP address", "Activity"].map((heading) => (
          <span key={heading} className="flex h-full items-center border-l border-[#EAEFF2] px-3.5">
            {heading}
          </span>
        ))}
      </div>

      {data && data.items.length === 0 ? (
        <div className="flex flex-col items-center gap-3 border-t border-line-3 px-5 py-10 text-center md:border-t-0">
          <span className="flex size-11 items-center justify-center rounded-2xl bg-surface-2 text-muted-2">
            <SearchX className="size-5" />
          </span>
          <p className="text-[14px] font-semibold">No visits match these filters</p>
          <Button variant="outline" size="sm" onClick={() => update({ where: "all", device: null, path: null, type: null })}>
            Clear filters
          </Button>
        </div>
      ) : (
        <ul className={cn("divide-y divide-[#EEF1F3] border-t border-line-3 transition-opacity duration-200 md:border-t-0", loading && "opacity-55")}>
          {data?.items.map((visit, index) => (
            <VisitRow
              key={visit.id}
              visit={visit}
              index={index}
              open={open === visit.id}
              onToggle={() => setOpen((current) => (current === visit.id ? null : visit.id))}
            />
          ))}
        </ul>
      )}

      {data && data.total > 0 ? (
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#EEF1F3] px-4 py-3 sm:px-5">
          <span className="text-[13px] text-slate">
            Total <strong className="font-semibold text-ink">{data.total.toLocaleString("en")}</strong> {data.total === 1 ? "visit" : "visits"}
          </span>

          {/* Phones: Previous and Next */}
          <div className="flex w-full gap-2 md:hidden">
            <Button variant="outline" className="flex-1" disabled={filters.page <= 1} onClick={() => setFilters((current) => ({ ...current, page: current.page - 1 }))}>
              <ChevronLeft />
              Previous
            </Button>
            <Button variant="outline" className="flex-1" disabled={filters.page >= lastPage} onClick={() => setFilters((current) => ({ ...current, page: current.page + 1 }))}>
              Next
              <ChevronRight />
            </Button>
          </div>

          <div className="hidden items-center gap-5 md:flex">
            <span className="inline-flex items-center gap-2.5 text-[13px] text-slate">
              Rows per page
              <DropdownMenu>
                <DropdownMenuTrigger className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-line-2 bg-white pr-2 pl-2.5 text-[13px] font-semibold text-ink outline-none hover:border-[#cfd8dd] focus-visible:ring-3 focus-visible:ring-ring/30">
                  {filters.pageSize}
                  <ChevronsUpDown className="size-3.5 text-muted" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="min-w-24">
                  <DropdownMenuRadioGroup value={String(filters.pageSize)} onValueChange={(value) => update({ pageSize: Number(value) as Filters["pageSize"] })}>
                    {PAGE_SIZES.map((size) => (
                      <DropdownMenuRadioItem key={size} value={String(size)}>
                        {size}
                      </DropdownMenuRadioItem>
                    ))}
                  </DropdownMenuRadioGroup>
                </DropdownMenuContent>
              </DropdownMenu>
            </span>
            <nav aria-label="Pages" className="flex items-center gap-1 text-[13px] font-semibold text-slate">
              <PageButton label="Previous page" disabled={filters.page <= 1} onClick={() => setFilters((current) => ({ ...current, page: current.page - 1 }))}>
                <ChevronLeft className="size-4" />
              </PageButton>
              {pageNumbers(filters.page, lastPage).map((page, index) =>
                page === "gap" ? (
                  <span key={`gap-${index}`} className="inline-flex size-8 items-center justify-center text-muted-2">
                    …
                  </span>
                ) : (
                  <PageButton
                    key={page}
                    label={`Page ${page}`}
                    current={page === filters.page}
                    onClick={() => setFilters((current) => ({ ...current, page }))}
                  >
                    {page}
                  </PageButton>
                ),
              )}
              <PageButton label="Next page" disabled={filters.page >= lastPage} onClick={() => setFilters((current) => ({ ...current, page: current.page + 1 }))}>
                <ChevronRight className="size-4" />
              </PageButton>
            </nav>
          </div>
        </div>
      ) : null}
    </Card>
  );
}

function PageButton({
  label,
  current = false,
  disabled = false,
  onClick,
  children,
}: {
  label: string;
  current?: boolean;
  disabled?: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-current={current ? "page" : undefined}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "relative inline-flex size-8 items-center justify-center rounded-full outline-none transition-colors focus-visible:ring-3 focus-visible:ring-ring/30 disabled:text-soft",
        current ? "text-white" : "hover:bg-surface-2",
      )}
    >
      {current ? (
        <motion.span layoutId="visits-page" transition={{ type: "spring", stiffness: 500, damping: 38 }} className="absolute inset-0 rounded-full bg-ink" />
      ) : null}
      <span className="relative">{children}</span>
    </button>
  );
}

/** "Device Any ▾", turning Kariba with an × once something is picked. */
function FilterChip({
  label,
  value,
  options,
  selected,
  onSelect,
  mono = false,
}: {
  label: string;
  value: string | null;
  options: { value: string; label: string; note?: string }[];
  selected: string | null;
  onSelect: (value: string | null) => void;
  mono?: boolean;
}) {
  return (
    <span
      className={cn(
        "inline-flex h-[34px] shrink-0 items-center rounded-[10px] border bg-white text-[13px] text-slate shadow-xs transition-colors",
        value ? "border-[#ACE1F4] bg-[#F5FBFE]" : "border-line-2",
      )}
    >
      <DropdownMenu>
        <DropdownMenuTrigger className="inline-flex h-full items-center gap-1.5 rounded-[10px] pr-2.5 pl-3 outline-none focus-visible:ring-3 focus-visible:ring-ring/30">
          {label}
          <strong className={cn("font-semibold text-ink", mono && value && "font-mono text-xs")}>{value ?? "Any"}</strong>
          <ChevronDown className="size-3.5 text-muted" />
        </DropdownMenuTrigger>
        <DropdownMenuContent className="min-w-44">
          <DropdownMenuRadioGroup value={selected ?? "any"} onValueChange={(next) => onSelect(next === "any" ? null : String(next))}>
            <DropdownMenuRadioItem value="any">Any</DropdownMenuRadioItem>
            {options.map((option) => (
              <DropdownMenuRadioItem key={option.value} value={option.value}>
                <span className={cn(mono && "font-mono text-[12.5px]")}>{option.label}</span>
                {option.note ? <span className="ml-auto pl-3 text-xs text-muted-2 tabular-nums">{option.note}</span> : null}
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
        </DropdownMenuContent>
      </DropdownMenu>
      {value ? (
        <button
          type="button"
          onClick={() => onSelect(null)}
          aria-label={`Clear ${label.toLowerCase()} filter`}
          className="mr-1 flex size-[22px] items-center justify-center rounded-md text-muted outline-none hover:bg-white hover:text-ink focus-visible:ring-3 focus-visible:ring-ring/30"
        >
          <X className="size-3.5" />
        </button>
      ) : null}
    </span>
  );
}

function CountryChip({ code }: { code: string | null }) {
  return (
    <span className="inline-flex h-5 w-7 shrink-0 items-center justify-center rounded-[5px] border border-[#D6F0FA] bg-[#EFF9FD] text-[10.5px] font-bold text-brand-dark">
      {code ?? "?"}
    </span>
  );
}

function ActivityBadge({ type, children }: { type: Activity; children?: ReactNode }) {
  const chat = type === "BOOKING_CHAT";
  return (
    <span
      className={cn(
        "inline-flex h-[22px] items-center gap-1.5 rounded-md border px-2 text-[11px] font-bold tracking-[0.04em] whitespace-nowrap uppercase",
        chat ? "border-[#DCD3FA] bg-[#F5F2FF] text-[#5B4691]" : "border-line bg-surface text-slate",
      )}
    >
      {chat ? <WhatsAppIcon size={11} color="#5B4691" /> : null}
      {children ?? ACTIVITY_LABEL[type]}
    </span>
  );
}

/** "Today, 10:42" with the day in bold. */
function When({ date }: { date: string }) {
  const [day, time] = formatWhen(date).split(", ");
  return (
    <span className="whitespace-nowrap">
      <strong className="font-semibold">{day}</strong>
      <span className="text-muted">, {time}</span>
    </span>
  );
}

function VisitRow({ visit, index, open, onToggle }: { visit: SiteVisit; index: number; open: boolean; onToggle: () => void }) {
  const DeviceIcon = DEVICE_ICON[visit.device];
  return (
    <motion.li
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: Math.min(index * 0.015, 0.3), ease: EASE_OUT }}
      className={cn(open && "bg-[#F5FBFE]")}
    >
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="w-full text-left text-[14px] outline-none transition-colors hover:bg-surface/70 focus-visible:bg-surface"
      >
        {/* Desktop */}
        <span className={cn("hidden h-14 items-center md:grid", COLUMNS)}>
          <span className="flex justify-center">
            <span
              className={cn(
                "flex size-6 items-center justify-center rounded-md transition-colors",
                open ? "bg-brand-wash text-brand" : "text-soft",
              )}
            >
              <ChevronRight className={cn("size-[15px] transition-transform duration-200", open && "rotate-90")} />
            </span>
          </span>
          <span className="px-3.5">
            <When date={visit.createdAt} />
          </span>
          <span className="flex min-w-0 items-center gap-2.5 border-l border-[#EEF1F3] px-3.5">
            <CountryChip code={visit.country} />
            <span className="truncate">{countryName(visit.country)}</span>
          </span>
          <span className="flex min-w-0 border-l border-[#EEF1F3] px-3.5">
            <span className="inline-flex h-6 items-center truncate rounded-md bg-surface px-2 font-mono text-xs text-ink-2">{visit.path}</span>
          </span>
          <span className="flex items-center gap-1.5 border-l border-[#EEF1F3] px-3.5 text-ink-2">
            <DeviceIcon className="size-[15px] text-muted" />
            {DEVICE_LABEL[visit.device]}
          </span>
          <span className="truncate border-l border-[#EEF1F3] px-3.5 font-mono text-[12.5px] text-slate">{visit.ip ?? "Not known"}</span>
          <span className="flex border-l border-[#EEF1F3] px-3.5">
            <ActivityBadge type={visit.type} />
          </span>
        </span>

        {/* Phones */}
        <span className="flex items-center gap-3 px-4 py-3 md:hidden">
          <CountryChip code={visit.country} />
          <span className="flex min-w-0 flex-1 flex-col">
            <span className="flex items-center gap-2">
              <span className="truncate font-semibold">{countryName(visit.country)}</span>
              {visit.type === "BOOKING_CHAT" ? <WhatsAppIcon size={13} color="#5B4691" /> : null}
            </span>
            <span className="truncate font-mono text-xs text-muted">
              {visit.ip ?? "IP not known"} · {visit.path}
            </span>
          </span>
          <span className="shrink-0 text-xs text-muted">{formatWhen(visit.createdAt)}</span>
        </span>
      </button>

      <AnimatePresence initial={false}>
        {open ? (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.28, ease: EASE_OUT }}
            className="overflow-hidden"
          >
            <VisitDetail visit={visit} />
          </motion.div>
        ) : null}
      </AnimatePresence>
    </motion.li>
  );
}

const journeys = new Map<string, Journey>();

/** The guest's whole visit: pages in order, any booking chat, device and where they are. */
function VisitDetail({ visit }: { visit: SiteVisit }) {
  const [journey, setJourney] = useState<Journey | null>(journeys.get(visit.id) ?? null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (journeys.has(visit.id)) return;
    let current = true;
    void api<Journey>(`/api/lodge/visits/${visit.id}/journey`).then((result) => {
      if (!current) return;
      if (result.error !== undefined) setFailed(true);
      else {
        journeys.set(visit.id, result.data);
        setJourney(result.data);
      }
    });
    return () => {
      current = false;
    };
  }, [visit.id]);

  const pages = journey?.steps.filter((step) => step.type === "PAGE_VIEW") ?? [];
  const chat = journey?.steps.find((step) => step.type === "BOOKING_CHAT");

  const facts = [
    {
      bar: "bg-brand",
      title: journey ? `${pages.length} ${pages.length === 1 ? "page" : "pages"}` : "…",
      note: "In this visit",
    },
    {
      bar: "bg-purple",
      title: chat ? (chat.room ?? "Book on WhatsApp") : "No booking chat",
      note: chat ? `Booking chat at ${formatClock(chat.createdAt)}` : "Looked around only",
    },
    { bar: "bg-[#DB8B5D]", title: DEVICE_LABEL[visit.device], note: visit.browser ?? "Browser not known" },
    { bar: "bg-success", title: countryName(visit.country), note: visit.ip ?? "IP not known" },
  ];

  return (
    <div className="flex flex-col gap-4 border-t border-[#EEF1F3] bg-[#F7FAFB] px-4 py-4 md:py-[18px] md:pr-5 md:pl-[54px]">
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4 md:gap-5">
        {facts.map((fact) => (
          <div key={fact.note} className="flex gap-2.5">
            <span className={cn("w-[3px] shrink-0 rounded-sm", fact.bar)} />
            <div className="flex min-w-0 flex-col gap-0.5">
              <span className="truncate text-[15px] font-semibold">{fact.title}</span>
              <span className="truncate text-[12.5px] text-muted">{fact.note}</span>
            </div>
          </div>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-2 text-[12.5px] text-slate">
        <span className="mr-1 font-semibold text-ink-2">Path</span>
        {failed ? (
          <span>Couldn&apos;t load this visit.</span>
        ) : !journey ? (
          <Spinner className="size-4 text-brand" label="Loading this visit" />
        ) : (
          journey.steps.map((step, index) => (
            <span key={step.id} className="inline-flex items-center gap-2">
              {index > 0 ? <ArrowRight className="size-3.5 text-soft" /> : null}
              {step.type === "BOOKING_CHAT" ? (
                <ActivityBadge type="BOOKING_CHAT">Book on WhatsApp</ActivityBadge>
              ) : (
                <span
                  className={cn(
                    "inline-flex h-[26px] items-center rounded-[7px] border bg-white px-2.5 font-mono text-xs text-ink-2",
                    step.id === visit.id ? "border-brand/50 ring-2 ring-brand/15" : "border-line",
                  )}
                >
                  {step.path}
                </span>
              )}
            </span>
          ))
        )}
      </div>
    </div>
  );
}
